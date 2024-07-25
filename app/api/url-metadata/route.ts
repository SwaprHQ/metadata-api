import { NextResponse, NextRequest } from "next/server";
import puppeteer from "puppeteer-core";
const cheerio = require("cheerio");
const chrome = require("@sparticuz/chromium");

// Config CORS
// ========================================================
/**
 *
 * @param origin
 * @returns
 */
const getCorsHeaders = (origin: string) => {
  // Default options
  const headers = {
    "Access-Control-Allow-Methods": `${process.env.ALLOWED_METHODS}`,
    "Access-Control-Allow-Headers": `${process.env.ALLOWED_HEADERS}`,
    "Access-Control-Allow-Origin": `${process.env.DOMAIN_URL}`,
  };

  // If no allowed origin is set to default server origin
  if (!process.env.ALLOWED_ORIGIN || !origin) return headers;

  // If allowed origin is set, check if origin is in allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGIN.split(",");

  // Validate server origin
  if (allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  // Return result
  return headers;
};

/**
 * Basic OPTIONS Request to simuluate OPTIONS preflight request for mutative requests
 */
export const OPTIONS = async (request: NextRequest) => {
  // Return Response
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: getCorsHeaders(request.headers.get("origin") || ""),
    }
  );
};

const getOptions = async () => {
  let options;

  options = {
    args: chrome.args,
    defaultViewport: chrome.defaultViewport,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
  };

  return options;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const urlParam = searchParams.get("url");
  try {
    console.log(request.url);
    console.log(urlParam);
    if (!urlParam) throw "No url";

    const decodedUrl = decodeURIComponent(urlParam);

    console.log("configuring chrome...");
    const options = await getOptions();

    console.log("options", options);
    console.log("launching browser...");
    const browser = await puppeteer.launch(options);

    console.log("opening new page...");
    const page = await browser.newPage();

    console.log("setting request interception...");
    await page.setRequestInterception(true);
    page.on("request", (request: any) => {
      const reqType = request.resourceType();
      if (reqType === "document") {
        request.continue();
      } else if (process.env.NODE_ENV === "development") {
        request.continue();
      } else {
        console.log("block request type: " + request.resourceType());
        request.abort();
      }
    });

    console.log("navigating to " + decodedUrl + "...");
    await page.goto(decodedUrl, { timeout: 0 }).then(() => {
      console.log("url loaded"); //WORKS FINE
    });

    console.log("get page content...");

    const html = await page.content();

    console.log("parse html...");
    const $ = cheerio.load(html);
    const articlePublishTime = $('[property="article:published_time"]').attr(
      "content"
    );
    const ogImage = $('[property="og:image"]').attr("content");
    const ogTitle = $('[property="og:title"]').attr("content");

    console.log({ articlePublishTime, ogImage, ogTitle });

    console.log("closing browser...");
    await browser.close();

    console.log("done.");
    return NextResponse.json(
      { articlePublishTime, ogImage, ogTitle },
      {
        status: 200,
        headers: {
          ...getCorsHeaders(request.headers.get("origin") || ""),
          "Cache-Control": `public, max-age=${process.env.MAX_AGE || "10800"}`,
        },
      }
    );
  } catch (error) {
    console.log(error);

    return NextResponse.json({ error: error }, { status: 400 });
  }
}

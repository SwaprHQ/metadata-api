import { NextResponse, NextRequest } from "next/server";
import puppeteer from "puppeteer-core";
const chrome = require("@sparticuz/chromium");
const cheerio = require("cheerio");

/** The code below determines the executable location for Chrome to
 * start up and take the screenshot when running a local development environment.
 *
 * If the code is running on Windows, find chrome.exe in the default location.
 * If the code is running on Linux, find the Chrome installation in the default location.
 * If the code is running on MacOS, find the Chrome installation in the default location.
 * You may need to update this code when running it locally depending on the location of
 * your Chrome installation on your operating system.

 via https://www.contentful.com/blog/2021/03/17/puppeteer-node-open-graph-screenshot-for-socials/
*/

export const dynamicParams = true;
export const revalidate = false;
export const fetchCache = "auto";
export const runtime = "nodejs";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";

const exePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
    ? "/usr/bin/google-chrome"
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const getOptions = async () => {
  let options;
  if (process.env.NODE_ENV === "production") {
    options = {
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    };
  } else {
    options = {
      args: [],
      executablePath: exePath,
      headless: true,
    };
  }
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

    const articlePusblishTime = $('[property="article:published_time"]').attr(
      "content"
    );
    const ogImage = $('[property="og:image"]').attr("content");
    const ogTitle = $('[property="og:title"]').attr("content");

    console.log({ articlePusblishTime, ogImage, ogTitle });

    console.log("closing browser...");
    await browser.close();

    console.log("done.");
    return NextResponse.json(
      { articlePusblishTime, ogImage, ogTitle },
      { status: 201 }
    );
  } catch (error) {
    console.log(error);

    return NextResponse.json({ error: error }, { status: 400 });
  }
}

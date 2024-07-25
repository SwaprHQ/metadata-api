/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    //config.externals = ["chrome-aws-lambda", "puppeteer-core"];
    config.externals = ["@sparticuz/chromium", "puppeteer-core", "picocolors"];

    return config;
  },
};

export default nextConfig;

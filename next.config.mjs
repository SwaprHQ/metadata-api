/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    //config.externals = ["chrome-aws-lambda", "puppeteer-core"];
    config.externals = ["chrome-aws-lambda", "puppeteer-core", "picocolors"];

    return config;
  },
};

export default nextConfig;

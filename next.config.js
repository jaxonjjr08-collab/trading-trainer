/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  // Set NEXT_DIST_DIR=C:/some/path to redirect build output off OneDrive. When unset,
  // Next.js uses the default .next inside the project — which works fine, just touches
  // OneDrive on every build.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Pin the workspace root to this project so Next stops warning about the stray
  // C:\Users\jaxon\package-lock.json. Doesn't touch that file.
  outputFileTracingRoot: path.resolve(__dirname),
};

module.exports = nextConfig;

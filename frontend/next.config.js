const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo-style repo has package-lock at root + frontend — pin tracing to frontend
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

// Configure hostname and port for Replit
if (process.env.REPL_SLUG) {
  nextConfig.hostname = '0.0.0.0';
  nextConfig.port = 3000;
}

module.exports = nextConfig;

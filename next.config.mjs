/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [
    "*.picard.replit.dev",
    "*.janeway.replit.dev",
    "*.spock.replit.dev",
    "*.kirk.replit.dev",
    "*.replit.dev",
    "*.repl.co",
  ],
};

export default nextConfig;

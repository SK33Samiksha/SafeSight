// Where the Express backend runs. The browser never calls it directly:
// requests to /api/* on this site are forwarded to it, so phones and other
// devices on the same Wi-Fi only need to reach this one address.
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow opening the dev server from other devices on a home/college network
  // (e.g. http://192.168.1.5:3000 on a phone).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }]
  },
}

export default nextConfig

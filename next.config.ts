// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
    ],
  },
  // Disable some experimental features that might cause issues
  experimental: {
    // Disable optimization that might cause build issues
    optimizeCss: false,
    // Disable turbo
    turbo: {
      rules: {}
    }
  },
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for fallback-build-manifest.json issue
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // Generate build ID
  generateBuildId: async () => {
    // Return a constant build ID for development
    return 'development-build'
  },
  // Disable build optimization for now
  swcMinify: false,
  // Output configuration
  output: 'standalone',
}
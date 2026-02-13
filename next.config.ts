import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Корень проекта для file tracing (чтобы не подхватывать lockfile из родительской папки)
  outputFileTracingRoot: path.join(process.cwd()),
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon', permanent: false }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: [
              'geolocation=()',
              'camera=()',
              'microphone=()',
              'payment=()',
              'usb=()',
              'bluetooth=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'autoplay=()',
              'encrypted-media=()',
              'picture-in-picture=()',
              'screen-wake-lock=()',
              'web-share=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
        ],
      },
    ]
  },
}

export default nextConfig

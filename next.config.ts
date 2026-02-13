import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
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

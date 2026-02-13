import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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

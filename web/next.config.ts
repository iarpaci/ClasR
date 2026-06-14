import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://use.typekit.net https://eu.i.posthog.com https://eu-assets.i.posthog.com",
      "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
      "font-src 'self' https://use.typekit.net https://p.typekit.net",
      "img-src 'self' data: blob: https://p.typekit.net",
      "connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://o4511299097985024.ingest.de.sentry.io",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const API_URL = process.env.API_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/analyze',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});

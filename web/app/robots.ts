import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/contact',
          '/faq',
          '/features',
          '/how-it-works',
          '/pricing',
          '/privacy',
          '/terms',
          '/mesafeli-satis',
          '/login',
          '/register',
          '/forgot-password',
        ],
        disallow: [
          '/analyze',
          '/settings',
          '/onboarding',
          '/dashboard',
          '/report/',
          '/chat',
          '/reset-password',
        ],
      },
    ],
    sitemap: 'https://clasr.ai/sitemap.xml',
  };
}

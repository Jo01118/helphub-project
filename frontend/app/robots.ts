import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/volunteer/dashboard/', '/user/dashboard/'],
    },
    sitemap: 'https://helphub-reportingsystem.vercel.app/sitemap.xml',
  }
}

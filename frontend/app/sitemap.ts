import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://helphub-reportingsystem.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://helphub-reportingsystem.vercel.app/access',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://helphub-reportingsystem.vercel.app/user',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: 'https://helphub-reportingsystem.vercel.app/volunteer',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  ]
}

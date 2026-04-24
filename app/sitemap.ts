import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://parkspace.com.au'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const static_routes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/listings`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('is_active', true)

  const listingRoutes: MetadataRoute.Sitemap = (data ?? []).map((l) => ({
    url: `${BASE_URL}/listings/${l.id}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...static_routes, ...listingRoutes]
}

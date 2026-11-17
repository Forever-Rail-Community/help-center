import type { APIRoute, GetStaticPaths } from 'astro'
import { loadHelp } from '../lib/feed'
import { siteImage, type SiteImage, type SiteImageName } from '../lib/siteImages'

// Writes the logo and the home page image into the build as /<name>.<ext> (see src/lib/siteImages.ts).
const NAMES: SiteImageName[] = ['logo', 'hero']

export const getStaticPaths = (async () => {
  const help = await loadHelp()
  const images = await Promise.all(NAMES.map((name) => siteImage(help, name)))
  return images.filter((image): image is SiteImage => image !== null).map((image) => ({ params: { image: image.name, ext: image.ext }, props: { image } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) => {
  const { image } = props as { image: SiteImage }
  return new Response(image.bytes, { headers: { 'content-type': image.type } })
}

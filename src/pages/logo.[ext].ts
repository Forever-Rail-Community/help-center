import type { APIRoute, GetStaticPaths } from 'astro'
import { loadHelp } from '../lib/feed'
import { loadLogo } from '../lib/logo'

// Writes the dashboard's logo into the build as /logo.<ext> (see src/lib/logo.ts).
export const getStaticPaths: GetStaticPaths = async () => [{ params: { ext: (await loadLogo(await loadHelp())).ext } }]

export const GET: APIRoute = async () => {
  const logo = await loadLogo(await loadHelp())
  return new Response(logo.bytes, { headers: { 'content-type': logo.type } })
}

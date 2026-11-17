// Loads the dashboard's public help feed once per build and arranges it for the pages.
// The feed's shape is defined in the dashboard (shared/types/help.ts, PublicHelp).
import { renderArticle, type Heading } from './render'

export type HelpGame = 'run8' | 'railroader' | 'all'

interface FeedArticle {
  categorySlug: string
  slug: string
  game: HelpGame
  section: string
  sortOrder: number
  title: string
  summary: string
  body: unknown
  authorName: string
  updatedAt: string
}

interface Feed {
  site: { name: string; logo: string; brandColor: string }
  categories: { slug: string; name: string; description: string; icon: string; sortOrder: number }[]
  articles: FeedArticle[]
}

export interface Article extends Omit<FeedArticle, 'body'> {
  url: string
  category: Category
  html: string
  headings: Heading[]
}

export interface Section {
  name: string // '' for articles without a section
  articles: Article[]
}

export interface Category {
  slug: string
  name: string
  description: string
  icon: string
  url: string
  articles: Article[] // in reading order: by section, then order, then title
  sections: Section[]
}

export interface Help {
  site: Feed['site']
  categories: Category[] // only categories with at least one published article
  articles: Article[]
  feedUrl: string
}

// Names match the dashboard's game picker. A game the site doesn't know yet shows its key.
const GAME_NAMES: Record<string, string> = { run8: 'Run8', railroader: 'Railroader', all: 'All games' }
export const gameName = (game: string) => GAME_NAMES[game] ?? game

function feedUrl(): string {
  const url = import.meta.env.HELP_FEED_URL
  if (!url) throw new Error('HELP_FEED_URL is not set. Point it at the dashboard: https://<dashboard>/api/public/help')
  return url
}

async function fetchFeed(url: string): Promise<Feed> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Could not load the help feed from ${url}: ${res.status} ${res.statusText}`)
  const feed = (await res.json()) as Feed
  if (!feed?.site || !Array.isArray(feed.categories) || !Array.isArray(feed.articles)) {
    throw new Error(`${url} did not return a help feed`)
  }
  return feed
}

function arrange(feed: Feed, url: string): Help {
  const categories: Category[] = feed.categories.map((c) => ({ ...c, url: `/${c.slug}/`, articles: [], sections: [] }))
  const bySlug = new Map(categories.map((c) => [c.slug, c]))

  const articles: Article[] = feed.articles.flatMap(({ body, ...a }) => {
    const category = bySlug.get(a.categorySlug)
    if (!category) return [] // the feed only lists articles in known categories; skip anything odd
    return [{ ...a, url: `${category.url}${a.slug}/`, category, ...renderArticle(body) }]
  })

  const readingOrder = (x: Article, y: Article) =>
    x.section.localeCompare(y.section) || x.sortOrder - y.sortOrder || x.title.localeCompare(y.title)
  for (const a of [...articles].sort(readingOrder)) a.category.articles.push(a)

  for (const c of categories) {
    for (const a of c.articles) {
      const last = c.sections.at(-1)
      if (last?.name === a.section) last.articles.push(a)
      else c.sections.push({ name: a.section, articles: [a] })
    }
  }

  return { site: feed.site, categories: categories.filter((c) => c.articles.length), articles, feedUrl: url }
}

let loaded: Promise<Help> | undefined

// Every page calls this; the feed is fetched and rendered only once per build.
export function loadHelp(): Promise<Help> {
  loaded ??= (async () => {
    const url = feedUrl()
    return arrange(await fetchFeed(url), url)
  })()
  return loaded
}

// The articles before and after this one in its category, for the links at the end of an article.
export function neighbours(article: Article) {
  const list = article.category.articles
  const i = list.indexOf(article)
  return { previous: list[i - 1], next: list[i + 1] }
}

// The most recently updated articles, newest first.
export const recentlyUpdated = (help: Help, count: number) =>
  [...help.articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, count)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

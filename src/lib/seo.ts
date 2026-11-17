import type { Article, Help } from './feed'

// schema.org data that helps search engines show breadcrumbs and article details in results.

const absolute = (path: string, site: URL) => new URL(path, site).toString()

export function breadcrumbData(items: { label: string; url: string }[], site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.label, item: absolute(item.url, site) }))
  }
}

export function articleData(article: Article, help: Help, logo: string, site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary || undefined,
    dateModified: article.updatedAt,
    mainEntityOfPage: absolute(article.url, site),
    author: { '@type': 'Person', name: article.authorName },
    publisher: { '@type': 'Organization', name: help.site.name, logo: { '@type': 'ImageObject', url: absolute(logo, site) } }
  }
}

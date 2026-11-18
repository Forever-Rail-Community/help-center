// Live data the static help site reads in the browser, after the page loads: the status page's summary and the
// Discord online count. Each answer is kept for a short while in sessionStorage, so clicking through the site
// doesn't ask again on every page, and a page that asks twice (two widgets) only fetches once.

const inFlight = new Map<string, Promise<unknown>>()

interface Kept<T> {
  at: number
  data: T
}

function kept<T>(url: string, maxAgeMs: number): T | null {
  try {
    const entry = JSON.parse(sessionStorage.getItem(`live:${url}`) ?? 'null') as Kept<T> | null
    return entry && Date.now() - entry.at < maxAgeMs ? entry.data : null
  } catch {
    return null // storage blocked, or something unreadable in it
  }
}

function keep<T>(url: string, data: T) {
  try {
    sessionStorage.setItem(`live:${url}`, JSON.stringify({ at: Date.now(), data } satisfies Kept<T>))
  } catch {
    // Private browsing can refuse storage; the next page just asks again.
  }
}

/** The JSON at `url`, from a copy younger than `maxAgeMs` when there is one. Null when it can't be fetched. */
export function fetchJson<T>(url: string, maxAgeMs: number): Promise<T | null> {
  const fresh = kept<T>(url, maxAgeMs)
  if (fresh !== null) return Promise.resolve(fresh)
  let request = inFlight.get(url) as Promise<T | null> | undefined
  if (!request) {
    request = fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
      .catch(() => null)
      .then((data) => {
        if (data !== null) keep(url, data)
        return data
      })
      .finally(() => inFlight.delete(url))
    inFlight.set(url, request)
  }
  return request
}

/** Runs `task` now, then every `everyMs` while the page is visible, and right away when it's shown again. */
export function repeat(task: () => void, everyMs: number) {
  task()
  setInterval(() => document.visibilityState === 'visible' && task(), everyMs)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && task())
}

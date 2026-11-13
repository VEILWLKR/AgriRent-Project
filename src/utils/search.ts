const RECENT_SEARCHES_KEY = 'agrirent_recent_searches';

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(value: string): string[] {
  const query = value.trim();
  if (!query || typeof window === 'undefined') return getRecentSearches();
  const next = [query, ...getRecentSearches().filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

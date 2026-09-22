import type { ProfileLink, Work } from './types';

export const homeTitle = 'rakune | イラストレーター';
export const siteName = 'rakune';

export function workTitle(title: string) {
  return `${title} | ${siteName}`;
}

export function artworkAlt(work: Pick<Work, 'title' | 'caption'>) {
  return work.caption ? `${work.title}。${work.caption}` : work.title;
}

export function jsonForScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function pageOrigin(site: URL | undefined, current: URL, isDev: boolean) {
  return site ?? (isDev ? current : undefined);
}

export function absoluteUrl(src: string | undefined, origin: URL | undefined) {
  if (!src) return undefined;
  if (/^https?:\/\//.test(src)) return src;
  if (!origin) return undefined;
  return new URL(src, origin).href;
}

export function artistLinks(links: ProfileLink[]) {
  return links.filter((link) => isArtistProfile(link.url)).map((link) => link.url);
}

function isArtistProfile(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'x.com' || host === 'twitter.com') return path.length > 0;
    if (host === 'pixiv.net') return path.length > 0;
    return path.length > 0 || parsed.search.length > 0;
  } catch {
    return false;
  }
}

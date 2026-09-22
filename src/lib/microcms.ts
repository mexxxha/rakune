import { createClient } from 'microcms-js-sdk';
import { getLocalPortfolio } from './fallback';
import type { Portfolio, Work } from './types';

type MicrocmsImage = {
  url: string;
};

type MicrocmsWork = {
  id: string;
  title: string;
  image?: MicrocmsImage;
  caption?: string;
  year?: number;
};

function isConfigured() {
  const domain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = import.meta.env.MICROCMS_API_KEY;
  return Boolean(
    domain &&
      apiKey &&
      domain !== 'your-service-domain' &&
      apiKey !== 'your-api-key',
  );
}

function thumbUrl(url: string) {
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}w=480&fm=webp`;
}

function mapWorks(contents: MicrocmsWork[]): Work[] {
  return contents
    .filter((item) => item.image?.url)
    .map((item) => {
      const image = item.image!.url;
      return {
        id: item.id,
        title: item.title,
        image,
        thumb: thumbUrl(image),
        caption: item.caption,
        year: item.year,
      };
    });
}

export async function getPortfolio(): Promise<Portfolio> {
  const fallback = await getLocalPortfolio();

  if (!isConfigured()) {
    return fallback;
  }

  try {
    const client = createClient({
      serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
      apiKey: import.meta.env.MICROCMS_API_KEY,
    });

    const worksRes = await client.getList<MicrocmsWork>({
      endpoint: 'works',
      queries: { limit: 100, orders: '-publishedAt' },
    });

    const works = mapWorks(worksRes.contents);

    return {
      works: works.length > 0 ? works : fallback.works,
      profile: fallback.profile,
    };
  } catch {
    return fallback;
  }
}

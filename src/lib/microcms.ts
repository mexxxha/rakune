import { createClient } from 'microcms-js-sdk';
import { getLocalPortfolio } from './fallback';
import type { Portfolio, Profile, Work } from './types';

type CmsClient = ReturnType<typeof createClient>;

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

type MicrocmsProfile = {
  name?: string;
  bio?: string;
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

function filled(value: string | undefined) {
  const text = value?.trim();
  return text ? text : undefined;
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

async function fetchWorks(client: CmsClient, fallback: Work[]) {
  try {
    const worksRes = await client.getList<MicrocmsWork>({
      endpoint: 'works',
      queries: { limit: 100, orders: '-publishedAt' },
    });
    const works = mapWorks(worksRes.contents);
    return works.length > 0 ? works : fallback;
  } catch {
    return fallback;
  }
}

async function fetchProfile(client: CmsClient, fallback: Profile): Promise<Profile> {
  try {
    const content = await client.getObject<MicrocmsProfile>({
      endpoint: 'profile',
    });
    const name = filled(content.name);
    const bio = filled(content.bio);
    return {
      ...fallback,
      ...(name ? { name } : {}),
      ...(bio ? { bio } : {}),
    };
  } catch {
    return fallback;
  }
}

export async function getPortfolio(): Promise<Portfolio> {
  const fallback = await getLocalPortfolio();

  if (!isConfigured()) {
    return fallback;
  }

  const client = createClient({
    serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
    apiKey: import.meta.env.MICROCMS_API_KEY,
  });

  const [works, profile] = await Promise.all([
    fetchWorks(client, fallback.works),
    fetchProfile(client, fallback.profile),
  ]);

  return { works, profile };
}

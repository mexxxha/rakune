import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import item01 from '../assets/images/item01.jpg';
import item02 from '../assets/images/item02.jpg';
import item03 from '../assets/images/item03.jpg';
import item04 from '../assets/images/item04.jpg';
import item05 from '../assets/images/item05.jpg';
import item06 from '../assets/images/item06.jpg';
import item07 from '../assets/images/item07.jpg';
import item08 from '../assets/images/item08.jpg';
import item09 from '../assets/images/item09.jpg';
import item10 from '../assets/images/item010.jpg';
import profilePhoto from '../assets/images/profile.jpg';
import type { Portfolio, Work } from './types';

const localImages: { file: ImageMetadata; title: string; caption: string }[] = [
  {
    file: item01,
    title: '青い花の部屋',
    caption: 'スマホの明かりだけが灯る夜。散らかった部屋に、青く光る花が咲いている。',
  },
  {
    file: item02,
    title: 'スライムと自撮り',
    caption: '紫のタイルの前で、とろけるような生き物と一緒に鏡越しの自撮り。',
  },
  {
    file: item03,
    title: '根暗コラージュ',
    caption: '「根暗」「溶」「OYASUMI」。切り取られた日常が、1枚の紙の上で重なる。',
  },
  {
    file: item04,
    title: 'カフェの午後',
    caption: '窓から差す光と、ケーキの皿。考えごとをしているような、静かな時間。',
  },
  {
    file: item05,
    title: '髪の地図',
    caption: '長い髪の海に、制服の少女たちと小さな物が散らばっている。',
  },
  {
    file: item06,
    title: 'ピンクの枕',
    caption: 'ふわふわのクッションに囲まれて、三つ編みの少女が眠っている。',
  },
  {
    file: item07,
    title: '黄色い丸の上で',
    caption: '部屋の真ん中に落ちたスポットライト。散らかった床の上で、横になっている。',
  },
  {
    file: item08,
    title: '額縁の外へ',
    caption: '枠からはみ出す長い髪と、頭から生えた小さな芽。',
  },
  {
    file: item09,
    title: 'シナモンミク',
    caption: 'ふわふわの耳と、水色のリボン。パステルで描いた、甘いコラボの1枚。',
  },
  {
    file: item10,
    title: '午後のひとコマ',
    caption: '日常の端っこから切り取った、少しだけ不思議な風景。',
  },
];

export async function getLocalPortfolio(): Promise<Portfolio> {
  const works: Work[] = await Promise.all(
    localImages.map(async (item, index) => {
      const thumbImage = await getImage({ src: item.file, width: 240, format: 'webp' });
      return {
        id: `local-${String(index + 1).padStart(2, '0')}`,
        title: item.title,
        caption: item.caption,
        image: item.file.src,
        thumb: thumbImage.src,
      };
    }),
  );

  return {
    works,
    profile: {
      name: 'rakune',
      photo: profilePhoto.src,
      bio: 'イラストレーターの rakune です。人物と、身のまわりに散らばった小物を描くのが好きです。\n\n夜の部屋やカフェ、少しだけ溶けたり、はみ出したりする空気を大切にしています。書籍の挿絵、グッズ、SNS 用のイラストなど、お気軽にご相談ください。',
      links: [
        { label: 'X（更新情報）', url: 'https://x.com/' },
        { label: 'Pixiv（作品集）', url: 'https://www.pixiv.net/' },
      ],
    },
  };
}

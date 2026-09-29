import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Lang = Post['data']['lang'];

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const htmlLang = (lang: Lang) => (lang === 'zh-TW' ? 'zh-Hant-TW' : 'en');

export const langLabel = (lang: Lang) => (lang === 'zh-TW' ? '中文' : 'English');

export const tagSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

// ISO-style dates, e.g. 2025-06-30, in the author's time zone.
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
export const formatDate = (date: Date) => dateFormat.format(date);
export const yearOf = (date: Date) => formatDate(date).slice(0, 4);

// 500 characters a minute for Chinese, 212 words a minute for English.
export function readingMinutes(post: Post): number {
  const text = (post.body ?? '').replace(/```[\s\S]*?```/g, '').replace(/[#>*_`[\]()!-]/g, ' ');
  if (post.data.lang === 'zh-TW') {
    const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
    const words = text.replace(/[㐀-鿿豈-﫿]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round((cjk + words) / 500));
  }
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 212));
}

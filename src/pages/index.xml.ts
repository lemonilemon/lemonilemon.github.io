// Kept at the Hugo feed address for existing subscribers.
import type { APIContext } from 'astro';
import { feed } from '../lib/feed';

export const GET = (context: APIContext) => feed(context);

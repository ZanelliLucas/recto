import { fileURLToPath } from 'node:url';
import type { Move } from '@recto/shared';
import request from 'supertest';
import { createApp } from '../src/app';
import type { CategoryRepository, ContentCategory } from '../src/content/types';
import { GameService } from '../src/games/gameService';
import { InMemoryGameStore } from '../src/games/gameStore';

export const contentDir = fileURLToPath(new URL('../content/', import.meta.url));

export class StaticCategoryRepository implements CategoryRepository {
  constructor(private readonly categories: ContentCategory[]) {}

  async listPublished(): Promise<ContentCategory[]> {
    return this.categories.filter((category) => category.published);
  }

  async findPublished(slug: string): Promise<ContentCategory | undefined> {
    return this.categories.find((category) => category.published && category.slug === slug);
  }
}

export function makeCategory(
  slug: string,
  count: number,
  visualGroup: (index: number) => string | null = () => null,
  published = true,
): ContentCategory {
  return {
    slug,
    name: slug,
    description: '',
    order: 0,
    published,
    thumbnail: 'img0',
    images: Array.from({ length: count }, (_, i) => ({
      id: `img${i}`,
      title: `Image ${i}`,
      file: `img${i}.svg`,
      author: 'Test',
      sourceUrl: 'https://example.org/',
      licence: 'Domaine public',
      retrievedAt: '2026-09-12',
      visualGroup: visualGroup(i),
    })),
  };
}

/** Coups d'une partie parfaite : chaque paire retournée du premier coup. */
export function perfectMoves(deck: readonly string[]): Move[] {
  const positions = new Map<string, number[]>();
  deck.forEach((id, index) => positions.set(id, [...(positions.get(id) ?? []), index]));
  return [...positions.values()].map(([a, b]) => [a!, b!] as const);
}

export function setup(categories: ContentCategory[] = [makeCategory('test', 60)]) {
  let now = 1_700_000_000_000;
  const repository = new StaticCategoryRepository(categories);
  const games = new GameService(repository, new InMemoryGameStore(), { now: () => now });
  const app = createApp({ categories: repository, games, contentDir });
  return {
    app,
    agent: request.agent(app),
    advance(ms: number) {
      now += ms;
    },
  };
}

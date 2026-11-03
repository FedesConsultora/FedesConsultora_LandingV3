import { describe, expect, it } from 'vitest';
import { privateCrawlerPaths, renderRobotsTxt } from './robots-policy';

const origin = 'https://fedesconsultora.com';
const groups = (robots: string) => robots.split(/\n\s*\n/);

describe('robots.txt: indexación pública sin exponer rutas privadas a crawlers de IA', () => {
  it('bloquea todo en preview sin sitemap', () => {
    const robots = renderRobotsTxt(false, origin);
    expect(robots).toBe('User-agent: *\nDisallow: /\n');
    expect(robots).not.toContain('Sitemap:');
  });

  it('repite las exclusiones de privacidad en el grupo específico de IA', () => {
    const robots = renderRobotsTxt(true, origin);
    const sections = groups(robots);
    const generic = sections.find((group) => group.startsWith('User-agent: *\n'));
    const ai = sections.find((group) => group.includes('User-agent: OAI-SearchBot'));
    expect(generic).toBeDefined();
    expect(ai).toBeDefined();
    for (const section of [generic, ai]) {
      expect(section).toContain('Allow: /');
      for (const path of privateCrawlerPaths) {
        expect(section).toContain(`Disallow: ${path}`);
      }
    }
    for (const agent of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
      'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended']) {
      expect(ai).toContain(`User-agent: ${agent}`);
    }
    expect(robots).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
  });

  it('usa el origen configurado en el sitemap y no habilita rutas privadas por error', () => {
    const robots = renderRobotsTxt(true, 'https://staging.example.org');
    expect(robots).toContain('Sitemap: https://staging.example.org/sitemap-index.xml');
    expect(robots).not.toContain('Sitemap: https://fedesconsultora.com/');
    expect(robots.match(/Disallow: \/api\//g)).toHaveLength(2);
  });
});

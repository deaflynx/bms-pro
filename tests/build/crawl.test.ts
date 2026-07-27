import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('robots.txt', () => {
  const robots = readFileSync('dist/robots.txt', 'utf8');

  it('keeps the AI crawler allowlist from the current site', () => {
    for (const bot of [
      'GPTBot',
      'ChatGPT-User',
      'OAI-SearchBot',
      'anthropic-ai',
      'ClaudeBot',
      'claude-web',
      'PerplexityBot',
      'Perplexity-User',
      'MistralAI-User',
      'YouBot',
      'Google-Extended',
    ]) {
      expect(robots, `${bot} must stay allowed`).toContain(bot);
    }
  });

  it('still blocks AhrefsBot', () => {
    expect(robots).toMatch(/User-agent: AhrefsBot\s+Disallow: \//);
  });

  it('points at the sitemap', () => {
    expect(robots).toContain('Sitemap:');
  });

  it('drops the WordPress-only rules, which no longer exist', () => {
    for (const gone of ['/wp-admin/', 'xmlrpc.php', '*?s=', '/author/']) {
      expect(robots, `${gone} should be gone`).not.toContain(gone);
    }
  });
});

describe('sitemap', () => {
  const body = readFileSync('dist/sitemap-0.xml', 'utf8');

  it('is generated', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
  });

  it('lists every product page', () => {
    for (const s of ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro']) {
      expect(body).toContain(`/products/${s}/`);
    }
  });

  it('lists the document pages', () => {
    for (const t of ['passport', 'declaration', 'technical-conditions']) {
      expect(body).toContain(`/documents/bms-m/${t}/`);
    }
  });

  it('never lists the retired WooCommerce pages', () => {
    for (const gone of ['/cart/', '/checkout/', '/my-account/', '/shop/']) {
      expect(body, gone).not.toContain(gone);
    }
  });

  it('excludes the mockup pages, which are drafts', () => {
    expect(body).not.toContain('/mockups/');
  });
});

describe('Open Graph images', () => {
  it('gives every product its own OG image, not the logo', () => {
    for (const s of ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro']) {
      expect(existsSync(`dist/og/${s}.png`), `og/${s}.png`).toBe(true);
      const html = readFileSync(`dist/products/${s}/index.html`, 'utf8');
      expect(html).toContain(`/og/${s}.png`);
    }
  });

  it('has a default image for the other pages', () => {
    expect(existsSync('dist/og/default.png')).toBe(true);
    expect(readFileSync('dist/index.html', 'utf8')).toContain('/og/default.png');
  });

  it('makes every og:image absolute', () => {
    for (const r of ['', 'products/bms-m', 'faq', 'contacts']) {
      const html = readFileSync(`dist/${r ? `${r}/` : ''}index.html`, 'utf8');
      const img = html.match(/property="og:image" content="([^"]+)"/)![1];
      expect(img, `/${r}/`).toMatch(/^https:\/\//);
    }
  });
});

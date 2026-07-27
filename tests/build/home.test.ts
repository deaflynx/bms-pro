import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('dist/index.html', 'utf8');
/** Scripts contain selector strings that would inflate markup counts. */
const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');

describe('homepage', () => {
  it('leads with the frequency range in the h1', () => {
    expect(markup).toMatch(/<h1[^>]*>[\s\S]*20–40 Гц[\s\S]*<\/h1>/);
  });

  it('leads with the device photo, not the interactive panel', () => {
    expect(markup).toContain('/assets/img/bms-m-front.webp');
    expect(markup).not.toMatch(/class="instrument/);
  });

  it('defines biomechanical stimulation above the lineup', () => {
    expect(markup).toContain('Що таке біомеханічна стимуляція');
    expect(markup).toContain('уздовж мʼязових волокон');
    expect(markup.indexOf('Що таке біомеханічна стимуляція')).toBeLessThan(
      markup.indexOf('id="lineup"'),
    );
  });

  it('renders all four product cards linking to their pages', () => {
    for (const [name, slug] of [
      ['BMS m', 'bms-m'],
      ['BMS pro', 'bms-pro'],
      ['BMS Nexus', 'bms-nexus'],
      ['BMS Quadro', 'bms-quadro'],
    ]) {
      expect(markup, name).toContain(name);
      expect(markup, slug).toContain(`/bms-pro/products/${slug}/`);
    }
  });

  it('includes the comparison matrix', () => {
    expect(markup).toContain('Порівняння моделей');
  });

  it('shows every price, labelled approximate', () => {
    for (const p of ['24 000', '32 000', '48 000', '83 000']) {
      expect(markup.replace(/ /g, ' '), p).toContain(p);
    }
    expect(markup).toContain('орієнтовна ціна');
  });

  it('includes the three principle diagrams, each with a described label', () => {
    // Matched by the accessible label, not the class — `class="dia` also hits
    // the instrument's .dial and .dial-scale.
    const labels = [...markup.matchAll(/role="img" aria-label="(Схема:[^"]+)"/g)].map((m) => m[1]);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
  });

  it('never ships an iframe', () => {
    expect(html).not.toContain('<iframe');
  });

  it('offers the video as a click-to-load facade', () => {
    expect(markup).toContain('class="facade');
    expect(markup).toContain('data-yt=');
  });

  it('carries the medical-device disclaimer', () => {
    expect(markup).toContain('не є медичними виробами');
  });

  it('makes the primary phone dialable', () => {
    expect(markup).toContain('tel:+380505460077');
  });

  it('names the manufacturer and the registered declaration', () => {
    expect(markup).toContain('ТОВ «УКРСИСТЕМС»');
    expect(markup).toContain('UA.TR.D.00159-25');
  });

  it('emits WebSite and ItemList schema alongside Organization', () => {
    const types = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1])['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).toContain('ItemList');
  });
});

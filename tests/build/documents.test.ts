import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TYPES = ['passport', 'declaration', 'technical-conditions'] as const;

function page(type: string): string {
  return readFileSync(`dist/documents/bms-m/${type}/index.html`, 'utf8');
}

describe('document pages', () => {
  it('emits a page per document type for BMS m', () => {
    for (const t of TYPES) {
      expect(existsSync(`dist/documents/bms-m/${t}/index.html`), t).toBe(true);
    }
  });

  it('transcribes the passport as HTML, not just a PDF link', () => {
    const html = page('passport');
    // the passport has 10 numbered sections
    expect(html.match(/<h2[^>]*>/g)!.length).toBeGreaterThanOrEqual(10);
    expect(html).toContain('Гарантійний термін');
    expect(html).toContain('Експлуатаційні обмеження');
    // its spec table must be real markup, so it is indexable
    expect(html).toContain('<table');
    expect(html).toContain('Кут повороту вібраційної головки');
  });

  it('transcribes the technical conditions with all eight sections', () => {
    const html = page('technical-conditions');
    expect(html.match(/<h2[^>]*>/g)!.length).toBeGreaterThanOrEqual(8);
    expect(html).toContain('ТУ У 27.9-2294811615-001:2025');
    expect(html).toContain('ДСТУ EN 60335-1');
    expect(html).toContain('84,0–106,7 кПа');
  });

  it('states the declaration number and registrant as text, not only in the scan', () => {
    const html = page('declaration');
    expect(html).toContain('UA.TR.D.00159-25');
    expect(html).toContain('ТОВ «УКРСИСТЕМС»');
    expect(html).toContain('24 липня 2025');
  });

  it('offers the PDF where one exists', () => {
    expect(page('passport')).toContain('/assets/docs/passport-bms-m.pdf');
    expect(page('technical-conditions')).toContain('/assets/docs/tu-bms-m.pdf');
    // the declaration is a scan image, not a PDF
    expect(page('declaration')).toContain('/assets/img/declar.png');
  });

  it('carries DigitalDocument and BreadcrumbList schema', () => {
    for (const t of TYPES) {
      const blocks = [
        ...page(t).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ].map((m) => JSON.parse(m[1]));
      expect(blocks.some((b) => b['@type'] === 'DigitalDocument'), t).toBe(true);
      expect(blocks.some((b) => b['@type'] === 'BreadcrumbList'), t).toBe(true);
    }
  });

  it('builds a table of contents whose every link resolves to a real heading', () => {
    const html = page('passport');
    expect(html).toContain('doc-toc');

    const toc = html.match(/<nav class="doc-toc[\s\S]*?<\/nav>/)![0];
    const links = [...toc.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const ids = new Set([...html.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((m) => m[1]));

    expect(links.length).toBe(10); // the passport has 10 numbered sections
    for (const l of links) expect(ids, `#${l} has no matching h2`).toContain(l);
  });

  it('offers the PDF without a print button — the print stylesheet covers Ctrl+P', () => {
    expect(page('passport')).toContain('Завантажити PDF');
    expect(page('passport')).not.toContain('Друкувати');
  });

  it('carries the disclaimer', () => {
    for (const t of TYPES) expect(page(t), t).toContain('не є медичними виробами');
  });
});

describe('documents hub', () => {
  const hub = readFileSync('dist/documents/index.html', 'utf8');

  it('links BMS m to its three documents', () => {
    for (const t of TYPES) expect(hub).toContain(`/bms-pro/documents/bms-m/${t}/`);
  });

  it('links BMS pro to the shared BMS (m, Pro) documents and Quadro to its passport', () => {
    for (const t of TYPES) expect(hub).toContain(`/bms-pro/documents/bms-pro/${t}/`);
    expect(hub).toContain('/bms-pro/documents/bms-quadro/passport/');
  });

  it('marks the missing documents as pending rather than linking to empty pages', () => {
    expect(hub).toContain('готується');
    for (const slug of ['bms-nexus', 'bms-magnus']) {
      expect(hub, slug).not.toContain(`/bms-pro/documents/${slug}/`);
    }
    for (const t of ['declaration', 'technical-conditions']) {
      expect(hub, t).not.toContain(`/bms-pro/documents/bms-quadro/${t}/`);
    }
  });

  it('lists all five models in the matrix', () => {
    for (const n of ['BMS m', 'BMS pro', 'BMS Nexus', 'BMS Quadro', 'BMS Magnus']) {
      expect(hub).toContain(n);
    }
  });
});

describe('BMS pro documents', () => {
  it('reuse the BMS m documents under the pro model, naming pro in the title', () => {
    const designation = {
      passport: 'ТУ У 27.9-2294811615-001:2025',
      declaration: 'UA.TR.D.00159-25',
      'technical-conditions': 'ТУ У 27.9-2294811615-001:2025',
    };
    for (const t of TYPES) {
      const html = readFileSync(`dist/documents/bms-pro/${t}/index.html`, 'utf8');
      expect(html, t).toMatch(/<title>Паспорт приладу BMS pro|<title>Декларація відповідності BMS pro|<title>Технічні умови BMS pro/);
      expect(html, t).toContain(designation[t]);
    }
  });

  it('point their canonical at the BMS m page, so the copies do not compete in search', () => {
    for (const t of TYPES) {
      const html = readFileSync(`dist/documents/bms-pro/${t}/index.html`, 'utf8');
      expect(html.match(/<link rel="canonical" href="([^"]+)"/)![1], t).toContain(
        `/documents/bms-m/${t}/`,
      );
    }
  });
});

describe('BMS Quadro passport', () => {
  const html = readFileSync('dist/documents/bms-quadro/passport/index.html', 'utf8');

  it('transcribes the 2021 passport with its own technical data', () => {
    expect(html).toMatch(/<title>Паспорт приладу BMS Quadro/);
    expect(html).toContain('«QUADRO»');
    expect(html).toContain('20–35 Гц');
    expect(html).toContain('15 ВА');
    expect(html).toContain('до 30 хв, пауза 15 хв');
    expect(html.match(/<h2[^>]*>/g)!.length).toBeGreaterThanOrEqual(9);
  });

  it('lists the contraindications, since the passport requires supervision', () => {
    expect(html).toContain('Протипоказання');
    expect(html).toContain('Гострі гарячкові стани');
  });

  it('offers no PDF, because the source is a Word file', () => {
    expect(html).not.toContain('Завантажити PDF');
    expect(html).not.toContain('PDF для завантаження');
  });
});

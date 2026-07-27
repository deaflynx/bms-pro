import { describe, expect, it } from 'vitest';
import { FREQ_MAX, FREQ_MIN, instrumentFor } from '../../src/lib/instrument';

describe('instrumentFor', () => {
  it('gives BMS m a single analog channel with no digital readout', () => {
    expect(instrumentFor('analog')).toEqual({
      channels: 1,
      digital: false,
      label: 'Аналоговий регулятор',
    });
  });

  it('gives BMS pro one digital channel', () => {
    expect(instrumentFor('digital')).toEqual({
      channels: 1,
      digital: true,
      label: 'Цифровий регулятор',
    });
  });

  it('gives BMS Nexus two independent digital channels', () => {
    const cfg = instrumentFor('dual-digital');
    expect(cfg.channels).toBe(2);
    expect(cfg.digital).toBe(true);
  });

  it('treats the roller unit as one digital channel', () => {
    expect(instrumentFor('roller').channels).toBe(1);
    expect(instrumentFor('roller').digital).toBe(true);
  });

  it('labels every indicator type distinctly, so the matrix rows differ', () => {
    const labels = (['analog', 'digital', 'dual-digital', 'roller'] as const).map(
      (i) => instrumentFor(i).label,
    );
    expect(new Set(labels).size).toBe(4);
  });

  it('exposes the documented 20-40 Hz working range', () => {
    expect(FREQ_MIN).toBe(20);
    expect(FREQ_MAX).toBe(40);
  });
});

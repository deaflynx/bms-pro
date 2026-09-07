export type Indicator = 'analog' | 'digital' | 'dual-digital' | 'roller';

export interface InstrumentConfig {
  /** How many independently adjustable channels the panel exposes. */
  channels: number;
  /** Whether the panel has a numeric readout. BMS m does not. */
  digital: boolean;
  label: string;
}

const CONFIG: Record<Indicator, InstrumentConfig> = {
  analog: { channels: 1, digital: false, label: 'Аналоговий регулятор' },
  digital: { channels: 1, digital: true, label: 'Цифровий регулятор' },
  'dual-digital': { channels: 2, digital: true, label: 'Два цифрові канали' },
  roller: { channels: 1, digital: true, label: 'Роликовий вузол' },
};

export function instrumentFor(indicator: Indicator): InstrumentConfig {
  return CONFIG[indicator];
}

/** Documented working range of the BMS platform, per the passport. */
export const FREQ_MIN = 20;
export const FREQ_MAX = 40;

/** The range a model's own spec sheet states, falling back to the platform range. */
export function frequencyLabel(specs: Record<string, string>): string {
  const key = Object.keys(specs).find((k) => k.startsWith('Частота коливань'));
  return key ? specs[key] : `${FREQ_MIN}–${FREQ_MAX} Гц`;
}

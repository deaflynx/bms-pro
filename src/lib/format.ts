/** U+202F narrow no-break space — the Ukrainian thousands separator, and it never wraps. */
const THIN_NBSP = ' ';
/** U+00A0 — a normal-width space before ₴; U+202F leaves the sign looking cramped. */
const NBSP = ' ';

export function formatPrice(uah: number): string {
  const grouped = String(uah).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
  return `${grouped}${NBSP}₴`;
}

export const PRICE_NOTE = 'орієнтовна ціна';

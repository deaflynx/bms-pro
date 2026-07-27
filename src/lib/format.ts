/** U+202F narrow no-break space — keeps "24 000 ₴" from wrapping mid-number. */
const THIN_NBSP = ' ';

export function formatPrice(uah: number): string {
  const grouped = String(uah).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
  return `${grouped}${THIN_NBSP}₴`;
}

export const PRICE_NOTE = 'орієнтовна ціна';

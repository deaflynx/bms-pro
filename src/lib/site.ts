/**
 * Joins a base path and an internal path into exactly one slash between them.
 * Kept pure and separate from `url()` so it can be tested against both the
 * GitHub Pages base (`/bms-pro/`) and the production root (`/`).
 */
export function joinBase(base: string, path: string): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  return `${b}${path.replace(/^\//, '')}`;
}

/** Prefixes an internal path with the configured base. Every internal link must use this. */
export function url(path: string): string {
  return joinBase(import.meta.env.BASE_URL, path);
}

export const SITE = {
  name: 'BMS Pro',
  legalName: 'Системи біомеханічної стимуляції',
  tagline: 'Системи біомеханічної стимуляції',
  phonePrimary: '+380505460077',
  phonePrimaryDisplay: '+380 50 546 00 77',
  phoneSecondary: '+380685460077',
  phoneSecondaryDisplay: '+380 68 546 00 77',
  email: 'info@bms-pro.com.ua',
  address: {
    street: 'вул. Бориспільська 11а, оф. 206',
    city: 'Київ',
    postalCode: '02099',
    country: 'UA',
  },
  declaration: 'UA.TR.D.00159-25',
  declarationDate: '2025-07-24',
  declarationDateDisplay: '24 липня 2025',
  tu: 'ТУ У 27.9-2294811615-001:2025',
  disclaimer:
    'Прилади BMS не є медичними виробами. Вони не призначені для діагностики, ' +
    'лікування або профілактики захворювань і не замінюють консультацію лікаря ' +
    'чи призначене лікування. Перед застосуванням ознайомтеся з інструкцією користувача.',
} as const;

export const NAV = [
  { href: '/products/', label: 'Прилади' },
  { href: '/how-it-works/', label: 'Як це працює' },
  { href: '/documents/', label: 'Технічна документація' },
  { href: '/about/', label: 'Про нас' },
  { href: '/contacts/', label: 'Контакти' },
] as const;

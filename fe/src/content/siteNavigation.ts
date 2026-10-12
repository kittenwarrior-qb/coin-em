/** Current registered public pages only; legacy/pilot pages are not implicitly published. */
export const PUBLIC_SITE_PAGES = [
  { id: 'about', label: 'Giới thiệu', href: '/about' },
  { id: 'cards', label: 'Bộ thẻ', href: '/about/cards' },
  { id: 'guide', label: 'Hướng dẫn', href: '/about/story' },
] as const

export function publicSitePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

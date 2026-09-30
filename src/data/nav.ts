// Main menu. Set hidden: false to show a link. Add children to give a link its own submenu
// (Dinnerware, Body …); the header picks them up automatically. On desktop each child is a landscape (4:3) photo tile;
// the photo is public/images/nav/<image>.(jpg|png|webp), 4:3, and a limestone block until it exists.
// In the mobile drawer the children are plain text rows.
export type NavLink = { label: string; href: string; hidden?: boolean; children?: NavChild[] };
export type NavChild = { label: string; href: string; image?: string };

export const nav: NavLink[] = [
  {
    label: 'Scents', href: '/scents',
    children: [
      { label: 'Shop All', href: '/scents', image: 'scents-all' },
      { label: 'Brands', href: '/scents/brands', image: 'scents-brands' },
      { label: 'Notes', href: '/scents/notes', image: 'scents-notes' },
    ],
  },
  {
    label: 'Dinnerware', href: '/dinnerware',
    children: [
      { label: 'Shop All', href: '/dinnerware', image: 'dinnerware-all' },
      { label: 'Categories', href: '/dinnerware/categories', image: 'dinnerware-categories' },
      { label: 'Brands', href: '/dinnerware/brands', image: 'dinnerware-brands' },
    ],
  },
  { label: 'Journal', href: '/journal', hidden: true },
  { label: 'About', href: '/about' },
].filter((l) => !l.hidden);

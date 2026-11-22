// Browser half of Chess Insight: page at /chess + nav.item. React and @timon/ui are provided by the host.
import React from 'react';
import { NavLink } from '@timon/ui';
import { createPage } from './app.js';
import { t } from './i18n.js';

const h = React.createElement;

// 16 px line picto painted with a CSS mask so it follows currentColor (active / hover states).
const PICTO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='6.5' r='3.2'/%3E%3Cpath d='M9 11.5h6M10 11.5c0 3-2.2 4-2.2 7.5h8.4c0-3.5-2.2-4.5-2.2-7.5M6.5 21h11'/%3E%3C/svg%3E\")";
export function NavIcon({ className }) {
  return h('span', {
    className, 'aria-hidden': true,
    style: { display: 'inline-block', width: 16, height: 16, flex: 'none', backgroundColor: 'currentColor', WebkitMaskImage: PICTO, maskImage: PICTO, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain' },
  });
}

export function apply(ctx) {
  const disposePage = ctx.slots.register({ slot: 'page', key: '/chess' }, createPage(ctx));
  const disposeNav = ctx.slots.register({ slot: 'nav.item', key: '/chess' }, () => h(NavLink, { href: '/chess', label: t('nav.title'), icon: NavIcon }));
  return () => { disposeNav(); disposePage(); };
}

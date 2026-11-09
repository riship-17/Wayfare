// Renders the Phosphor icons used in the video to SVG strings (same icon set as the app).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as P from '@phosphor-icons/react';
import { writeFileSync } from 'node:fs';
const names = ['House', 'FileText', 'CurrencyCircleDollar', 'Info', 'UsersThree', 'ShieldCheck', 'ListChecks', 'Bank', 'Train', 'GraduationCap', 'Lightning', 'AirplaneLanding', 'AirplaneTilt', 'WifiSlash', 'Lock', 'LockOpen', 'CheckCircle', 'ShareNetwork', 'Wallet', 'MapPin', 'ChartLineUp', 'Path', 'IdentificationCard', 'Buildings', 'Laptop', 'Lifebuoy', 'Lightbulb', 'Heart'];
const out = {};
for (const n of names) out[n] = renderToStaticMarkup(createElement(P[n], { size: 64, weight: 'regular', color: 'currentColor' }));
for (const n of ['Lightning', 'CheckCircle', 'Lock', 'ShieldCheck', 'AirplaneTilt', 'WifiSlash', 'ArrowRight']) out[n + 'Bold'] = renderToStaticMarkup(createElement(P[n], { size: 64, weight: 'bold', color: 'currentColor' }));
writeFileSync(new URL('./comp/icons.js', import.meta.url), 'window.ICONS = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length, 'icons');

// Original vector illustrations for local demonstration, not field evidence.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backend/package.json'));
const sharp = require('sharp');
const out = path.join(root,'backend/public/demo');
await mkdir(out,{recursive:true});
const base = (scene,accent='#0d9488') => `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e1f2ef"/><stop offset="1" stop-color="#f8f7ef"/></linearGradient></defs><rect width="960" height="600" fill="url(#sky)"/><circle cx="798" cy="115" r="48" fill="#efd695"/><path d="M0 295H960V430H0Z" fill="#cce0d9"/><path d="M0 430L960 325V600H0Z" fill="#314b57"/><path d="M0 500L960 390" stroke="#f4de9b" stroke-width="8" stroke-dasharray="75 48"/><g fill="#b2c9c4"><path d="M65 150H175V350H65Z"/><path d="M190 110H300V335H190Z"/><path d="M685 170H785V320H685Z"/><path d="M820 205H950V305H820Z"/></g><g fill="#7eaba6">${[90,130,215,255,710,750,845,895].map(x=>`<path d="M${x} 220h18v28h-18zM${x} 270h18v28h-18z"/>`).join('')}</g><path d="M325 341V240M602 312V210" stroke="#385a52" stroke-width="12"/><g fill="${accent}"><circle cx="325" cy="220" r="54"/><circle cx="300" cy="244" r="34"/><circle cx="350" cy="245" r="38"/><circle cx="602" cy="194" r="55"/><circle cx="575" cy="223" r="38"/><circle cx="630" cy="218" r="38"/></g>${scene}<rect x="26" y="24" width="146" height="34" rx="17" fill="white" fill-opacity=".9"/><text x="99" y="46" text-anchor="middle" fill="#345758" font-family="Arial,sans-serif" font-size="14">ẢNH MINH HỌA</text></svg>`;
const scenes = {
 road: '<ellipse cx="485" cy="489" rx="146" ry="49" fill="#263b45"/><path d="M345 481l48-32 60 18 60-31 65 30 48 14-48 32-64-9-48 17-72-21z" fill="#172d37"/><path d="M389 452l-28-42 16-22 36 60M570 458l39-43 24 7-38 45" fill="none" stroke="#829b9a" stroke-width="6"/><path d="M287 438l27-68 28 68zM672 403l27-68 28 68z" fill="#e79749"/><path d="M300 408h28M685 372h28" stroke="#fff5db" stroke-width="12"/>',
 light: '<path d="M470 410V110Q470 80 510 80H553" fill="none" stroke="#36545c" stroke-width="15"/><path d="M535 76h64v24h-64z" fill="#49656d"/><path d="M547 101l-58 150h173L590 101" fill="#ebd179" opacity=".14"/><path d="M551 124l28 31-28 31 28 31" fill="none" stroke="#d98c50" stroke-width="9"/><path d="M418 409h110" stroke="#567876" stroke-width="12"/>',
 waste: '<path d="M385 360h117l-12 133H398z" fill="#537e6d"/><path d="M370 353h147v18H370zM414 333h58v20h-58z" fill="#345a4e"/><g fill="#d1ac77"><path d="M531 448l34-59 54 58z"/><path d="M577 479l38-65 52 62z"/></g><path d="M511 490l23-40 34 24-5 23z" fill="#eee6d4"/><path d="M614 482l31-28 35 16-8 21z" fill="#a0c8c4"/><circle cx="420" cy="493" r="11" fill="#23453e"/><circle cx="475" cy="493" r="11" fill="#23453e"/>',
 flood: '<path d="M180 449Q280 417 390 454T620 434T880 439V600H180Z" fill="#75b9ca" opacity=".88"/><g stroke="#c7e9e9" stroke-width="6" fill="none"><path d="M260 483q60-25 125-5M490 526q75-25 150-5M710 472q58-20 100-2M360 567q58-20 100-2"/></g><path d="M382 425l63-115 65 115z" fill="#f3c976" stroke="#876438" stroke-width="7"/><path d="M443 345v42" stroke="#765339" stroke-width="8"/><circle cx="443" cy="401" r="5" fill="#765339"/>',
 completed: '<path d="M290 461l375-41 47 85-422 46z" fill="#537981"/><path d="M332 495l279-31" stroke="#f8e9b8" stroke-width="8" stroke-dasharray="50 28"/><circle cx="477" cy="288" r="88" fill="#0d9488"/><path d="M433 287l30 33 62-70" fill="none" stroke="#f4fbf5" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>'
};
for (const [name,scene] of Object.entries(scenes)) {
  const svg=base(scene,name==='light'?'#527a74':'#408c7b');
  await writeFile(path.join(out,`${name}.svg`),svg);
  await sharp(Buffer.from(svg)).jpeg({quality:90}).toFile(path.join(out,`${name}.jpg`));
}
console.log('Đã tạo 5 hình minh họa gốc cho dữ liệu mẫu.');

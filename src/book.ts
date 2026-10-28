import type { Project } from './projects';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const book = $('book'), title = $('btitle'), desc = $('bdesc'), media = $('bmedia'), link = $<HTMLAnchorElement>('bopen');

export const bookOpen = () => book.style.display === 'flex';

export function openBook(p: Project) {
  title.textContent = p.title;
  desc.replaceChildren(...[p.description].flat().join('\n\n').split(/\n\s*\n/)
    .map(t => Object.assign(document.createElement('p'), { textContent: t })));
  desc.scrollTop = 0;
  link.href = p.url;
  if (p.video) {
    const v = Object.assign(document.createElement('video'), { src: p.video, autoplay: true, loop: true, muted: true, controls: true, playsInline: true });
    media.replaceChildren(v, Object.assign(document.createElement('figcaption'), { textContent: '~ see it in action ~' }));
  } else {
    media.replaceChildren(Object.assign(document.createElement('div'), { className: 'none', textContent: 'No demo reel yet. Open the page to see it live!' }));
  }
  book.style.display = 'flex';
}

export function closeBook() { book.style.display = 'none'; media.replaceChildren(); }

/** Keyboard while the book is open: E / Esc close, W/S or arrows scroll the description. */
export function bookKey(e: KeyboardEvent) {
  if ((e.code === 'KeyE' && !e.repeat) || e.code === 'Escape') closeBook();
  else if (['KeyW', 'ArrowUp'].includes(e.code)) desc.scrollBy({ top: -64, behavior: 'smooth' });
  else if (['KeyS', 'ArrowDown'].includes(e.code)) desc.scrollBy({ top: 64, behavior: 'smooth' });
  else return;
  e.preventDefault();
}

$('bclose').onclick = closeBook;
book.onclick = e => { if (e.target === book) closeBook(); };

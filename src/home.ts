import './home.css';
import { fetchProjects, type Project } from './projects';

/** Tiny DOM helper: el('a', { href }, 'text', child) */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
}

const list = document.getElementById('projects')!;
fetchProjects().then(projects => {
  list.replaceChildren();
  projects.forEach(render);
  if (!projects.length) list.append(el('li', { className: 'empty' }, 'Nothing here yet. Check back soon.'));
});

function render(p: Project, i: number) {
  const [first, ...rest] = [p.description].flat().join('\n\n').split(/\n\s*\n/);
  const para = (t: string) => el('p', {}, t);
  const out = { href: p.url, target: '_blank', rel: 'noopener' };
  // videos don't autoplay: first frame as a still, play while hovering the project (tap to toggle on touch)
  const video = p.video ? el('video', { src: p.video + '#t=0.1', preload: 'metadata', loop: true, muted: true, playsInline: true }) : null;
  const li = el('li', {},
    el('span', { className: 'num' }, String(i + 1).padStart(2, '0')),
    el('div', {},
      el('h3', {}, el('a', out, p.title)),
      el('div', { className: 'desc' }, para(first), ...(rest.length ? [el('details', {}, el('summary', {}, 'more'), ...rest.map(para))] : [])),
      ...(video ? [el('div', { className: 'media' }, video, el('span', { className: 'hint' }))] : []),
      el('div', { className: 'links' },
        el('a', out, 'visit ↗'),
        ...(p.repo && p.repo !== p.url ? [el('a', { href: p.repo, target: '_blank', rel: 'noopener' }, 'code ↗')] : [])),
    ),
  );
  if (video) {
    li.onmouseenter = () => void video.play().catch(() => {});
    li.onmouseleave = () => video.pause();
    video.onclick = () => openLightbox(p.video!, video);
    video.onplay = video.onpause = () => li.classList.toggle('playing', !video.paused);
  }
  list.append(li);
}

// click a preview -> big video in a native <dialog>; Esc, ×, or a click on the backdrop closes it
const lightbox = document.getElementById('lightbox') as HTMLDialogElement;
const big = lightbox.querySelector('video')!;
function openLightbox(src: string, from: HTMLVideoElement) {
  from.pause();
  big.src = src;
  big.currentTime = from.currentTime;
  lightbox.showModal();
  lightbox.focus(); // instead of the auto-focused × (which shows a focus ring); Esc still closes
  big.play().catch(() => {});
}
lightbox.onclick = e => { if (e.target === lightbox) lightbox.close(); };
document.getElementById('lbclose')!.onclick = () => lightbox.close();
lightbox.onclose = () => { big.pause(); big.removeAttribute('src'); big.load(); };

document.getElementById('year')!.textContent = String(new Date().getFullYear());

// typewriter heading
const name = 'Mishal', type = document.getElementById('type')!;
if (matchMedia('(prefers-reduced-motion: reduce)').matches) type.textContent = name;
else [...name].forEach((c, i) => setTimeout(() => (type.textContent += c), 300 + i * 110));

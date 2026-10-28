// Projects = my public GitHub repos. Fetched once server-side and kept for the life of the process,
// so visitors never hit GitHub's rate limit. New repos show up after a restart or redeploy.
import { Readable, pipeline } from 'node:stream';

const USER = process.env.GITHUB_USER || 'zayn0001';
// the profile README repo and this site's own repo aren't projects
const SKIP = new Set([USER, process.env.PORTFOLIO_REPO || 'personal-portfolio'].map(s => s.toLowerCase()));
const RETRY = 60_000; // after a failed fetch, wait this long before asking GitHub again

let cache = null; // { projects, videos } after the first successful fetch
let loading = null, failedAt = 0;

const gh = path => fetch('https://api.github.com' + path, {
  headers: {
    accept: 'application/vnd.github+json',
    'user-agent': 'personal-portfolio',
    ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  },
}).then(r => (r.ok ? r.json() : Promise.reject(new Error(`GitHub ${r.status} on ${path}`))));

/**
 * One repo (+ its root file listing) -> { project, video }.
 * Description "Name — text" (em/en dash or |) sets the title; otherwise the repo name is prettified.
 * A demo.mp4/webm in the repo root (or any mp4/webm there) becomes the preview video.
 */
export function toProject(repo, files) {
  const m = /^(.{2,80}?)\s+[—–|]\s+(.+)$/s.exec(repo.description ?? '');
  const isVid = f => f.type === 'file' && /\.(mp4|webm)$/i.test(f.name);
  const vid = files.find(f => isVid(f) && /^demo\./i.test(f.name)) ?? files.find(isVid);
  return {
    project: {
      title: m ? m[1].trim() : repo.name.split(/[-_]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      description: (m ? m[2] : repo.description ?? '').trim(),
      url: repo.homepage || repo.html_url,
      repo: repo.html_url,
      ...(vid && { video: `/api/video/${repo.name}` }),
    },
    video: vid?.download_url,
  };
}

async function load() {
  const repos = (await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`))
    .filter(r => !r.fork && !r.archived && !r.private && !SKIP.has(r.name.toLowerCase()));
  const rows = await Promise.all(repos.map(async r => [r.name, toProject(r, await gh(`/repos/${r.full_name}/contents/`).catch(() => []))]));
  return {
    projects: rows.map(([, x]) => x.project),
    videos: new Map(rows.filter(([, x]) => x.video).map(([name, x]) => [name, x.video])),
  };
}

/** Fetches from GitHub on the first call only; every later call is served from memory. */
export async function getProjects() {
  if (!cache && Date.now() - failedAt > RETRY) {
    loading ??= load()
      .then(c => { cache = c; }, e => { console.error(e.message); failedAt = Date.now(); })
      .finally(() => { loading = null; });
  }
  if (loading) await loading;
  return cache?.projects ?? [];
}

/** /api/projects and /api/video/<repo>. Returns true if it handled the request. Shared by `npm start` and `npm run dev`. */
export async function handleApi(req, res) {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/projects') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }).end(JSON.stringify(await getProjects()));
    return true;
  }
  const m = /^\/api\/video\/([\w.-]+)$/.exec(path);
  if (!m) return false;
  // proxy the raw GitHub file: raw.githubusercontent serves octet-stream + nosniff, which Safari won't play.
  // Only repos already in the list are proxied, so this can't be used to fetch arbitrary URLs.
  await getProjects();
  const src = cache?.videos.get(m[1]);
  if (!src) { res.writeHead(404).end('not found'); return true; }
  const up = await fetch(src, { headers: req.headers.range ? { range: req.headers.range } : {} });
  const headers = { 'content-type': /\.webm$/i.test(src) ? 'video/webm' : 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600' };
  for (const h of ['content-length', 'content-range']) { const v = up.headers.get(h); if (v) headers[h] = v; }
  res.writeHead(up.status, headers);
  if (up.body) pipeline(Readable.fromWeb(up.body), res, () => {}); // pipeline tears down the upstream if the viewer leaves
  else res.end();
  return true;
}

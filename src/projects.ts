export interface Project {
  title: string;
  /** A string, or an array of paragraphs. */
  description: string | string[];
  /** Live site (the repo's "Website" field), or the repo itself if none is set. */
  url: string;
  /** GitHub repo page. */
  repo?: string;
  /** Demo clip, proxied from a demo.mp4/webm in the repo root. */
  video?: string;
}

/** My public GitHub repos, via the server's cached /api/projects (see server/projects.js). */
export const fetchProjects = (): Promise<Project[]> =>
  fetch('/api/projects').then(r => (r.ok ? r.json() : []), () => []);

export interface Project {
  title: string;
  /** Shown in the book. A string, or an array of paragraphs for longer write-ups. */
  description: string | string[];
  /** Demo clip for the book's right page, e.g. "/projects/my-app/demo.mp4" (file in public/). */
  video?: string;
  url: string;
  /** Lower comes first (leftmost building). */
  order?: number;
  /** Roof colour, e.g. "#4f7fc0". Default: picked from the title. */
  roof?: string;
}

// Every content/projects/*.json becomes a building. No code changes needed to add one.
const files = import.meta.glob<Project>('../content/projects/*.json', { eager: true, import: 'default' });

export const projects: Project[] = Object.values(files).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

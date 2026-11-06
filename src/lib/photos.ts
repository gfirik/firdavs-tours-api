import type { ImageMetadata } from 'astro';
import credits from '../data/photo-credits.json';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

const ALT: Record<string, string> = {
  'registan-night': 'The three madrasas of the Registan in Samarkand, lit gold against a deep blue evening sky',
  'registan-day': 'Registan square in Samarkand by day, with tiled portals and turquoise domes',
  'shah-i-zinda': 'Turquoise-tiled portals of the Shakhi-Zinda necropolis in Samarkand',
  'po-i-kalyan': 'The Kalyan Minaret and mosque courtyard in Bukhara under summer clouds',
  'bukhara-courtyard': 'Arcaded courtyard of the Kalyan Mosque in Bukhara with the minaret beyond',
  'khiva-kunya-ark': 'Tiled towers of the Kunya-Ark citadel inside the walls of Ichan-Kala, Khiva',
  'khiva-tosh-gate': 'Mud-brick towers of the Tosh Gate in the walls of Khiva',
  'tashkent-metro': 'Marble columns and chandeliers in a Tashkent metro station',
  'kokand-palace': 'Tiled entrance portal of the Khudayar Khan palace in Kokand',
  'kokand-tower': 'A tiled corner tower of the Khudayar Khan palace in Kokand',
  'yurt-camp': 'A yurt camp among the dunes of the Kyzylkum desert',
  'nuratau-aydarkul': 'Spring flowers on the Nuratau foothills with Lake Aydarkul on the horizon',
  'moynaq-ship': 'A rusting fishing boat stranded on the dry former seabed of the Aral Sea at Muynak',
  chimgan: 'Greater Chimgan mountain above green slopes near Tashkent',
};

export type PhotoSlug = keyof typeof ALT;

export function photo(slug: string): { src: ImageMetadata; alt: string } {
  const f = files[`../assets/photos/${slug}.jpg`];
  if (!f || !ALT[slug]) throw new Error(`Missing photo ${slug}`);
  return { src: f.default, alt: ALT[slug] };
}

export const photoCredits = credits as { slug: string; title: string; author: string; license: string; licenseUrl: string | null; source: string }[];

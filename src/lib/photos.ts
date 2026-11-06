import type { ImageMetadata } from 'astro';
import credits from '../data/photo-credits.json';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

const ALT: Record<string, string> = {
  'kalon-minaret-night': 'The Kalon Minaret in Bukhara, floodlit gold against the night sky',
  'registan-night': 'The three madrasas of the Registan in Samarkand, lit gold against a deep blue evening sky',
  'registan-evening': 'Registan square in Samarkand at dusk, its madrasa portals lit against a blue sky',
  'shah-i-zinda': 'Turquoise-tiled portals of the Shakhi-Zinda necropolis in Samarkand',
  'khiva-kalta-minor-night': 'The tiled Kalta Minor minaret in Khiva, lit at night',
  'khiva-aminkhan-night': 'The Muhammad Amin Khan madrasa and Kalta Minor in Khiva, illuminated at night',
  'bukhara-ark-sunset': 'Bukhara old city at sunset, with the Kalon Minaret and turquoise domes beyond the Ark walls',
  'bukhara-mir-i-arab-sunset': 'Tiled portal and dome of the Mir-i-Arab madrasa in Bukhara in warm sunset light',
  'tashkent-hazrati-imam': 'Turquoise dome and minaret of the Hazrati Imam complex in Tashkent under a deep blue sky',
  'kokand-palace': 'Tiled entrance portal of the Khudayar Khan palace in Kokand',
  'rishtan-plate': 'A hand-painted blue Rishtan ceramic plate from the Fergana Valley',
  'yurts-night': 'Three yurts under a moonlit sky in the Kyzylkum desert',
  'aydarkul-sunset': 'Sunset over the shore of Lake Aydarkul',
  'moynaq-hull': 'A rusted ship hull stranded on the sand of the former Aral Sea at Muynak',
  'charvak-road': 'A mountain road above Charvak reservoir at golden hour, near Chimgan',
};

export type PhotoSlug = keyof typeof ALT;

export function photo(slug: string): { src: ImageMetadata; alt: string } {
  const f = files[`../assets/photos/${slug}.jpg`];
  if (!f || !ALT[slug]) throw new Error(`Missing photo ${slug}`);
  return { src: f.default, alt: ALT[slug] };
}

export const photoCredits = credits as { slug: string; title: string; author: string; license: string; licenseUrl: string | null; source: string }[];

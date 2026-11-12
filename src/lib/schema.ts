import { SITE, AGENCY } from './site';

/**
 * Structured data for search engines. Firdavs Tours is a demo brand by fhsystems, so it is
 * never described as a business (no TravelAgency, address, phone, ratings, reviews or bookings).
 */
export const DEMO_NAME = `${SITE.name} (demo by ${AGENCY.name})`;
export const DEMO_DESCRIPTION =
  'A demo AI travel consultant built by fhsystems on real 2026 Uzbekistan tour prices. It recommends tours, quotes exact prices from the price list and turns chats into booking requests in English, Uzbek and Russian. A demonstration brand: it takes no real bookings.';

const ORG_ID = AGENCY.url + '/#organization';
const SITE_ID = SITE.url + '/#website';

export const fhsystems = { '@type': 'Organization', '@id': ORG_ID, name: AGENCY.name, url: AGENCY.url };

export const website = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: DEMO_NAME,
  url: SITE.url + '/',
  description: DEMO_DESCRIPTION,
  inLanguage: 'en',
  creator: { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
};

/** One @graph per page: the organization, the site, and the page's own nodes. */
export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': [fhsystems, website, ...nodes] });

export const ref = { org: { '@id': ORG_ID }, site: { '@id': SITE_ID } };

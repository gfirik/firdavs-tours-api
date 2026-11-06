import { tourById } from '../lib/catalogue';

const group = tourById('classic-group-8');

/** Answers follow the practical facts the planner uses, plus lib/tours.json. `html` may contain links. */
export const FAQ: { q: string; a: string; html?: string }[] = [
  {
    q: 'Do I need a visa for Uzbekistan?',
    a: 'Many nationalities can visit visa-free for up to 30 days, and others apply online through the official e-visa portal. The rules depend on your passport and do change, so please check e-visa.gov.uz for your nationality before you travel.',
    html: 'Many nationalities can visit visa-free for up to 30 days, and others apply online through the official e-visa portal. The rules depend on your passport and do change, so please check <a href="https://e-visa.gov.uz" rel="noopener" target="_blank">e-visa.gov.uz</a> for your nationality before you travel.',
  },
  {
    q: 'When is the best time to go?',
    a: 'Mid-March to June and September to mid-November are the best months for the cities. June to August is very hot (often above 40°C) in Bukhara, Khiva and Termez, though the mountains are pleasant then. December to February is cold and quiet, with skiing at Chimgan and Amirsoy.',
  },
  {
    q: 'How do we travel between cities?',
    a: 'Mostly by train. The Afrosiyob high-speed train links Tashkent and Samarkand in about 2 h 10 min, Samarkand to Bukhara takes about 1 h 30 min, and Bukhara to Khiva is about 6–7 hours by train or 7 by road. Trains are included in all the multi-city routes.',
  },
  {
    q: 'Can I pay by card, or should I bring cash?',
    a: 'The currency is the Uzbek som (UZS). Cards are accepted in the cities; carry some cash for bazaars and villages.',
  },
  {
    q: 'What should I wear to mosques and madrasas?',
    a: 'Cover shoulders and knees when visiting mosques and mausoleums. Women should bring a scarf for active mosques, and everyone removes their shoes where asked.',
  },
  {
    q: 'How big are the groups?',
    a: `Private journeys are just you and your companions, from a solo traveller to a large family. The ${group.name} is guaranteed to run with 2 travellers and never takes more than ${group.max_group}. Private groups of 10 or more get a dedicated group price from a consultant.`,
  },
  {
    q: 'How does booking work?',
    a: 'Describe your trip to the planner and you will see an exact price for your group and hotel class straight away. When you are ready, it collects your name, an email or Telegram contact, dates, group size and any special needs, and sends your request with a reference number. A travel consultant confirms availability within 24 hours.',
  },
  {
    q: 'Do I pay online?',
    a: 'No. Nothing is paid on this website or in the chat. Your consultant follows up with how to confirm: usually a 20% deposit, with the balance 30 days before arrival and free cancellation up to 45 days before. Exact terms are confirmed at booking.',
  },
];

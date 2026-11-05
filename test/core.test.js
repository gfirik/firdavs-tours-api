import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, departures, validateRequest, bracket } from '../lib/core.js';

test('brackets', () => { assert.equal(bracket(1), '1'); assert.equal(bracket(2), '2'); assert.equal(bracket(4), '3-4'); assert.equal(bracket(9), '5+'); });
test('classic comfort 2 pax', () => { const r = quote({ tourId: 'classic-8', pax: 2, hotelClass: 'comfort' }); assert.equal(r.quote.per_person_usd, 2535); assert.equal(r.quote.total_usd, 5070); });
test('solo premium adds single supplement', () => { const r = quote({ tourId: 'classic-8', pax: 1, hotelClass: 'premium' }); assert.equal(r.quote.per_person_usd, 6080); assert.equal(r.quote.single_supplement_usd, 950); assert.equal(r.quote.total_usd, 7030); });
test('large private group flagged', () => { const r = quote({ tourId: 'classic-8', pax: 20, hotelClass: 'standard' }); assert.equal(r.quote.custom_group_price, true); });
test('group tour has no premium', () => { const r = quote({ tourId: 'classic-group-8', pax: 2, hotelClass: 'premium' }); assert.equal(r.ok, false); });
test('unknown tour', () => assert.equal(quote({ tourId: 'x', pax: 2, hotelClass: 'standard' }).ok, false));
test('bad pax', () => assert.equal(quote({ tourId: 'classic-8', pax: 0, hotelClass: 'standard' }).ok, false));
test('departures filter', () => { const r = departures({ tourId: 'classic-group-8', from: '2027-02-10' }); assert.equal(r.departures[0], '2027-03-20'); });
test('private tour departures', () => assert.equal(departures({ tourId: 'classic-8' }).type, 'private'));
test('request validation', () => {
  assert.equal(validateRequest({}).ok, false);
  const ok = validateRequest({ name: 'Ann', contact: 'ann@example.com', tour_id: 'classic-8', travellers: 2, hotel_class: 'Comfort', dates: 'April 2027' });
  assert.equal(ok.ok, true); assert.equal(ok.record.hotel_class, 'comfort');
  assert.equal(validateRequest({ name: 'Ann', contact: '@ann_travel', tour_id: 'classic-8', travellers: 2, hotel_class: 'standard', dates: 'May' }).ok, true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Unit } from '../src/types';
import { parseStatementPeriod, participationFactor } from '../src/lib/unitParticipation';

const unit: Unit = {
  id: 'T1', floor: '1ος', type: 'Διαμέρισμα', size: 80, share: 100, coefficient: 1,
  ownerName: 'Owner', residentName: 'Resident', residentType: 'Ενοικιαστής', occupants: 2,
  status: 'Ενεργό', balance: 0, prevBalance: 0, deposit: 0,
};

test('parses Greek statement periods into exact month bounds', () => {
  const period = parseStatementPeriod('Ιούλιος 2026');
  assert.equal(period?.start.toISOString().slice(0, 10), '2026-07-01');
  assert.equal(period?.end.toISOString().slice(0, 10), '2026-07-31');
  assert.equal(period?.days, 31);
});

test('full policy participates for the whole charge whenever dates overlap', () => {
  assert.equal(participationFactor({ ...unit, participationStart: '2026-07-20', participationPolicy: 'full' }, 'Ιούλιος 2026'), 1);
  assert.equal(participationFactor({ ...unit, participationStart: '2026-08-01', participationPolicy: 'full' }, 'Ιούλιος 2026'), 0);
});

test('prorated policy calculates inclusive active days', () => {
  assert.equal(participationFactor({ ...unit, participationStart: '2026-07-17', participationPolicy: 'prorated' }, 'Ιούλιος 2026'), 15 / 31);
  assert.equal(participationFactor({ ...unit, participationEnd: '2026-07-10', participationPolicy: 'prorated' }, 'Ιούλιος 2026'), 10 / 31);
});

test('a unit outside a period receives a zero participation factor', () => {
  assert.equal(participationFactor({ ...unit, participationEnd: '2026-06-30' }, 'Ιούλιος 2026'), 0);
});

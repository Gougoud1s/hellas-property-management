import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, googleCalendarUrl } from '../src/lib/calendarExport';

const event = {
  id: 'notice:ANA-IL-01:A1',
  title: 'Λήξη ειδοποιητηρίου A1 · 142,30 €',
  date: '2026-08-18',
  description: 'Ιούλιος 2026',
  location: 'Λεωφ. Ειρήνης 38, Ηλιούπολη'
};

test('ICS export includes an all-day event and two display reminders', () => {
  const ics = buildIcs([event], 'Anastassiadis Group');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260818/);
  assert.match(ics, /DTEND;VALUE=DATE:20260819/);
  assert.match(ics, /TRIGGER:-P3D/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.equal((ics.match(/BEGIN:VALARM/g) ?? []).length, 2);
});

test('Google Calendar link contains the event date and title', () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.hostname, 'calendar.google.com');
  assert.equal(url.searchParams.get('dates'), '20260818/20260819');
  assert.equal(url.searchParams.get('text'), event.title);
});

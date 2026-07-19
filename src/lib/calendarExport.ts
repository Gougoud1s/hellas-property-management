export interface ExportCalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
  location?: string;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function nextDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function buildIcs(events: ExportCalendarEvent[], calendarName = 'Atlas PM'): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const body = events.map((event) => [
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.id)}@atlaspm.gr`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDate(event.date))}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : '',
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(event.title)} σε 3 ημέρες`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(event.title)} αύριο`, 'END:VALARM',
    'END:VEVENT'
  ].filter(Boolean).join('\r\n')).join('\r\n');

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'PRODID:-//Atlas PM//Property Calendar//EL', `X-WR-CALNAME:${escapeIcs(calendarName)}`, body, 'END:VCALENDAR', ''].join('\r\n');
}

export function downloadIcs(events: ExportCalendarEvent[], filename = 'atlas-pm-calendar.ics'): void {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event: ExportCalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compactDate(event.date)}/${compactDate(nextDate(event.date))}`,
    details: event.description ?? '',
    location: event.location ?? ''
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

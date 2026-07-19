import { Unit } from '../types';

const MONTHS: Record<string, number> = {
  ιανουάριος: 0, φεβρουάριος: 1, μάρτιος: 2, απρίλιος: 3, μάιος: 4, ιούνιος: 5,
  ιούλιος: 6, αύγουστος: 7, σεπτέμβριος: 8, οκτώβριος: 9, νοέμβριος: 10, δεκέμβριος: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export interface PeriodRange { start: Date; end: Date; days: number }

export function parseStatementPeriod(period: string): PeriodRange | null {
  const match = period.trim().toLocaleLowerCase('el-GR').match(/^([^\s]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  const year = Number(match[2]);
  if (month === undefined || year < 2000 || year > 2200) return null;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start, end, days: end.getUTCDate() };
}

function isoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function participationFactor(unit: Unit, period: string): number {
  const range = parseStatementPeriod(period);
  if (!range) return 1;
  const configuredStart = isoDate(unit.participationStart);
  const configuredEnd = isoDate(unit.participationEnd);
  const start = configuredStart && configuredStart > range.start ? configuredStart : range.start;
  const end = configuredEnd && configuredEnd < range.end ? configuredEnd : range.end;
  if (start > end) return 0;
  if ((unit.participationPolicy ?? 'full') === 'full') return 1;
  const activeDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(0, Math.min(1, activeDays / range.days));
}


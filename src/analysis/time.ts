import { Temporal } from '@js-temporal/polyfill';
import type { TimeOccurrence } from '../db';
import type { Interval } from './types';
export const MINUTE = 60000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export function captureLocalTime(epoch:number,zone:string) {
  const zoned=Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(zone);
  const date=zoned.toPlainDate().toString();
  const clock=`${String(zoned.hour).padStart(2,'0')}:${String(zoned.minute).padStart(2,'0')}`;
  const earlier=zonedTime(date,clock,zone,'earlier');
  const occurrence:TimeOccurrence=epoch-earlier<MINUTE?'earlier':'later';
  return {date,clock,occurrence};
}
export function addDate(date: string, days: number) { return Temporal.PlainDate.from(date).add({ days }).toString(); }
export function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  for (let date = start; date <= end && result.length < 1100; date = addDate(date, 1)) result.push(date);
  return result;
}
export function zonedTime(date: string, clock: string, zone: string, occurrence?: TimeOccurrence): number {
  const plain = Temporal.PlainDateTime.from(`${date}T${clock}`);
  const earlier = plain.toZonedDateTime(zone, { disambiguation: 'earlier' });
  const later = plain.toZonedDateTime(zone, { disambiguation: 'later' });
  if (!earlier.toPlainDateTime().equals(plain) || !later.toPlainDateTime().equals(plain)) throw new Error(`${date} ${clock}: godzina nie istnieje po zmianie czasu`);
  if (earlier.epochMilliseconds !== later.epochMilliseconds && !occurrence) throw new Error(`${date} ${clock}: godzina występuje dwukrotnie; wybierz pierwsze lub drugie wystąpienie`);
  return (occurrence === 'later' ? later : earlier).epochMilliseconds;
}
export function timeInterval(date: string, start: string, end: string, nextDay: boolean, zone: string, startOccurrence?: TimeOccurrence, endOccurrence?: TimeOccurrence): Interval {
  const result = { start: zonedTime(date, start, zone, startOccurrence), end: zonedTime(addDate(date, nextDay || end < start ? 1 : 0), end, zone, endOccurrence) };
  if (result.end < result.start || result.end - result.start > 26 * HOUR) throw new Error('Przedział pracy jest nieprawidłowy lub przekracza 26 godzin');
  return result;
}
export function mergeIntervals(items: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const item of [...items].filter(i => i.end > i.start).sort((a,b) => a.start-b.start)) {
    const last = result[result.length - 1];
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else result.push({ ...item });
  }
  return result;
}
export function intersect(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a.start,b.start), end = Math.min(a.end,b.end);
  return end > start ? { start,end } : null;
}
export function minutes(items: Interval[], window?: Interval) {
  return mergeIntervals(items.flatMap(i => { const value = window ? intersect(i,window) : i; return value ? [value] : []; })).reduce((sum,i)=>sum+(i.end-i.start)/MINUTE,0);
}
export function gaps(items: Interval[], window: Interval): Interval[] {
  const result: Interval[] = []; let cursor = window.start;
  for (const item of mergeIntervals(items)) {
    if (item.end <= window.start || item.start >= window.end) continue;
    if (item.start > cursor) result.push({ start:cursor, end:Math.min(item.start,window.end) });
    cursor = Math.max(cursor,item.end);
  }
  if (cursor < window.end) result.push({ start:cursor,end:window.end });
  return result;
}
export function nightMinutes(items: Interval[], zone: string, nightStart: string, nightEnd: string) {
  let result = 0;
  for (const item of mergeIntervals(items)) {
    const first = Temporal.Instant.fromEpochMilliseconds(item.start).toZonedDateTimeISO(zone).toPlainDate().subtract({ days:1 }).toString();
    const last = Temporal.Instant.fromEpochMilliseconds(item.end).toZonedDateTimeISO(zone).toPlainDate().toString();
    for (const date of dateRange(first,last)) {
      const night = timeInterval(date,nightStart,nightEnd,nightEnd <= nightStart,zone,'earlier','later');
      const overlap = intersect(item,night);
      if (overlap) result += (overlap.end-overlap.start)/MINUTE;
    }
  }
  return result;
}

import type { RoundingSettings, Shift } from './db';

export const DEFAULT_ROUNDING: RoundingSettings = { enabled: true, blockMinutes: 15, boundary: 'keep' };

export function clockToMinutes(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error(`Nieprawidłowa godzina: ${clock}`);
  return hours * 60 + minutes;
}

export function elapsedMinutes(start: string, end: string, nextDay = false): number {
  const startMinutes = clockToMinutes(start);
  let endMinutes = clockToMinutes(end);
  if (nextDay || endMinutes < startMinutes) endMinutes += 1440;
  return endMinutes - startMinutes;
}

export function roundElapsedEnd(actualStart: string, actualEnd: string, endNextDay: boolean, settings: RoundingSettings) {
  const elapsed = elapsedMinutes(actualStart, actualEnd, endNextDay);
  if (!settings.enabled) return { clock: actualEnd, nextDay: endNextDay, elapsedMinutes: elapsed };
  const block = Math.max(1, Math.floor(settings.blockMinutes));
  const crossesMidnight = endNextDay || clockToMinutes(actualEnd) < clockToMinutes(actualStart);
  const absoluteEnd = clockToMinutes(actualEnd) + (crossesMidnight ? 1440 : 0);
  const remainder = absoluteEnd % block;
  const roundedAbsolute = remainder === 0 ? absoluteEnd + (settings.boundary === 'advance' ? block : 0) : absoluteEnd + block - remainder;
  const roundedElapsed = roundedAbsolute - clockToMinutes(actualStart);
  return { clock: `${String(Math.floor((roundedAbsolute % 1440) / 60)).padStart(2, '0')}:${String(roundedAbsolute % 60).padStart(2, '0')}`, nextDay: Math.floor(roundedAbsolute / 1440) > 0, elapsedMinutes: roundedElapsed };
}

export function normalizeShift(shift: Shift): Shift {
  const plannedStart = shift.plannedStart ?? shift.start;
  const plannedEnd = shift.plannedEnd ?? shift.end;
  const actualStart = shift.actualStart ?? plannedStart;
  const actualEnd = shift.actualEnd ?? plannedEnd;
  return { ...shift, plannedStart, plannedEnd, actualStart, actualEnd, actualConfirmed: shift.actualConfirmed ?? false };
}

export function calculateBillingEnd(shift: Shift, settings: RoundingSettings): Shift {
  const normalized = normalizeShift(shift);
  if (normalized.dayOff || !normalized.actualStart || !normalized.actualEnd) return normalized;
  if (normalized.billingEndOverride) return { ...normalized, billingEnd: normalized.billingEndOverride, billingEndNextDay: normalized.billingEndOverrideNextDay ?? false };
  const nextDay = normalized.actualEndNextDay ?? (normalized.actualEnd < normalized.actualStart ? true : normalized.nextDay);
  const rounded = roundElapsedEnd(normalized.actualStart, normalized.actualEnd, nextDay, settings);
  return { ...normalized, billingEnd: rounded.clock, billingEndNextDay: rounded.nextDay };
}

export function additionalMinutes(shift: Shift): number | null {
  if (!shift.billingEnd || !shift.plannedStart || !shift.plannedEnd) return null;
  const billable = elapsedMinutes(shift.plannedStart, shift.billingEnd, shift.billingEndNextDay);
  const planned = elapsedMinutes(shift.plannedStart, shift.plannedEnd, shift.nextDay);
  return billable - planned;
}

export function formatMinutes(value: number): string {
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 60)} h ${String(absolute % 60).padStart(2, '0')} min`;
}

export function localDateTime(date: string, clock: string, nextDay: boolean) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = clock.split(':').map(Number);
  const value = new Date(year, month - 1, day + (nextDay ? 1 : 0), hours, minutes);
  return value;
}

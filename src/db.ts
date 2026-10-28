import Dexie, { type EntityTable } from 'dexie';
import type { NominalAdjustment, RestException } from './analysis/types';
export const DATABASE_VERSION=4;

export type ShiftTemplate = { id?: number; code: string; name: string; start: string; end: string; nextDay: boolean };
export type Shift = { id?: number; date: string; templateId?: number; code: string; start: string; end: string; nextDay: boolean; dayOff: boolean; plannedStart?: string; plannedEnd?: string; actualStart?: string; actualEnd?: string; actualEndNextDay?: boolean; billingEnd?: string; billingEndNextDay?: boolean; billingEndOverride?: string; billingEndOverrideNextDay?: boolean; actualConfirmed?: boolean; source?: 'manual'|'pdf'; importedAt?: string; planConfirmed?: boolean; note?: string; color?: string; dayType?: CodeDefinition['dayType'] };
export type CodeDefinition = { code: string; name: string; start: string; end: string; nextDay: boolean; dayType: 'work'|'off'|'other'; color: string };
export type ImportLog = { id?: number; month: string; importedAt: string; filename: string; fingerprint: string; recognizedDays: number; changedDays: number; conflicts: number; status: 'imported'|'updated' };
export type PeriodSettings = { id: 'current'; start: string; end: string; month1: number | ''; month2: number | ''; month3: number | ''; quarterTotal: number | '' };
export type Preference = { key: string; value: string };
export type RoundingSettings = { enabled: boolean; blockMinutes: number; boundary: 'keep' | 'advance' };

export type TimeOccurrence = 'earlier' | 'later';
export type AnalysisShift = Shift & { actualStartOccurrence?: TimeOccurrence; actualEndOccurrence?: TimeOccurrence };

class ShiftControlDB extends Dexie {
  shifts!: EntityTable<AnalysisShift, 'id'>;
  templates!: EntityTable<ShiftTemplate, 'id'>;
  periods!: EntityTable<PeriodSettings, 'id'>;
  preferences!: EntityTable<Preference, 'key'>;
  codes!: EntityTable<CodeDefinition, 'code'>;
  importLogs!: EntityTable<ImportLog, 'id'>;
  nominalAdjustments!: EntityTable<NominalAdjustment, 'id'>;
  restExceptions!: EntityTable<RestException, 'id'>;
  constructor() {
    super('ShiftControl');
    this.version(1).stores({ shifts: '++id, date', templates: '++id, code', periods: 'id', preferences: 'key' });
    this.version(2).stores({ shifts: '++id, date', templates: '++id, code', periods: 'id', preferences: 'key' });
    this.version(3).stores({ shifts: '++id, date', templates: '++id, code', periods: 'id', preferences: 'key', codes: 'code', importLogs: '++id, month, fingerprint' });
    this.version(DATABASE_VERSION).stores({ shifts: '++id, date', templates: '++id, code', periods: 'id', preferences: 'key', codes: 'code', importLogs: '++id, month, fingerprint', nominalAdjustments: '++id, date', restExceptions: '++id, date' });
  }
}
export const db = new ShiftControlDB();

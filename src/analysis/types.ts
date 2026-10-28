export type AnalysisSettings = {
  rulesConfirmed: boolean;
  system: 'basic' | 'equivalent';
  dailyNormHours: number;
  maxDailyHours: number;
  timeZone: string;
  nightStart: string;
  nightEnd: string;
  dailyRestHours: number;
  weeklyRestHours: number;
  completeFrom: string;
  completeThrough: string;
  flexibleStart: boolean;
};
export const DEFAULT_ANALYSIS: AnalysisSettings = {
  rulesConfirmed: false,
  system: 'equivalent', dailyNormHours: 8, maxDailyHours: 12, timeZone: 'Europe/Warsaw',
  nightStart: '22:00', nightEnd: '06:00', dailyRestHours: 11, weeklyRestHours: 35,
  completeFrom: '', completeThrough: '', flexibleStart: false,
};
export type NominalAdjustment = { id?: number; date: string; hours: number; kind: 'absence' | 'correction'; reason: string };
export type RestException = {
  id?: number; date: string; scope: 'daily' | 'weekly';
  kind: 'emergency' | 'management' | 'shiftChange'; reason: string;
  compensationStart: string; compensationEnd: string;
};
export type Interval = { start: number; end: number };
export type AnalysisWarning = { date?: string; kind: 'data' | 'dailyRest' | 'weeklyRest' | 'review'; message: string };
export type DayAnalysis = {
  date: string; planned: number; actual: number; billing: number | null; additional: number | null;
  dailyOvertime: number; night: number; correction: number; confirmed: boolean;
};
export type RestResult = {
  date: string; endDate?: string; minutes: number; required: number;
  status: 'observed' | 'potential' | 'incomplete' | 'boundary' | 'exception'; detail?: string;
};

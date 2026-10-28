import type { CodeDefinition, Shift } from './db';
import { calculateBillingEnd, DEFAULT_ROUNDING, normalizeShift } from './worktime';

export function hasPlanChange(old:Shift|undefined, code:string, def:CodeDefinition) {
  return !!old && (old.code!==code || old.start!==def.start || old.end!==def.end || old.nextDay!==def.nextDay || old.dayOff!==(def.dayType==='off'));
}
export function isManualPlan(old:Shift|undefined) { return !!old && (old.source!=='pdf' || old.planConfirmed===true); }
export function mergeImportedPlan(old:Shift|undefined,date:string,code:string,def:CodeDefinition,importedAt:string):Shift {
  if(isManualPlan(old)) return old!;
  const base:Shift=old?normalizeShift(old):{date,code,start:def.start,end:def.end,nextDay:def.nextDay,dayOff:def.dayType==='off',actualStart:def.start,actualEnd:def.end,actualEndNextDay:def.nextDay,actualConfirmed:false};
  const next:Shift={...base,date,code,start:def.start,end:def.end,plannedStart:def.start,plannedEnd:def.end,nextDay:def.nextDay,dayOff:def.dayType==='off',source:'pdf',importedAt,planConfirmed:false,color:def.color,dayType:def.dayType};
  return old?next:calculateBillingEnd(next,DEFAULT_ROUNDING);
}

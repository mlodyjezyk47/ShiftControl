import { describe, expect, it } from 'vitest';
import type { CodeDefinition, Shift } from './db';
import { hasPlanChange, mergeImportedPlan } from './importMerge';
const code:CodeDefinition={code:'N',name:'Nocna',start:'22:00',end:'06:00',nextDay:true,dayType:'work',color:'#4488ff'};
const date='2027-01-03';
describe('ponowny import',()=>{
  it('nie tworzy drugiego wpisu i aktualizuje plan',()=>{const old=mergeImportedPlan(undefined,date,'N',code,'2026-12-01');const changed=mergeImportedPlan(old,date,'N',{...code,start:'21:00'},'2026-12-02');expect(changed.id).toBe(old.id);expect(changed.plannedStart).toBe('21:00');expect(hasPlanChange(old,'N',{...code,start:'21:00'})).toBe(true)});
  it('zachowuje potwierdzone faktyczne godziny i ręczną korektę rozliczenia',()=>{const old:Shift={...mergeImportedPlan(undefined,date,'N',code,'2026-12-01'),actualStart:'22:03',actualEnd:'07:12',actualEndNextDay:true,actualConfirmed:true,billingEnd:'07:30',billingEndNextDay:true,billingEndOverride:'07:30',billingEndOverrideNextDay:true,note:'Zmiana przedłużona'};const next=mergeImportedPlan(old,date,'N',{...code,start:'21:00',end:'05:00'},'2026-12-02');expect(next).toMatchObject({plannedStart:'21:00',actualStart:'22:03',actualEnd:'07:12',billingEnd:'07:30',billingEndOverride:'07:30',actualConfirmed:true,note:'Zmiana przedłużona'})});
  it('zachowuje ręcznie poprawiony plan',()=>{const old:Shift={...mergeImportedPlan(undefined,date,'N',code,'2026-12-01'),planConfirmed:true};expect(mergeImportedPlan(old,date,'N',{...code,start:'20:00'},'2026-12-02')).toBe(old)});
});

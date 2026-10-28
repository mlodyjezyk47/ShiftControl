import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import type { AnalysisShift, PeriodSettings, RoundingSettings } from '../db';
import type { AnalysisSettings, NominalAdjustment, RestException } from '../analysis/types';
import { analyzeWork } from '../analysis/engine';
import { calculateMonth, calculateQuarter, DEFAULT_PAY_MONTH, type PayrollSettings } from '../payroll/model';
export function summaryRows(shifts:AnalysisShift[],period:PeriodSettings,settings:AnalysisSettings,rounding:RoundingSettings,adjustments:NominalAdjustment[],exceptions:RestException[],payroll:PayrollSettings,month?:string){
 const keys=[0,1,2].map(i=>format(addMonths(startOfMonth(parseISO(period.start)),i),'yyyy-MM'));
 const nominals=[period.month1,period.month2,period.month3];const configs=keys.map((key,i)=>payroll.months[key]??{...DEFAULT_PAY_MONTH,nominal:nominals[i]});
 const key=`${period.start}/${period.end}`;
 const q=payroll.quarters[key]??{nominal:period.quarterTotal,weeklyPremium:'unverified' as const,rateMonth:keys[2]};
 const a=analyzeWork(shifts,{...period,month1:configs[0].nominal,month2:configs[1].nominal,month3:configs[2].nominal,quarterTotal:q.nominal},settings,rounding,adjustments,exceptions);
 if(!a.valid)throw new Error(a.error);
 const status=a.preliminary?'Wstępny szacunek — niekompletne dane lub trwający okres':'Szacunek — wymaga weryfikacji';
 const rows:unknown[][]=[['Zakres','Pozycja','Wartość','Jednostka','Status']];
 const add=(scope:string,label:string,value:unknown,unit:string,detail=status)=>rows.push([scope,label,value??'do weryfikacji',unit,detail]);
 const pays=keys.map((key,i)=>{const days=a.days.filter(d=>d.date.startsWith(key));return calculateMonth({key,config:configs[i],actualMinutes:days.reduce((s,d)=>s+d.actual,0),additionalMinutes:days.reduce((s,d)=>s+(d.additional??0),0),dailyMinutes:days.reduce((s,d)=>s+d.dailyOvertime,0),nightMinutes:days.reduce((s,d)=>s+d.night,0),components:payroll.components})});
 for(let i=0;i<keys.length;i++){if(month&&keys[i]!==month)continue;const scope=keys[i],days=a.days.filter(d=>d.date.startsWith(scope)),m=a.months[i];
 for(const [label,value] of [['Plan',m.planned],['Faktyczna praca',m.actual],['Czas rozliczeniowy',m.billing],['Bilans dodatkowy',days.reduce((s,d)=>s+(d.additional??0),0)],['Nadgodziny dobowe',days.reduce((s,d)=>s+d.dailyOvertime,0)],['Godziny nocne',days.reduce((s,d)=>s+d.night,0)],['Ręczne korekty',days.reduce((s,d)=>s+d.correction,0)],['Nominał',m.base],['Wymiar po korektach',m.adjusted]] as const)add(scope,label,value===null?null:value/60,'h');
 const p=pays[i];if(p.valid){for(const [label,value] of [['Zasadnicze',p.base],['Normalne wynagrodzenie za dobowe',p.normal],['Dodatek 50% (procent wg ustawień)',p.p50],['Dodatek 100% (procent wg ustawień)',p.p100],['Dodatek nocny',p.night],['Premia',p.bonus],['Inne miesięczne',p.components],['Znane składniki miesięczne',p.total]] as const)add(scope,label,value,'PLN brutto',`${status}${p.partial?' — częściowa kwota':''}`);p.warnings.forEach(w=>add(scope,'Ostrzeżenie płacowe',w,''))}else add(scope,'Błąd kalkulacji',p.error,'');
 }
 if(!month){const labels:Record<string,string>={planned:'Plan okresu',actual:'Faktyczna praca',billing:'Czas rozliczeniowy',additional:'Bilans dodatkowy',dailyOvertime:'Nadgodziny dobowe',weeklyOvertime:'Nadgodziny średniotygodniowe',shortfall:'Niedopracowanie — szacunek',remaining:'Pozostały wymiar',nominal:'Nominał okresu',adjustedNominal:'Wymiar po korektach',adjustmentMinutes:'Korekty wymiaru',night:'Godziny nocne',correction:'Ręczne korekty rozliczenia'};for(const [label,value] of Object.entries(a.totals))add(key,labels[label]||label,value===null?null:value/60,'h');const p=calculateQuarter(pays,a.totals.weeklyOvertime,q,configs[Math.max(0,keys.indexOf(q.rateMonth))],payroll.components,key);for(const [label,value] of [['Normalne za średniotygodniowe',p.normal],['Dodatek średniotygodniowy',p.premium],['Inne kwartalne',p.other],['Znane składniki odroczone',p.deferred],['Znane składniki całego okresu',p.total]] as const)add(key,label,value,'PLN brutto',`${status}${p.partial?' — częściowa kwota':''}`);p.warnings.forEach(w=>add(key,'Ostrzeżenie płacowe',w,''))}
 a.warnings.forEach(w=>add(w.date||key,'Ostrzeżenie',w.message,''));add(key,'Informacja','Szacunkowe kwoty brutto; eksport nie zastępuje listy płac.','');return rows;
}

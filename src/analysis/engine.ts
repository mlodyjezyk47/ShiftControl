import { Temporal } from '@js-temporal/polyfill';
import type { AnalysisShift, PeriodSettings, RoundingSettings } from '../db';
import { clockToMinutes, elapsedMinutes, roundElapsedEnd } from '../worktime';
import { addDate, dateRange, DAY, gaps, HOUR, intersect, mergeIntervals, MINUTE, minutes, nightMinutes, timeInterval, zonedTime } from './time';
import type { AnalysisSettings, AnalysisWarning, DayAnalysis, Interval, NominalAdjustment, RestException, RestResult } from './types';

type WorkRow = { shift: AnalysisShift; planned: Interval; actual?: Interval; billing?: Interval; plannedMinutes: number; correction: number };
export function analyzeWork(shifts: AnalysisShift[], period: PeriodSettings, settings: AnalysisSettings, rounding: RoundingSettings, adjustments: NominalAdjustment[] = [], exceptions: RestException[] = [], now = Date.now()) {
  const warnings: AnalysisWarning[] = [];
  const warn = (kind:AnalysisWarning['kind'],message:string,date?:string) => warnings.push({kind,message,date});
  let bounds:Interval;
  try {
    bounds = { start:zonedTime(period.start,'00:00',settings.timeZone), end:zonedTime(addDate(period.end,1),'00:00',settings.timeZone) };
    if (bounds.end<=bounds.start || bounds.end-bounds.start>367*DAY) throw new Error('Okres musi trwać od 1 do 366 dni');
    if (![settings.dailyNormHours,settings.maxDailyHours,settings.dailyRestHours,settings.weeklyRestHours].every(n=>Number.isFinite(n)&&n>0)) throw new Error('Wprowadź dodatnie normy i minima odpoczynku');
    if(settings.maxDailyHours<settings.dailyNormHours) throw new Error('Maksymalna zmiana nie może być krótsza od normy dobowej');
    if ([period.month1,period.month2,period.month3,period.quarterTotal].some(n=>n!==''&&(!Number.isFinite(Number(n))||Number(n)<0))) throw new Error('Nominały muszą być nieujemnymi liczbami godzin');
    if (adjustments.some(a=>!Number.isFinite(a.hours))) throw new Error('Nieprawidłowa wartość korekty wymiaru');
    const ns=clockToMinutes(settings.nightStart),ne=clockToMinutes(settings.nightEnd);
    if(ns<21*60 || ns>23*60 || (ne-ns+1440)%1440!==480) throw new Error('Pora nocna powinna obejmować 8 godzin pomiędzy 21:00 a 07:00 (np. 22:00–06:00)');
  } catch(e) { return { valid:false as const, error:e instanceof Error?e.message:'Nieprawidłowa konfiguracja', warnings }; }
  const inPeriod = (date:string) => date>=period.start && date<=period.end;
  const allDates = dateRange(period.start,period.end);
  const byDate = new Map(shifts.map(s=>[s.date,s]));
  const rows:WorkRow[]=[];
  const plannedWithin=(r:WorkRow)=>r.planned.end>r.planned.start?r.plannedMinutes*minutes([r.planned],bounds)/((r.planned.end-r.planned.start)/MINUTE):0;
  const badDates = new Set<string>();
  const horizonStart=addDate(period.start,-7), horizonEnd=addDate(period.end,7);
  for(const shift of shifts.filter(s=>s.date>=horizonStart&&s.date<=horizonEnd)) {
    const isPlannedWork=!shift.dayOff && shift.dayType!=='other';
    const isActualWork=shift.actualConfirmed && !!shift.actualStart && !!shift.actualEnd && (isPlannedWork || shift.actualStart!==shift.actualEnd || shift.actualEndNextDay);
    if(!isPlannedWork&&!isActualWork) continue;
    try {
      const ps=shift.plannedStart??shift.start, pe=shift.plannedEnd??shift.end;
      const planned=isPlannedWork?timeInterval(shift.date,ps,pe,shift.nextDay,settings.timeZone,'earlier','later'):{start:zonedTime(shift.date,'00:00',settings.timeZone),end:zonedTime(shift.date,'00:00',settings.timeZone)};
      const plannedMinutes=isPlannedWork?elapsedMinutes(ps,pe,shift.nextDay):0;
      let actual:Interval|undefined,billing:Interval|undefined,correction=0;
      if(isActualWork) {
        const as=shift.actualStart!,ae=shift.actualEnd!;
        const next=shift.actualEndNextDay??(ae<as||shift.nextDay);
        actual=timeInterval(shift.date,as,ae,next,settings.timeZone,shift.actualStartOccurrence,shift.actualEndOccurrence);
        if(!isPlannedWork)warn('review','Potwierdzona praca w dniu oznaczonym jako wolny lub inny. Sprawdź sposób jej rekompensaty i aktualność planu.',shift.date);
        const auto=roundElapsedEnd(as,ae,next,rounding);
        // Recorded billing time is authoritative; legacy records use the automatic end.
        const end=shift.billingEndOverride??shift.billingEnd??auto.clock;
        const endNext=shift.billingEndOverride?shift.billingEndOverrideNextDay:(shift.billingEndNextDay??auto.nextDay);
        try {
          billing=timeInterval(shift.date,as,end,!!endNext,settings.timeZone,shift.actualStartOccurrence,shift.actualEndOccurrence);
          if(shift.billingEndOverride) {
            const automatic=timeInterval(shift.date,as,auto.clock,auto.nextDay,settings.timeZone,shift.actualStartOccurrence,shift.actualEndOccurrence);
            correction=(billing.end-automatic.end)/MINUTE;
          }
        } catch(e) { warn('data',`Nie można wyznaczyć rozliczenia: ${e instanceof Error?e.message:'błąd czasu'}. Godziny faktyczne zachowano w analizie.`,shift.date); }
        if(actual.start<planned.start&&isPlannedWork) warn('review','Wcześniejsze rozpoczęcie: sprawdź przypisanie pracy do doby pracowniczej.',shift.date);
        if((actual.end-actual.start)/MINUTE!==elapsedMinutes(as,ae,next)) warn('review','Zmiana czasu: czas rzeczywisty różni się od różnicy godzin na zegarze.',shift.date);
      } else if(inPeriod(shift.date)) warn('data','Godziny faktyczne nie zostały potwierdzone; nie są wliczane do analizy wykonanej pracy.',shift.date);
      if(isPlannedWork && plannedMinutes>settings.maxDailyHours*60) warn('review','Plan przekracza skonfigurowaną maksymalną długość zmiany.',shift.date);
      if(actual && actual.end-actual.start>settings.maxDailyHours*HOUR) warn('review','Faktyczna praca przekracza skonfigurowaną maksymalną długość zmiany.',shift.date);
      if(actual&&actual.end>now){warn('data','Potwierdzony przedział kończy się w przyszłości; nie jest jeszcze zaliczany do wykonanej pracy.',shift.date);actual=undefined;billing=undefined;correction=0;}
      rows.push({shift,planned,actual,billing,plannedMinutes,correction});
    } catch(e) {
      badDates.add(shift.date);warn('data',e instanceof Error?e.message:'Nieprawidłowe godziny',shift.date);
      // A bad actual timestamp must not remove a valid plan from the summary.
      if(isPlannedWork)try{const ps=shift.plannedStart??shift.start,pe=shift.plannedEnd??shift.end;rows.push({shift,planned:timeInterval(shift.date,ps,pe,shift.nextDay,settings.timeZone,'earlier','later'),plannedMinutes:elapsedMinutes(ps,pe,shift.nextDay),correction:0})}catch{ /* The warning above describes the invalid row. */ }
    }
  }
  const completeFrom=settings.completeFrom;
  const known=(date:string)=>{
    const s=byDate.get(date);
    if(badDates.has(date))return false;
    if(s && !s.dayOff && s.dayType!=='other') return !!s.actualConfirmed;
    if(s?.actualConfirmed || s?.dayOff)return true;
    return !!completeFrom && !!settings.completeThrough && date>=completeFrom && date<=settings.completeThrough;
  };
  const unknownDates=allDates.filter(d=>!known(d));
  if(!settings.rulesConfirmed)warn('data','Potwierdź system i parametry w „Analiza czasu → Reguły i korekty”. Obecne wartości są ustawieniami roboczymi.');
  const missingDates=unknownDates.filter(d=>!byDate.has(d)||byDate.get(d)?.dayType==='other');
  if(missingDates.length) warn('data',`Brak kompletnej ewidencji dla ${missingDates.length} dni. Puste dni nie potwierdzają odpoczynku.`,missingDates[0]);
  if(settings.flexibleStart)warn('review','Ruchome godziny rozpoczęcia: ponowne wejście jest analizowane osobno. Zweryfikuj podstawę stosowania tego rozkładu.');
  if(settings.dailyRestHours<11||settings.weeklyRestHours<35)warn('review','Minima odpoczynku obniżone w konfiguracji. Wymagana jest weryfikacja podstawy wyjątku.');
  if(settings.dailyNormHours!==8)warn('review','Ustawiono normę dobową inną niż 8 h. Sprawdź podstawę zastosowania tej normy.');
  if(settings.maxDailyHours>12)warn('review','Zmiany powyżej 12 h mogą wymagać szczególnych zasad odpoczynku równoważnego. Zweryfikuj system i podstawę wydłużenia.');
  const nightLength=(clockToMinutes(settings.nightEnd)-clockToMinutes(settings.nightStart)+1440)%1440;
  if(nightLength!==480)warn('review','Skonfigurowana pora nocna nie obejmuje 8 godzin zegarowych. Sprawdź ustawienia.');
  const actualRows=rows.filter((r):r is WorkRow&{actual:Interval}=>!!r.actual).sort((a,b)=>a.actual.start-b.actual.start);
  const actualUnion=mergeIntervals(actualRows.map(r=>r.actual));
  if(actualRows.reduce((sum,r)=>sum+(r.actual.end-r.actual.start)/MINUTE,0)-minutes(actualUnion)>0)warn('data','Przedziały pracy nakładają się. Nakładające się minuty są liczone tylko raz.');

  // Employee days last 24 elapsed hours. Earlier re-entry joins the existing day.
  const buckets:{date:string;window:Interval;threshold:number; row:WorkRow}[]=[];
  for(const row of actualRows) {
    const anchor=Math.min(row.actual.start,row.plannedMinutes?row.planned.start:row.actual.start);
    const previous=buckets[buckets.length-1];
    const threshold=settings.system==='basic'?settings.dailyNormHours*60:Math.max(settings.dailyNormHours*60,Math.min(row.plannedMinutes,settings.maxDailyHours*60));
    let current=previous;
    if(!settings.flexibleStart && previous && anchor<previous.window.end){
      warn('review','Ponowne wejście w tej samej dobie pracowniczej; czas połączono przed wyznaczeniem nadgodzin dobowych.',row.shift.date);
    } else {
      current={date:row.shift.date,window:{start:anchor,end:anchor+DAY},threshold,row};
      buckets.push(current);
    }
    // A re-entry may continue beyond the first employee day. Allocate that tail
    // into a following non-overlapping 24-hour window rather than losing it.
    while(current && row.actual.end>current.window.end) {
      const start=current.window.end;
      const date=Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(settings.timeZone).toPlainDate().toString();
      current={date,window:{start,end:start+DAY},threshold,row};
      buckets.push(current);
    }
  }
  const dailyOvertimeIntervals:Interval[]=[];
  const dailyByDate=new Map<string,number>();
  const dailyRests:RestResult[]=[];
  for(let index=0;index<buckets.length;index++) {
    const bucket=buckets[index];
    const allocationWindow=settings.flexibleStart&&buckets[index+1]?{...bucket.window,end:Math.min(bucket.window.end,buckets[index+1].window.start)}:bucket.window;
    const work=actualUnion.flatMap(i=>{const piece=intersect(i,allocationWindow);return piece?[piece]:[]});
    let allowance=bucket.threshold;
    const overtime:Interval[]=[];
    for(const i of work){const duration=(i.end-i.start)/MINUTE;const regular=Math.min(allowance,duration);allowance-=regular;if(duration>regular)overtime.push({start:i.start+regular*MINUTE,end:i.end})}
    dailyOvertimeIntervals.push(...overtime);
    dailyByDate.set(bucket.date,(dailyByDate.get(bucket.date)||0)+minutes(overtime,bounds));
    if(!inPeriod(bucket.date))continue;
    const rest=gaps(actualUnion,bucket.window);
    const maximum=Math.max(0,...rest.map(g=>(g.end-g.start)/MINUTE));
    const dates=dateRange(bucket.date,addDate(bucket.date,1));
    const complete=dates.every(known) && bucket.window.end<=now;
    const exception=exceptions.find(e=>e.scope==='daily'&&e.date===bucket.date);
    const status=exception?'exception':!complete?'incomplete':maximum>=settings.dailyRestHours*60?'observed':'potential';
    let detail=exception?validateException(exception,actualUnion,known,settings,bounds,now,Math.max(0,settings.dailyRestHours*60-maximum)):undefined;
    if(status==='potential')warn('dailyRest',`Potencjalnie zbyt krótki odpoczynek w dobie pracowniczej: ${Math.round(maximum)} min (minimum ${settings.dailyRestHours*60}).`,bucket.date);
    if(exception)warn('review',detail!,bucket.date);
    dailyRests.push({date:bucket.date,minutes:maximum,required:settings.dailyRestHours*60,status,detail});
  }
  // Work outside the employee-day windows is never silently classified as ordinary time.
  const covered=minutes(actualUnion.flatMap(i=>buckets.flatMap(b=>{const piece=intersect(i,b.window);return piece?[piece]:[]})),bounds);
  if(covered<minutes(actualUnion,bounds))warn('review','Część pracy wykracza poza zidentyfikowane doby pracownicze. Nadgodziny wymagają ręcznej weryfikacji.');
  const context:Interval={start:zonedTime(horizonStart,'00:00',settings.timeZone),end:zonedTime(addDate(horizonEnd,1),'00:00',settings.timeZone)};
  const allGaps=gaps(actualUnion,context);
  const weeklyRests:RestResult[]=[];
  for(let start=period.start;start<=period.end;start=addDate(start,7)) {
    const end=addDate(start,7);
    const window={start:zonedTime(start,'00:00',settings.timeZone),end:zonedTime(end,'00:00',settings.timeZone)};
    const partial=end>addDate(period.end,1);
    const exception=exceptions.find(e=>e.scope==='weekly'&&e.date===start);
    const reduced=!!exception;
    const required=reduced?24*60:settings.weeklyRestHours*60;
    const complete=dateRange(start,addDate(end,-1)).every(known)&&window.end<=now&&!partial;
    const inside=Math.max(0,...gaps(actualUnion,window).map(g=>(g.end-g.start)/MINUTE));
    const crossing=allGaps.filter(g=>intersect(g,window)&&g.end-g.start>=required*MINUTE&&(g.start<window.start||g.end>window.end));
    const boundaryCandidate=crossing.some(g=>dateRange(Temporal.Instant.fromEpochMilliseconds(g.start).toZonedDateTimeISO(settings.timeZone).toPlainDate().toString(),Temporal.Instant.fromEpochMilliseconds(g.end-1).toZonedDateTimeISO(settings.timeZone).toPlainDate().toString()).every(known));
    const status=exception?'exception':!complete?'incomplete':inside>=required?'observed':boundaryCandidate?'boundary':'potential';
    const detail=exception?`${inside<required?`Nie wykazano nawet ${required/60} h odpoczynku. `:''}${validateException(exception,actualUnion,known,settings,bounds,now,Math.max(0,settings.weeklyRestHours*60-inside))}`:partial?'Niepełny końcowy tydzień okresu: sprawdź również sąsiedni okres.':status==='boundary'?'Odpoczynek przekracza granicę tygodnia. Przypisanie do tygodni wymaga ręcznej weryfikacji.':undefined;
    if(status==='potential')warn('weeklyRest',`Potencjalny brak ${required/60} h odpoczynku w tygodniu rozpoczynającym się ${start}.`,start);
    if(status==='boundary')warn('review',detail!,start);
    if(exception)warn('review',detail!,start);
    weeklyRests.push({date:start,endDate:addDate(end,-1),minutes:inside,required,status,detail});
  }
  const days:DayAnalysis[]=rows.filter(r=>inPeriod(r.shift.date)).map(r=>({date:r.shift.date,planned:r.plannedMinutes,actual:r.actual?minutes([r.actual],bounds):0,billing:r.billing?minutes([r.billing],bounds):null,additional:r.billing?minutes([r.billing],bounds)-r.plannedMinutes:null,dailyOvertime:dailyByDate.get(r.shift.date)||0,night:r.actual?nightMinutes([r.actual],settings.timeZone,settings.nightStart,settings.nightEnd):0,correction:r.correction,confirmed:!!r.actual}));
  const actual=minutes(actualUnion,bounds);
  const billing=minutes(rows.flatMap(r=>r.billing?[r.billing]:[]),bounds);
  const planned=rows.reduce((sum,r)=>sum+plannedWithin(r),0);
  const plannedExecuted=rows.filter(r=>r.billing).reduce((sum,r)=>sum+plannedWithin(r),0);
  const dailyOvertime=minutes(dailyOvertimeIntervals,bounds);
  const relevantAdjustments=adjustments.filter(a=>inPeriod(a.date));
  for(const a of relevantAdjustments) if(a.kind==='absence'&&actualRows.some(r=>r.shift.date===a.date))warn('review','Nieobecność i potwierdzona praca w tym samym dniu. Sprawdź, czy korekta dotyczy właściwej części dnia.',a.date);
  const adjustmentMinutes=relevantAdjustments.reduce((sum,a)=>sum+a.hours*60,0);
  const nominal=period.quarterTotal===''?null:Number(period.quarterTotal)*60;
  const adjustedNominal=nominal===null?null:Math.max(0,nominal+adjustmentMinutes);
  if(nominal===null)warn('data','Wpisz ręcznie łączny nominał okresu. Nadgodziny średniotygodniowe i pozostały wymiar są niedostępne.');
  if(nominal!==null&&nominal+adjustmentMinutes<0)warn('review','Korekty obniżają wymiar poniżej zera. W analizie przyjęto zero; zweryfikuj korekty.');
  const monthlyBase=[period.month1,period.month2,period.month3];
  if(monthlyBase.some(v=>v===''))warn('data','Nie uzupełniono wszystkich ręcznych nominałów miesięcznych.');
  if(monthlyBase.every(v=>v!=='')&&nominal!==null&&monthlyBase.reduce<number>((sum,v)=>sum+Number(v)*60,0)!==nominal)warn('review','Suma nominałów miesięcznych różni się od nominału kwartalnego. W bilansie okresu użyto podanej wartości kwartalnej.');
  if(Temporal.PlainDate.from(period.start).add({months:3}).subtract({days:1}).toString()!==period.end)warn('review','Daty nie wyznaczają pełnych trzech miesięcy. Sprawdź ustawienia okresu kwartalnego.');
  const months=[0,1,2].map(index=>{const key=Temporal.PlainDate.from(period.start).with({day:1}).add({months:index}).toString().slice(0,7);const list=days.filter(d=>d.date.startsWith(key));const base=monthlyBase[index]===''?null:Number(monthlyBase[index])*60;const correction=relevantAdjustments.filter(a=>a.date.startsWith(key)).reduce((sum,a)=>sum+a.hours*60,0);return {key,base,adjusted:base===null?null:Math.max(0,base+correction),planned:list.reduce((s,d)=>s+d.planned,0),actual:list.reduce((s,d)=>s+d.actual,0),billing:list.reduce((s,d)=>s+(d.billing??0),0)}});
  const ordinary=actual-dailyOvertime;
  const weeklyOvertime=adjustedNominal===null?null:Math.max(0,ordinary-adjustedNominal);
  const shortfall=adjustedNominal===null?null:Math.max(0,adjustedNominal-ordinary);
  const preliminary=now<bounds.end||unknownDates.length>0||warnings.some(w=>w.kind==='data');
  return {valid:true as const,warnings,days,months,dailyRests,weeklyRests,unknownDates,preliminary,
    totals:{planned,actual,billing,additional:billing-plannedExecuted,dailyOvertime,weeklyOvertime,shortfall,remaining:shortfall,nominal,adjustedNominal,adjustmentMinutes,night:nightMinutes(actualUnion.flatMap(i=>{const part=intersect(i,bounds);return part?[part]:[]}),settings.timeZone,settings.nightStart,settings.nightEnd),correction:days.reduce((s,d)=>s+d.correction,0)}};
}
function validateException(e:RestException,work:Interval[],known:(date:string)=>boolean,settings:AnalysisSettings,bounds:Interval,now:number,deficit:number) {
  const prefix=`Wyjątek: ${e.reason}. `;
  if(!e.compensationStart||!e.compensationEnd)return prefix+'Wymaga ręcznej weryfikacji; nie wskazano odpoczynku równoważnego.';
  try {
    const [sd,st]=e.compensationStart.split('T'),[ed,et]=e.compensationEnd.split('T');
    const interval={start:zonedTime(sd,st,settings.timeZone),end:zonedTime(ed,et,settings.timeZone)};
    if(interval.end<=interval.start||minutes(work,interval)>0)return prefix+'Wskazany odpoczynek równoważny jest nieprawidłowy lub nakłada się na pracę.';
    if(!dateRange(sd,ed).every(known)||interval.end>now)return prefix+'Odpoczynek równoważny ma niekompletną lub przyszłą ewidencję.';
    if(interval.start<bounds.start||interval.end>bounds.end)return prefix+'Odpoczynek równoważny poza okresem; sprawdź termin jego udzielenia.';
    if((interval.end-interval.start)/MINUTE<deficit)return prefix+'Wskazany odpoczynek jest krótszy od stwierdzonego niedoboru.';
    return prefix+'Odnotowano przedział wolny od potwierdzonej pracy. Podstawa wyjątku, termin i udzielenie odpoczynku równoważnego wymagają ręcznej weryfikacji.';
  } catch {return prefix+'Nieprawidłowy lub niejednoznaczny czas odpoczynku równoważnego.';}
}
export type WorkAnalysis = ReturnType<typeof analyzeWork>;

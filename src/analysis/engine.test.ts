import { describe, expect, it } from 'vitest';
import type { AnalysisShift, PeriodSettings } from '../db';
import { calculateBillingEnd, DEFAULT_ROUNDING } from '../worktime';
import { analyzeWork } from './engine';
import { addDate, captureLocalTime, HOUR, zonedTime } from './time';
import { DEFAULT_ANALYSIS, type AnalysisSettings, type NominalAdjustment, type RestException } from './types';
const period:PeriodSettings={id:'current',start:'2026-01-01',end:'2026-03-31',month1:16,month2:0,month3:0,quarterTotal:16};
const settings:AnalysisSettings={...DEFAULT_ANALYSIS,rulesConfirmed:true,completeFrom:'2025-12-20',completeThrough:'2026-12-31'};
const now=Date.parse('2027-01-15T12:00:00Z');
function shift(date:string,start='08:00',end='16:00',actualEnd=end,options:Partial<AnalysisShift>={}):AnalysisShift {
  return calculateBillingEnd({date,start,end,plannedStart:start,plannedEnd:end,actualStart:start,actualEnd,nextDay:end<start,actualEndNextDay:actualEnd<start,actualConfirmed:true,dayOff:false,code:'A',...options},DEFAULT_ROUNDING);
}
function analyze(shifts:AnalysisShift[], opts:Partial<AnalysisSettings>={}, p:PeriodSettings=period, corrections:NominalAdjustment[]=[], exceptions:RestException[]=[], at=now) {
  const result=analyzeWork(shifts,p,{...settings,...opts},DEFAULT_ROUNDING,corrections,exceptions,at);
  if(!result.valid)throw new Error(result.error);
  return result;
}
describe('normy i bilans okresu',()=>{
  it('równoważny plan 12 h nie generuje nadgodzin, dopiero jego przekroczenie',()=>{
    expect(analyze([shift('2026-01-01','06:00','18:00')]).totals.dailyOvertime).toBe(0);
    expect(analyze([shift('2026-01-01','06:00','18:00','19:00')]).totals.dailyOvertime).toBe(60);
    expect(analyze([shift('2026-01-01','06:00','18:00')],{system:'basic'}).totals.dailyOvertime).toBe(240);
  });
  it('krótszy plan nie obniża normy dobowej do długości zmiany',()=>{
    const result=analyze([shift('2026-01-01','08:00','14:00','17:00')]);
    expect(result.totals.additional).toBe(180);expect(result.totals.dailyOvertime).toBe(60);
  });
  it('bilans średniotygodniowy obejmuje cały kwartał i odejmuje dobowe tylko raz',()=>{
    const r=analyze([shift('2026-01-01','08:00','16:00','18:00'),shift('2026-02-01'),shift('2026-03-01')]);
    expect(r.totals.actual).toBe(26*60);expect(r.totals.dailyOvertime).toBe(120);expect(r.totals.weeklyOvertime).toBe(480);
    expect(r.totals.dailyOvertime+r.totals.weeklyOvertime!).toBe(600);
    expect(analyze([shift('2026-01-01')],{},period,[],[],Date.parse('2026-02-01T00:00Z')).preliminary).toBe(true);
  });
  it('planowana niedziela lub święto nie oznaczają automatycznie nadgodzin',()=>{
    const r=analyze([shift('2026-01-01'),shift('2026-01-04')]);expect(r.totals.dailyOvertime).toBe(0);expect(r.totals.weeklyOvertime).toBe(0);
  });
  it('ręczna korekta rozliczenia nie zmienia faktycznych godzin ani nadgodzin',()=>{
    const r=analyze([shift('2026-01-01','08:00','16:00','16:00',{billingEndOverride:'17:00',billingEndOverrideNextDay:false})]);
    expect(r.totals.actual).toBe(480);expect(r.totals.billing).toBe(540);expect(r.totals.correction).toBe(60);expect(r.totals.dailyOvertime).toBe(0);
  });
  it('korekta nieobecności obniża wymiar bez zmiany nominałów',()=>{
    const p={...period,quarterTotal:24,month1:24};
    const r=analyze([shift('2026-01-01'),shift('2026-01-02')],{},p,[{date:'2026-01-03',hours:-8,kind:'absence',reason:'Urlop zgodnie z planem 8 h'}]);
    expect(p.quarterTotal).toBe(24);expect(r.totals.adjustedNominal).toBe(960);expect(r.totals.remaining).toBe(0);expect(r.months[0].base).toBe(1440);expect(r.months[0].adjusted).toBe(960);
  });
  it('nie zastępuje brakującego nominału sumą miesięcy',()=>{
    const r=analyze([shift('2026-01-01')],{},{...period,quarterTotal:''});expect(r.totals.weeklyOvertime).toBeNull();expect(r.totals.remaining).toBeNull();expect(r.preliminary).toBe(true);
  });
  it('nie liczy predykcji godzin faktycznych jako potwierdzonej pracy',()=>{
    const r=analyze([shift('2026-01-01','08:00','16:00','16:00',{actualConfirmed:false})]);expect(r.totals.planned).toBe(480);expect(r.totals.actual).toBe(0);expect(r.preliminary).toBe(true);
  });
  it('potwierdzona praca w przyszłości nie powiększa sum wykonania',()=>{
    const r=analyze([shift('2026-03-01')],{},period,[],[],Date.parse('2026-02-01T00:00Z'));expect(r.totals.actual).toBe(0);expect(r.warnings.some(w=>w.message.includes('w przyszłości'))).toBe(true);
  });
  it('nakładające się przedziały są sumowane jednokrotnie',()=>{
    const r=analyze([shift('2026-01-01','20:00','06:00'),shift('2026-01-02','04:00','12:00')]);expect(r.totals.actual).toBe(16*60);expect(r.warnings.some(w=>w.message.includes('nakładają'))).toBe(true);
  });
});
describe('doby pracownicze i odpoczynki',()=>{
  it('łączy ponowne wejście w 24-godzinnej dobie zamiast liczyć osobno daty',()=>{
    const shifts=[shift('2026-01-01','14:00','22:00'),shift('2026-01-02','06:00','14:00')];
    expect(analyze(shifts).totals.dailyOvertime).toBe(480);
    expect(analyze(shifts,{flexibleStart:true}).totals.dailyOvertime).toBe(0);
    expect(analyze(shifts).dailyRests[0].status).toBe('potential');
  });
  it('liczy 11 h oryginalnego odpoczynku bez końca zaokrąglonego',()=>{
    const r=analyze([shift('2026-01-01','08:00','20:00','20:00',{billingEndOverride:'21:00'}),shift('2026-01-02','07:00','15:00')]);
    expect(r.dailyRests[0].minutes).toBe(660);expect(r.dailyRests[0].status).toBe('observed');
  });
  it('nie pomija końca ponownej zmiany wykraczającego poza pierwszą dobę',()=>{
    const r=analyze([shift('2026-01-01','09:00','17:00'),shift('2026-01-02','08:00','20:00')],{system:'basic'});
    expect(r.totals.actual).toBe(20*60);expect(r.totals.dailyOvertime).toBe(4*60);
    expect(r.warnings.some(w=>w.message.includes('poza zidentyfikowane'))).toBe(false);
  });
  it('wykrywa krótki odpoczynek w dobie nawet przy długiej późniejszej przerwie',()=>{
    const r=analyze([shift('2026-01-01','08:00','22:00'),shift('2026-01-02','07:00','15:00')]);expect(r.dailyRests[0].minutes).toBe(540);expect(r.dailyRests[0].status).toBe('potential');
  });
  it('brak danych nie stanowi potwierdzenia odpoczynku',()=>{
    const r=analyze([shift('2026-01-01')],{completeFrom:'',completeThrough:''});expect(r.dailyRests[0].status).toBe('incomplete');expect(r.weeklyRests[0].status).toBe('incomplete');
  });
  const april={...period,start:'2026-04-01',end:'2026-06-30'};
  it('tygodnie liczy od pierwszego dnia okresu, także gdy jest środa',()=>{
    const rows=Array.from({length:10},(_,i)=>shift(addDate(april.start,i-1)));
    const r=analyze(rows,{},april);expect(r.weeklyRests[0].date).toBe('2026-04-01');expect(r.weeklyRests[1].date).toBe('2026-04-08');expect(r.weeklyRests[0].minutes).toBeLessThan(35*60);expect(r.weeklyRests[0].status).toBe('potential');
  });
  it('rozpoznaje 35 h nieprzerwanego odpoczynku wewnątrz tygodnia',()=>{
    const r=analyze([shift('2026-04-01'),shift('2026-04-02'),shift('2026-04-05')],{},april);expect(r.weeklyRests[0].status).toBe('observed');
  });
  it('sprawdza przerwę przez granicę tygodni i oznacza przypisanie do weryfikacji',()=>{
    const rows=[...Array.from({length:7},(_,i)=>shift(addDate('2026-04-01',i),'06:00','14:00')),...Array.from({length:6},(_,i)=>shift(addDate('2026-04-09',i),'06:00','14:00'))];
    const r=analyze(rows,{},april);expect(r.weeklyRests[0].status).toBe('boundary');expect(r.weeklyRests[1].status).toBe('boundary');
  });
  it('zachowuje ostrzeżenie po wpisaniu wyjątku i sprawdza odpoczynek równoważny',()=>{
    const exception:RestException={date:'2026-01-01',scope:'daily',kind:'emergency',reason:'Usuwanie awarii',compensationStart:'2026-01-03T00:00',compensationEnd:'2026-01-03T12:00'};
    const r=analyze([shift('2026-01-01','08:00','22:00'),shift('2026-01-02','07:00','15:00')],{},period,[],[exception]);expect(r.dailyRests[0].status).toBe('exception');expect(r.dailyRests[0].detail).toContain('ręcznej weryfikacji');
    const invalid=analyze([shift('2026-01-01','08:00','22:00'),shift('2026-01-02','07:00','15:00')],{},period,[],[{...exception,compensationStart:'2026-01-02T08:00',compensationEnd:'2026-01-02T12:00'}]);expect(invalid.dailyRests[0].detail).toContain('nakłada');
  });
  it('wyjątek tygodniowy dla zmiany zmiany nie schodzi poniżej 24 h',()=>{
    const rows=Array.from({length:7},(_,i)=>shift(addDate(april.start,i)));
    const r=analyze(rows,{},april,[],[{date:april.start,scope:'weekly',kind:'shiftChange',reason:'Przejście na inną zmianę',compensationStart:'',compensationEnd:''}]);expect(r.weeklyRests[0].required).toBe(1440);expect(r.weeklyRests[0].detail).toContain('Nie wykazano nawet 24');
  });
});
describe('północ i zmiany czasu Europe/Warsaw',()=>{
  it('przycina zmianę na granicy okresu bez sztucznego dodatkowego czasu',()=>{
    const r=analyze([shift('2025-12-31','22:00','06:00')]);expect(r.totals.actual).toBe(360);expect(r.totals.planned).toBe(360);expect(r.totals.additional).toBe(0);
  });
  it('nie usuwa godzin faktycznych przy nieistniejącym końcu po zaokrągleniu',()=>{
    const r=analyze([shift('2026-03-29','00:00','01:59')]);expect(r.totals.actual).toBe(119);expect(r.days[0].billing).toBeNull();expect(r.days[0].additional).toBeNull();expect(r.preliminary).toBe(true);
  });
  it('przycisk zakończenia może zapisać właściwe wystąpienie dwukrotnej godziny',()=>{
    expect(captureLocalTime(Date.parse('2026-10-25T00:30:20Z'),'Europe/Warsaw')).toEqual({date:'2026-10-25',clock:'02:30',occurrence:'earlier'});
    expect(captureLocalTime(Date.parse('2026-10-25T01:30:20Z'),'Europe/Warsaw')).toEqual({date:'2026-10-25',clock:'02:30',occurrence:'later'});
  });
  it('liczy nocną zmianę i rzeczywiste nocne minuty przez północ',()=>{
    const r=analyze([shift('2026-01-01','22:00','06:00','06:15')]);expect(r.totals.actual).toBe(495);expect(r.totals.night).toBe(480);expect(r.totals.dailyOvertime).toBe(15);
  });
  it('wiosenna noc ma 7 h, jesienna 9 h niezależnie od strefy przeglądarki',()=>{
    const spring=analyze([shift('2026-03-28','22:00','06:00')]);const fall=analyze([shift('2026-10-24','22:00','06:00')],{},{...period,start:'2026-10-01',end:'2026-12-31'});
    expect(spring.totals.planned).toBe(480);expect(spring.totals.actual).toBe(420);expect(spring.totals.night).toBe(420);expect(fall.totals.actual).toBe(540);expect(fall.totals.night).toBe(540);
  });
  it('odrzuca nieistniejącą godzinę i wymaga wyboru godziny dwukrotnej',()=>{
    expect(()=>zonedTime('2026-03-29','02:30','Europe/Warsaw')).toThrow('nie istnieje');
    expect(()=>zonedTime('2026-10-25','02:30','Europe/Warsaw')).toThrow('dwukrotnie');
    expect(zonedTime('2026-10-25','02:30','Europe/Warsaw','later')-zonedTime('2026-10-25','02:30','Europe/Warsaw','earlier')).toBe(HOUR);
    const p={...period,start:'2026-10-01',end:'2026-12-31'};
    const ambiguous=shift('2026-10-25','02:10','03:10');expect(analyze([ambiguous],{},p).totals.actual).toBe(0);expect(analyze([ambiguous],{},p).totals.planned).toBe(60);
    expect(analyze([{...ambiguous,actualStartOccurrence:'later'}],{},p).totals.actual).toBe(60);
  });
  it('odpoczynek przez wiosenną zmianę czasu mierzy rzeczywistymi 11 godzinami',()=>{
    const r=analyze([shift('2026-03-28','08:00','20:00'),shift('2026-03-29','08:00','16:00')]);expect(r.dailyRests[0].minutes).toBe(660);
  });
});

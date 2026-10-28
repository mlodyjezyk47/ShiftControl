import { describe, expect, it } from 'vitest';
import { calculateMonth, calculateQuarter, DEFAULT_PAY_MONTH, money, type PayInput, type PayQuarter } from './model';
const input=(patch:Partial<PayInput['config']>={},fields:Partial<PayInput>={}):PayInput=>({key:'2026-11',config:{...DEFAULT_PAY_MONTH,nominal:160,...patch},actualMinutes:9600,additionalMinutes:0,dailyMinutes:0,nightMinutes:0,components:[],...fields});
function month(patch:Partial<PayInput['config']>={},fields:Partial<PayInput>={}){const r=calculateMonth(input(patch,fields));if(!r.valid)throw new Error(r.error);return r;}
const q:PayQuarter={nominal:480,weeklyPremium:'100',rateMonth:'2026-12'};
describe('wynagrodzenie miesięczne',()=>{
  it('zaokrągla dodatnie kwoty i potrącenia symetrycznie do grosza',()=>{expect(money(1.005)).toBe(1.01);expect(money(-1.005)).toBe(-1.01)});
  it('stawka zmienia się wraz z nominałem miesiąca i edytowalną podstawą',()=>{
    expect(month().rate).toBe(6050/160);expect(month({nominal:176}).rate).toBe(6050/176);expect(month({base:6400}).rate).toBe(40);
  });
  it('dopuszcza stałą stawkę i osobne składniki normalnego wynagrodzenia',()=>{
    const r=month({method:'fixed',fixedRate:40,normalMonthlyExtras:160,hours50:2},{dailyMinutes:120});expect(r.rate).toBe(40);expect(r.normalRate).toBe(41);expect(r.normal).toBe(82);expect(r.p50).toBe(40);
  });
  it('liczy normalne wynagrodzenie oraz dodatki bez dublowania godzin',()=>{
    const r=month({base:6400,hours50:2,hours100:1},{dailyMinutes:180});expect(r.normal).toBe(120);expect(r.p50).toBe(40);expect(r.p100).toBe(40);expect(r.total).toBe(6600);expect(r.unresolved).toBe(0);
    expect(calculateMonth(input({hours50:2,hours100:2},{dailyMinutes:180})).valid).toBe(false);
  });
  it('nie wybiera samodzielnie dodatku za niezaklasyfikowane godziny',()=>{
    const r=month({}, {key:'2026-11',dailyMinutes:120});expect(r.p50).toBe(0);expect(r.p100).toBe(0);expect(r.unresolved).toBe(2);expect(r.partial).toBe(true);
  });
  it('liczy dodatek nocny z wpisanej stawki lub podstawy referencyjnej',()=>{
    expect(month({nightHourly:6},{nightMinutes:480}).night).toBe(48);
    expect(month({nightMethod:'reference',nightReference:4800,nightPercent:20},{nightMinutes:480}).night).toBe(48);
    expect(month({nightMethod:'reference',nightReference:4800,nightPercent:20,nominal:120},{nightMinutes:480}).night).toBe(64);
  });
  it('nie zastępuje brakującego nominału wymyśloną stawką',()=>{
    const r=month({nominal:''},{dailyMinutes:120});expect(r.rate).toBeNull();expect(r.normal).toBeNull();expect(r.partial).toBe(true);expect(r.total).toBe(6050);
  });
  it('premię, korektę i składniki miesięczne nalicza tylko we właściwym miesiącu',()=>{
    const r=month({base:6400,bonus:300,baseAdjustment:-400},{components:[{id:'a',name:'Transport',amount:100,timing:'monthly',scope:'all'},{id:'b',name:'Jednorazowa',amount:200,timing:'monthly',scope:'2026-10'},{id:'c',name:'Kwartalna',amount:500,timing:'quarterEnd',scope:'all'}]});expect(r.base).toBe(6000);expect(r.components).toBe(100);expect(r.total).toBe(6400);
  });
  it('odrzuca nieprawidłowe liczby oraz podstawę po korekcie poniżej zera',()=>{
    expect(calculateMonth(input({base:-1})).valid).toBe(false);expect(calculateMonth(input({hours50:NaN})).valid).toBe(false);expect(calculateMonth(input({baseAdjustment:-7000})).valid).toBe(false);
  });
});
describe('wypłata po kwartale',()=>{
  it('średniotygodniowe i kwartalne składniki dodaje raz, poza miesięcznymi',()=>{
    const c={...DEFAULT_PAY_MONTH,base:6400,nominal:160 as const,hours50:2};
    const monthly=month(c,{dailyMinutes:120});
    const r=calculateQuarter([monthly],180,q,c,[{id:'a',name:'Premia kwartalna',amount:500,timing:'quarterEnd',scope:'all'}],'2026-10-01/2026-12-31');
    expect(monthly.total).toBe(6520);expect(r.normal).toBe(120);expect(r.premium).toBe(120);expect(r.other).toBe(500);expect(r.deferred).toBe(740);expect(r.total).toBe(7260);
  });
  it('nieznanego dodatku średniotygodniowego nie przyjmuje jako 100%',()=>{
    const r=calculateQuarter([month()],120,{...q,weeklyPremium:'unverified'},input().config,[],'Q');expect(r.premium).toBeNull();expect(r.normal).toBe(75.63);expect(r.partial).toBe(true);
  });
  it('bez nominału okresu nie szacuje godzin średniotygodniowych',()=>{
    const r=calculateQuarter([month()],null,q,input().config,[],'Q');expect(r.normal).toBeNull();expect(r.premium).toBeNull();expect(r.partial).toBe(true);
  });
  it('stosuje wybrany miesiąc stawki, nie średnią stawek w kwartale',()=>{
    expect(calculateQuarter([],120,q,input({base:6400,nominal:160}).config,[],'Q').premium).toBe(80);
    expect(calculateQuarter([],120,q,input({base:6400,nominal:128}).config,[],'Q').premium).toBe(100);
  });
});

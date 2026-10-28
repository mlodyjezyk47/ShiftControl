export type PayMonth = {
  base: number; nominal: number | ''; method: 'nominal'|'fixed'; fixedRate:number;
  normalMonthlyExtras:number; baseAdjustment:number; premium50:number; premium100:number;
  hours50:number; hours100:number; nightMethod:'fixed'|'reference'; nightHourly:number;
  nightReference:number; nightPercent:number; bonus:number;
};
export type PayQuarter = { nominal:number|''; weeklyPremium:'unverified'|'50'|'100'; rateMonth:string };
export type PayComponent = { id:string; name:string; amount:number; timing:'monthly'|'quarterEnd'; scope:string };
export type PayrollSettings = { months:Record<string,PayMonth>; quarters:Record<string,PayQuarter>; components:PayComponent[] };
export const DEFAULT_PAY_MONTH:PayMonth={base:6050,nominal:'',method:'nominal',fixedRate:0,normalMonthlyExtras:0,baseAdjustment:0,premium50:50,premium100:100,hours50:0,hours100:0,nightMethod:'fixed',nightHourly:0,nightReference:0,nightPercent:20,bonus:0};
export const DEFAULT_PAYROLL:PayrollSettings={months:{},quarters:{},components:[]};
export type PayInput={key:string;config:PayMonth;actualMinutes:number;additionalMinutes:number;dailyMinutes:number;nightMinutes:number;components:PayComponent[]};
export const money=(value:number)=>Math.sign(value)*Math.round((Math.abs(value)+Number.EPSILON)*100)/100;
export function calculateMonth(input:PayInput) {
  const {config:c}=input;const warnings:string[]=[];
  const numeric=Object.values(c).filter(v=>typeof v==='number') as number[];
  if(numeric.some(v=>!Number.isFinite(v))||(typeof c.nominal==='number'&&c.nominal<0)||c.base<0||c.fixedRate<0||c.hours50<0||c.hours100<0||c.premium50<0||c.premium100<0||c.nightHourly<0||c.nightReference<0||c.nightPercent<0||c.normalMonthlyExtras<0) return {valid:false as const,error:'Wpisz poprawne, nieujemne stawki i liczby godzin. Korekta podstawy może być ujemna.'};
  const nominal=typeof c.nominal==='number'&&c.nominal>0?c.nominal:null;
  const rate=c.method==='fixed'?c.fixedRate:nominal===null?null:c.base/nominal;
  const normalRate=rate===null||(c.normalMonthlyExtras!==0&&nominal===null)?null:rate+(nominal===null?0:c.normalMonthlyExtras/nominal);
  if(rate===null)warnings.push('Brak dodatniego nominału: nie można wyznaczyć stawki godzinowej.');
  if(c.method==='fixed'&&c.fixedRate===0)warnings.push('Ustawiona stała stawka wynosi 0 zł. Sprawdź jej wartość.');
  const dailyHours=input.dailyMinutes/60;
  if(c.hours50+c.hours100>dailyHours+0.00001)return {valid:false as const,error:`Przypisano więcej dodatków niż nadgodzin dobowych (${dailyHours.toFixed(2)} h). Te same godziny nie mogą trafić do obu dodatków.`};
  const unresolved=Math.max(0,dailyHours-c.hours50-c.hours100);
  if(unresolved>0)warnings.push(`${unresolved.toFixed(2)} h nadgodzin dobowych wymaga przypisania dodatku. Kwota tych dodatków nie jest uwzględniona.`);
  const nightRate=c.nightMethod==='fixed'?c.nightHourly:nominal===null?null:c.nightReference/nominal*c.nightPercent/100;
  if(input.nightMinutes>0&&(nightRate===null||nightRate===0))warnings.push('Sprawdź stawkę dodatku nocnego; nie wyznaczono dodatniej kwoty za noc.');
  const normal=normalRate===null?null:money(dailyHours*normalRate);
  const p50=rate===null?null:money(c.hours50*rate*c.premium50/100);
  const p100=rate===null?null:money(c.hours100*rate*c.premium100/100);
  const night=nightRate===null?null:money(input.nightMinutes/60*nightRate);
  const components=input.components.filter(x=>x.timing==='monthly'&&(x.scope==='all'||x.scope===input.key)).reduce((s,x)=>s+x.amount,0);
  const base=money(c.base+c.baseAdjustment);
  if(base<0)return {valid:false as const,error:'Podstawa po korekcie nie może być ujemna.'};
  return {valid:true as const,base,rate,normalRate,normal,p50,p100,night,bonus:money(c.bonus),components:money(components),unresolved,warnings,
    total:money(base+(normal??0)+(p50??0)+(p100??0)+(night??0)+c.bonus+components),partial:unresolved>0||normal===null||p50===null||p100===null||night===null||warnings.length>0};
}
export function calculateQuarter(months:ReturnType<typeof calculateMonth>[],weeklyMinutes:number|null,config:PayQuarter,rateConfig:PayMonth,components:PayComponent[],quarterKey:string) {
  const reference=calculateMonth({key:config.rateMonth,config:{...rateConfig,hours50:0,hours100:0},actualMinutes:0,additionalMinutes:0,dailyMinutes:0,nightMinutes:0,components:[]});
  const warnings:string[]=[];
  const hours=weeklyMinutes===null?null:weeklyMinutes/60;
  if(hours===null)warnings.push('Brak kwartalnego wymiaru: nie można oszacować średniotygodniowych.');
  if(config.weeklyPremium==='unverified'&&(hours??0)>0)warnings.push('Dodatek średniotygodniowy wymaga weryfikacji i wyboru stawki.');
  const rate=reference.valid?reference.rate:null,normalRate=reference.valid?reference.normalRate:null;
  const normal=hours===null||normalRate===null?null:money(hours*normalRate);
  const premium=hours===null?null:hours===0?0:config.weeklyPremium==='unverified'||rate===null?null:money(hours*rate*(config.weeklyPremium==='50'?rateConfig.premium50:rateConfig.premium100)/100);
  const other=money(components.filter(c=>c.timing==='quarterEnd'&&(c.scope==='all'||c.scope===quarterKey)).reduce((s,c)=>s+c.amount,0));
  const monthly=money(months.reduce((s,m)=>s+(m.valid?m.total:0),0));
  if(!reference.valid)warnings.push(reference.error);
  if((hours??0)>0&&normalRate===null)warnings.push('Brak stawki do wypłaty po kwartale.');
  return {monthly,normal,premium,other,deferred:money((normal??0)+(premium??0)+other),total:money(monthly+(normal??0)+(premium??0)+other),warnings,partial:months.some(m=>!m.valid||m.partial)||normal===null||premium===null||warnings.length>0};
}

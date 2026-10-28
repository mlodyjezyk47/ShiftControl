import { z } from 'zod';
import { db, DATABASE_VERSION } from '../db';
export { DATABASE_VERSION } from '../db';
export const BACKUP_VERSION=1;
export const TABLES=['shifts','templates','periods','preferences','codes','importLogs','nominalAdjustments','restExceptions'] as const;
const date=z.string().refine(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Nieprawidłowa data');
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const stamp=z.string().datetime({offset:true});
const text=z.string().max(20000), code=z.string().max(100);
const id=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const num=z.number().finite(), positive=num.nonnegative();
const nominal=z.union([positive,z.literal('')]);
const shift=z.object({id,date,code,start:time,end:time,nextDay:z.boolean(),dayOff:z.boolean(),templateId:id.optional(),plannedStart:time.optional(),plannedEnd:time.optional(),actualStart:time.optional(),actualEnd:time.optional(),actualEndNextDay:z.boolean().optional(),billingEnd:time.optional(),billingEndNextDay:z.boolean().optional(),billingEndOverride:time.optional(),billingEndOverrideNextDay:z.boolean().optional(),actualConfirmed:z.boolean().optional(),source:z.enum(['manual','pdf']).optional(),importedAt:stamp.optional(),planConfirmed:z.boolean().optional(),note:text.optional(),color:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),dayType:z.enum(['work','off','other']).optional(),actualStartOccurrence:z.enum(['earlier','later']).optional(),actualEndOccurrence:z.enum(['earlier','later']).optional()}).strict();
const template=z.object({id,code,name:text,start:time,end:time,nextDay:z.boolean()}).strict();
const period=z.object({id:z.literal('current'),start:date,end:date,month1:nominal,month2:nominal,month3:nominal,quarterTotal:nominal}).strict().refine(p=>p.end>=p.start,'Koniec okresu przed początkiem');
const definition=z.object({code,name:text,start:time,end:time,nextDay:z.boolean(),dayType:z.enum(['work','off','other']),color:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).strict();
const log=z.object({id,month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),importedAt:stamp,filename:text,fingerprint:text,recognizedDays:positive.int(),changedDays:positive.int(),conflicts:positive.int(),status:z.enum(['imported','updated'])}).strict();
const adjustment=z.object({id,date,hours:num,kind:z.enum(['absence','correction']),reason:text}).strict();
const localTime=z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/).refine(v=>date.safeParse(v.slice(0,10)).success,'Nieprawidłowa data odpoczynku')]);
const exception=z.object({id,date,scope:z.enum(['daily','weekly']),kind:z.enum(['emergency','management','shiftChange']),reason:text,compensationStart:localTime,compensationEnd:localTime}).strict();
const payMonth=z.object({base:positive,nominal,method:z.enum(['nominal','fixed']),fixedRate:positive,normalMonthlyExtras:positive,baseAdjustment:num,premium50:positive,premium100:positive,hours50:positive,hours100:positive,nightMethod:z.enum(['fixed','reference']),nightHourly:positive,nightReference:positive,nightPercent:positive,bonus:num}).strict();
const jsonRecord=z.record(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),payMonth);
const payroll=z.object({months:jsonRecord,quarters:z.record(z.string().max(100),z.object({nominal,weeklyPremium:z.enum(['unverified','50','100']),rateMonth:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}).strict()),components:z.array(z.object({id:text,name:text,amount:num,timing:z.enum(['monthly','quarterEnd']),scope:text}).strict())}).strict();
const analysis=z.object({rulesConfirmed:z.boolean(),system:z.enum(['basic','equivalent']),dailyNormHours:positive,maxDailyHours:positive,timeZone:z.enum(['Europe/Warsaw','UTC']),nightStart:time,nightEnd:time,dailyRestHours:positive,weeklyRestHours:positive,completeFrom:z.union([date,z.literal('')]),completeThrough:z.union([date,z.literal('')]),flexibleStart:z.boolean()}).strict();
const pref=z.object({key:text,value:z.string().max(10_000_000)}).strict().superRefine((p,ctx)=>{
 const schema=p.key==='analysis'?analysis:p.key==='payroll'?payroll:p.key==='rounding'?z.object({enabled:z.boolean(),blockMinutes:z.number().int().min(1).max(1440),boundary:z.enum(['keep','advance'])}).strict():null;
 if(p.key==='theme'&&!['dark','light'].includes(p.value))ctx.addIssue({code:'custom',message:'Niepoprawny motyw'});
 if(schema)try{schema.parse(JSON.parse(p.value))}catch{ctx.addIssue({code:'custom',message:`Nieprawidłowe ustawienia: ${p.key}`})}
});
const tableSchema=z.object({shifts:z.array(shift),templates:z.array(template),periods:z.array(period),preferences:z.array(pref),codes:z.array(definition),importLogs:z.array(log),nominalAdjustments:z.array(adjustment),restExceptions:z.array(exception)}).strict();
export type BackupTables=z.infer<typeof tableSchema>;
export type Backup={app:'ShiftControl';formatVersion:1;databaseVersion:number;createdAt:string;tables:BackupTables};
export function validateBackup(value:unknown):Backup {
 const envelope=z.object({app:z.literal('ShiftControl'),formatVersion:z.literal(1),databaseVersion:z.number().int().min(1).max(DATABASE_VERSION),createdAt:stamp,tables:z.record(z.string(),z.unknown())}).strict().parse(value);
 const data={...envelope.tables};
 if(envelope.databaseVersion<3){data.codes??=[];data.importLogs??=[]}
 if(envelope.databaseVersion<4){data.nominalAdjustments??=[];data.restExceptions??=[]}
 const tables=tableSchema.parse(data);
 for(const name of TABLES){const rows=tables[name] as unknown as Record<string,unknown>[];const key=name==='codes'?'code':name==='preferences'?'key':'id';if(new Set(rows.map(r=>r[key])).size!==rows.length)throw new Error(`Powtórzone klucze w tabeli ${name}`)}
 if(new Set(tables.shifts.map(s=>s.date)).size!==tables.shifts.length)throw new Error('Więcej niż jedna zmiana dla tej samej daty');
 return {...envelope,formatVersion:1,tables};
}
export async function snapshot():Promise<BackupTables>{return db.transaction('r',TABLES.map(n=>db.table(n)),async()=>Object.fromEntries(await Promise.all(TABLES.map(async n=>[n,await db.table(n).toArray()])))) as Promise<BackupTables>}
export async function makeBackup():Promise<Backup>{return {app:'ShiftControl',formatVersion:BACKUP_VERSION,databaseVersion:DATABASE_VERSION,createdAt:new Date().toISOString(),tables:await snapshot()}}
export function download(data:Blob,filename:string){const url=URL.createObjectURL(data);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export function downloadBackup(backup:Backup,prefix='ShiftControl-kopia'){download(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`${prefix}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`)}
export async function restoreBackup(backup:Backup,expected:BackupTables){
 const validated=validateBackup(backup);
 await db.transaction('rw',TABLES.map(n=>db.table(n)),async()=>{
  const current=Object.fromEntries(await Promise.all(TABLES.map(async n=>[n,await db.table(n).toArray()])));
  if(JSON.stringify(current)!==JSON.stringify(expected))throw new Error('Dane zmieniły się od podglądu. Wczytaj kopię ponownie przed przywróceniem.');
  for(const name of TABLES){await db.table(name).clear();await db.table(name).bulkPut(validated.tables[name])}
 });
}

import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { db } from '../db';
import { DEFAULT_ANALYSIS } from './types';

it('aktualizuje IndexedDB z Etapu 3 i zachowuje grafik, ewidencję, nominały oraz importy',async()=>{
  db.close();await Dexie.delete('ShiftControl');
  const old=new Dexie('ShiftControl');
  old.version(3).stores({shifts:'++id, date',templates:'++id, code',periods:'id',preferences:'key',codes:'code',importLogs:'++id, month, fingerprint'});
  const shift={id:1,date:'2026-11-03',code:'9',start:'09:00',end:'17:00',dayOff:false,nextDay:false,actualStart:'08:57',actualEnd:'18:36',billingEnd:'18:45',billingEndOverride:'18:45',actualConfirmed:true,note:'Ręczna korekta',source:'pdf'};
  const period={id:'current',start:'2026-10-01',end:'2026-12-31',month1:176,month2:152,month3:168,quarterTotal:496};
  await old.table('shifts').put(shift);await old.table('periods').put(period);
  await old.table('templates').put({id:1,code:'A',name:'Poranna',start:'06:00',end:'14:00',nextDay:false});
  await old.table('codes').put({code:'x',name:'Wolne',dayType:'off'});
  await old.table('importLogs').put({id:1,month:'2026-11',filename:'grafik.pdf',fingerprint:'abc'});
  await old.table('preferences').put({key:'theme',value:'light'});old.close();
  await db.open();
  expect(await db.shifts.get(1)).toEqual(shift);expect(await db.periods.get('current')).toEqual(period);
  expect(await db.templates.count()).toBe(1);expect(await db.codes.count()).toBe(1);expect(await db.importLogs.count()).toBe(1);expect((await db.preferences.get('theme'))?.value).toBe('light');
  await db.preferences.put({key:'analysis',value:JSON.stringify(DEFAULT_ANALYSIS)});
  await db.nominalAdjustments.add({date:'2026-11-04',hours:-8,kind:'absence',reason:'Urlop'});
  await db.restExceptions.add({date:'2026-11-03',scope:'daily',kind:'emergency',reason:'Awaria',compensationStart:'',compensationEnd:''});
  db.close();await db.open();
  expect(await db.nominalAdjustments.count()).toBe(1);expect(await db.restExceptions.count()).toBe(1);expect(JSON.parse((await db.preferences.get('analysis'))!.value)).toEqual(DEFAULT_ANALYSIS);
  expect(await db.shifts.get(1)).toEqual(shift);db.close();await Dexie.delete('ShiftControl');
});

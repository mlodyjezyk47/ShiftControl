import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { AnalysisShift } from '../db';
import { calculateBillingEnd, DEFAULT_ROUNDING, additionalMinutes, formatMinutes, normalizeShift } from '../worktime';
import { download } from './backup';
export function csv(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}).join(';')).join('\r\n')}
export function exportCsv(rows:unknown[][],name:string){download(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}),name)}
export function historyRows(shifts:AnalysisShift[],month:string){return [['Data','Kod','Plan od','Plan do','Plan +1','Faktycznie od','Faktycznie do','Faktycznie +1','Koniec rozliczeniowy','Rozliczenie +1','Potwierdzone','Dodatkowe minuty','Niedopracowanie minuty','Korekta ręczna'],...shifts.filter(s=>s.date.startsWith(month)&&(!s.dayOff||s.actualConfirmed)).sort((a,b)=>a.date.localeCompare(b.date)).map(raw=>{const s=raw.billingEnd?normalizeShift(raw):calculateBillingEnd(raw,DEFAULT_ROUNDING);const extra=s.actualConfirmed?additionalMinutes(s):null;return [s.date,s.code,s.plannedStart??s.start,s.plannedEnd??s.end,s.nextDay?'tak':'nie',s.actualStart,s.actualEnd,s.actualEndNextDay?'tak':'nie',s.billingEnd,s.billingEndNextDay?'tak':'nie',s.actualConfirmed?'tak':'nie',extra===null?'':Math.max(extra,0),extra===null?'':Math.max(-extra,0),s.billingEndOverride??'']})]}
export async function schedulePdf(shifts:AnalysisShift[],month:string){
 const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');
 const response=await fetch(`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`);if(!response.ok)throw new Error('Nie udało się wczytać czcionki PDF.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const doc=new jsPDF();doc.addFileToVFS('DejaVuSans.ttf',btoa(binary));doc.addFont('DejaVuSans.ttf','SC','normal');doc.setFont('SC');doc.setFontSize(18);doc.text(`ShiftControl — grafik ${month}`,14,18);doc.setFontSize(9);doc.text('Plan z lokalnej ewidencji. +1 oznacza zakończenie następnego dnia.',14,26);
 const start=startOfMonth(parseISO(`${month}-01`));const rows=eachDayOfInterval({start,end:endOfMonth(start)}).map(day=>{const date=format(day,'yyyy-MM-dd'),s=shifts.find(s=>s.date===date);return [date,s?.code||'—',s?.dayOff?'Wolne':s?`${s.plannedStart??s.start}–${s.plannedEnd??s.end}${s.nextDay?' +1':''}`:'Brak wpisu',s?.note||'']});
 autoTable(doc,{startY:32,head:[['Data','Kod','Plan','Notatka']],body:rows,styles:{font:'SC',fontStyle:'normal',fontSize:9,cellPadding:3},headStyles:{font:'SC',fontStyle:'normal',fillColor:[27,74,125]},columnStyles:{0:{cellWidth:32},1:{cellWidth:22},2:{cellWidth:52}}});
 doc.save(`ShiftControl-grafik-${month}.pdf`);
}
export {formatMinutes};

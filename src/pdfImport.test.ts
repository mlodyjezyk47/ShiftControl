import { describe, expect, it } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { jsPDF } from 'jspdf';
import { daysInMonth, matchingRows, parseScheduleTokens, type PdfToken } from './pdfImport';

function fixture(year:number,month:number,order=['Anna Nowak','Marta Zielińska'],number=15) {
  const count=daysInMonth(year,month);const tokens:PdfToken[]=[{text:`${['','styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'][month]} ${year}`,x:200,y:550,width:100,page:1}];
  for(let day=1;day<=count;day++) tokens.push({text:String(day),x:100+day*20,y:500,width:8,page:1});
  order.forEach((name,row)=>{const y=470-row*15;tokens.push({text:String(row?number:1),x:20,y,width:7,page:1},{text:name,x:35,y,width:60,page:1});for(let day=1;day<=count;day++) tokens.push({text:day===count?'NOWY':'x',x:100+day*20,y: y+2,width:8,page:1})});
  return tokens;
}
describe('tabela grafiku PDF',()=>{
  it.each([[2027,2,28],[2028,2,29],[2026,11,30],[2027,1,31]])('rozpoznaje %i-%i i %i dni', (year,month,count)=>{const p=parseScheduleTokens(fixture(year,month));expect(p.days).toHaveLength(count);expect(p.year).toBe(year);expect(p.month).toBe(month);expect(p.rows[1].cells[count]).toBe('NOWY')});
  it('odnajduje pracownika po nazwie mimo innego numeru i kolejności',()=>{const p=parseScheduleTokens(fixture(2027,1,['Marta ZIELINSKA','Anna Nowak'],7));expect(matchingRows(p.rows,'Zielińska  Marta')).toHaveLength(1);expect(matchingRows(p.rows,'Zielińska Marta')[0].number).toBe('1')});
  it('zgłasza brak tabeli i nie rozpoznaje błędnego miesiąca',()=>{expect(parseScheduleTokens([{text:'foobar 2027',x:0,y:0,width:10,page:1}]).errors).toContain('Nie rozpoznano nagłówków dni w tabeli.');expect(parseScheduleTokens(fixture(2027,2).map(t=>t.text.startsWith('luty')?{...t,text:'miesiąc 2027'}:t)).month).toBeUndefined()});
});
it('odczytuje wszystkie 30 dni z pliku PDF o układzie tabeli',async()=>{const pdf=new jsPDF({orientation:'landscape'});pdf.setFontSize(6);pdf.text('listopad 2026',120,10);pdf.text('15',5,30);pdf.text('Marta Zielinska',10,30);for(let day=1;day<=30;day++){pdf.text(String(day),70+day*7,20);pdf.text(day===30?'6':'9',70+day*7,30)}const bytes=new Uint8Array(pdf.output('arraybuffer'));const doc=await pdfjs.getDocument({data:bytes,useSystemFonts:true}).promise;const tokens:PdfToken[]=[];for(let page=1;page<=doc.numPages;page++){const content=await(await doc.getPage(page)).getTextContent();for(const item of content.items)if('str' in item&&item.str.trim())tokens.push({text:item.str.trim(),x:item.transform[4],y:item.transform[5],width:item.width,page})}const p=parseScheduleTokens(tokens);const row=matchingRows(p.rows,'Zielinska Marta')[0];expect([p.year,p.month,p.days.length]).toEqual([2026,11,30]);expect(row.number).toBe('15');expect(Object.keys(row.cells)).toHaveLength(30);expect(row.cells[1]).toBe('9');expect(row.cells[30]).toBe('6');expect(row.missing).toEqual([])});

export type PdfToken = { text: string; x: number; y: number; width: number; page: number };
export type ParsedRow = { name: string; number: string; cells: Record<number,string>; missing: number[] };
export type ParsedSchedule = { year?: number; month?: number; rows: ParsedRow[]; days: number[]; errors: string[] };
const monthNames = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const forms = ['stycz','lut','mar','kwie','maj','czerw','lip','sierp','wrześ','paździer','listopad','grud'];
export function daysInMonth(year:number,month:number) { return new Date(year,month,0).getDate(); }
export function monthLabel(year:number,month:number) { return `${monthNames[month-1]} ${year}`; }
export function detectMonth(text:string) {
  const clean=text.toLocaleLowerCase('pl-PL').replace(/\s+/g,' ');
  const hits: {year:number;month:number}[]=[];
  for(let m=1;m<=12;m++) {
    const re=new RegExp(`${forms[m-1]}[a-ząćęłńóśźż]*\\s+(20\\d{2}|19\\d{2})`,'gi');
    for(const match of clean.matchAll(re)) hits.push({month:m,year:Number(match[1])});
  }
  const unique=[...new Map(hits.map(h=>[`${h.year}-${h.month}`,h])).values()];
  return unique.length===1?unique[0]:undefined;
}
export function normalizeName(name:string) { return name.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' '); }
export function matchingRows(rows:ParsedRow[], savedName:string) { const target=normalizeName(savedName);return rows.filter(r=>normalizeName(r.name)===target); }

export function parseScheduleTokens(tokens:PdfToken[]):ParsedSchedule {
  const errors:string[]=[];
  const text=tokens.map(t=>t.text).join(' ');
  const month=detectMonth(text);
  const pages=[...new Set(tokens.map(t=>t.page))];
  let best:{page:number;y:number;columns:{day:number;x:number}[]} | undefined;
  for(const page of pages){
    const pageTokens=tokens.filter(t=>t.page===page);
    for(const candidate of pageTokens.filter(t=>t.text.trim()==='1')){
      const line=pageTokens.filter(t=>Math.abs(t.y-candidate.y)<4 && /^\d{1,2}$/.test(t.text.trim()) && t.x>=candidate.x-2).sort((a,b)=>a.x-b.x);
      const columns=line.map(t=>({day:Number(t.text.trim()),x:t.x+t.width/2})).filter((v,i)=>v.day===i+1);
      if(columns.length>=28 && (!best || columns.length>best.columns.length)) best={page,y:candidate.y,columns};
    }
  }
  if(!best) return {year:month?.year,month:month?.month,rows:[],days:[],errors:['Nie rozpoznano nagłówków dni w tabeli.']};
  const columns=best.columns.slice(0,31);
  const gap=(columns[columns.length-1].x-columns[0].x)/(columns.length-1);
  const cutoff=columns[0].x-gap/2;
  const pageTokens=tokens.filter(t=>t.page===best.page && t.y<best!.y-5 && t.x<cutoff);
  const nameTokens=pageTokens.filter(t=>/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2}/.test(t.text) && !/nazwisko|imię|lp\./i.test(t.text));
  const rows:ParsedRow[]=nameTokens.map(n=>{
    const number=pageTokens.filter(t=>/^\d{1,3}$/.test(t.text.trim()) && Math.abs(t.y-n.y)<4 && t.x<n.x).sort((a,b)=>b.x-a.x)[0]?.text||'';
    const cells:Record<number,string>={};
    for(const t of tokens.filter(t=>t.page===best!.page && Math.abs(t.y-n.y)<4.5 && t.x>=cutoff)){
      const center=t.x+t.width/2;
      const index=Math.round((center-columns[0].x)/gap);
      if(index>=0&&index<columns.length&&Math.abs(center-columns[index].x)<gap*.43){
        const day=columns[index].day; cells[day]=(cells[day]||'')+t.text.trim();
      }
    }
    const missing=columns.map(c=>c.day).filter(d=>!cells[d]);
    return {name:n.text.trim(),number,cells,missing};
  }).filter(r=>Object.keys(r.cells).length>=Math.min(20,columns.length*.6));
  if(!month) errors.push('Miesiąc lub rok nie został rozpoznany jednoznacznie. Wybierz go ręcznie.');
  if(month && columns.length!==daysInMonth(month.year,month.month)) errors.push(`Nagłówek ma ${columns.length} dni, a wybrany miesiąc ma ${daysInMonth(month.year,month.month)}.`);
  if(rows.length===0) errors.push('Nie rozpoznano wierszy pracowników.');
  return {year:month?.year,month:month?.month,rows,days:columns.map(c=>c.day),errors};
}

export async function readPdf(file:File) {
  const pdfjs=await import('pdfjs-dist');
  const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  const fingerprint=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
  const doc=await pdfjs.getDocument({data:bytes}).promise;
  const tokens:PdfToken[]=[];
  for(let page=1;page<=doc.numPages;page++){
    const content=await(await doc.getPage(page)).getTextContent();
    for(const item of content.items){ if('str' in item && item.str.trim()) tokens.push({text:item.str.trim(),x:item.transform[4],y:item.transform[5],width:item.width,page}); }
  }
  return {parsed:parseScheduleTokens(tokens),fingerprint};
}

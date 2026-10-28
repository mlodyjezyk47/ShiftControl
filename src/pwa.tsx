import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { db } from './db';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function PwaStatus(){
 const [offline,setOffline]=useState(!navigator.onLine),[cached,setCached]=useState(false),[update,setUpdate]=useState(false),[confirmed,setConfirmed]=useState(false),[install,setInstall]=useState<InstallPrompt|null>(null),[error,setError]=useState('');
 const [updateSW,setUpdateSW]=useState<((reload?:boolean)=>Promise<void>)|null>(null);
 useEffect(()=>{
  let registration:ServiceWorkerRegistration|undefined;
  const updateService=registerSW({onNeedRefresh:()=>setUpdate(true),onOfflineReady:()=>setCached(true),onRegisteredSW:(_url,r)=>{registration=r},onRegisterError:()=>setError('Nie udało się przygotować trybu offline. Otwórz aplikację ponownie z dostępem do internetu.')});
  setUpdateSW(()=>updateService);
  const online=()=>setOffline(!navigator.onLine);
  const check=()=>{if(navigator.onLine)void registration?.update().catch(()=>{})};
  const prompt=(e:Event)=>{e.preventDefault();setInstall(e as InstallPrompt)};
  const installed=()=>setInstall(null);
  window.addEventListener('online',online);window.addEventListener('offline',online);window.addEventListener('focus',check);window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',installed);
  const timer=setInterval(check,3600000);
  return()=>{clearInterval(timer);window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('focus',check);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',installed)};
 },[]);
 return <div className="pwa-status" aria-live="polite">
  {offline&&<p>Tryb offline — pracujesz na danych tego urządzenia.</p>}
  {cached&&!offline&&<p>Gotowe do pracy offline. <button onClick={()=>setCached(false)}>Zamknij</button></p>}
  {install&&<p>ShiftControl na ekranie głównym <button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null)}}>Zainstaluj</button></p>}
  {error&&<p>{error}</p>}
  {update&&<div className="pwa-update"><b>Dostępna nowa wersja</b><span>Zapisz otwarte formularze. Dane IndexedDB pozostają na urządzeniu.</span><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Otwarte formularze są zapisane</label><button disabled={!confirmed} onClick={async()=>{try{await db.transaction('r',db.tables,async()=>{await db.shifts.count()});await updateSW?.(true)}catch{setError('Aktualizacja nie powiodła się. Spróbuj ponownie.')}}}>Aktualizuj aplikację</button><button onClick={()=>setUpdate(false)}>Później</button></div>}
 </div>;
}

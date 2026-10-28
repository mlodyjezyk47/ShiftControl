import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
 base:process.env.VITE_BASE_PATH||'/',
 plugins:[react(),VitePWA({registerType:'prompt',injectRegister:null,includeAssets:['icons/*.png','fonts/*'],manifest:{id:'.',name:'ShiftControl — planer pracy',short_name:'ShiftControl',description:'Prywatny grafik, ewidencja i analiza czasu pracy',lang:'pl',start_url:'.',scope:'.',display:'standalone',background_color:'#081321',theme_color:'#081321',icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},workbox:{clientsClaim:true,globPatterns:['**/*.{js,css,html,mjs,png,ttf,txt}'],maximumFileSizeToCacheInBytes:4*1024*1024,cleanupOutdatedCaches:true,navigateFallback:'index.html',navigateFallbackDenylist:[/\/assets\//,/\/fonts\//,/\/icons\//]}})],
 build:{rollupOptions:{output:{manualChunks:{time:['@js-temporal/polyfill'],validation:['zod']}}}},
});

import {build} from 'esbuild';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,12);
await build({entryPoints:['src/media-worker.js'],bundle:true,format:'esm',outfile:'app/media-worker.js',minify:true,legalComments:'eof'});
const mediaHash=hash(await fs.readFile('app/media-worker.js'));
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',outfile:'app/veil.js',minify:true,define:{MEDIA_WORKER_URL:JSON.stringify('./media-worker.js?v='+mediaHash)},legalComments:'eof'});
const names=['veil.js','fullscreen.js','simple.css'];const assets=[];let html=await fs.readFile('app/index.html','utf8');
for(const name of names){const revision=hash(await fs.readFile('app/'+name));html=html.replace(new RegExp(name.replace('.','\\.')+'(?:\\?v=[^" ]+)?','g'),name+'?v='+revision);assets.push('./'+name+'?v='+revision);}
html=html.replace('Physical 30-day media cleanup is not deployed.','Expired media is removed by the hourly server cleanup.');await fs.writeFile('app/index.html',html);
assets.push('./media-worker.js?v='+mediaHash,'./icon-silver-192.png','./icon-silver-512.png','./icon-gold-192.png','./icon-gold-512.png');
const cache='veil-static-'+hash(JSON.stringify(assets));
await fs.writeFile('app/sw.js',`const CACHE=${JSON.stringify(cache)},ASSETS=${JSON.stringify(assets)};const ALLOWED=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.filter(p=>!p.includes('media-worker.js')))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('veil-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!ALLOWED.has(e.request.url))return;e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(e.request);if(cached)return cached;const response=await fetch(e.request);if(response.ok)await c.put(e.request,response.clone());return response;}));});
`);

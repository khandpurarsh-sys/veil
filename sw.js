// Deliberately caches no messages, media, keys, config or app code.
// No offline delivery claim; updates must be fetched from the network.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});

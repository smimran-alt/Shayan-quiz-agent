self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin&&url.pathname.startsWith('/Shayan-quiz-agent/')){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>fetch(req)));
  }
});

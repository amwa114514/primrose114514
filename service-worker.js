/* Primrose · Service Worker */
var CACHE_NAME = 'prim-pwa-v1';
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

/* 安装：预缓存核心资源 */
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(err){
        console.warn('预缓存部分资源失败', err);
      });
    })
  );
  self.skipWaiting();
});

/* 激活：清理旧版缓存 */
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* 请求拦截：缓存优先，网络兜底 */
self.addEventListener('fetch', function(event){
  var req = event.request;

  /* 只处理 GET 请求 */
  if(req.method !== 'GET') return;

  /* 跳过跨域资源（如 Google Fonts、外部 favicon），避免污染缓存 */
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        /* 只缓存成功的、同源的响应 */
        if(res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(req, copy).catch(function(){});
          });
        }
        return res;
      }).catch(function(){
        /* 网络失败时，如果是导航请求，回退到缓存的首页 */
        if(req.mode === 'navigate'){
          return caches.match('./index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
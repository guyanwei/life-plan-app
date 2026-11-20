/* ============================================================
   一次性自清理 Service Worker（临时文件，使命完成后即删除）
   作用：清除旧注册码机 PWA 遗留的离线缓存（lifeplan-codegen-v3 等），
        注销过期 Service Worker，强制刷新受控页面，然后自我注销。
   效果：用户设备下次访问 codegen/ 时自动清理，此后该路径永久 404。
   ============================================================ */
var PURGE_VER = 'lifeplan-purge-20261120-1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    // 1) 删除该域名下所有离线缓存（含旧的 lifeplan-codegen-v3）
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) {
        return caches.delete(k).catch(function () {});
      }));
    } catch (_) {}

    // 2) 强制所有 codegen 作用域内的窗口重新导航（Client.navigate 无需页面配合）
    try {
      var cls = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      cls.forEach(function (c) {
        try {
          if (c.url.indexOf('/codegen/') >= 0) {
            c.navigate(c.url.split('?')[0] + '?__purged=' + Date.now()).catch(function () {});
          }
        } catch (_) {}
      });
    } catch (_) {}

    // 3) 注销自身，之后此作用域不再有任何 Service Worker
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

// 激活期间所有请求直连网络、不写任何缓存 → codegen/ 直接返回服务端 404
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(function () {
      return new Response('', { status: 404 });
    })
  );
});

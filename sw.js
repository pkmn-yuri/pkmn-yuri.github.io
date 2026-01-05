// sw.js
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // 나중에 여기에 오프라인 캐싱 로직을 추가할 수 있습니다.
});

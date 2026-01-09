// sw.js

const CACHE_NAME = 'pkmn-translator-v1'; // 버전을 바꾸면 새로운 캐시를 받습니다.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './database.json',
  './pinyin-data.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 설치 (Install): 모든 파일을 캐시에 저장
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. 요청 가로채기 (Fetch): 오프라인이면 캐시에서 꺼내줌
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 그거 반환, 없으면 네트워크 요청
      return response || fetch(event.request);
    })
  );
});

// 3. 활성화 (Activate): 이전 버전 캐시 삭제 (업데이트 관리)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

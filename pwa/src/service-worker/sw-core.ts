export const CACHE_NAME = 'openanchor-superapp-v10' as const;

export const coreUrls: readonly string[] = ['./', './index.html'] as const;

export const moduleUrls: Readonly<Record<string, readonly string[]>> = {
  anchor: ['./modules/anchor/', './modules/anchor/index.html'],
  wachtownik: ['./modules/wachtownik/', './modules/wachtownik/index.html'],
  egzamin: ['./modules/egzamin/', './modules/egzamin/index.html'],
  zeglowanie: ['./modules/zeglowanie/', './modules/zeglowanie/index.html'],
} as const;

export const CDN_HOSTNAMES: readonly string[] = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
] as const;

export function isCdnRequest(url: URL): boolean {
  return CDN_HOSTNAMES.some((cdn) => url.hostname.includes(cdn));
}

export function getModuleUrls(moduleName: string): readonly string[] | undefined {
  return moduleUrls[moduleName];
}

export function shouldHandleFetch(url: URL, method: string): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (isCdnRequest(url)) return false;
  if (method !== 'GET') return false;
  return true;
}

export function isHashedAsset(url: URL): boolean {
  return url.pathname.includes('/assets/');
}

export async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, clone);
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

export async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (!networkResponse || networkResponse.status !== 200) return networkResponse;
    const clone = networkResponse.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, clone);
    return networkResponse;
  } catch {
    if (request.mode === 'navigate') {
      const indexResponse = await caches.match('./index.html');
      if (indexResponse) return indexResponse;
      const rootResponse = await caches.match('./');
      if (rootResponse) return rootResponse;
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

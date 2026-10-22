import type { Plugin, ProxyOptions } from 'vite';
import { request as httpRequest, type IncomingMessage, type OutgoingHttpHeaders, type ServerResponse } from 'node:http';
import { GAME_ENTRIES, entryProxyPrefix } from './src/config/gameEntries';

/**
 * 遊戲入口代理：把測試站轉發成與本工具同源，才能在主畫面分頁的 iframe 內嵌並保有登入狀態。
 * - /rg/<key>/...       → 側欄「遊戲入口」的站台
 * - /rgx/<host>/...     → 其他 *.rsg-games.com 站台（例如登入後跳轉的遊戲頁 qa-k8s-gameweb-cocos），
 *                         不轉的話遊戲頁是第三方 iframe，Chrome 會擋它的 Cookie，遊戲進不去
 * 這些站台回應 X-Frame-Options: SAMEORIGIN、登入表單 target="_top"，直接嵌入會被瀏覽器擋或跳離本工具，
 * 因此代理會：移除禁止嵌入的標頭、Cookie 改掛在代理路徑下、Location 與 HTML 內的站內網址改寫成代理路徑。
 */
const ENTRY_HOSTS = GAME_ENTRIES.map(e => ({ origin: new URL(e.url).origin, prefix: entryProxyPrefix(e) }));

const GENERIC_ROOT = '/rgx';
const PROXIABLE_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.rsg-games\.com$/i;

/** 由請求網址取出代理前綴：/rg/<key> 或 /rgx/<host> */
function prefixOf(url: string): string | null {
  const entry = ENTRY_HOSTS.find(h => url === h.prefix || url.startsWith(h.prefix + '/') || url.startsWith(h.prefix + '?'));
  if (entry) return entry.prefix;
  const m = url.match(/^\/rgx\/([^/?#]+)/);
  return m && PROXIABLE_HOST.test(m[1]) ? `${GENERIC_ROOT}/${m[1]}` : null;
}

/** 站內網址（絕對網址或 / 開頭）→ 代理路徑；非 rsg-games.com 的網址原樣保留 */
function rewriteUrl(url: string, prefix: string): string {
  if (url.startsWith('/') && !url.startsWith('//')) return prefix + url;
  const entry = ENTRY_HOSTS.find(h => url === h.origin || url.startsWith(h.origin + '/'));
  if (entry) return entry.prefix + (url.slice(entry.origin.length) || '/');
  const m = url.match(/^https?:\/\/([^/?#]+)(.*)$/i);
  if (m && PROXIABLE_HOST.test(m[1])) return `${GENERIC_ROOT}/${m[1]}${m[2] || '/'}`;
  return url;
}

function rewriteHtml(html: string, prefix: string): string {
  return html
    // 表單/連結指定跳到最上層視窗會蓋掉整個工具，改為在 iframe 內開啟
    .replace(/target=(["'])_(top|parent)\1/gi, 'target=$1_self$1')
    // 站內絕對網址與 / 開頭的路徑改走代理
    .replace(/\b(href|src|action)=(["'])([^"']*)\2/gi, (_m, attr: string, q: string, url: string) => `${attr}=${q}${rewriteUrl(url, prefix)}${q}`);
}

function rewriteHeaders(upstream: IncomingMessage, prefix: string): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = { ...upstream.headers };
  delete headers['x-frame-options'];
  delete headers['content-security-policy'];
  if (typeof headers.location === 'string') {
    const to = rewriteUrl(headers.location, prefix);
    // 跳到代理不到的網域時記一筆，方便判斷內嵌為何失敗
    if (to === headers.location && !to.startsWith('/')) console.log(`[game-entry] ${prefix} redirect → ${to}`);
    headers.location = to;
  }
  const cookies = upstream.headers['set-cookie'];
  if (cookies) {
    headers['set-cookie'] = cookies.map(c =>
      c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*path=[^;]*/gi, '') + `; path=${prefix}/`,
    );
  }
  return headers;
}

/** 把上游回應寫回瀏覽器：改寫標頭；HTML 另外改寫內容 */
function sendRewritten(upstream: IncomingMessage, res: ServerResponse, prefix: string) {
  const headers = rewriteHeaders(upstream, prefix);
  if (!String(upstream.headers['content-type'] ?? '').includes('text/html')) {
    res.writeHead(upstream.statusCode ?? 502, headers);
    upstream.pipe(res);
    return;
  }
  const chunks: Buffer[] = [];
  upstream.on('data', (c: Buffer) => chunks.push(c));
  upstream.on('end', () => {
    // 部分站台為 big5 編碼；以 latin1 逐位元組讀寫，只改 ASCII 部分，不破壞中文
    const body = Buffer.from(rewriteHtml(Buffer.concat(chunks).toString('latin1'), prefix), 'latin1');
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    headers['content-length'] = body.length;
    res.writeHead(upstream.statusCode ?? 502, headers);
    res.end(body);
  });
}

export function gameEntryProxy(): Record<string, ProxyOptions> {
  const entries = ENTRY_HOSTS.map(({ origin, prefix }) => [prefix, {
    target: origin,
    changeOrigin: true,
    rewrite: (path: string) => path.slice(prefix.length) || '/',
    selfHandleResponse: true,
    configure: proxy => {
      // 不收壓縮內容，HTML 才能直接改寫
      proxy.on('proxyReq', proxyReq => proxyReq.setHeader('accept-encoding', 'identity'));
      proxy.on('proxyRes', (upstream, _req, res) => sendRewritten(upstream, res, prefix));
    },
  } satisfies ProxyOptions] as const);

  return Object.fromEntries(entries);
}

/**
 * 另外兩件 Vite proxy 設定做不到、改用中介層處理的事：
 * 1. /rgx/<host>/...：轉發到任一 *.rsg-games.com 站台（目標網域依網址而定）。
 * 2. 補漏：入口頁面裡由 JS 或 CSS 發出、以 / 開頭的請求（例如 CSS 的 url(/images/bg.png)、location.href='/Game'）
 *    不會經過 HTML 改寫，會直接打到本工具拿到首頁；依 Referer 判斷來自哪個站台，轉回該站台的代理路徑。
 */
export function gameEntryPlugin(): Plugin {
  /** /rgx/<host>/...：目標網域依網址而定，Vite 的 proxy 設定做不到，自行轉發 */
  const genericProxy = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const prefix = prefixOf(req.url ?? '');
    if (!prefix?.startsWith(GENERIC_ROOT + '/')) return next();
    const host = prefix.slice(GENERIC_ROOT.length + 1);
    const headers = { ...req.headers, host, 'accept-encoding': 'identity' };
    delete headers.referer;
    delete headers.origin;
    const upstreamReq = httpRequest({ host, port: 80, method: req.method, path: (req.url ?? '').slice(prefix.length) || '/', headers }, upstream => sendRewritten(upstream, res, prefix));
    upstreamReq.on('error', err => { res.statusCode = 502; res.end(`proxy error: ${err.message}`); });
    req.pipe(upstreamReq);
  };

  const redirect = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? '';
    const referer = req.headers.referer;
    if (!referer || prefixOf(url) || url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/')) return next();
    let refPath: string;
    try { refPath = new URL(referer).pathname; } catch { return next(); }
    const prefix = prefixOf(refPath);
    if (!prefix) return next();
    res.statusCode = 307;
    res.setHeader('location', prefix + url);
    res.end();
    console.log(`[game-entry] ${url} → ${prefix}${url}`);
  };
  return {
    name: 'game-entry-generic-proxy',
    configureServer: server => { server.middlewares.use(genericProxy); server.middlewares.use(redirect); },
    configurePreviewServer: server => { server.middlewares.use(genericProxy); server.middlewares.use(redirect); },
  };
}

/**
 * RNG PAY 桌面版（Electron）主程序。
 *
 * 與瀏覽器版的差別：主畫面的「遊戲入口」分頁改用 <webview>，也就是真正的 Chromium 分頁，
 * 不受 iframe 的 X-Frame-Options / 第三方 Cookie 限制，遊戲頁可完整執行，不需要開發伺服器代理。
 *
 * 啟動方式：
 *   npm run desktop:dev   先另開 `npm run dev`，桌面版載入 http://localhost:5173（可熱更新）
 *   npm run desktop       先建置 dist，再以 app:// 協定載入建置結果
 */
const { app, BrowserWindow, ipcMain, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.RNGPAY_DEV_URL || 'http://localhost:5173';
const isDev = process.argv.includes('--dev');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// app:// 視為一般網站來源，fetch / Worker / 相對路徑才能正常運作
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    backgroundColor: '#0f1115',
    title: 'RNG PAY',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // 工具本身要開的新視窗（例如「在新分頁開啟（實際網址）」）交給系統預設瀏覽器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) mainWindow.loadURL(DEV_URL);
  else mainWindow.loadURL('app://rngpay/index.html');

  mainWindow.on('closed', () => { mainWindow = null; });
}

// 入口分頁（webview）裡開新視窗（例如大廳點遊戲是 target="_blank"）→ 改在工具內開一個新分頁
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) mainWindow?.webContents.send('rngpay:open-web-tab', url);
    return { action: 'deny' };
  });
});

ipcMain.handle('rngpay:open-external', (_event, url) => {
  if (typeof url === 'string' && /^https?:/i.test(url)) return shell.openExternal(url);
  return undefined;
});

app.whenReady().then(() => {
  // 以 app:// 提供 dist 內的建置結果；找不到的路徑回 index.html（單頁應用）
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.normalize(path.join(DIST_DIR, decodeURIComponent(pathname)));
    if (!filePath.startsWith(DIST_DIR)) return new Response('Forbidden', { status: 403 });
    const res = await net.fetch(pathToFileURL(filePath).toString()).catch(() => null);
    if (res && res.ok) return res;
    return net.fetch(pathToFileURL(path.join(DIST_DIR, 'index.html')).toString());
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

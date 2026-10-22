/** 桌面版 preload：只開放必要的幾個 API 給網頁（見 src/desktop.ts） */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rngpayDesktop', {
  isDesktop: true,
  /** 入口分頁裡開新視窗時通知網頁，由網頁開成工具內的新分頁；回傳取消訂閱函式 */
  onOpenWebTab: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on('rngpay:open-web-tab', listener);
    return () => ipcRenderer.removeListener('rngpay:open-web-tab', listener);
  },
  openExternal: (url) => ipcRenderer.invoke('rngpay:open-external', url),
});

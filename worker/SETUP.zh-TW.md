# Yahoo 報價服務：一次性設定

App 仍放在 GitHub Pages。Yahoo 不提供讓該網站直接讀取報價的 CORS 標頭，因此由你的 Cloudflare Worker 代抓資料。使用者不需要 Yahoo、Fugle 或 Alpaca 金鑰。

## 上線方式

1. 登入 Cloudflare，進入 Workers & Pages → Create application。
2. 連接 GitHub，選 SolomonWei/wealth-pocket，分支 codex/yahoo-no-keys。
3. 根目錄設 `worker`，部署指令設 `npx wrangler deploy`，使用 Workers 免費方案。此服務不需要資料庫、網域或行情金鑰。
4. 部署後，取得 Cloudflare 顯示的 `https://…workers.dev` 網址。
5. 將這個公開網址交給維護者，寫入 `public/market-config.json` 的 `yahooProxyUrl`。先驗證 `/quotes?symbols=tw:2330,tw:6488,us:AAPL` 有正確報價與時間，再將前端發布至 main。

也可以從已登入的電腦，在 worker 目錄執行 `npx wrangler deploy`。若用 Cloudflare 的線上程式碼編輯器，`dashboard.js` 是可直接貼上的單檔版；它由 quotes.mjs 移除測試用具名匯出後產生。

## 資料與限制

只接收股票代碼，不傳持倉數量、成本、銀行餘額。成功報價暫存 60 秒；沒有資產資料庫。台股通常延遲 20 分鐘，實際以 Yahoo 回傳時間為準。Yahoo 公開 chart 端點並非有 SLA 的官方開發者 API，若限流或格式改變會清楚顯示失敗並保留原估值。

CORS 僅允許 `https://solomonwei.github.io`。它是瀏覽器來源限制，不是帳號登入或完整防濫用機制。每次最多 20 個代碼，固定只向 Yahoo 查詢，不接受任意目標網址。

官方部署文件：https://developers.cloudflare.com/workers/get-started/dashboard/

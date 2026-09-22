# 聚財 Pocket 部署

## GitHub Pages（使用者選定）

此專案已準備 `.github/workflows/pages.yml`，只會發布 `public/` 內的 App 程式，不會上傳你的持倉、備份或行情金鑰。

1. 將此專案原始碼推送到指定 GitHub 儲存庫的 `main` 分支。
2. 儲存庫 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 在 **Actions → Publish Pocket to GitHub Pages** 執行工作流程，或推送一次更新。
4. 工作流程會先跑財務計算測試，再發布 `public/`。
5. 使用部署成功後顯示的 HTTPS 網址，在 iPhone Safari 開啟 → 分享 → 加入主畫面。

`wealth-pocket-source.zip` 是完整原始碼套件（包括隱藏的 `.github` 工作流程）。`wealth-pocket-deploy.zip` 則只有網站檔案，若以 GitHub 網頁手動上傳到另一個儲存庫根目錄，也可選 **Deploy from a branch / main / root**。

GitHub Free 的 Pages 可用於公開儲存庫；付費方案對私有儲存庫的支援請以帳號權限為準。程式不內嵌真實資產資料。

官方文件：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 第一次開啟

- 預設沒有真實資產。可以先開啟示範，再回到自己的資產。
- USD/TWD 預設自動使用臺銀美元即期買進，顯示掛牌時間；也可切換自行設定。USDT 共用美元／台幣匯率，以 1 USDT＝1 USD 估值。尚無報價時的預設 32 只是占位示意值。
- GitHub Actions 預計每 15 分鐘讀取一次臺銀牌告（排程可能延遲），App 開啟時每 5 分鐘讀取已發布的匯率。來源失敗會保留舊報價並標示更新延遲。只以分支部署靜態檔案不會自動產生匯率。
- 新增持倉的數量、成本和融資，再新增銀行餘額、房產持分價值與未償貸款。
- 幣安使用公開現貨行情。台股、美股改用 Yahoo 延遲報價，先部署 worker/SETUP.zh-TW.md 所述的報價服務，再設定 public/market-config.json。
- 尚未取得股價時，填入手動估價；否則會顯示不完整的淨資產小計。
- 使用者不需填寫行情金鑰。
- 定期匯出 JSON 備份。資料在目前手機／瀏覽器的本機儲存，沒有雲端同步。

## 目前狀態

已通過財務計算、行情解析與手機瀏覽器測試。已實測接收到 Binance 公開 WebSocket 行情。Yahoo 服務已在本機實测取得上市、上櫃及美股報價，已部署至 wealth-pocket-quotes.solomonwei-pocket.workers.dev。

部署目標為 SolomonWei/wealth-pocket，使用 GitHub Actions 發布到 GitHub Pages。只有 public/ 內的網站程式被發布，使用者的持倉和 API 金鑰不在儲存庫中。

目前 App 版本 v0.3.4，可於設定與頁尾確認。更新不必重加 iPhone 主畫面，使用設定內「重新載入最新版」即可；本機持倉保留，不需行情金鑰。

房產可直接輸入持分估值與剩餘房貸（未償本金），同時顯示房產淨值。若同一筆房貸原本獨立列為貸款，移到房產後請移除重複紀錄。

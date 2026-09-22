# 聚財 Pocket

iPhone-friendly personal net-worth PWA. Traditional Chinese UI. Static site with browser-local records; no account, trade execution, or bank login integration.

## Run

Node 22+: `npm start`, then open http://localhost:4173. `npm test` runs financial and market-parser tests. Deploy `public/` behind HTTPS for iPhone Home Screen installation.

## Included

- Holdings: Taiwan and US equities (share units), Binance USDT spot pairs.
- Manual bank balances, property ownership value, outstanding loans.
- Margin principal, outstanding interest, simple ACT/365 interest from a user-provided date. Updates after repayment/rate changes must be entered manually. Not a lender statement or broker maintenance-margin calculation.
- Net worth = gross asset values minus outstanding principal and interest. Missing quotes produce an explicit partial total, never a silently complete balance.
- Watchlist with target-price indicators, separate from holdings. No background alerts.
- Local JSON persistence, explicit import replacement, backup export, independent demo mode, amount masking.
- USD/TWD defaults to Bank of Taiwan USD spot-buy, with quotation time and a manual override. USDT is valued using the same USD/TWD rate (1 USDT = 1 USD for this portfolio estimate). Legacy backups are normalized on load without changing holdings. Default 32 is a labeled placeholder until a quote is available.
- GitHub Actions checks the official bank page about every 15 minutes (schedules may be delayed). A failed refresh retains the previous verified quote with a stale status; no quote is fabricated. The app checks the published snapshot every 5 minutes while open.

## Quote connections

- Taiwan and US equities use Yahoo Finance delayed quotes via the owner's Cloudflare Worker in `worker/quotes.mjs`. No end-user credentials. Yahoo's public chart endpoint is unofficial and can change or rate-limit; failures remain visible and preserve previous prices.
- Configure `public/market-config.json` with the deployed Worker HTTPS origin before publishing this version. An empty URL explicitly shows that the service is not enabled. See `worker/SETUP.zh-TW.md`.
- The browser sends only market/ticker codes. It never sends quantities, costs, bank balances, property values or credentials to the Worker. The Worker has no portfolio database. Quote requests may appear in hosting access logs.
- The gateway allows only Yahoo chart requests, validates symbols/currency/timestamps, limits each batch to 20, and caches successful quotes for 60 seconds. Taiwan symbols resolve `.TW` first and `.TWO` only on a not-found response.
- The app checks equities about every minute while open. Taiwan Yahoo quotes are normally 20 minutes delayed; US timing depends on Yahoo's source. Refresh frequency does not remove source delay. Each price displays its source timestamp.
- Binance public WebSocket tickers remain automatic: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- Connections pause in the background and restart in the foreground. No background fetch or portfolio synchronization.

## Persistence boundaries

The GitHub Pages app is publicly accessible; each visitor sees their own browser-local data. Portfolio data remains in that browser on that device. Safari and an installed web app may not share storage. Export/import when changing browser contexts. Backups contain financial data in plaintext. Site assets deliberately use no offline service worker, so private-hosting authentication pages are never cached as application documents.

## Validation

Financial tests cover financing, missing quotes, currency conversion, interest, P&L and invalid imports. Yahoo tests cover Taiwan OTC resolution, share classes, metadata validation, CORS, partial errors and rate limits. Browser checks cover mobile sizing, CRUD, demo isolation, watchlist exclusion, reload persistence, automatic Yahoo prices without credentials and failure fallback.

## App updates

Current version: 0.3.5. The Yahoo gateway is deployed at https://wealth-pocket-quotes.solomonwei-pocket.workers.dev. Version is shown in Settings and the footer. Reload the existing Home Screen app to update; no reinstall or quote keys are needed. Local portfolio storage is preserved.

Property records include outstanding mortgage principal and optional accrued/estimated interest. Gross property value stays in assets, mortgage debt stays in liabilities, and the property row displays net equity. Existing standalone loan records are preserved; do not record the same mortgage twice.

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

- Binance public WebSocket tickers: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- Fugle browser WebSocket API key: https://developer.fugle.tw/docs/data/websocket-api/getting-started/
- Alpaca WebSocket API key/secret with IEX or authorized SIP feed: https://docs.alpaca.markets/us/docs/streaming-market-data
- App rights do not guarantee API rights for Futu: https://openapi.futunn.com/futu-api-doc/en/intro/authority.html

Credentials are kept only in page memory and sent directly to the selected provider. They are never included in localStorage, backups, or application source. Prefer market-data/paper-account keys. The app has no trading endpoints. Never paste broker login passwords into the app.

Market quote timestamps and connection status are visible. Feed permissions, provider latency, market activity, and network conditions affect timeliness. No fixed end-to-end latency is promised. Stock streaming starts with future trades; before a first quote, manual values can be used. Last received quotes are cached with timestamps. Disconnects retry with capped exponential backoff. The app pauses connections in the background and reconnects in the foreground. No background fetch, server data storage, or device synchronization.

## Persistence boundaries

The GitHub Pages app is publicly accessible; each visitor sees their own browser-local data. Portfolio data remains in that browser on that device. Safari and an installed web app may not share storage. Export/import when changing browser contexts. Backups contain financial data in plaintext. Site assets deliberately use no offline service worker, so private-hosting authentication pages are never cached as application documents.

## Validation

Financial tests cover financing, missing quotes, currency conversion, interest, P&L, invalid imports and feed normalization. Browser checks cover mobile sizing, CRUD, demo isolation, watchlist exclusion and reload persistence. Authenticated Fugle/Alpaca live feeds require user-owned API credentials to validate end to end.

## App updates

Current version: 0.2.0, shown in Settings and the footer. Reload the existing Home Screen app to pick up deployments; reinstalling is unnecessary. Settings includes a reload button. Versioned asset URLs refresh changed scripts and styles. Reloading preserves local portfolio storage; in-memory quote keys need to be entered again.

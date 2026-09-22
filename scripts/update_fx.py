"""Read BOT's public USD spot-buy quote; publish timestamps and fail visibly."""
import json
import re
import urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path

SOURCE = 'https://rate.bot.com.tw/xrt?Lang=zh-TW'
PREVIOUS = 'https://solomonwei.github.io/wealth-pocket/data/usd-twd.json'
OUTPUT = Path(__file__).resolve().parents[1] / 'public/data/usd-twd.json'


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.texts = [], None, None, []

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        if tag in ('td', 'th') and self.row is not None:
            self.cell = [dict(attrs), '']

    def handle_data(self, data):
        self.texts.append(data)
        if self.cell is not None:
            self.cell[1] += data

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            self.row.append(self.cell)
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def parse_bot(html):
    parser = TableParser()
    parser.feed(html)
    price = None
    for row in parser.rows:
        if not any(re.search(r'\bUSD\b', text) for _, text in row):
            continue
        for attrs, text in row:
            if attrs.get('data-table') == '本行即期買入':
                price = float(text.strip().replace(',', ''))
                break
        if price is not None:
            break
    match = re.search(r'掛牌時間\s*[：:]\s*(\d{4}/\d{2}/\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)', ' '.join(parser.texts))
    if price is None or not 1 < price < 1000 or not match:
        raise ValueError('Official page did not contain USD spot-buy and quotation time')
    stamp = datetime.fromisoformat(match[1].replace('/', '-') + 'T' + match[2]).replace(tzinfo=timezone(timedelta(hours=8)))
    if stamp > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError('Quotation timestamp is in the future')
    return price, stamp.isoformat()


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Pocket-Exchange-Rate/1.0 (+https://github.com/SolomonWei/wealth-pocket)'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read(2_000_000).decode('utf-8-sig')


def main():
    result = {'schemaVersion': 1, 'source': '臺灣銀行', 'sourceUrl': SOURCE, 'rateType': 'USD 即期買入', 'rate': None, 'quotedAt': None, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'status': 'unavailable'}
    try:
        result['rate'], result['quotedAt'] = parse_bot(fetch(SOURCE))
        result['status'] = 'ok'
        print('BOT USD spot-buy:', result['rate'], result['quotedAt'])
    except Exception as error:
        print('::warning::BOT quote refresh unavailable (' + type(error).__name__ + '); retaining previous verified quote if available')
        try:
            previous = json.loads(fetch(PREVIOUS))
            if previous.get('sourceUrl') == SOURCE and previous.get('rateType') == 'USD 即期買入' and isinstance(previous.get('rate'), (int, float)) and 1 < previous['rate'] < 1000 and previous.get('quotedAt'):
                result.update(rate=previous['rate'], quotedAt=previous['quotedAt'], status='stale')
        except Exception:
            pass
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()

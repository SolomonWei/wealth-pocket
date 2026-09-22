import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('fx', Path(__file__).parents[1] / 'scripts/update_fx.py')
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)


class BankParserTests(unittest.TestCase):
    def test_picks_usd_spot_buy_not_cash_or_sell(self):
        html = '<p>掛牌時間：<span>2025/01/02 16:00</span></p><table><tr><td>美金 (USD)</td><td data-table="本行現金買入">30.1</td><td data-table="本行即期買入">30.5</td><td data-table="本行即期賣出">30.7</td></tr></table>'
        self.assertEqual(fx.parse_bot(html), (30.5, '2025-01-02T16:00:00+08:00'))

    def test_rejects_challenge_or_missing_timestamp(self):
        for html in ('<title>Challenge Validation</title>', '<tr><td>USD</td><td data-table="本行即期買入">31</td></tr>'):
            with self.assertRaises(ValueError):
                fx.parse_bot(html)


if __name__ == '__main__':
    unittest.main()

import assert from 'node:assert/strict';
import test from 'node:test';
import { noticeEmailHtml } from '../server/providers';

test('notice email escapes user-controlled period and date content', () => {
  const html = noticeEmailHtml({ period: '<script>alert(1)</script>', amount: 12.5, dueDate: '2026-07-31"' });
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /12\.50 €/);
  assert.match(html, /&quot;/);
});

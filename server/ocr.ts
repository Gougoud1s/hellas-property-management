import { Router } from 'express';
import { demoApiAllowed, integrationEnabled } from './config';
import { requireCompanyUser } from './auth';

const router = Router();

router.post('/scan', requireCompanyUser, async (req, res) => {
  const { image, mediaType = 'image/jpeg', fileName = '' } = req.body as { image?: string; mediaType?: string; fileName?: string };
  if (!image) { res.status(400).json({ error: 'Receipt image is required' }); return; }
  if (!integrationEnabled('ocr')) {
    if (!demoApiAllowed()) { res.status(503).json({ error: 'Receipt OCR is not configured' }); return; }
    res.json({ supplier: fileName.toLowerCase().includes('dei') ? 'ΔΕΗ' : 'Προμηθευτής παραστατικού', amount: 128.4, date: new Date().toISOString().slice(0, 10), category: fileName.toLowerCase().includes('dei') ? 'ΔΕΗ / Ρεύμα' : 'Γενικά / Άλλα', confidence: 0.78, demo: true });
    return;
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.ANTHROPIC_OCR_MODEL || 'claude-3-5-haiku-latest', max_tokens: 300, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } }, { type: 'text', text: 'Extract this Greek receipt. Return JSON only: supplier, amount number, date YYYY-MM-DD, category from Καθαριότητα|Συντήρηση Ασανσέρ|Κηπουρός|ΔΕΗ / Ρεύμα|ΕΥΔΑΠ / Νερό|Θέρμανση / Πετρέλαιο|Γενικά / Άλλα, confidence 0-1.' }] }] }) });
    if (!response.ok) throw new Error(`OCR request failed: ${response.status}`);
    const payload = await response.json() as { content: Array<{ text: string }> };
    const text = payload.content[0]?.text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : 'Receipt scan failed' }); }
});

export default router;

import { Router } from 'express';
const router = Router();
const subscriptions = new Map<string, unknown>();
router.post('/subscribe', (req, res) => { const id = String(req.body?.userId || `anon-${Date.now()}`); subscriptions.set(id, req.body?.subscription); res.status(201).json({ id, subscribed: true }); });
router.delete('/subscribe/:id', (req, res) => { subscriptions.delete(req.params.id); res.sendStatus(204); });
export default router;

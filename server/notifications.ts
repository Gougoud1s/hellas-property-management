import { Router } from 'express';
const router = Router();
router.post('/assemblies/:id/notify', (req, res) => res.json({ assemblyId: req.params.id, queued: Number(req.body?.recipients || 0), demo: !process.env.RESEND_API_KEY }));
export default router;

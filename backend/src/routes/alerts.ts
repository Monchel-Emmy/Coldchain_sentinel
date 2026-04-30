import { Router } from 'express';
import { isConnected } from '../db';
import { Alert } from '../models/Alert';
import { authenticate, requirePermission, getHCFilter, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('alerts:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const { acknowledged, severity } = req.query;
  const query: any = {};
  if (hcFilter) query.healthCenterId = hcFilter;
  if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';
  if (severity) query.severity = severity;
  const alerts = await Alert.find(query).sort({ createdAt: -1 }).lean();
  res.json(alerts.map(a => ({ ...a, id: a._id })));
});

router.patch('/:id/acknowledge', requirePermission('alerts:acknowledge'), async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true }).lean();
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ...alert, id: alert._id });
});

router.post('/acknowledge-all', requirePermission('alerts:acknowledge'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const query = hcFilter ? { healthCenterId: hcFilter, acknowledged: false } : { acknowledged: false };
  await Alert.updateMany(query, { acknowledged: true });
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import { Role as RoleModel } from '../models/Role';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { ALL_PERMISSIONS } from '../data/mockStore';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('roles:view'), async (_req, res) => {
  const roles = await RoleModel.find().lean();
  res.json(roles.map(r => ({ ...r, id: String(r._id) })));
});

router.get('/permissions', (_req, res) => res.json(ALL_PERMISSIONS));

// Public test endpoint to verify MongoDB connection
router.get('/test-mongodb', async (_req, res) => {
  try {
    const roleCount = await RoleModel.countDocuments();
    res.json({ 
      status: 'success', 
      message: 'MongoDB operations working',
      roleCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'MongoDB operations failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/', requirePermission('roles:create'), async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const role = await RoleModel.create({ name, description: description || '', permissions: permissions || [] });
  res.status(201).json({ ...role.toObject(), id: String(role._id) });
});

router.put('/:id', requirePermission('roles:edit'), async (req, res) => {
  const role = await RoleModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!role) return res.status(404).json({ error: 'Role not found' });
  res.json({ ...role, id: String(role._id) });
});

router.delete('/:id', requirePermission('roles:delete'), async (req, res) => {
  await RoleModel.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;

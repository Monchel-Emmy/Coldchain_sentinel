import { Router } from 'express';
import { User as UserModel } from '../models/User';
import { Role as RoleModel } from '../models/Role';
import { HealthCenter } from '../models/HealthCenter';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';

const router = Router();
router.use(authenticate);

// Helper: check if a string is a valid MongoDB ObjectId
function isObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

router.get('/', requirePermission('users:view'), async (_req, res) => {
  const users = await UserModel.find().lean();
  const result = await Promise.all(users.map(async u => {
    const role = await RoleModel.findById(u.roleId).lean();
    const hc   = u.healthCenterId ? await HealthCenter.findById(u.healthCenterId).lean() : null;
    return {
      id:                String(u._id),
      name:              u.name,
      email:             u.email,
      roleId:            String(u.roleId),
      roleName:          role?.name || 'Unknown',
      healthCenterId:    u.healthCenterId ? String(u.healthCenterId) : null,
      healthCenterName:  hc?.name || '',
      status:            u.status,
      lastLogin:         u.lastLogin,
      createdAt:         u.createdAt,
    };
  }));
  res.json(result);
});

router.post('/', requirePermission('users:create'), async (req, res) => {
  const { name, email, password, roleId, healthCenterId, status } = req.body;
  if (!name || !email || !roleId) return res.status(400).json({ error: 'Name, email and role are required' });

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  if (!isObjectId(roleId)) {
    return res.status(400).json({ error: 'Invalid role ID. Please select a valid role.' });
  }

  const userData: any = { name, email: email.toLowerCase(), roleId, status: status || 'active', password: password || 'TempPass@1234' };
  if (healthCenterId && isObjectId(healthCenterId)) userData.healthCenterId = healthCenterId;

  const user = await UserModel.create(userData);
  const role = await RoleModel.findById(user.roleId).lean();
  const hc   = user.healthCenterId ? await HealthCenter.findById(user.healthCenterId).lean() : null;

  res.status(201).json({
    id:               String(user._id),
    name:             user.name,
    email:            user.email,
    roleId:           String(user.roleId),
    roleName:         role?.name || '',
    healthCenterId:   user.healthCenterId ? String(user.healthCenterId) : null,
    healthCenterName: hc?.name || '',
    status:           user.status,
  });
});

router.put('/:id', requirePermission('users:edit'), async (req, res) => {
  const { name, email, roleId, healthCenterId, status } = req.body;

  const update: any = {};
  if (name)   update.name   = name;
  if (email)  update.email  = email.toLowerCase();
  if (status) update.status = status;
  // Only update roleId if it's a valid MongoDB ObjectId
  if (roleId && isObjectId(roleId)) update.roleId = roleId;
  // Allow setting or clearing healthCenterId
  if (healthCenterId !== undefined) {
    if (healthCenterId && isObjectId(healthCenterId)) {
      update.healthCenterId = healthCenterId;
    } else if (!healthCenterId) {
      update.$unset = { healthCenterId: '' };
    }
  }

  const user = await UserModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const role = await RoleModel.findById(user.roleId).lean();
  const hc   = user.healthCenterId ? await HealthCenter.findById(user.healthCenterId).lean() : null;

  res.json({
    id:               String(user._id),
    name:             user.name,
    email:            user.email,
    roleId:           String(user.roleId),
    roleName:         role?.name || '',
    healthCenterId:   user.healthCenterId ? String(user.healthCenterId) : null,
    healthCenterName: hc?.name || '',
    status:           user.status,
    lastLogin:        user.lastLogin,
  });
});

router.delete('/:id', requirePermission('users:delete'), async (req, res) => {
  await UserModel.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;

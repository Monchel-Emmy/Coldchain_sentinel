import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import passport from 'passport';
import { User as UserModel } from '../models/User';
import { Role as RoleModel } from '../models/Role';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { isConnected } from '../db';
import { sendOTPEmail } from '../services/email';

const router = Router();

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!isConnected()) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    // If account exists but not verified, resend OTP
    if (!existing.emailVerified) {
      const otp = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await UserModel.findByIdAndUpdate(existing._id, { otpCode: otp, otpExpiresAt: expires });
      await sendOTPEmail(email, existing.name, otp);
      return res.status(200).json({
        message: 'Verification code resent to your email.',
        email: email.toLowerCase(),
        requiresVerification: true,
      });
    }
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Get default role
  const defaultRole = await RoleModel.findOne({ name: 'Nurse / Technician' }).lean()
    ?? await RoleModel.findOne().lean();
  if (!defaultRole) {
    return res.status(500).json({ error: 'No roles found. Please contact an administrator.' });
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Create user with pending status
  const user = await UserModel.create({
    name,
    email: email.toLowerCase(),
    password,
    roleId: defaultRole._id,
    status: 'pending',
    emailVerified: false,
    otpCode: otp,
    otpExpiresAt,
  });

  // Send OTP email
  try {
    await sendOTPEmail(email, name, otp);
  } catch (emailErr) {
    console.error('Failed to send OTP email:', emailErr);
    // Delete the user so they can try again
    await UserModel.findByIdAndDelete(user._id);
    return res.status(500).json({ error: 'Failed to send verification email. Check your SMTP configuration.' });
  }

  res.status(201).json({
    message: 'Account created! Please check your email for the verification code.',
    email: email.toLowerCase(),
    requiresVerification: true,
  });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }
  if (!isConnected()) {
    return res.status(503).json({ error: 'Database not available' });
  }

  // Fetch user with OTP fields (they are select: false by default)
  const user = await UserModel.findOne({ email: email.toLowerCase() })
    .select('+otpCode +otpExpiresAt');

  if (!user) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (user.emailVerified) {
    return res.status(400).json({ error: 'Email already verified. Please log in.' });
  }
  if (!user.otpCode || !user.otpExpiresAt) {
    return res.status(400).json({ error: 'No verification code found. Please sign up again.' });
  }
  if (new Date() > user.otpExpiresAt) {
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }
  if (user.otpCode !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  // Activate account
  await UserModel.findByIdAndUpdate(user._id, {
    emailVerified: true,
    status: 'active',
    $unset: { otpCode: '', otpExpiresAt: '' },
  });

  res.json({ message: 'Email verified successfully! You can now log in.' });
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post('/resend-otp', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!isConnected()) return res.status(503).json({ error: 'Database not available' });

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await UserModel.findByIdAndUpdate(user._id, { otpCode: otp, otpExpiresAt });

  try {
    await sendOTPEmail(email, user.name, otp);
  } catch {
    return res.status(500).json({ error: 'Failed to send email. Try again later.' });
  }

  res.json({ message: 'New verification code sent to your email.' });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isConnected()) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const userDoc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
  if (!userDoc) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check email verification
  if (!userDoc.emailVerified) {
    return res.status(403).json({
      error: 'Email not verified',
      requiresVerification: true,
      email: userDoc.email,
    });
  }

  const isMatch = await userDoc.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (userDoc.status === 'inactive') {
    return res.status(403).json({ error: 'Account is inactive. Contact your administrator.' });
  }

  await UserModel.findByIdAndUpdate(userDoc._id, { lastLogin: new Date() });

  const role = await RoleModel.findById(userDoc.roleId).lean();
  const token = generateToken(String(userDoc._id));

  res.json({
    token,
    user: {
      id:             String(userDoc._id),
      name:           userDoc.name,
      email:          userDoc.email,
      status:         userDoc.status,
      healthCenterId: userDoc.healthCenterId ? String(userDoc.healthCenterId) : null,
      role: {
        id:          role ? String(role._id) : '',
        name:        role?.name || '',
        permissions: role?.permissions || [],
      },
    },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isConnected()) return res.status(503).json({ error: 'Database not available' });

  const user = await UserModel.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const role = await RoleModel.findById(user.roleId).lean();

  res.json({
    id:             String(user._id),
    name:           user.name,
    email:          user.email,
    status:         user.status,
    healthCenterId: user.healthCenterId ? String(user.healthCenterId) : null,
    role: {
      id:          role ? String(role._id) : '',
      name:        role?.name || '',
      permissions: role?.permissions || [],
    },
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

// Step 1: Redirect to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google callback — issue JWT and redirect to frontend
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_user`);

      await UserModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      const role = await RoleModel.findById(user.roleId).lean();
      const token = generateToken(String(user._id));

      // Redirect to frontend with token in query param
      // Frontend will pick it up and store in localStorage
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendURL}/auth/callback?token=${token}`);
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=server_error`);
    }
  }
);

export default router;

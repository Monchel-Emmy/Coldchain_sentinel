import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User as UserModel } from '../models/User';
import { Role as RoleModel } from '../models/Role';

export function configurePassport() {
  const clientID     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL  = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientID || !clientSecret) {
    console.warn('⚠️  Google OAuth not configured — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing in .env');
    return;
  }

  passport.use(new GoogleStrategy(
    { clientID, clientSecret, callbackURL },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error('No email from Google'), undefined);

        // Check if user already exists (by googleId or email)
        let user = await UserModel.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (user) {
          // Link Google ID if they previously signed up with email
          if (!user.googleId) {
            await UserModel.findByIdAndUpdate(user._id, {
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
              emailVerified: true,
              status: 'active',
              authProvider: 'google',
            });
            user = await UserModel.findById(user._id);
          }
          return done(null, user!);
        }

        // New user — get default role
        const defaultRole = await RoleModel.findOne({ name: 'Nurse / Technician' }).lean()
          ?? await RoleModel.findOne().lean();

        if (!defaultRole) return done(new Error('No roles found in database'), undefined);

        // Create new user — Google users are immediately active (email already verified by Google)
        const newUser = await UserModel.create({
          name:         profile.displayName || email.split('@')[0],
          email,
          googleId:     profile.id,
          avatar:       profile.photos?.[0]?.value,
          authProvider: 'google',
          roleId:       defaultRole._id,
          status:       'active',
          emailVerified: true,
        });

        return done(null, newUser);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  ));
}

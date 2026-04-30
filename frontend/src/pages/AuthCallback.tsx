// Handles the redirect from Google OAuth
// URL: /auth/callback?token=<jwt>
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=' + (error || 'unknown'));
      return;
    }

    // Store token and fetch user profile
    loginWithToken(token).then(() => {
      navigate('/');
    }).catch(() => {
      navigate('/login?error=token_invalid');
    });
  }, []);

  return <PageLoader message="Signing you in with Google..." />;
}

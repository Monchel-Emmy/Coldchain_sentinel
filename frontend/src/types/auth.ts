export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
  healthCenterId: string | null;
  avatar?: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

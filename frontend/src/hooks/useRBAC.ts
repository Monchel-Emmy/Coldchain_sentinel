import { useAuth } from '../context/AuthContext';

// Returns the healthCenterId to filter by, or null for Super Admin (no filter)
export function useHealthCenterScope(): string | null {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role.name === 'Super Admin') return null;
  return user.healthCenterId;
}

// Check if user can perform an action
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.role.permissions.includes(permission) ?? false;
}

// Check multiple permissions at once
export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { user } = useAuth();
  const result: Record<string, boolean> = {};
  permissions.forEach(p => {
    result[p] = user?.role.permissions.includes(p) ?? false;
  });
  return result;
}

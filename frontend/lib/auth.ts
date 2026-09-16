import { AuthUser, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types/auth';

const AUTH_STORAGE_KEY = 'hisabflow_session';

// Demo credential accounts
export const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: 'admin',
    user: {
      id: 'usr_admin',
      username: 'admin',
      displayName: 'Store Owner',
      role: 'ADMIN',
      loginTime: new Date().toISOString(),
    },
  },
  manager: {
    password: 'manager',
    user: {
      id: 'usr_manager',
      username: 'manager',
      displayName: 'Inventory Manager',
      role: 'MANAGER',
      loginTime: new Date().toISOString(),
    },
  },
  cashier: {
    password: 'cashier',
    user: {
      id: 'usr_cashier',
      username: 'cashier',
      displayName: 'POS Cashier',
      role: 'CASHIER',
      loginTime: new Date().toISOString(),
    },
  },
};

export function loginUser(user: AuthUser): void {
  if (typeof window !== 'undefined') {
    const session = {
      ...user,
      loginTime: new Date().toISOString(),
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logoutUser(onLogoutCallback?: () => void): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    // Remove legacy auth key if present
    localStorage.removeItem('hisabflow_auth');
  }
  if (onLogoutCallback && typeof onLogoutCallback === 'function') {
    onLogoutCallback();
  }
}

export function checkIsAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function getUserPermissions(role?: UserRole): RolePermissions {
  const currentRole = role || getCurrentUser()?.role || 'CASHIER';
  return ROLE_PERMISSIONS[currentRole];
}

export function hasPermission(permission: keyof RolePermissions): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role][permission];
}

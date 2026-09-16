export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  token?: string;
  loginTime: string;
}

export interface RolePermissions {
  canAccessPOS: boolean;
  canManageKhata: boolean;
  canReceivePayments: boolean;
  canManageProducts: boolean;
  canManageExpenses: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canAccessPOS: true,
    canManageKhata: true,
    canReceivePayments: true,
    canManageProducts: true,
    canManageExpenses: true,
    canManageSuppliers: true,
    canViewReports: true,
    canManageSettings: true,
    canViewAuditLogs: true,
  },
  MANAGER: {
    canAccessPOS: true,
    canManageKhata: true,
    canReceivePayments: true,
    canManageProducts: true,
    canManageExpenses: true,
    canManageSuppliers: true,
    canViewReports: true,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  CASHIER: {
    canAccessPOS: true,
    canManageKhata: false,
    canReceivePayments: true,
    canManageProducts: false,
    canManageExpenses: false,
    canManageSuppliers: false,
    canViewReports: false,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
};

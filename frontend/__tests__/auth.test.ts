import { describe, it, expect, beforeEach } from 'vitest';
import { loginUser, getCurrentUser, getAuthToken, logoutUser, hasPermission } from '../lib/auth';
import { sanitizeCsvField } from '../lib/exportUtils';
import { buildFonepayDynamicQr, calculateCrc16Ccitt, generateDynamicQrPayload } from '../lib/qrUtils';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('Authentication & Security Unit Tests', () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: local,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: session,
      writable: true,
      configurable: true,
    });
  });

  it('should initialize unauthenticated when no session exists', () => {
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeUndefined();
  });

  it('should store user session and JWT token on login and enforce RBAC permissions', () => {
    loginUser({
      id: 'usr_cashier',
      username: 'cashier',
      displayName: 'POS Cashier',
      role: 'CASHIER',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      loginTime: new Date().toISOString(),
    });

    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.username).toBe('cashier');
    expect(getAuthToken()).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    expect(hasPermission('canAccessPOS')).toBe(true);
    expect(hasPermission('canManageSettings')).toBe(false);
    expect(hasPermission('canManageExpenses')).toBe(false);
  });

  it('should clear session storage on logout', () => {
    loginUser({
      id: 'usr_admin',
      username: 'admin',
      displayName: 'Store Owner',
      role: 'ADMIN',
      token: 'jwt_token',
      loginTime: new Date().toISOString(),
    });

    logoutUser();
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeUndefined();
  });

  it('should neutralize CSV formula injection payloads while preserving numbers', () => {
    expect(sanitizeCsvField('=cmd|\'/C calc\'!A0')).toBe("'=cmd|'/C calc'!A0");
    expect(sanitizeCsvField('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
    expect(sanitizeCsvField('@IMPORTXML(...)')).toBe("'@IMPORTXML(...)");
    expect(sanitizeCsvField('-250.50')).toBe('-250.50');
    expect(sanitizeCsvField(1500)).toBe('1500');
    expect(sanitizeCsvField('Normal Customer Name')).toBe('Normal Customer Name');
  });

  it('should verify Anjali Store static QR CRC-16 checksum', () => {
    // Decoded from the user's uploaded standee photo
    const staticWithoutCrc = '0002010102110216427142002176883726400011fonepay.com07162222610021768837110115204533153035245802NP5912Anjali Store6011Lalitpur MP6211070722361576304';
    const crc = calculateCrc16Ccitt(staticWithoutCrc);
    expect(crc.toUpperCase()).toBe('85C0');
  });

  it('should generate EMVCo Fonepay Dynamic QR with pre-filled amount', () => {
    const dynQr = buildFonepayDynamicQr({
      accountName: 'Anjali Store',
      accountNumber: '2222610021768837',
      amount: 250.00,
      remarks: 'BILL-001',
    });

    expect(dynQr).toContain('010212'); // Tag 01 with '12' = Dynamic QR
    expect(dynQr).toContain('5406250.00'); // Tag 54 with pre-filled amount '250.00'
    expect(dynQr).toContain('fonepay.com07162222610021768837'); // Tag 26 with Fonepay Terminal
    expect(dynQr).toContain('Anjali Store'); // Merchant Name
    expect(dynQr).toContain('Lalitpur MP'); // City
    expect(dynQr).toContain('BILL-001'); // Invoice Reference in Tag 62

    // Verifies default format in generateDynamicQrPayload is FONEPAY_DYNAMIC
    const payload = generateDynamicQrPayload({
      accountName: 'Anjali Store',
      accountNumber: '2222610021768837',
      amount: 500.00,
    });
    expect(payload).toContain('010212');
    expect(payload).toContain('5406500.00');
    expect(payload).toContain('fonepay.com');
  });
});

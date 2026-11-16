import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (typeof module.registerHooks === 'function') {
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier) && context.parentURL) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        const tsCandidate = path.resolve(parentDir, `${specifier}.ts`);
        if (fs.existsSync(tsCandidate)) {
          return nextResolve(`${specifier}.ts`, context);
        }
        const indexCandidate = path.resolve(parentDir, specifier, 'index.ts');
        if (fs.existsSync(indexCandidate)) {
          return nextResolve(`${specifier}/index.ts`, context);
        }
      }
      return nextResolve(specifier, context);
    },
  });
}

const { loginUser, getCurrentUser, getAuthToken, logoutUser, hasPermission } = await import('../lib/auth.ts');
const { sanitizeCsvField } = await import('../lib/exportUtils.ts');
const { buildFonepayDynamicQr, calculateCrc16Ccitt, generateDynamicQrPayload } = await import('../lib/qrUtils.ts');
const { sanitizeInput, escapeHtml } = await import('../lib/utils.ts');

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
    assert.equal(getCurrentUser(), null);
    assert.equal(getAuthToken(), undefined);
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
    assert.notEqual(user, null);
    assert.equal(user?.username, 'cashier');
    assert.equal(getAuthToken(), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    assert.equal(hasPermission('canAccessPOS'), true);
    assert.equal(hasPermission('canManageSettings'), false);
    assert.equal(hasPermission('canManageExpenses'), false);
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
    assert.equal(getCurrentUser(), null);
    assert.equal(getAuthToken(), undefined);
  });

  it('should neutralize CSV formula injection payloads while preserving numbers', () => {
    assert.equal(sanitizeCsvField('=cmd|\'/C calc\'!A0'), "'=cmd|'/C calc'!A0");
    assert.equal(sanitizeCsvField('+SUM(A1:A10)'), "'+SUM(A1:A10)");
    assert.equal(sanitizeCsvField('@IMPORTXML(...)'), "'@IMPORTXML(...)");
    assert.equal(sanitizeCsvField('-250.50'), '-250.50');
    assert.equal(sanitizeCsvField(1500), '1500');
    assert.equal(sanitizeCsvField('Normal Customer Name'), 'Normal Customer Name');
  });

  it('should sanitize form inputs and escape HTML against XSS payloads', () => {
    assert.equal(sanitizeInput('  <script>alert(1)</script>Ram Store  '), 'alert(1)Ram Store');
    assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('should verify Anjali Store static QR CRC-16 checksum', () => {
    const staticWithoutCrc = '0002010102110216427142002176883726400011fonepay.com07162222610021768837110115204533153035245802NP5912Anjali Store6011Lalitpur MP6211070722361576304';
    const crc = calculateCrc16Ccitt(staticWithoutCrc);
    assert.equal(crc.toUpperCase(), '85C0');
  });

  it('should generate EMVCo Fonepay Dynamic QR with pre-filled amount', () => {
    const dynQr = buildFonepayDynamicQr({
      accountName: 'Anjali Store',
      accountNumber: '2222610021768837',
      amount: 250.00,
      remarks: 'BILL-001',
    });

    assert.equal(dynQr.includes('010212'), true);
    assert.equal(dynQr.includes('5406250.00'), true);
    assert.equal(dynQr.includes('fonepay.com07162222610021768837'), true);
    assert.equal(dynQr.includes('Anjali Store'), true);
    assert.equal(dynQr.includes('Lalitpur MP'), true);
    assert.equal(dynQr.includes('BILL-001'), true);

    const payload = generateDynamicQrPayload({
      accountName: 'Anjali Store',
      accountNumber: '2222610021768837',
      amount: 500.00,
    });
    assert.equal(payload.includes('010212'), true);
    assert.equal(payload.includes('5406500.00'), true);
    assert.equal(payload.includes('fonepay.com'), true);
  });
});

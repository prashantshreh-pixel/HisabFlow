import { describe, it, expect, beforeEach } from 'vitest';

describe('Authentication Local Storage Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize unauthenticated when no token exists', () => {
    const token = localStorage.getItem('hisabflow_auth');
    expect(token).toBeNull();
  });

  it('should store authentication flag on login success', () => {
    localStorage.setItem('hisabflow_auth', 'true');
    const token = localStorage.getItem('hisabflow_auth');
    expect(token).toBe('true');
  });

  it('should set authentication flag to false on sign out', () => {
    localStorage.setItem('hisabflow_auth', 'true');
    localStorage.setItem('hisabflow_auth', 'false');
    localStorage.removeItem('hisabflow_auth');
    
    const token = localStorage.getItem('hisabflow_auth');
    expect(token).toBeNull();
  });
});

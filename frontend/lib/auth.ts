export function loginUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hisabflow_auth', 'true');
  }
}

export function logoutUser(onLogoutCallback?: () => void): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hisabflow_auth');
  }
  if (onLogoutCallback && typeof onLogoutCallback === 'function') {
    onLogoutCallback();
  }
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('hisabflow_auth') === 'true';
}

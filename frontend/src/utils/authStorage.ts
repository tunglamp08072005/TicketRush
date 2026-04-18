export type RoleType = 'USER' | 'ADMIN';

export function normalizeAuthRole(role: string | null | undefined): RoleType {
  const normalized = (role || 'USER').toUpperCase().trim().replace(/^ROLE_/, '');
  return normalized === 'ADMIN' ? 'ADMIN' : 'USER';
}

export function setAuthSession(token: string, role: string, username?: string): void {
  const normalizedRole = normalizeAuthRole(role);

  localStorage.setItem('token', token);
  localStorage.setItem('role', normalizedRole);

  try {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('role', normalizedRole);
  } catch {
    // Some browsers may restrict storage in private mode.
  }

  if (username) {
    localStorage.setItem('username', username);
    try {
      sessionStorage.setItem('username', username);
    } catch {
      // Ignore storage restriction.
    }
  }
}

export function getAuthSession(): { token: string | null; role: RoleType | null; username: string | null } {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const role = localStorage.getItem('role') || sessionStorage.getItem('role');
  const username = localStorage.getItem('username') || sessionStorage.getItem('username');

  return {
    token,
    role: role ? normalizeAuthRole(role) : null,
    username,
  };
}

export function clearAuthSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');

  try {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('username');
  } catch {
    // Ignore storage restriction.
  }
}

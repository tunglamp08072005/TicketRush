export type RoleType = 'USER' | 'ADMIN';

type JwtPayload = {
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }

  const nowInSeconds = Date.now() / 1000;
  return payload.exp <= nowInSeconds;
}

function normalizeStoredToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  return token.replace(/^Bearer\s+/i, '').trim();
}

export function normalizeAuthRole(role: string | null | undefined): RoleType {
  const normalized = (role || 'USER').toUpperCase().trim().replace(/^ROLE_/, '');
  return normalized === 'ADMIN' ? 'ADMIN' : 'USER';
}

export function setAuthSession(token: string, role: string, username?: string): void {
  const normalizedToken = normalizeStoredToken(token);
  const normalizedRole = normalizeAuthRole(role);

  if (!normalizedToken) {
    return;
  }

  try {
    sessionStorage.setItem('token', normalizedToken);
    sessionStorage.setItem('role', normalizedRole);
  } catch {
    // Some browsers may restrict storage in private mode.
  }

  if (username) {
    try {
      sessionStorage.setItem('username', username);
    } catch {
      // Ignore storage restriction.
    }
  }
}

export function getAuthSession(): { token: string | null; role: RoleType | null; username: string | null } {
  const storedToken = sessionStorage.getItem('token');
  const token = normalizeStoredToken(storedToken);
  const role = sessionStorage.getItem('role');
  const username = sessionStorage.getItem('username');

  // Cleanup from previous implementation that persisted auth in localStorage.
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');

  if (!token) {
    return {
      token: null,
      role: null,
      username: null,
    };
  }

  if (isTokenExpired(token)) {
    clearAuthSession();
    return {
      token: null,
      role: null,
      username: null,
    };
  }

  return {
    token,
    role: role ? normalizeAuthRole(role) : 'USER',
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

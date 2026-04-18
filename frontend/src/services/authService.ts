const API_URL = 'http://localhost:8080/api/auth';

export interface LoginResponse {
  token: string;
  role: string;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Login failed');
  }

  return await res.json();
}

export async function requestRegisterVerification(email: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/register/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request verification failed');
  }

  return await res.text();
}

export async function verifyRegister(email: string, code: string): Promise<string> {
  const res = await fetch(`${API_URL}/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Verify registration failed');
  }

  return await res.text();
}

export async function forgotPassword(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Forgot password failed');
  }

  return await res.text();
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_URL}/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Reset password failed');
  }

  return await res.text();
}

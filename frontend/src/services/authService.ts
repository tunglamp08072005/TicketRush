const API_URL = 'http://localhost:8080/api/auth';

export interface LoginResponse {
  token: string;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Login failed');
  }

  return await res.json();
}

export async function register(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Register failed');
  }

  return await res.text();
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('s360_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Error de la API');
  }

  return res.json() as Promise<T>;
}

export interface DashboardSummary {
  employees: number;
  brigadists: number;
  contractors: number;
  inspections: number;
  findingsOpen: number;
  actionsOverdue: number;
  trainingRecords: number;
  accidents: number;
  drills: number;
  findingsByRiskLevel: Partial<Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>>;
}

export const api = {
  devLogin: (email: string, devSecret: string) =>
    request<{ accessToken: string; expiresIn: number }>('/api/v1/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, devSecret }),
    }),
  dashboard: () => request<DashboardSummary>('/api/v1/indicators/dashboard'),
};

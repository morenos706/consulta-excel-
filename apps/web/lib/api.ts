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
    // Sesión inválida o expirada: se limpia y se manda a /login desde un
    // único lugar en vez de repetir este chequeo en cada pantalla.
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('s360_token');
      localStorage.removeItem('s360_email');
      window.location.href = '/login';
    }
    throw new ApiError(res.status, body.message ?? 'Error de la API');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Indicadores -----------------------------------------------------

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

// --- Sedes / áreas -----------------------------------------------------

export interface Area {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  name: string;
  city: string | null;
  isMain: boolean;
  areas: Area[];
}

// --- Trabajadores --------------------------------------------------------

export type EmploymentType = 'DIRECT' | 'TEMPORARY' | 'APPRENTICE' | 'OUTSOURCED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Employee {
  id: string;
  documentNumber: string;
  fullName: string;
  position: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  siteId: string;
  areaId: string | null;
  hireDate: string;
  phone: string | null;
}

export interface CreateEmployeeInput {
  siteId: string;
  areaId?: string;
  documentNumber: string;
  fullName: string;
  position: string;
  employmentType: EmploymentType;
  hireDate: string;
  phone?: string;
}

// --- Brigada -------------------------------------------------------------

export type CompetencyLevel = 'COMPLIES' | 'NEEDS_UPDATE' | 'NON_COMPLIANT';

export interface Brigadist {
  id: string;
  employeeId: string;
  group: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  competencyLevel: CompetencyLevel;
  employee: Employee;
}

export interface CompetencyStatus {
  brigadistId: string;
  overallLevel: CompetencyLevel;
  trainingCompletionPercent: number;
  expiredCertificates: number;
  competencies: { name: string; level: CompetencyLevel }[];
}

// --- Inspecciones / hallazgos ---------------------------------------------

export interface InspectionTemplate {
  id: string;
  name: string;
  category: string;
}

export interface Inspection {
  id: string;
  templateId: string;
  siteId: string;
  performedAt: string;
  observations: string | null;
  template?: InspectionTemplate;
  site?: Site;
  findings?: Finding[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingStatus = 'OPEN' | 'IN_PROGRESS' | 'OVERDUE' | 'PENDING_VERIFICATION' | 'CLOSED';
export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CorrectiveAction {
  id: string;
  description: string;
  priority: ActionPriority;
  status: string;
  dueDate: string;
  responsibleEmployeeId: string | null;
  closureEvidenceS3Key: string | null;
}

export interface Finding {
  id: string;
  description: string;
  category: string;
  hazard: string | null;
  riskLevel: RiskLevel;
  status: FindingStatus;
  correctiveActions: CorrectiveAction[];
}

export interface CreateInspectionInput {
  templateId: string;
  siteId: string;
  performedAt: string;
  observations?: string;
  answers: Record<string, unknown>;
}

export interface CreateFindingInput {
  description: string;
  category: string;
  hazard?: string;
  riskLevel: RiskLevel;
  correctiveAction: {
    description: string;
    priority: ActionPriority;
    responsibleEmployeeId?: string;
    dueDate: string;
  };
}

export const api = {
  devLogin: (email: string, devSecret: string) =>
    request<{ accessToken: string; expiresIn: number }>('/api/v1/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, devSecret }),
    }),

  dashboard: () => request<DashboardSummary>('/api/v1/indicators/dashboard'),

  sites: () => request<Site[]>('/api/v1/sites'),

  employees: {
    list: () => request<Employee[]>('/api/v1/employees'),
    create: (input: CreateEmployeeInput) =>
      request<Employee>('/api/v1/employees', { method: 'POST', body: JSON.stringify(input) }),
  },

  brigade: {
    list: () => request<Brigadist[]>('/api/v1/brigadists'),
    create: (input: { employeeId: string; group?: string }) =>
      request<Brigadist>('/api/v1/brigadists', { method: 'POST', body: JSON.stringify(input) }),
    competencyStatus: (id: string) => request<CompetencyStatus>(`/api/v1/brigadists/${id}/competency-status`),
  },

  inspections: {
    list: () => request<Inspection[]>('/api/v1/inspections'),
    get: (id: string) => request<Inspection>(`/api/v1/inspections/${id}`),
    templates: () => request<InspectionTemplate[]>('/api/v1/inspections/templates'),
    create: (input: CreateInspectionInput) =>
      request<Inspection>('/api/v1/inspections', { method: 'POST', body: JSON.stringify(input) }),
    addFinding: (inspectionId: string, input: CreateFindingInput) =>
      request<Finding>(`/api/v1/inspections/${inspectionId}/findings`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },

  findings: {
    submitClosureEvidence: (id: string, evidenceS3Key: string) =>
      request<Finding>(`/api/v1/findings/${id}/closure-evidence`, {
        method: 'PATCH',
        body: JSON.stringify({ evidenceS3Key }),
      }),
    verifyAndClose: (id: string) => request<Finding>(`/api/v1/findings/${id}/verify`, { method: 'PATCH' }),
  },
};

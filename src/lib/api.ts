// Cliente HTTP central — OdontoSystem
// Context-path do backend: /api/v1

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export const API_URL = `${API_BASE}/api/v1`;

const TOKEN_KEY = "odonto.token";
const USER_KEY  = "odonto.user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser(): MeResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setStoredUser(u: MeResponse | null) {
  if (typeof window === "undefined") return;
  u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number; body: any;
  constructor(status: number, body: any, message?: string) {
    super(message || (body?.message ?? `Erro ${status}`));
    this.status = status; this.body = body;
  }
}

type Opts = {
  method?: string; body?: any;
  query?: Record<string, string | number | boolean | undefined | null>;
  formData?: FormData; signal?: AbortSignal;
};

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query))
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.formData) { body = opts.formData; }
  else if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.body); }
  let res: Response;
  try {
    res = await fetch(url.toString(), { method: opts.method ?? (body ? "POST" : "GET"), headers, body, signal: opts.signal });
  } catch (e: any) {
    throw new ApiError(0, null, `Falha de rede: ${e?.message ?? "API offline"}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") { setToken(null); setStoredUser(null); }
    throw new ApiError(res.status, data, data?.message);
  }
  return data as T;
}
function safeJson(t: string) { try { return JSON.parse(t); } catch { return t; } }

// ============ Tipos ============
export type UserRole = "ADMIN" | "DENTIST" | "RECEPTIONIST";

export interface MeResponse {
  id: string; fullName: string; email: string; role: UserRole;
}

/** Usuário completo — retornado por GET /users e GET /users/{id} */
export interface UserRecord {
  id: string; fullName: string; email: string; role: UserRole;
  active: boolean; createdAt?: string;
}
export interface UserCreateRequest { fullName: string; email: string; password: string; role: UserRole; }
export interface UserUpdateRequest { fullName?: string; email?: string; role?: UserRole; }
export interface PasswordResetRequest { newPassword: string; }

export interface Page<T> {
  content: T[]; totalElements: number; totalPages: number;
  number: number; size: number; first: boolean; last: boolean; empty: boolean;
}

export interface Patient {
  id: string; fullName: string; cpf: string; dateOfBirth: string;
  age: number; phone?: string; email?: string; address?: string; notes?: string; active: boolean;
}
export interface PatientRequest {
  fullName: string; cpf: string; dateOfBirth: string;
  phone?: string; email?: string; address?: string; notes?: string;
}

export type AppointmentStatus =
  | "AGENDADO"
  | "CONFIRMADO"
  | "AGUARDANDO"
  | "EM_ATENDIMENTO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "NAO_COMPARECEU";

export interface Appointment {
  id: string; patientId: string; patientName: string;
  dentistId: string; dentistName: string;
  startTime: string; endTime: string; status: AppointmentStatus;
  reason?: string; notes?: string; createdAt: string;
}
export interface AppointmentRequest {
  patientId: string; dentistId: string;
  startTime: string; endTime: string; reason?: string; notes?: string;
}

export interface Procedure {
  id: string; name: string; category: string; defaultDurationMinutes: number; description?: string;
}
export interface ClinicalRecord {
  id: string; patientId: string; patientName: string;
  dentistId: string; dentistName: string; recordDate: string;
  chiefComplaint: string; diagnosis?: string; treatmentPlan?: string;
  evolutionNotes?: string; active: boolean; procedures: Procedure[]; createdAt: string;
}
export interface ClinicalRecordRequest {
  patientId: string;
  recordDate: string;
  chiefComplaint: string;
  diagnosis?: string;
  treatmentPlan?: string;
  evolutionNotes?: string;
  procedureIds?: string[];
}
export interface ExamFile {
  id: string; patientId: string; fileName: string; url?: string;
  examType?: string; description?: string; examDate?: string; createdAt: string;
}
export type ToothStatus =
  | "HIGIDO"
  | "RESTAURADO"
  | "CARIE"
  | "CANAL"
  | "AUSENTE"
  | "IMPLANTE"
  | "COROA"
  | "FRATURA"
  | "OUTRO";
export interface ToothRecord {
  id: string;
  toothNumber: number;
  status: ToothStatus;
  notes?: string;
  dentistName: string;
  recordedAt: string;
  createdAt: string;
}
export interface OdontogramResponse {
  patientId: string;
  patientName: string;
  teeth: ToothRecord[];
  lastUpdated?: string | null;
  updatedBy: string;
}

// ============ Domain helpers ============
export const Auth = {
  login: (email: string, password: string) =>
    api<{ token: string }>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => api<MeResponse>("/auth/me"),
};

/** Gestão de usuários — endpoints que o backend precisará expor (ver instruções backend) */
export const Users = {
  list: (params: { role?: UserRole; active?: boolean; page?: number; size?: number } = {}) =>
    api<Page<UserRecord>>("/users", { query: params }),
  listDentists: () =>
    api<Page<UserRecord>>("/users", { query: { role: "DENTIST", active: true, size: 100 } }),
  get: (id: string) => api<UserRecord>(`/users/${id}`),
  create: (data: UserCreateRequest) =>
    api<UserRecord>("/users", { method: "POST", body: data }),
  update: (id: string, data: UserUpdateRequest) =>
    api<UserRecord>(`/users/${id}`, { method: "PUT", body: data }),
  resetPassword: (id: string, data: PasswordResetRequest) =>
    api<void>(`/users/${id}/password`, { method: "PATCH", body: data }),
  deactivate: (id: string) =>
    api<UserRecord>(`/users/${id}/deactivate`, { method: "PATCH" }),
  activate: (id: string) =>
    api<UserRecord>(`/users/${id}/activate`, { method: "PATCH" }),
};

export const Patients = {
  list: (params: { name?: string; cpf?: string; page?: number; size?: number } = {}) =>
    api<Page<Patient>>("/patients", { query: params }),
  get: (id: string) => api<Patient>(`/patients/${id}`),
  create: (data: PatientRequest) => api<Patient>("/patients", { method: "POST", body: data }),
  update: (id: string, data: PatientRequest) => api<Patient>(`/patients/${id}`, { method: "PUT", body: data }),
  remove: (id: string) => api<void>(`/patients/${id}`, { method: "DELETE" }),
};

export const Appointments = {
  list: (params: { page?: number; size?: number } = {}) =>
    api<Page<Appointment>>("/appointments", { query: { size: 200, sort: "startTime", ...params } }),
  get: (id: string) => api<Appointment>(`/appointments/${id}`),
  create: (data: AppointmentRequest) => api<Appointment>("/appointments", { method: "POST", body: data }),
  update: (id: string, data: AppointmentRequest) => api<Appointment>(`/appointments/${id}`, { method: "PUT", body: data }),
  setStatus: (id: string, status: AppointmentStatus) =>
    api<Appointment>(`/appointments/${id}/status`, { method: "PATCH", body: { status } }),
  waitingRoom: () => api<WaitingRoomEntry[]>("/appointments/waiting-room"),
};

export const Records = {
  listByPatient: (patientId: string, page = 0, size = 20) =>
    api<Page<ClinicalRecord>>(`/patients/${patientId}/records`, { query: { page, size } }),
  get: (id: string) => api<ClinicalRecord>(`/records/${id}`),
  create: (patientId: string, data: ClinicalRecordRequest) =>
    api<ClinicalRecord>(`/patients/${patientId}/records`, { method: "POST", body: data }),
  update: (id: string, data: ClinicalRecordRequest) =>
    api<ClinicalRecord>(`/records/${id}`, { method: "PUT", body: data }),
  remove: (id: string) => api<void>(`/records/${id}`, { method: "DELETE" }),
};

export const Procedures = { catalog: () => api<Procedure[]>("/procedures/catalog") };

export const Exams = {
  listByPatient: (patientId: string, page = 0, size = 20) =>
    api<Page<ExamFile>>(`/patients/${patientId}/exams`, { query: { page, size } }),
  upload: (patientId: string, file: File, extra: { examType?: string; description?: string; examDate?: string } = {}) => {
    const fd = new FormData();
    fd.append("file", file);
    if (extra.examType) fd.append("examType", extra.examType);
    if (extra.description) fd.append("description", extra.description);
    if (extra.examDate) fd.append("examDate", extra.examDate);
    return api<ExamFile>(`/patients/${patientId}/exams`, { method: "POST", formData: fd });
  },
  remove: (id: string) => api<void>(`/exams/${id}`, { method: "DELETE" }),
};

/** Sala de espera — retornado por GET /appointments/waiting-room */
export interface WaitingRoomEntry {
  appointmentId: string;
  patientName: string;
  dentistName: string;
  status: AppointmentStatus;
  startTime: string;
  waitingTimeMinutes: number;
}

/** Recorrência — retornado por GET /recurrence/list */
export interface RecurrenceEntry {
  patientId: string;
  fullName: string;
  phone: string;
  messageTemplate: string;
}

export const WaitingRoom = {
  list: () => api<WaitingRoomEntry[]>("/appointments/waiting-room"),
};

export const Recurrence = {
  list: () => api<RecurrenceEntry[]>("/recurrence/list"),
  trigger: (phone: string, message: string) =>
    api<void>(`/recurrence/trigger?phone=${encodeURIComponent(phone)}`, {
      method: "POST",
      body: message,
    }),
};

export const Odontograms = {
  get: (patientId: string) =>
    api<OdontogramResponse>(`/patients/${patientId}/odontogram`),
  record: (patientId: string, data: { toothNumber: number; status: ToothStatus; notes?: string }) =>
    api<ToothRecord>(`/patients/${patientId}/odontogram`, { method: "POST", body: data }),
  history: (patientId: string, toothNumber: number) =>
    api<ToothRecord[]>(`/patients/${patientId}/odontogram/${toothNumber}/history`),
};

// ============ Formatadores ============
export function formatCpf(cpf: string) {
  const d = (cpf || "").replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}
/** Mascara CPF: exibe apenas primeiros 3 e últimos 2 dígitos — ex.: 123.***.***-09 */
export function maskCpf(cpf: string) {
  const d = (cpf || "").replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  return `${d.slice(0,3)}.***.***-${d.slice(9,11)}`;
}
export function onlyDigits(s: string) { return (s || "").replace(/\D/g, ""); }
export function formatPhone(p?: string) {
  if (!p) return "";
  const d = onlyDigits(p);
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return p;
}
export function parseBackendDateTime(value: string | number[]): Date {
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value as number[];
    return new Date(y, mo - 1, d, h, mi, s);
  }
  return new Date(value);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  AGUARDANDO: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NAO_COMPARECEU: "Não compareceu",
};
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador", DENTIST: "Dentista", RECEPTIONIST: "Recepcionista",
};
export const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  DENTIST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  RECEPTIONIST: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// ============ Novos tipos — Bloqueio de horários & Horários livres ============

export interface BlockScheduleRequest {
  dentistId: string;
  startTime: string;  // ISO datetime
  endTime: string;    // ISO datetime
  reason: string;
}

export interface FreeSlot {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

// ============ Extensão de Appointments com novos endpoints ============

export const AppointmentsExt = {
  blockSchedule: (data: BlockScheduleRequest) =>
    api<Appointment>("/appointments/block", { method: "POST", body: data }),

  getFreeSlots: (dentistId: string, date: string) =>
    api<FreeSlot[]>("/appointments/free-slots", {
      query: { dentistId, date },
    }),
};

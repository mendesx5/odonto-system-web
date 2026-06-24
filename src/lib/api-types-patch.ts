// ──────────────────────────────────────────────────────────────────────────────
// PATCH para src/lib/api.ts
// Adicione os campos abaixo aos tipos já existentes no arquivo.
// ──────────────────────────────────────────────────────────────────────────────

// 1. ClinicalRecordRequest — adicione o campo procedureIds (opcional):
//
// export interface ClinicalRecordRequest {
//   patientId: string;
//   recordDate: string;
//   chiefComplaint: string;
//   diagnosis?: string;
//   treatmentPlan?: string;
//   evolutionNotes?: string;
//   procedureIds?: string[];   // ← ADD THIS
// }

// 2. AppointmentRequest — adicione procedureIds (opcional, para quando o backend suportar):
//
// export interface AppointmentRequest {
//   patientId: string;
//   dentistId: string;
//   startTime: string;
//   endTime: string;
//   reason?: string;
//   notes?: string;
//   procedureIds?: string[];   // ← ADD THIS (fase 5)
// }

// 3. Appointments.listByPatient (novo método — adicione ao objeto Appointments):
//
// export const Appointments = {
//   ...
//   listByPatient: (patientId: string, page = 0, size = 200) =>
//     api<Page<Appointment>>(`/appointments`, {
//       query: { patientId, page, size, sort: "startTime" },
//     }),
// };
//
// NOTA: quando o backend implementar GET /appointments?patientId=... pode-se
// substituir o filtro client-side de _authenticated.patients.$id.tsx pelo método acima.

// 4. STATUS_LABEL — verifique se as chaves batem exatamente com o enum do backend.
//    O backend usa: AGENDADO | CONFIRMADO | CONCLUIDO | CANCELADO | NAO_COMPARECEU
//    O frontend usa os mesmos. ✅  Nenhuma alteração necessária.

export {}; // mantém o arquivo como módulo TypeScript

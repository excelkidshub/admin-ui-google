import type {
  AdminData,
  BatchForm,
  BatchRecord,
  DashboardSummary,
  ExpenseForm,
  ExpenseRecord,
  PaymentForm,
  PaymentRecord,
  StudentForm,
  StudentRecord
} from "../types";

const SESSION_KEY = "excelkidshub-admin-google-session";
const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL ?? "";
const ADMISSIONS_ENDPOINT = import.meta.env.VITE_ADMISSIONS_ENDPOINT ?? "";

type SessionState = {
  loggedIn: boolean;
  adminToken: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  adminToken?: string;
  admissionId?: string;
  data?: T;
};

function getStoredSession(): SessionState {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return { loggedIn: false, adminToken: "" };
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return { loggedIn: false, adminToken: "" };
  }
}

function saveSession(session: SessionState) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function requireAppsScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("VITE_GOOGLE_SCRIPT_URL is not configured");
  }
}

async function postAppsScript<T>(payload: Record<string, unknown>): Promise<ApiEnvelope<T>> {
  requireAppsScriptUrl();

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Apps Script request failed");
  }

  return result;
}

function toAdmissionsPayload(form: StudentForm) {
  return {
    parentName: form.parentName.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    studentName: form.studentName.trim(),
    age: form.age.trim(),
    gender: form.gender.trim(),
    school: form.school.trim(),
    grade: form.grade.trim(),
    level: form.level.trim(),
    mode: form.mode,
    admissionSource: form.admissionSource.trim() || "Admin UI",
    notes: form.notes.trim()
  };
}

function buildFeeValues(totalFee: number, discount: number, manualAdjustment: number, totalPaid: number) {
  const adjustedFee = Math.max(0, totalFee - discount + manualAdjustment);
  const pending = Math.max(0, adjustedFee - totalPaid);
  const paymentStatus = pending === 0 && adjustedFee > 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending";

  return { adjustedFee, pending, paymentStatus } as const;
}

function normalizeStudent(student: StudentRecord): StudentRecord {
  const fee = buildFeeValues(
    Number(student.totalFee ?? 0),
    Number(student.discount ?? 0),
    Number(student.manualAdjustment ?? 0),
    Number(student.totalPaid ?? 0)
  );

  return {
    ...student,
    totalFee: Number(student.totalFee ?? 0),
    discount: Number(student.discount ?? 0),
    manualAdjustment: Number(student.manualAdjustment ?? 0),
    totalPaid: Number(student.totalPaid ?? 0),
    adjustedFee: Number(student.adjustedFee ?? fee.adjustedFee),
    pending: Number(student.pending ?? fee.pending),
    paymentStatus: student.paymentStatus || fee.paymentStatus
  };
}

async function submitAdmissionToLiveEndpoint(form: StudentForm) {
  if (!ADMISSIONS_ENDPOINT) {
    throw new Error("VITE_ADMISSIONS_ENDPOINT is not configured");
  }

  const response = await fetch(ADMISSIONS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toAdmissionsPayload(form))
  });

  const result = (await response.json()) as ApiEnvelope<never>;
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to save admission");
  }

  return result;
}

export const adminSession = {
  isLoggedIn() {
    return getStoredSession().loggedIn;
  },
  async login(password: string) {
    const result = await postAppsScript<never>({
      action: "adminLogin",
      adminPassword: password
    });

    saveSession({
      loggedIn: true,
      adminToken: result.adminToken || ""
    });

    return true;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
  getToken() {
    return getStoredSession().adminToken;
  }
};

export const adminApi = {
  async getAll(): Promise<AdminData> {
    const adminToken = adminSession.getToken();
    const [studentsResult, batchesResult, paymentsResult, expensesResult] = await Promise.all([
      postAppsScript<StudentRecord[]>({ action: "getAdmissions", adminToken }),
      postAppsScript<BatchRecord[]>({ action: "getBatches", adminToken }),
      postAppsScript<PaymentRecord[]>({ action: "getPayments", adminToken }),
      postAppsScript<ExpenseRecord[]>({ action: "getExpenses", adminToken })
    ]);

    return {
      students: (studentsResult.data || []).map(normalizeStudent),
      batches: batchesResult.data || [],
      payments: paymentsResult.data || [],
      expenses: expensesResult.data || []
    };
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const result = await postAppsScript<DashboardSummary>({
      action: "getDashboard",
      adminToken: adminSession.getToken()
    });

    return result.data as DashboardSummary;
  },

  async createStudent(form: StudentForm) {
    const result = await submitAdmissionToLiveEndpoint(form);
    return normalizeStudent({
      ...form,
      admissionId: result.admissionId || "",
      createdDate: new Date().toISOString(),
      adjustedFee: 0,
      pending: 0,
      paymentStatus: "Pending"
    });
  },

  async updateStudent(_form: StudentForm) {
    throw new Error("Student update is not connected to Google Sheet yet");
  },

  async createBatch(form: BatchForm) {
    await postAppsScript<never>({
      action: "saveBatch",
      adminToken: adminSession.getToken(),
      ...form
    });
    return form;
  },

  async updateBatch(form: BatchForm) {
    await postAppsScript<never>({
      action: "updateBatch",
      adminToken: adminSession.getToken(),
      ...form
    });
    return form;
  },

  async assignStudentToBatch(admissionId: string, batchCode: string) {
    await postAppsScript<never>({
      action: "assignStudentToBatch",
      adminToken: adminSession.getToken(),
      admissionId,
      batchCode
    });
  },

  async createPayment(form: PaymentForm) {
    await postAppsScript<never>({
      action: "savePayment",
      adminToken: adminSession.getToken(),
      ...form
    });
    return form;
  },

  async createExpense(form: ExpenseForm) {
    await postAppsScript<never>({
      action: "saveExpense",
      adminToken: adminSession.getToken(),
      ...form
    });
    return form;
  }
};

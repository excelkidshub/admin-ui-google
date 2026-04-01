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

const STORAGE_KEY = "excelkidshub-admin-google-data";
const SESSION_KEY = "excelkidshub-admin-google-session";
const DEFAULT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "admin123";
const ADMISSIONS_ENDPOINT = import.meta.env.VITE_ADMISSIONS_ENDPOINT ?? "";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function buildFeeValues(totalFee: number, discount: number, manualAdjustment: number, totalPaid: number) {
  const adjustedFee = Math.max(0, totalFee - discount + manualAdjustment);
  const pending = Math.max(0, adjustedFee - totalPaid);
  const paymentStatus = pending === 0 && adjustedFee > 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending";

  return { adjustedFee, pending, paymentStatus } as const;
}

function seedData(): AdminData {
  const batches: BatchRecord[] = [
    {
      batchCode: "L1-B1",
      batchName: "Level 1 Morning",
      level: "L1",
      mode: "Offline",
      startDate: today(),
      endDate: "",
      timing: "10:00 AM - 11:00 AM",
      days: "Mon Wed Fri",
      capacity: 12,
      location: "Dhanori",
      status: "Active",
      notes: "Good for early readers"
    },
    {
      batchCode: "L2-B1",
      batchName: "Level 2 Evening",
      level: "L2",
      mode: "Online",
      startDate: today(),
      endDate: "",
      timing: "6:00 PM - 7:00 PM",
      days: "Tue Thu Sat",
      capacity: 15,
      location: "Google Meet",
      status: "Active",
      notes: "Focused on fluency and blends"
    }
  ];

  const studentsBase = [
    {
      admissionId: "A001",
      parentName: "Neha Sharma",
      mobile: "9876543210",
      email: "neha@example.com",
      address: "Vishrantwadi",
      city: "Pune",
      studentName: "Aarav Sharma",
      age: "6",
      gender: "Male",
      school: "Blue Bells School",
      grade: "1",
      level: "L1",
      batchCode: "L1-B1",
      mode: "Offline" as const,
      startDate: today(),
      endDate: "",
      status: "Active" as const,
      totalFee: 12000,
      discount: 1000,
      manualAdjustment: 0,
      totalPaid: 6000,
      admissionSource: "Website",
      referralType: "",
      referrerName: "",
      notes: "Prefers weekend practice sheets"
    },
    {
      admissionId: "A002",
      parentName: "Priya Joshi",
      mobile: "9988776655",
      email: "priya@example.com",
      address: "Dhanori",
      city: "Pune",
      studentName: "Anaya Joshi",
      age: "7",
      gender: "Female",
      school: "Sunrise School",
      grade: "2",
      level: "L2",
      batchCode: "",
      mode: "Online" as const,
      startDate: "",
      endDate: "",
      status: "Pending Start" as const,
      totalFee: 14000,
      discount: 0,
      manualAdjustment: 0,
      totalPaid: 0,
      admissionSource: "Website",
      referralType: "Parent Referral",
      referrerName: "Sneha",
      notes: "Needs evening slots"
    }
  ];

  const students: StudentRecord[] = studentsBase.map((student) => ({
    ...student,
    ...buildFeeValues(student.totalFee, student.discount, student.manualAdjustment, student.totalPaid),
    createdDate: nowIso()
  }));

  const payments: PaymentRecord[] = [
    {
      paymentId: "P001",
      admissionId: "A001",
      studentName: "Aarav Sharma",
      batchCode: "L1-B1",
      paymentDate: today(),
      amount: 6000,
      paymentMode: "UPI",
      transactionId: "UPI-101",
      notes: "Advance fee"
    }
  ];

  const expenses: ExpenseRecord[] = [
    {
      expenseId: "E001",
      expenseDate: today(),
      category: "Marketing",
      amount: 2500,
      paymentMode: "Bank Transfer",
      description: "Flyer distribution",
      vendor: "Local Print Shop"
    }
  ];

  return { students, batches, payments, expenses };
}

function readData(): AdminData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedData();
    writeData(seeded);
    return seeded;
  }

  return JSON.parse(raw) as AdminData;
}

function writeData(data: AdminData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(prefix: string, currentIds: string[]) {
  const max = currentIds.reduce((largest, value) => {
    const match = value.match(/\d+/);
    const current = match ? Number(match[0]) : 0;
    return current > largest ? current : largest;
  }, 0);

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function recalcStudent(student: Omit<StudentRecord, "adjustedFee" | "pending" | "paymentStatus">) {
  return {
    ...student,
    ...buildFeeValues(student.totalFee, student.discount, student.manualAdjustment, student.totalPaid)
  } as StudentRecord;
}

function sortByCreatedDate<T extends { createdDate?: string }>(items: T[]) {
  return [...items].sort((left, right) => String(right.createdDate ?? "").localeCompare(String(left.createdDate ?? "")));
}

function delay<T>(value: T) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), 150));
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

async function submitAdmissionToLiveEndpoint(form: StudentForm) {
  const response = await fetch(ADMISSIONS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toAdmissionsPayload(form))
  });

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    admissionId?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to save admission to live sheet");
  }

  return result;
}

export const adminSession = {
  isLoggedIn() {
    return localStorage.getItem(SESSION_KEY) === "true";
  },
  async login(password: string) {
    if (password !== DEFAULT_PASSWORD) {
      throw new Error("Invalid password");
    }
    localStorage.setItem(SESSION_KEY, "true");
    return delay(true);
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  }
};

export const adminApi = {
  async getAll() {
    return delay(readData());
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const data = readData();
    const totalRevenue = data.payments.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);

    return delay({
      totalStudents: data.students.length,
      activeStudents: data.students.filter((student) => student.status === "Active").length,
      pendingStudents: data.students.filter((student) => student.status === "Pending Start").length,
      activeBatches: data.batches.filter((batch) => batch.status === "Active").length,
      totalRevenue,
      pendingFees: data.students.reduce((sum, student) => sum + student.pending, 0),
      totalExpenses
    });
  },

  async createStudent(form: StudentForm) {
    const data = readData();
    const localAdmissionId = nextId("A", data.students.map((student) => student.admissionId));
    const liveResult = ADMISSIONS_ENDPOINT ? await submitAdmissionToLiveEndpoint(form) : null;
    const nextStudent: StudentRecord = recalcStudent({
      ...form,
      admissionId: liveResult?.admissionId || localAdmissionId,
      createdDate: nowIso()
    });

    data.students = sortByCreatedDate([nextStudent, ...data.students]);
    writeData(data);
    return delay(nextStudent);
  },

  async updateStudent(form: StudentForm) {
    const data = readData();
    const index = data.students.findIndex((student) => student.admissionId === form.admissionId);

    if (index === -1) {
      throw new Error("Student record not found");
    }

    const existing = data.students[index];
    data.students[index] = recalcStudent({
      ...existing,
      ...form
    });
    writeData(data);
    return delay(data.students[index]);
  },

  async createBatch(form: BatchForm) {
    const data = readData();
    if (data.batches.some((batch) => batch.batchCode === form.batchCode)) {
      throw new Error("Batch code already exists");
    }

    data.batches = [form, ...data.batches];
    writeData(data);
    return delay(form);
  },

  async updateBatch(form: BatchForm) {
    const data = readData();
    const index = data.batches.findIndex((batch) => batch.batchCode === form.batchCode);
    if (index === -1) {
      throw new Error("Batch not found");
    }

    data.batches[index] = form;
    writeData(data);
    return delay(form);
  },

  async assignStudentToBatch(admissionId: string, batchCode: string) {
    const data = readData();
    const studentIndex = data.students.findIndex((student) => student.admissionId === admissionId);
    const batch = data.batches.find((item) => item.batchCode === batchCode);

    if (studentIndex === -1) {
      throw new Error("Student not found");
    }
    if (!batch) {
      throw new Error("Batch not found");
    }

    const student = data.students[studentIndex];
    data.students[studentIndex] = recalcStudent({
      ...student,
      batchCode,
      startDate: student.startDate || batch.startDate,
      endDate: student.endDate || batch.endDate,
      status: batch.status === "Completed" ? "Completed" : "Active"
    });
    writeData(data);
    return delay(data.students[studentIndex]);
  },

  async createPayment(form: PaymentForm) {
    const data = readData();
    const studentIndex = data.students.findIndex((student) => student.admissionId === form.admissionId);
    if (studentIndex === -1) {
      throw new Error("Student not found for payment");
    }

    const nextPayment: PaymentRecord = {
      ...form,
      paymentId: nextId("P", data.payments.map((payment) => payment.paymentId))
    };

    data.payments = [nextPayment, ...data.payments];

    const currentStudent = data.students[studentIndex];
    data.students[studentIndex] = recalcStudent({
      ...currentStudent,
      totalPaid: currentStudent.totalPaid + form.amount
    });

    writeData(data);
    return delay(nextPayment);
  },

  async createExpense(form: ExpenseForm) {
    const data = readData();
    const nextExpense: ExpenseRecord = {
      ...form,
      expenseId: nextId("E", data.expenses.map((expense) => expense.expenseId))
    };

    data.expenses = [nextExpense, ...data.expenses];
    writeData(data);
    return delay(nextExpense);
  }
};

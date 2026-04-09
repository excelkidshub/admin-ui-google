export type ViewKey = "dashboard" | "students" | "batches" | "payments" | "expenses";
export type LearningMode = "Online" | "Offline";
export type StudentStatus = "Pending Start" | "Active" | "Completed" | "On Hold";
export type PaymentStatus = "Pending" | "Partial" | "Paid";
export type BatchStatus = "Upcoming" | "Active" | "Completed";
export type PaymentMode = "UPI" | "Cash" | "Bank Transfer";
export type ExpenseCategory = "Rent" | "Salary" | "Stationery" | "Marketing" | "Utilities" | "Other";
export type PaymentEmailKind = "receipt" | "full-payment" | "pending-reminder";

export type StudentRecord = {
  admissionId: string;
  parentName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  studentName: string;
  age: string;
  gender: string;
  school: string;
  grade: string;
  level: string;
  batchCode: string;
  mode: LearningMode;
  startDate: string;
  endDate: string;
  status: StudentStatus;
  totalFee: number;
  discount: number;
  manualAdjustment: number;
  adjustedFee: number;
  totalPaid: number;
  pending: number;
  paymentStatus: PaymentStatus;
  admissionSource: string;
  referralType: string;
  referrerName: string;
  createdDate: string;
  notes: string;
};

export type BatchRecord = {
  batchCode: string;
  batchName: string;
  level: string;
  mode: LearningMode;
  startDate: string;
  endDate: string;
  timing: string;
  days: string;
  capacity: number;
  location: string;
  status: BatchStatus;
  notes: string;
};

export type PaymentRecord = {
  paymentId: string;
  admissionId: string;
  studentName: string;
  batchCode: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId: string;
  notes: string;
};

export type ExpenseRecord = {
  expenseId: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  paymentMode: PaymentMode;
  description: string;
  vendor: string;
};

export type DashboardSummary = {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  activeBatches: number;
  totalRevenue: number;
  pendingFees: number;
  totalExpenses: number;
};

export type AdminData = {
  students: StudentRecord[];
  batches: BatchRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
};

export type StudentForm = Omit<StudentRecord, "adjustedFee" | "pending" | "paymentStatus" | "createdDate">;
export type BatchForm = BatchRecord;
export type PaymentForm = Omit<PaymentRecord, "paymentId">;
export type ExpenseForm = Omit<ExpenseRecord, "expenseId">;

export type PaymentCreateResult = {
  message: string;
  paymentId: string;
  paymentStatus: PaymentStatus;
  pending: number;
  totalPaid: number;
};

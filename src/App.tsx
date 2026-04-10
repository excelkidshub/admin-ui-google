import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi, adminSession } from "./lib/api.live";
import type { AdminData, BatchForm, ExpenseForm, LearningMode, PaymentEmailKind, PaymentForm, PaymentMode, StudentForm, ViewKey } from "./types";

const views: { key: ViewKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "students", label: "Students" },
  { key: "batches", label: "Batches" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" }
];

const ITEMS_PER_PAGE = 10;
const learningModes: LearningMode[] = ["Online", "Offline"];
const paymentModes: PaymentMode[] = ["UPI", "Cash", "Bank Transfer"];
const expenseCategories = ["Rent", "Salary", "Stationery", "Marketing", "Utilities", "Other"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDateCompact(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => onPageChange(0)}>First</button>
      <button disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page + 1} of {pageCount}</span>
      <button disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)}>Next</button>
      <button disabled={page >= pageCount - 1} onClick={() => onPageChange(pageCount - 1)}>Last</button>
    </div>
  );
}

function emptyStudentForm(): StudentForm {
  return {
    admissionId: "",
    parentName: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    studentName: "",
    age: "",
    gender: "",
    school: "",
    grade: "",
    level: "L1",
    batchCode: "",
    mode: "Offline",
    startDate: "",
    endDate: "",
    status: "Pending Start",
    totalFee: 0,
    discount: 0,
    manualAdjustment: 0,
    totalPaid: 0,
    admissionSource: "Admin UI",
    referralType: "",
    referrerName: "",
    notes: ""
  };
}

function emptyBatchForm(): BatchForm {
  return {
    batchCode: "",
    batchName: "",
    level: "L1",
    mode: "Offline",
    startDate: today(),
    endDate: "",
    timing: "",
    days: "",
    capacity: 12,
    location: "",
    status: "Active",
    notes: ""
  };
}

function emptyPaymentForm(): PaymentForm {
  return {
    admissionId: "",
    studentName: "",
    batchCode: "",
    paymentDate: today(),
    amount: 0,
    paymentMode: "UPI",
    transactionId: "",
    notes: ""
  };
}

function emptyExpenseForm(): ExpenseForm {
  return {
    expenseDate: today(),
    category: "Rent",
    amount: 0,
    paymentMode: "Bank Transfer",
    description: "",
    vendor: ""
  };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(adminSession.isLoggedIn());
  const [password, setPassword] = useState("");
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [data, setData] = useState<AdminData>({ students: [], batches: [], payments: [], expenses: [] });
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudentForm());
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatchForm());
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [editingStudent, setEditingStudent] = useState(false);
  const [editingBatch, setEditingBatch] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [assignment, setAssignment] = useState({ admissionId: "", batchCode: "" });
  const [studentSearch, setStudentSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(0);
  const [batchPage, setBatchPage] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const [selectedBatchCode, setSelectedBatchCode] = useState("");

  const dashboard = useMemo(() => ({
    totalStudents: data.students.length,
    activeStudents: data.students.filter((item) => item.status === "Active").length,
    pendingStudents: data.students.filter((item) => item.status === "Pending Start").length,
    activeBatches: data.batches.filter((item) => item.status === "Active").length,
    totalRevenue: data.payments.reduce((sum, item) => sum + item.amount, 0),
    totalExpenses: data.expenses.reduce((sum, item) => sum + item.amount, 0),
    pendingFees: data.students.reduce((sum, item) => sum + item.pending, 0)
  }), [data]);

  const visibleStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return data.students;
    return data.students.filter((item) => 
      [item.admissionId, item.studentName, item.parentName, item.mobile, item.batchCode, item.level]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data.students, studentSearch]);

  const paginatedStudents = useMemo(() => {
    const start = studentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return visibleStudents.slice(start, end);
  }, [visibleStudents, studentPage]);

  const studentPageCount = Math.ceil(visibleStudents.length / ITEMS_PER_PAGE);

  const visibleBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return data.batches;
    return data.batches.filter((item) =>
      [item.batchCode, item.batchName, item.level, item.mode, item.timing, item.days, item.location, item.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [batchSearch, data.batches]);

  const paginatedBatches = useMemo(() => {
    const start = batchPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return visibleBatches.slice(start, end);
  }, [visibleBatches, batchPage]);

  const batchPageCount = Math.ceil(visibleBatches.length / ITEMS_PER_PAGE);

  const visiblePayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    if (!query) return data.payments;
    return data.payments.filter((item) =>
      [item.paymentId, item.studentName, item.admissionId, item.paymentMode, item.transactionId]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data.payments, paymentSearch]);

  const paginatedPayments = useMemo(() => {
    const start = paymentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return visiblePayments.slice(start, end);
  }, [visiblePayments, paymentPage]);

  const paymentPageCount = Math.ceil(visiblePayments.length / ITEMS_PER_PAGE);

  const selectedBatch = useMemo(
    () => data.batches.find((item) => item.batchCode === selectedBatchCode) ?? null,
    [data.batches, selectedBatchCode]
  );

  const selectedBatchStudents = useMemo(() => {
    if (!selectedBatchCode) {
      return [];
    }

    return data.students.filter((item) => item.batchCode === selectedBatchCode);
  }, [data.students, selectedBatchCode]);

  const selectedStudent = useMemo(
    () => data.students.find((item) => item.admissionId === paymentForm.admissionId) ?? null,
    [data.students, paymentForm.admissionId]
  );

  const feeFollowUpStudents = useMemo(
    () => data.students.filter((item) => item.email && (item.pending > 0 || item.paymentStatus === "Paid" || item.totalPaid > 0)),
    [data.students]
  );

  async function runTask(task: () => Promise<void>, success?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (success) setMessage({ tone: "success", text: success });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setData(await adminApi.getAll());
  }

  useEffect(() => {
    if (isLoggedIn) {
      void runTask(refresh);
    }
  }, [isLoggedIn]);

  async function login(event: FormEvent) {
    event.preventDefault();
    await runTask(async () => {
      await adminSession.login(password);
      setPassword("");
      setIsLoggedIn(true);
      await refresh();
    }, "Logged in successfully.");
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    await runTask(async () => {
      if (editingStudent) {
        await adminApi.updateStudent(studentForm);
      } else {
        await adminApi.createStudent(studentForm);
      }
      setStudentForm(emptyStudentForm());
      setEditingStudent(false);
      setShowStudentModal(false);
      setStudentPage(0);
      await refresh();
    }, editingStudent ? "Student updated." : "Student registered.");
  }

  async function saveBatch(event: FormEvent) {
    event.preventDefault();
    await runTask(async () => {
      if (editingBatch) {
        await adminApi.updateBatch(batchForm);
      } else {
        await adminApi.createBatch(batchForm);
      }
      setBatchForm(emptyBatchForm());
      setEditingBatch(false);
      setShowBatchEditModal(false);
      setBatchPage(0);
      await refresh();
    }, editingBatch ? "Batch updated." : "Batch created.");
  }

  async function assignBatch(event: FormEvent) {
    event.preventDefault();
    await runTask(async () => {
      await adminApi.assignStudentToBatch(assignment.admissionId, assignment.batchCode);
      setAssignment({ admissionId: "", batchCode: "" });
      await refresh();
    }, "Student assigned.");
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await adminApi.createPayment({
        ...paymentForm,
        studentName: selectedStudent?.studentName ?? "",
        batchCode: selectedStudent?.batchCode ?? ""
      });
      setPaymentForm(emptyPaymentForm());
      await refresh();
      setMessage({ tone: "success", text: result.message || "Payment saved." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailAction(admissionId: string, emailType: PaymentEmailKind, paymentId = "") {
    setBusy(true);
    setMessage(null);
    try {
      const result = await adminApi.sendPaymentEmail(admissionId, emailType, paymentId);
      setMessage({ tone: "success", text: result.message });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    await runTask(async () => {
      await adminApi.createExpense(expenseForm);
      setExpenseForm(emptyExpenseForm());
      await refresh();
    }, "Expense saved.");
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">E</div>
            <div>
              <p className="eyebrow">ExcelKidsHub</p>
              <div className="brand-title">Phonics Academy Admin</div>
            </div>
          </div>
          <h1>Admin UI for Google Sheets</h1>
          <p className="auth-copy">Login, dashboard, batches, students, payments, and expenses connected to Google Sheets.</p>
          <form className="auth-form" onSubmit={login}>
            <label><span>Admin password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="button button--primary button--block" disabled={busy} type="submit">Login</button>
          </form>
          {message ? <div className={`banner banner--${message.tone}`}>{message.text}</div> : null}
          <p className="helper-text">Use your Apps Script admin password. The app expects live Apps Script environment configuration.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-lockup brand-lockup--sidebar">
            <div className="brand-mark" aria-hidden="true">E</div>
            <div>
              <p className="eyebrow">ExcelKidsHub</p>
              <h1>Admin Google</h1>
            </div>
          </div>
          <span>Google Sheet operations panel</span>
        </div>
        <nav className="sidebar__nav">
          {views.map((view) => (
            <button className={`nav-button ${activeView === view.key ? "nav-button--active" : ""}`} key={view.key} onClick={() => setActiveView(view.key)} type="button">
              <strong>{view.label}</strong>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>{views.find((view) => view.key === activeView)?.label}</h2>
            <p className="subtle-copy">ExcelKidsHub style admin workspace for admissions, batches, fees, and expenses.</p>
          </div>
          <div className="topbar__actions">
            <span className={`chip ${busy ? "chip--busy" : ""}`}>{busy ? "Working..." : "Ready"}</span>
            <button className="button button--ghost" onClick={() => void runTask(refresh)} type="button">Refresh</button>
            <button className="button button--ghost" onClick={() => { adminSession.logout(); setIsLoggedIn(false); }} type="button">Logout</button>
          </div>
        </header>

        {message ? <div className={`banner banner--${message.tone}`}>{message.text}</div> : null}

        {activeView === "dashboard" ? (
          <section className="stack">
            <div className="stat-grid">
              <article className="stat-card"><span>Total Students</span><strong>{dashboard.totalStudents}</strong><small>Admissions captured</small></article>
              <article className="stat-card stat-card--good"><span>Active Students</span><strong>{dashboard.activeStudents}</strong><small>Currently learning</small></article>
              <article className="stat-card stat-card--warn"><span>Pending Start</span><strong>{dashboard.pendingStudents}</strong><small>Need assignment</small></article>
              <article className="stat-card"><span>Active Batches</span><strong>{dashboard.activeBatches}</strong><small>Running batches</small></article>
              <article className="stat-card stat-card--good"><span>Revenue</span><strong>{formatCurrency(dashboard.totalRevenue)}</strong><small>Payments collected</small></article>
              <article className="stat-card stat-card--warn"><span>Pending Fees</span><strong>{formatCurrency(dashboard.pendingFees)}</strong><small>Outstanding fee</small></article>
              <article className="stat-card"><span>Expenses</span><strong>{formatCurrency(dashboard.totalExpenses)}</strong><small>Operational spend</small></article>
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel__header panel__header--stacked">
                  <div><h3>Current batches</h3><p>Live batch overview.</p></div>
                  <div className="toolbar">
                    <label>
                      <span>Filter batches</span>
                      <input value={batchSearch} onChange={(event) => setBatchSearch(event.target.value)} placeholder="Search code, name, mode, level" />
                    </label>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Code</th><th>Name</th><th>Mode</th><th>Timing</th><th>Students</th><th>Action</th></tr></thead>
                    <tbody>
                      {visibleBatches.map((batch) => <tr key={batch.batchCode}><td>{batch.batchCode}</td><td>{batch.batchName}</td><td>{batch.mode}</td><td>{batch.timing || "-"}</td><td>{data.students.filter((item) => item.batchCode === batch.batchCode).length} / {batch.capacity}</td><td><button className="button button--ghost" onClick={() => { setSelectedBatchCode(batch.batchCode); setActiveView("batches"); }} type="button">View</button></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <div className="panel__header"><div><h3>Recent registrations</h3><p>Latest student entries.</p></div></div>
                <div className="list-stack">
                  {data.students.slice(0, 5).map((student) => <div className="list-card" key={student.admissionId}><div><strong>{student.studentName}</strong><span>{student.parentName} | {student.level} | {student.mode}</span></div><div><span>{student.status}</span><small>{student.admissionId}</small></div></div>)}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeView === "students" ? (
          <section className="stack">
            <section className="panel">
              <div className="panel__header panel__header--stacked">
                <div><h3>Student admissions</h3><p>Manage registrations and fee status.</p></div>
                <div className="toolbar">
                  <label><span>Search students</span><input value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setStudentPage(0); }} placeholder="ID, name, parent, mobile, batch, level" /></label>
                  <span className="result-count">{visibleStudents.length} students</span>
                  <button className="button button--primary" onClick={() => { setStudentForm(emptyStudentForm()); setEditingStudent(false); setShowStudentModal(true); }} type="button">+ Add Student</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table compact-grid-table">
                  <thead><tr><th>Student</th><th>Parent</th><th>Program</th><th>Fees</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {paginatedStudents.map((student) => <tr key={student.admissionId}>
                      <td>
                        <div className="cell-stack">
                          <strong>{student.studentName}</strong>
                          <span>{student.admissionId} | {student.grade || "No grade"} | {student.age || "Age -"}</span>
                          <small>{student.school || "School not added"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{student.parentName}</strong>
                          <span>{student.mobile || "-"}</span>
                          <small>{student.email || student.city || "No contact details"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{student.batchCode || "Unassigned"}</strong>
                          <span>{student.level} | {student.mode}</span>
                          <small>{formatDateCompact(student.startDate)} to {formatDateCompact(student.endDate)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack cell-stack--numeric">
                          <strong>{formatCurrency(student.pending)}</strong>
                          <span>Paid {formatCurrency(student.totalPaid)} of {formatCurrency(student.adjustedFee || student.totalFee)}</span>
                          <small>{student.paymentStatus}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{student.status}</strong>
                          <span>{student.admissionSource || "Admin UI"}</span>
                          <small>{student.notes || "No notes"}</small>
                        </div>
                      </td>
                      <td><button className="button button--ghost button--tight" onClick={() => { setStudentForm({ admissionId: student.admissionId, parentName: student.parentName, mobile: student.mobile, email: student.email, address: student.address, city: student.city, studentName: student.studentName, age: student.age, gender: student.gender, school: student.school, grade: student.grade, level: student.level, batchCode: student.batchCode, mode: student.mode, startDate: student.startDate, endDate: student.endDate, status: student.status, totalFee: student.totalFee, discount: student.discount, manualAdjustment: student.manualAdjustment, totalPaid: student.totalPaid, admissionSource: student.admissionSource, referralType: student.referralType, referrerName: student.referrerName, notes: student.notes }); setEditingStudent(true); setShowStudentModal(true); }} type="button">Edit</button></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <Pagination page={studentPage} pageCount={studentPageCount} onPageChange={setStudentPage} />
            </section>
          </section>
        ) : null}

        {activeView === "batches" ? (
          <section className="stack">
            <section className="panel">
              <div className="panel__header panel__header--stacked">
                <div><h3>Current batches</h3><p>Create and update scheduled batches.</p></div>
                <div className="toolbar">
                  <label>
                    <span>Search batches</span>
                    <input value={batchSearch} onChange={(event) => { setBatchSearch(event.target.value); setBatchPage(0); }} placeholder="Code, name, level, timing, location" />
                  </label>
                  <span className="result-count">{visibleBatches.length} batches</span>
                  <button className="button button--primary" onClick={() => { setBatchForm(emptyBatchForm()); setEditingBatch(false); setShowBatchEditModal(true); }} type="button">+ Create Batch</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table compact-grid-table">
                  <thead><tr><th>Batch</th><th>Schedule</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {paginatedBatches.map((batch) => {
                      const studentCount = data.students.filter((item) => item.batchCode === batch.batchCode).length;
                      return <tr key={batch.batchCode}>
                        <td>
                          <div className="cell-stack">
                            <strong>{batch.batchCode} | {batch.batchName}</strong>
                            <span>{batch.level} | {batch.mode}</span>
                            <small>{batch.location || "Location not added"}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{batch.timing || "-"}</strong>
                            <span>{batch.days || "Days not set"}</span>
                            <small>{formatDateCompact(batch.startDate)} to {formatDateCompact(batch.endDate)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack cell-stack--numeric">
                            <strong>{studentCount} / {batch.capacity}</strong>
                            <span>{batch.capacity - studentCount} seats left</span>
                            <small>{studentCount > batch.capacity ? "Over capacity" : "Within capacity"}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{batch.status}</strong>
                            <span>{batch.notes || "No notes"}</span>
                          </div>
                        </td>
                        <td><div className="table-actions"><button className="button button--ghost button--tight" onClick={() => setSelectedBatchCode(batch.batchCode)} type="button">View</button><button className="button button--ghost button--tight" onClick={() => { setBatchForm(batch); setEditingBatch(true); setShowBatchEditModal(true); }} type="button">Edit</button></div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={batchPage} pageCount={batchPageCount} onPageChange={setBatchPage} />
            </section>
            <section className="panel">
              <div className="panel__header"><div><h3>Assign student to batch</h3><p>Move a student into a running batch.</p></div></div>
              <form onSubmit={assignBatch}>
                <div className="form-grid compact-grid">
                  <label><span>Student</span><select value={assignment.admissionId} onChange={(event) => setAssignment((current) => ({ ...current, admissionId: event.target.value }))}><option value="">Select student</option>{data.students.map((student) => <option key={student.admissionId} value={student.admissionId}>{student.studentName} ({student.admissionId})</option>)}</select></label>
                  <label><span>Batch</span><select value={assignment.batchCode} onChange={(event) => setAssignment((current) => ({ ...current, batchCode: event.target.value }))}><option value="">Select batch</option>{data.batches.map((batch) => <option key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} - {batch.batchName}</option>)}</select></label>
                </div>
                <div className="actions"><button className="button button--primary" disabled={busy} type="submit">Assign batch</button></div>
              </form>
            </section>
          </section>
        ) : null}

        {activeView === "payments" ? (
          <section className="stack">
            <section className="panel">
              <div className="panel__header panel__header--stacked">
                <div><h3>Payment history</h3><p>Records from the payments sheet.</p></div>
                <div className="toolbar">
                  <label><span>Search payments</span><input value={paymentSearch} onChange={(event) => { setPaymentSearch(event.target.value); setPaymentPage(0); }} placeholder="ID, student, admission ID, mode, transaction" /></label>
                  <span className="result-count">{visiblePayments.length} payments</span>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table compact compact-grid-table">
                  <thead><tr><th>Payment</th><th>Student</th><th>Amount</th><th>Reference</th><th>Action</th></tr></thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.paymentId}>
                        <td>
                          <div className="cell-stack">
                            <strong>{payment.paymentId}</strong>
                            <span>{formatDateCompact(payment.paymentDate)}</span>
                            <small>{payment.paymentMode}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{payment.studentName}</strong>
                            <span>{payment.admissionId}</span>
                            <small>{payment.batchCode || "No batch"}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack cell-stack--numeric">
                            <strong>{formatCurrency(payment.amount)}</strong>
                            <span>{payment.paymentMode}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{payment.transactionId || "-"}</strong>
                            <span>{payment.notes || "No notes"}</span>
                          </div>
                        </td>
                        <td><button className="button button--ghost button--tight" disabled={busy} onClick={() => void sendEmailAction(payment.admissionId, "receipt", payment.paymentId)} type="button">Send Receipt</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={paymentPage} pageCount={paymentPageCount} onPageChange={setPaymentPage} />
            </section>

            <section className="panel">
              <div className="panel__header"><div><h3>Fee email actions</h3><p>Send reminders and full-payment emails to parents directly from admin.</p></div></div>
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Pending</th><th>Action</th></tr></thead>
                  <tbody>
                    {feeFollowUpStudents.map((student) => (
                      <tr key={student.admissionId}>
                        <td>{student.studentName}</td>
                        <td>{student.email || "-"}</td>
                        <td>{student.paymentStatus}</td>
                        <td>{formatCurrency(student.pending)}</td>
                        <td>
                          <div className="table-actions">
                            <button className="button button--ghost" disabled={busy || !student.email || student.pending <= 0} onClick={() => void sendEmailAction(student.admissionId, "pending-reminder")} type="button">Pending</button>
                            <button className="button button--ghost" disabled={busy || !student.email || student.paymentStatus !== "Paid"} onClick={() => void sendEmailAction(student.admissionId, "full-payment")} type="button">Full Payment</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <form className="panel" onSubmit={savePayment}>
              <div className="panel__header"><div><h3>Create payment record</h3><p>Add a new fee collection entry and optionally email the parent.</p></div></div>
              <div className="form-grid">
                <label><span>Student</span><select value={paymentForm.admissionId} onChange={(event) => setPaymentForm((current) => ({ ...current, admissionId: event.target.value }))} required><option value="">Select student</option>{data.students.map((student) => <option key={student.admissionId} value={student.admissionId}>{student.studentName} ({student.admissionId})</option>)}</select></label>
                <label><span>Amount</span><input type="number" min="1" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))} required /></label>
                <label><span>Date</span><input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} /></label>
                <label><span>Mode</span><select value={paymentForm.paymentMode} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMode: event.target.value as PaymentMode }))}>{paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                <label><span>Transaction ID</span><input value={paymentForm.transactionId} onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))} placeholder="Optional reference number" /></label>
                <label className="field--full"><span>Notes</span><textarea rows={3} value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional payment note for receipt or follow-up" /></label>
              </div>
              {selectedStudent ? <div className="summary-bar"><span>Total fee: {formatCurrency(selectedStudent.totalFee)}</span><span>Paid: {formatCurrency(selectedStudent.totalPaid)}</span><span>Pending: {formatCurrency(selectedStudent.pending)}</span><span>Email: {selectedStudent.email || "-"}</span><span>Status: {selectedStudent.paymentStatus}</span></div> : null}
              <div className="actions"><button className="button button--primary" disabled={busy} type="submit">Save payment</button></div>
            </form>
          </section>
        ) : null}

        {activeView === "expenses" ? (
          <section className="page-grid">
            <section className="panel">
              <div className="panel__header"><div><h3>Expense records</h3><p>Operational spending entries.</p></div></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th></tr></thead>
                  <tbody>{data.expenses.map((expense) => <tr key={expense.expenseId}><td>{expense.expenseId}</td><td>{expense.expenseDate}</td><td>{expense.category}</td><td>{expense.vendor || "-"}</td><td>{formatCurrency(expense.amount)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
            <form className="panel" onSubmit={saveExpense}>
              <div className="panel__header"><div><h3>Create expense record</h3><p>Add a new expense into the register.</p></div></div>
              <div className="form-grid">
                <label><span>Date</span><input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm((current) => ({ ...current, expenseDate: event.target.value }))} /></label>
                <label><span>Amount</span><input type="number" min="1" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: Number(event.target.value) }))} required /></label>
                <label><span>Category</span><select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value as ExpenseForm["category"] }))}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label><span>Payment mode</span><select value={expenseForm.paymentMode} onChange={(event) => setExpenseForm((current) => ({ ...current, paymentMode: event.target.value as PaymentMode }))}>{paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                <label><span>Vendor</span><input value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} /></label>
                <label><span>Description</span><input value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} /></label>
              </div>
              <div className="actions"><button className="button button--primary" disabled={busy} type="submit">Save expense</button></div>
            </form>
          </section>
        ) : null}
      </main>
      
      {/* Student Edit Modal */}
      {showStudentModal ? (
        <div className="modal-backdrop" onClick={() => { setShowStudentModal(false); setStudentForm(emptyStudentForm()); setEditingStudent(false); }} role="presentation">
          <section className="form-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel__header">
              <div><h3>{editingStudent ? "Edit student" : "Register student"}</h3><p>Manage student information and fees.</p></div>
              <button className="button button--ghost" onClick={() => { setShowStudentModal(false); setStudentForm(emptyStudentForm()); setEditingStudent(false); }} type="button">✕</button>
            </div>
            <form onSubmit={saveStudent}>
              <div className="modal-content">
                <div className="form-grid">
                  <label><span>Student name *</span><input value={studentForm.studentName} onChange={(event) => setStudentForm((current) => ({ ...current, studentName: event.target.value }))} required /></label>
                  <label><span>Parent name *</span><input value={studentForm.parentName} onChange={(event) => setStudentForm((current) => ({ ...current, parentName: event.target.value }))} required /></label>
                  <label><span>Mobile *</span><input value={studentForm.mobile} onChange={(event) => setStudentForm((current) => ({ ...current, mobile: event.target.value }))} required /></label>
                  <label><span>Email</span><input type="email" value={studentForm.email} onChange={(event) => setStudentForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label><span>Age</span><input value={studentForm.age} onChange={(event) => setStudentForm((current) => ({ ...current, age: event.target.value }))} /></label>
                  <label><span>Gender</span><select value={studentForm.gender} onChange={(event) => setStudentForm((current) => ({ ...current, gender: event.target.value }))}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
                  <label><span>School</span><input value={studentForm.school} onChange={(event) => setStudentForm((current) => ({ ...current, school: event.target.value }))} /></label>
                  <label><span>Grade</span><input value={studentForm.grade} onChange={(event) => setStudentForm((current) => ({ ...current, grade: event.target.value }))} /></label>
                  <label><span>Level *</span><input value={studentForm.level} onChange={(event) => setStudentForm((current) => ({ ...current, level: event.target.value }))} required /></label>
                  <label><span>Learning Mode *</span><select value={studentForm.mode} onChange={(event) => setStudentForm((current) => ({ ...current, mode: event.target.value as LearningMode }))}>{learningModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                  <label><span>Status</span><select value={studentForm.status} onChange={(event) => setStudentForm((current) => ({ ...current, status: event.target.value as any }))}><option value="Pending Start">Pending Start</option><option value="Active">Active</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option></select></label>
                  <label><span>Assign Batch</span><select value={studentForm.batchCode} onChange={(event) => setStudentForm((current) => ({ ...current, batchCode: event.target.value }))}><option value="">Select batch</option>{data.batches.map((batch) => <option key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} - {batch.batchName}</option>)}</select></label>
                  <label><span>Start Date</span><input type="date" value={studentForm.startDate} onChange={(event) => setStudentForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
                  <label><span>End Date</span><input type="date" value={studentForm.endDate} onChange={(event) => setStudentForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
                  <label><span>Total Fee</span><input type="number" min="0" value={studentForm.totalFee} onChange={(event) => setStudentForm((current) => ({ ...current, totalFee: Number(event.target.value) }))} /></label>
                  <label><span>Total Paid</span><input type="number" min="0" value={studentForm.totalPaid} onChange={(event) => setStudentForm((current) => ({ ...current, totalPaid: Number(event.target.value) }))} /></label>
                  <label><span>Discount</span><input type="number" min="0" value={studentForm.discount} onChange={(event) => setStudentForm((current) => ({ ...current, discount: Number(event.target.value) }))} /></label>
                  <label><span>Manual Adjustment</span><input type="number" value={studentForm.manualAdjustment} onChange={(event) => setStudentForm((current) => ({ ...current, manualAdjustment: Number(event.target.value) }))} /></label>
                  <label><span>City</span><input value={studentForm.city} onChange={(event) => setStudentForm((current) => ({ ...current, city: event.target.value }))} /></label>
                  <label className="field--full"><span>Address</span><textarea rows={2} value={studentForm.address} onChange={(event) => setStudentForm((current) => ({ ...current, address: event.target.value }))} /></label>
                  <label className="field--full"><span>Notes</span><textarea rows={3} value={studentForm.notes} onChange={(event) => setStudentForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button button--primary" disabled={busy} type="submit">{editingStudent ? "Update student" : "Save student"}</button>
                <button className="button button--ghost" onClick={() => { setShowStudentModal(false); setStudentForm(emptyStudentForm()); setEditingStudent(false); }} type="button">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* Batch Edit Modal */}
      {showBatchEditModal ? (
        <div className="modal-backdrop" onClick={() => { setShowBatchEditModal(false); setBatchForm(emptyBatchForm()); setEditingBatch(false); }} role="presentation">
          <section className="form-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel__header">
              <div><h3>{editingBatch ? "Edit batch" : "Create batch"}</h3><p>Manage batch schedule and details.</p></div>
              <button className="button button--ghost" onClick={() => { setShowBatchEditModal(false); setBatchForm(emptyBatchForm()); setEditingBatch(false); }} type="button">✕</button>
            </div>
            <form onSubmit={saveBatch}>
              <div className="modal-content">
                <div className="form-grid">
                  <label><span>Batch code *</span><input value={batchForm.batchCode} onChange={(event) => setBatchForm((current) => ({ ...current, batchCode: event.target.value }))} required disabled={editingBatch} /></label>
                  <label><span>Batch name *</span><input value={batchForm.batchName} onChange={(event) => setBatchForm((current) => ({ ...current, batchName: event.target.value }))} required /></label>
                  <label><span>Level *</span><input value={batchForm.level} onChange={(event) => setBatchForm((current) => ({ ...current, level: event.target.value }))} required /></label>
                  <label><span>Mode *</span><select value={batchForm.mode} onChange={(event) => setBatchForm((current) => ({ ...current, mode: event.target.value as LearningMode }))}>{learningModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                  <label><span>Status</span><select value={batchForm.status} onChange={(event) => setBatchForm((current) => ({ ...current, status: event.target.value as any }))}><option value="Upcoming">Upcoming</option><option value="Active">Active</option><option value="Completed">Completed</option></select></label>
                  <label><span>Capacity</span><input type="number" min="1" value={batchForm.capacity} onChange={(event) => setBatchForm((current) => ({ ...current, capacity: Number(event.target.value) }))} /></label>
                  <label><span>Start Date</span><input type="date" value={batchForm.startDate} onChange={(event) => setBatchForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
                  <label><span>End Date</span><input type="date" value={batchForm.endDate} onChange={(event) => setBatchForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
                  <label><span>Timing</span><input value={batchForm.timing} onChange={(event) => setBatchForm((current) => ({ ...current, timing: event.target.value }))} placeholder="e.g., 4:00 PM - 5:00 PM" /></label>
                  <label><span>Days</span><input value={batchForm.days} onChange={(event) => setBatchForm((current) => ({ ...current, days: event.target.value }))} placeholder="e.g., Mon, Wed, Fri" /></label>
                  <label><span>Location</span><input value={batchForm.location} onChange={(event) => setBatchForm((current) => ({ ...current, location: event.target.value }))} /></label>
                  <label className="field--full"><span>Notes</span><textarea rows={3} value={batchForm.notes} onChange={(event) => setBatchForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button button--primary" disabled={busy} type="submit">{editingBatch ? "Update batch" : "Save batch"}</button>
                <button className="button button--ghost" onClick={() => { setShowBatchEditModal(false); setBatchForm(emptyBatchForm()); setEditingBatch(false); }} type="button">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* Batch Detail Modal */}
      {selectedBatch ? (
        <div className="modal-backdrop" onClick={() => setSelectedBatchCode("")} role="presentation">
          <section className="detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="batch-detail-title">
            <div className="panel__header panel__header--stacked detail-modal__header">
              <div>
                <p className="eyebrow">Batch details</p>
                <h3 id="batch-detail-title">{selectedBatch.batchCode} - {selectedBatch.batchName}</h3>
                <p>{selectedBatch.level} | {selectedBatch.mode} | {selectedBatch.status}</p>
              </div>
              <div className="toolbar">
                <button className="button button--ghost" onClick={() => { setBatchForm(selectedBatch); setEditingBatch(true); setSelectedBatchCode(""); }} type="button">Edit batch</button>
                <button className="button button--ghost" onClick={() => setSelectedBatchCode("")} type="button">Close</button>
              </div>
            </div>
            <div className="detail-modal__body">
              <div className="detail-modal__stats">
                <article className="stat-card"><span>Students</span><strong>{selectedBatchStudents.length}</strong><small>{selectedBatch.capacity} capacity</small></article>
                <article className="stat-card"><span>Collected</span><strong>{formatCurrency(selectedBatchStudents.reduce((sum, item) => sum + item.totalPaid, 0))}</strong><small>Fee received</small></article>
                <article className="stat-card stat-card--warn"><span>Pending</span><strong>{formatCurrency(selectedBatchStudents.reduce((sum, item) => sum + item.pending, 0))}</strong><small>Outstanding fee</small></article>
                <article className="stat-card"><span>Schedule</span><strong>{selectedBatch.timing || "-"}</strong><small>{selectedBatch.days || selectedBatch.mode}</small></article>
              </div>
              <div className="list-stack detail-modal__info">
                <div className="list-card">
                  <div><strong>Dates</strong><span>{selectedBatch.startDate || "-"} to {selectedBatch.endDate || "-"}</span></div>
                  <div><strong>Location</strong><small>{selectedBatch.location || "-"}</small></div>
                </div>
                <div className="list-card">
                  <div><strong>Notes</strong><span>{selectedBatch.notes || "No notes added yet."}</span></div>
                </div>
              </div>
              <div className="table-wrap detail-modal__table">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Student</th><th>Status</th><th>Total Fee</th><th>Paid</th><th>Pending</th><th>Payment</th></tr></thead>
                  <tbody>
                    {selectedBatchStudents.length ? selectedBatchStudents.map((student) => (
                      <tr key={student.admissionId}>
                        <td>{student.admissionId}</td>
                        <td>{student.studentName}</td>
                        <td>{student.status}</td>
                        <td>{formatCurrency(student.totalFee)}</td>
                        <td>{formatCurrency(student.totalPaid)}</td>
                        <td>{formatCurrency(student.pending)}</td>
                        <td>{student.paymentStatus}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7}>No students are assigned to this batch yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

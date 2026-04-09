# ExcelKidsHub Admin UI Google

React admin UI for the Google Sheets based workflow.

## Current scope

- login screen
- dashboard
- student registration and edit
- batch creation and edit
- student to batch assignment
- payment record creation
- expense record creation
- payment receipt / reminder email actions

## Current data mode

The app is designed to work against Google Apps Script.

Set these env vars:

- `VITE_ADMIN_API_URL=/api/admin`

## Run

1. `npm install`
2. `npm run dev`

The admin login now uses the Apps Script `adminLogin` action, so use the same `ADMIN_PASSWORD` that you configured in Apps Script Script Properties.

## Next backend work

Required Apps Script actions:

- `login`
- `getDashboard`
- `getStudents`
- `saveStudent`
- `updateStudent`
- `getBatches`
- `saveBatch`
- `updateBatch`
- `assignStudentToBatch`
- `savePayment`
- `sendPaymentEmail`
- `saveExpense`
- `getPayments`
- `getExpenses`

## Payment email flow

The payments screen now supports:

- send receipt PDF while saving a payment
- send full payment confirmation when balance becomes zero
- resend receipt from payment history
- send pending payment reminder from admin

Apps Script must have:

- `09_PaymentEmails.gs`
- a Google Docs template named `ExcelKidsHub Receipt Template`, or `RECEIPT_TEMPLATE_ID`

## Current live connection path

Current website flow is:

1. `register.html` submits to `/api/register`
2. `api/register.js` on Vercel forwards the request to Google Apps Script
3. Google Apps Script writes into the live Google Sheet

Current config locations:

- Website Vercel proxy: [register.js](/c:/application/docg/excelkidshub-workspace/excelkidshub.github.io/api/register.js)
- Website form submit JS: [admissions.js](/c:/application/docg/excelkidshub-workspace/excelkidshub.github.io/js/admissions.js)
- Admin UI live Apps Script API config: [api.live.ts](/c:/application/docg/excelkidshub-workspace/admin-ui-google/src/lib/api.live.ts)
- Admin UI env example: [.env.example](/c:/application/docg/excelkidshub-workspace/admin-ui-google/.env.example)

For the admin Vercel project, set:

- `GOOGLE_SCRIPT_URL` in the Vercel project environment variables

The browser calls:

- `/api/admin`

Then Vercel forwards that request to:

- `GOOGLE_SCRIPT_URL`

If the website Vercel project should use an env var instead of hardcoded Apps Script URL, set:

- `GOOGLE_SCRIPT_URL`

in the website Vercel project settings.

## Current limitation

Student edit is not yet wired back to Google Sheet update logic. New admission creation, dashboard reads, admissions reads, batches, payments, and expenses are intended to use Apps Script.

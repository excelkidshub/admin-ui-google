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

## Current data mode

The app is designed to work against Google Apps Script.

Set these env vars:

- `VITE_ADMISSIONS_ENDPOINT=https://your-website-domain/api/register`
- `VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/your-apps-script-deployment-id/exec`

## Run

1. `npm install`
2. `npm run dev`

The admin login now uses the Apps Script `adminLogin` action, so use the same `ADMIN_PASSWORD` that you configured in Apps Script Script Properties.

## Next backend work

Required Apps Script admin actions:

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
- `saveExpense`
- `getPayments`
- `getExpenses`

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

- `VITE_ADMISSIONS_ENDPOINT` in the admin project
- `VITE_GOOGLE_SCRIPT_URL` in the admin project

If the website Vercel project should use an env var instead of hardcoded Apps Script URL, set:

- `GOOGLE_SCRIPT_URL`

in the website Vercel project settings.

## Current limitation

Student edit is not yet wired back to Google Sheet update logic. New admission creation, dashboard reads, admissions reads, batches, payments, and expenses are intended to use Apps Script.

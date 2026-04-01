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

The app currently uses a browser `localStorage` mock store so the UI can be reviewed before the Google Apps Script admin API is finished.

## Run

1. `npm install`
2. `npm run dev`

Default local password:

- `admin123`

Change later with:

- `VITE_ADMIN_PASSWORD=your-password`

To use the same live admission save flow as the website:

- `VITE_ADMISSIONS_ENDPOINT=https://your-website-domain/api/register`

Example:

- `VITE_ADMISSIONS_ENDPOINT=https://excelkidshub.in/api/register`

When this is set, the `Students` form in the admin UI will submit new admissions through the same Vercel API proxy already used by the website form.

## Next backend work

Recommended Apps Script admin actions:

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

## Current live connection path

Current website flow is:

1. `register.html` submits to `/api/register`
2. `api/register.js` on Vercel forwards the request to Google Apps Script
3. Google Apps Script writes into the live Google Sheet

Current config locations:

- Website Vercel proxy: [register.js](/c:/application/docg/excelkidshub-workspace/excelkidshub.github.io/api/register.js)
- Website form submit JS: [admissions.js](/c:/application/docg/excelkidshub-workspace/excelkidshub.github.io/js/admissions.js)
- Admin UI live admission endpoint config: [api.ts](/c:/application/docg/excelkidshub-workspace/admin-ui-google/src/lib/api.ts)
- Admin UI env example: [.env.example](/c:/application/docg/excelkidshub-workspace/admin-ui-google/.env.example)

If the admin UI is moved to a separate repo and deployed separately on Vercel, set:

- `VITE_ADMISSIONS_ENDPOINT` in the admin project

If the website Vercel project should use an env var instead of hardcoded Apps Script URL, set:

- `GOOGLE_SCRIPT_URL`

in the website Vercel project settings.

## Current limitation

Right now only new admission creation can use the live Google Sheet flow through `/api/register`.

These admin modules are still local/mock until dedicated read/update APIs are added:

- dashboard reads
- batch reads/writes
- payment reads/writes
- expense reads/writes

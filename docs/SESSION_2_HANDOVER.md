# CLINIQ — Session 2 Handover · 17 Jul 2026

Owner: Dr. Karthikayan Dhanasekaran (nammadoctorji) · Chennai
Hard constraint: NEET PG exam 30 Aug 2026 — every session must end at a committed, deployable state with a handover note.

## What happened this session

Session 1 left deployment blocked on an empty `.env.local` and a suspected wrong-Google-account mixup (browser was signed into drkarthikayan@gmail.com instead of nammadoctorji@gmail.com while working in Firebase console / Cloud Shell). This session resolved the blocker and completed the full deploy + seed pipeline.

**Standing rule reconfirmed and followed throughout:** verified the active Google account (via `myaccount.google.com`) before every console/terminal action. Note the account slot index (`/u/0/`, `/u/1/`) is **not stable across tabs/tab groups** — it flipped between sessions. Always re-verify by reading the account name/email on the page, never assume the slot index from a previous tab.

1. **Firebase console (as nammadoctorji):** confirmed the "CLINIQ web" app already existed correctly on the `cliniq-software` project (the Session 1 registration was fine — the earlier account mixup did not corrupt it). Captured the real `firebaseConfig`.
2. **`.env.local`:** wrote via single `printf` command in Cloud Shell (`~/cliniq/.env.local`), verified all 7 `VITE_*` lines are filled. No heredocs used.
3. **Firestore:** already existed, confirmed region is `asia-south1` via `gcloud firestore databases describe`. Auth Email/Password already enabled. Hosting had not been initialized yet — first `firebase deploy --only hosting` registered the default site.
4. **Deploy pipeline:**
   - `firebase login --no-localhost` — completed via the Google OAuth consent flow (session ID cross-checked before pasting the auth code back into Cloud Shell). First attempt's session expired after a browser tab was lost mid-flow; second attempt succeeded cleanly.
   - `firebase use cliniq-software`
   - `firebase deploy --only firestore:rules` — deployed successfully.
   - `npm run build` — succeeded (`vite build`, 77 modules, ~7.5s). Note: a few chunks exceed 500 kB post-minification (firebase-firestore, firebase-auth, index bundle) — not blocking, but worth code-splitting in a future session per Vite's warning.
   - `firebase deploy --only hosting` — **live at https://cliniq-software.web.app**
5. **Seed:** generated a service-account key directly in Cloud Shell via `gcloud iam service-accounts keys create` (avoided ever downloading it through the browser), ran `npm i firebase-admin --save-dev && node scripts/seedTenant.mjs` with the **placeholder** tenant/doctor config left as-is in `scripts/seedTenant.mjs` (tenantId `sunrise-clinic`, doctor `dr.priya@sunriseclinic.in` / `ChangeMe#2026`). Deleted the local key file **and** revoked the IAM key itself (`gcloud iam service-accounts keys delete`) immediately after — no lingering credential anywhere.
6. **Verification:** signed in at the live URL as the seeded doctor. Doctor rail rendered correctly (Front desk, Appointments, Consultation, Patient history, Billing, Pharmacy, Templates, Settings). Empty queue rendered correctly. Ran a live test check-in (mobile `9840012345`, "Test Patient QA") — token was assigned, queue updated in real time, and the write was confirmed present in Firestore at `tenants/sunrise-clinic/visits/{autoId}`.
7. **Committed + pushed:** only `package.json` / `package-lock.json` changed (added `firebase-admin` as a devDependency for the seed script). `.env.local` correctly stayed out of git (already gitignored). Pushed to `main` at commit `65d57d0` (`nammadoctorji/CLINIQ-SOFTWARE`).

## Current state — fully deployed, no blockers

- **Live app:** https://cliniq-software.web.app
- **Seeded login:** `dr.priya@sunriseclinic.in` / `ChangeMe#2026` (tenant `sunrise-clinic`) — **change this password after first real login**, per the seed script's own reminder. This is placeholder demo data; rename the clinic/doctor in Settings once real onboarding starts, or edit `CONFIG` in `scripts/seedTenant.mjs` and re-run to seed a second real tenant.
- **Test data present:** one test visit ("Test Patient QA", mobile 9840012345) sits in the `sunrise-clinic` tenant's queue. Fine to leave as a smoke-test fixture, or delete via Firestore console before real use.
- Firestore: `asia-south1`, production rules deployed, tenant-isolated per `firestore.rules`.
- Firebase: Spark plan, Auth Email/Password on, Hosting live.
- Repo: `main` branch, commit `65d57d0`, working tree clean.

## Immediate next steps (S2 — Consultation page)

Per the original build order in the Session 1 handover, next up is the Consultation page, ported from `CLINIQ_prototype.html`:

- Patient banner with allergy band and block-on-prescribe logic
- Pre-existing condition chips
- Doctor-editable vitals (does not overwrite nurse's front-desk entry — audit trail)
- Quick/SOAP toggle
- Labs checklist (blood / urine-others / imaging+cardiac) + free-text custom line
- Rx table with stock-aware drug search (FEFO batch tag) and allergy check against `patient.allergies`
- Template apply-and-edit, "Save as template" from a completed consult
- Complete consult → sets visit status + queues billing
- New services needed: `visits.service.js`, `stock.service.js` (drug search, FEFO pick, allergy check)

## Conventions reconfirmed this session

- `where()` + `orderBy()` on different fields → composite index trap; filter server-side, sort client-side.
- No heredocs in this user's terminal — single-line `printf`/`sed`, or base64-encode-and-decode for longer file writes.
- Verify Google account identity before every console/terminal action — and re-verify per tab, since account slot index (`/u/0/`, `/u/1/`) is not stable.
- OAuth consent screens (`firebase login`, `gh auth login`) require explicit user go-ahead before completing — confirmed with the user this session before proceeding.
- Session end = commit + push + handover doc, always.

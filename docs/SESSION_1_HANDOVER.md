# CLINIQ — Session 1 handover · 14 Jul 2026

## State: DEPLOYABLE ✅
`npm install && npm run dev` runs the full app in demo mode. `npm run build` passes.

## Decisions locked this session
1. **New Firebase project** (cliniq-prod, asia-south1) — clean separation from OHC.
2. **Multi-tenant from day 1**, OHC pattern: custom claims `{tenantId, role}`,
   all data under `tenants/{tenantId}`, rules enforce token match.
3. **Patient identity = mobile + name + DOB** (not age). Age always derived.
4. **FEFO not FIFO** for pharmacy — expiry beats arrival date for medicines.
5. Stack identical to OHC: React 19 + Vite + Tailwind 3.4 + Firebase 12 + Zustand.
6. Demo mode (`VITE_DEMO_MODE=true`) runs everything with in-memory data —
   UI work never blocks on Firebase config.

## Built & working
- Design system as Tailwind tokens (ink/teal/paper/caution/danger, Sora/Inter/IBM Plex Mono)
- Login → role-aware app shell (rail filters by role) → lazy-loaded routes
- **Front Desk (complete):** live queue (onSnapshot in prod / reactive demo store),
  phone → family strip with allergy/condition chips, check-in modal with optional
  nurse vitals, token assignment, stats
- Firestore rules (tenant-isolated, role-gated writes), schema doc, seed script

## NOT done (ordered backlog)
- S2: Consultation page (allergy band + block-on-prescribe, vitals doctor-edit,
  Quick/SOAP, labs checklist, templates apply) — port from approved prototype
- S3: Appointments + Patient history (family switcher, visit timeline)
- S4: Billing + Pharmacy (Excel import via xlsx lib — NOT exceljs, writeBatch
  for dispense+invoice atomicity, FEFO batch picker in Rx)
- S5: Settings, MRN counter, Cloud Function to set claims on staff creation
  (replaces seed-script-only claims), SMS integration decision

## Session-2 entry point
Open `src/pages/Consultation.jsx` (stub). Reference design: CLINIQ_prototype.html
consultation screen. Services needed: `visits.service.js` (update consult fields),
`stock.service.js` (drug search across pharmacy_stock, FEFO pick, allergy check
against patient.allergies).

## Traps active
- where()+orderBy() different fields → composite index → sort client-side instead
- snap?.docs optional chaining everywhere
- xlsx (SheetJS), never exceljs

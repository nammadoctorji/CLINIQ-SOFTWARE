# CLINIQ — Clinic OS

Multi-tenant clinic management SaaS for Indian general practice.
Front desk queue · family records on one mobile number · Quick/SOAP consults ·
stock-aware FEFO prescribing · billing · templates.

- **Stack:** React 19 · Vite · Tailwind 3.4 · Firebase 12 (cliniq-software, asia-south1) · Zustand
- **Repo:** github.com/nammadoctorji/CLINIQ-SOFTWARE
- **Docs:** `docs/SETUP.md` (first deploy) · `docs/FIRESTORE_SCHEMA.md` · `docs/SESSION_1_HANDOVER.md`

## Quick start
```bash
npm install
cp .env.example .env.local   # demo mode on by default — runs without Firebase
npm run dev
```

## Deploy
```bash
npm run build
firebase deploy --only hosting
```
Never run plain `firebase deploy` once multiple hosting targets exist.

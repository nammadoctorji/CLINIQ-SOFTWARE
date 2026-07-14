# CLINIQ — setup (do once)

## 0. Run the UI immediately (no Firebase needed)
```bash
npm install
cp .env.example .env.local        # VITE_DEMO_MODE=true is already set
npm run dev                        # login with any credentials, search 98400 12345
```

## 1. Create the Firebase project
- console.firebase.google.com → Add project → project: **cliniq-software** (already created ✅)
- Region for Firestore: **asia-south1 (Mumbai)** — DPDP data-residency answer, same as OHC
- Enable: **Authentication → Email/Password**, **Firestore**, **Hosting**
- Project settings → add a **Web app** → copy config values into `.env.local`
- Set `VITE_DEMO_MODE=false`

## 2. Wire the repo (repo already created: nammadoctorji/CLINIQ-SOFTWARE)
```bash
git init
git branch -M main
git remote add origin https://github.com/nammadoctorji/CLINIQ-SOFTWARE.git
git add -A
git commit -m "Session 1: scaffold + auth + multi-tenant rules + front desk"
git push -u origin main
```
Then link Firebase:
```bash
git init && git add -A && git commit -m "Session 1: scaffold + auth + front desk"
# edit .firebaserc → replace REPLACE_WITH_CLINIQ_PROJECT_ID with real project id
firebase use cliniq-software
firebase deploy --only firestore:rules
```

## 3. Seed the first tenant
- Project settings → Service accounts → **Generate new private key** → save as
  `serviceAccount.json` in project root (already gitignored)
- Edit tenant/doctor details at the top of `scripts/seedTenant.mjs`
- `npm i firebase-admin --save-dev && npm run seed`
- Delete or secure `serviceAccount.json` afterwards. If it ever leaks, revoke the
  key in GCP console immediately.

## 4. Deploy
```bash
npm run build
firebase deploy --only hosting     # single site for now; add prod/uat targets like OHC later
```

## Known traps carried over from OHC
- Never plain `firebase deploy` once multiple targets exist.
- Firebase deploy circular-JSON error is transient — retry.
- Stale-file trap: grep a unique string in any file you copy from Downloads before `cp`.

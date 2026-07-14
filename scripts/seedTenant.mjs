// Seed a tenant + first doctor account with custom claims.
// Usage:
//   1. Firebase console > Project settings > Service accounts > Generate new private key
//   2. Save as serviceAccount.json in project root (gitignored)
//   3. node scripts/seedTenant.mjs
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const CONFIG = {
  tenantId: 'sunrise-clinic',
  tenantName: 'Sunrise Clinic',
  city: 'Chennai',
  doctor: { email: 'dr.priya@sunriseclinic.in', password: 'ChangeMe#2026', name: 'Dr. Priya', role: 'doctor' },
}

const sa = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const auth = getAuth()
const db = getFirestore()

const run = async () => {
  // 1. tenant doc
  await db.doc(`tenants/${CONFIG.tenantId}`).set({
    name: CONFIG.tenantName, city: CONFIG.city, plan: 'starter',
    modules: { pharmacy: true, frontDeskVitals: true, sms: true, abha: false },
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 2. auth user + custom claims (the multi-tenancy mechanism — OHC pattern)
  let user
  try {
    user = await auth.getUserByEmail(CONFIG.doctor.email)
  } catch {
    user = await auth.createUser({
      email: CONFIG.doctor.email, password: CONFIG.doctor.password, displayName: CONFIG.doctor.name,
    })
  }
  await auth.setCustomUserClaims(user.uid, { tenantId: CONFIG.tenantId, role: CONFIG.doctor.role })

  // 3. staff doc
  await db.doc(`tenants/${CONFIG.tenantId}/staff/${user.uid}`).set({
    name: CONFIG.doctor.name, email: CONFIG.doctor.email, role: CONFIG.doctor.role,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 4. default billing price list
  await db.doc(`tenants/${CONFIG.tenantId}/settings/billing`).set({
    priceList: [
      { label: 'Consultation', amount: 300 },
      { label: 'Follow-up consult (within 7 days)', amount: 150 },
      { label: 'ECG', amount: 250 },
      { label: 'Nebulization', amount: 200 },
      { label: 'Dressing — minor', amount: 100 },
      { label: 'Injection administration', amount: 60 },
    ],
  }, { merge: true })

  // 5. starter templates
  const tpl = db.collection(`tenants/${CONFIG.tenantId}/templates`)
  await tpl.doc('acute-pharyngitis').set({
    name: 'Acute pharyngitis', mode: 'quick',
    complaint: 'Fever __ days, sore throat. Throat congested, no exudate. Chest clear.',
    dx: 'J02.9 · Acute pharyngitis',
    advice: 'Warm saline gargles, fluids, rest. Review if fever persists beyond 48 h.',
    rx: [
      { drug: 'Paracetamol 650 mg', dose: '1 tab', freq: 'TDS after food', days: 3 },
      { drug: 'Cetirizine 10 mg', dose: '1 tab', freq: 'HS', days: 3 },
    ],
    labs: [],
  })

  console.log(`Seeded tenant "${CONFIG.tenantId}" with doctor ${CONFIG.doctor.email}`)
  console.log('IMPORTANT: change the password after first login.')
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

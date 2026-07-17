// Superadmin (cross-tenant) operations. Gated by the `superadmin` custom
// claim (see scripts/setSuperadmin.mjs) and mirrored in firestore.rules via
// isSuperadmin(). Staff-account creation still goes through a Cloud Shell
// script (scripts/seedStaff.mjs) since setting Firebase Auth custom claims
// requires the Admin SDK and must never run in the browser.
import { DEMO, db } from '../lib/firebase'
import {
  collection, doc, getDocs, setDoc, addDoc, serverTimestamp,
} from 'firebase/firestore'

export async function listTenants() {
  if (DEMO) return [{ id: 'demo-clinic', name: 'Demo Clinic (offline)', city: 'Chennai' }]
  const snap = await getDocs(collection(db, 'tenants'))
  return snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []
}

export async function createTenant(tenantId, { name, city }) {
  if (DEMO) return { id: tenantId, name, city }
  await setDoc(doc(db, 'tenants', tenantId), {
    name, city, plan: 'starter',
    modules: { pharmacy: true, frontDeskVitals: true, sms: true, abha: false },
    createdAt: serverTimestamp(),
  }, { merge: true })
  return { id: tenantId, name, city }
}

export async function seedStockItem(tenantId, item) {
  if (DEMO) return { id: 'demo-stock', ...item }
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'pharmacy_stock'), item)
  return { id: ref.id, ...item }
}

export async function seedPatient(tenantId, patient) {
  if (DEMO) return { id: 'demo-patient', ...patient }
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'patients'), {
    ...patient, createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...patient }
}

export async function savePriceList(tenantId, priceList) {
  if (DEMO) return
  await setDoc(doc(db, 'tenants', tenantId, 'settings', 'billing'), { priceList }, { merge: true })
}

// Auth flow (OHC pattern): email/password sign-in, then tenantId + role
// resolved from custom claims set by scripts/seedTenant.mjs (later: Cloud Function).
import { DEMO, auth } from '../lib/firebase'
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'

const DEMO_USER = {
  uid: 'demo-uid',
  email: 'dr.priya@sunriseclinic.in',
  name: 'Dr. Priya',
  role: 'doctor',
  tenantId: 'demo-clinic',
  tenantName: 'Sunrise Clinic',
}

export async function staffLogin(email, password) {
  if (DEMO) return DEMO_USER
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const token = await cred.user.getIdTokenResult(true)
  const { tenantId, role } = token.claims
  if (!tenantId) {
    await fbSignOut(auth)
    throw new Error('Account has no clinic assigned. Run the seed script or contact admin.')
  }
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    name: cred.user.displayName || cred.user.email,
    role: role || 'frontdesk',
    tenantId,
  }
}

export async function signOut() {
  if (DEMO) return
  await fbSignOut(auth)
}

export function watchAuth(cb) {
  if (DEMO) return () => {}
  return onAuthStateChanged(auth, cb)
}

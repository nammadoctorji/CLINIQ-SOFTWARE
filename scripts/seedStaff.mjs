// One-off Admin SDK script: creates (or reuses) a Firebase Auth user and
// assigns tenantId + role custom claims, plus a staff profile doc — the
// per-clinic counterpart of scripts/seedTenant.mjs's doctor-seeding step,
// generalized so the Superadmin UI can generate a ready-to-run command.
//   node scripts/seedStaff.mjs <tenantId> <email> <password> <name> <role>
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const [, , tenantId, email, password, name, role] = process.argv
if (!tenantId || !email || !password || !name || !role) {
  console.error('Usage: node scripts/seedStaff.mjs <tenantId> <email> <password> <name> <role>')
  process.exit(1)
}

const sa = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const auth = getAuth()
const db = getFirestore()

const run = async () => {
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email, password, displayName: name })
  }
  await auth.setCustomUserClaims(user.uid, { tenantId, role })
  await db.doc(`tenants/${tenantId}/staff/${user.uid}`).set({
    name, email, role, createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  console.log(`Staff account ready: ${email} · ${role} · ${tenantId}`)
  console.log('IMPORTANT: change the password after first login.')
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

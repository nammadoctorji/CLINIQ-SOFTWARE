// One-off Admin SDK script: grants (or revokes) the `superadmin` custom
// claim on an existing Firebase Auth user, without touching their existing
// tenantId/role claims. Run from Cloud Shell only — never ship
// serviceAccount.json to the client.
//   node scripts/setSuperadmin.mjs <email> [off]
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const [, , email, mode] = process.argv
if (!email) {
  console.error('Usage: node scripts/setSuperadmin.mjs <email> [off]')
  process.exit(1)
}

const sa = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const auth = getAuth()

const run = async () => {
  const user = await auth.getUserByEmail(email)
  const claims = { ...(user.customClaims || {}) }
  if (mode === 'off') delete claims.superadmin
  else claims.superadmin = true
  await auth.setCustomUserClaims(user.uid, claims)
  console.log(`${mode === 'off' ? 'Removed' : 'Granted'} superadmin for ${email}. They must sign out and back in.`)
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

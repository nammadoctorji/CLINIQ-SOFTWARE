// Pharmacy stock lookups for the consult Rx table: drug search, FEFO
// (first-expiry-first-out) batch pick, and allergy matching. Stock is
// batch-granular per docs/FIRESTORE_SCHEMA.md; this module only READS —
// the actual dispense decrement is a Session-4 writeBatch contract.
import { DEMO, db } from '../lib/firebase'
import { collection, query, onSnapshot } from 'firebase/firestore'

const NEAR_EXPIRY_DAYS = 90
const LOW_STOCK_THRESHOLD = 10

const demoStock = [
  { id: 'b1', drug: 'Paracetamol 650 mg', batch: 'PB-1042', expiry: '2027-03-01', qty: 120, mrp: 2 },
  { id: 'b2', drug: 'Paracetamol 650 mg', batch: 'PB-1039', expiry: '2026-09-15', qty: 8, mrp: 2 },
  { id: 'b3', drug: 'Cetirizine 10 mg', batch: 'CT-221', expiry: '2027-01-10', qty: 60, mrp: 1.5 },
  { id: 'b4', drug: 'Amoxicillin 500 mg', batch: 'AM-556', expiry: '2026-08-01', qty: 40, mrp: 6 },
  { id: 'b5', drug: 'Azithromycin 500 mg', batch: 'AZ-118', expiry: '2026-11-20', qty: 15, mrp: 12 },
  { id: 'b6', drug: 'Pantoprazole 40 mg', batch: 'PT-330', expiry: '2027-05-05', qty: 90, mrp: 3 },
  { id: 'b7', drug: 'ORS sachet', batch: 'ORS-77', expiry: '2027-02-01', qty: 200, mrp: 20 },
  { id: 'b8', drug: 'Ibuprofen 400 mg', batch: 'IB-902', expiry: '2026-07-01', qty: 4, mrp: 3 },
]

export function watchStock(tenantId, cb) {
  if (DEMO) { cb([...demoStock]); return () => {} }
  const q = query(collection(db, 'tenants', tenantId, 'pharmacy_stock'))
  return onSnapshot(q, (snap) => cb(snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []))
}

export function pickFefoBatch(stockRows, drugName) {
  const batches = stockRows
    .filter((r) => r.drug === drugName && (r.qty ?? 0) > 0)
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
  if (!batches.length) return null
  const first = batches[0]
  const totalQty = batches.reduce((s, b) => s + (b.qty ?? 0), 0)
  const daysToExpiry = (new Date(first.expiry) - new Date()) / 86400000
  return {
    drug: drugName, batchId: first.id, batch: first.batch, expiry: first.expiry, mrp: first.mrp,
    totalQty, nearExpiry: daysToExpiry <= NEAR_EXPIRY_DAYS, lowStock: totalQty <= LOW_STOCK_THRESHOLD,
  }
}

export function searchDrugs(stockRows, text) {
  const t = (text || '').trim().toLowerCase()
  if (!t) return []
  const names = [...new Set(stockRows.filter((r) => r.drug?.toLowerCase().includes(t)).map((r) => r.drug))]
  return names.slice(0, 8).map((name) => pickFefoBatch(stockRows, name)).filter(Boolean)
}

// Allergy list entries look like "Penicillin (rash, 2021)" — match on the
// leading token against the drug name being prescribed. Not a substitute
// for a real drug-class allergy database, but enough to enforce the
// "prescribing a listed allergen is blocked" rule at demo/MVP scale.
export function checkAllergyMatch(allergies, drugName) {
  if (!allergies?.length || !drugName) return null
  const d = drugName.toLowerCase()
  const hit = allergies.find((a) => {
    const token = (a || '').split(/[\s(]/)[0].toLowerCase()
    return token && d.includes(token)
  })
  return hit || null
}

// Turns a completed consult into a queued (unpaid) invoice draft that the
// Billing page (Session 4) will pick up. Reads the doctor-managed price
// list from settings/billing per docs/FIRESTORE_SCHEMA.md.
import { DEMO, db } from '../lib/firebase'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const DEFAULT_PRICE_LIST = [
  { label: 'Consultation', amount: 300 },
  { label: 'Follow-up consult (within 7 days)', amount: 150 },
  { label: 'ECG', amount: 250 },
  { label: 'Nebulization', amount: 200 },
  { label: 'Dressing — minor', amount: 100 },
  { label: 'Injection administration', amount: 60 },
]

export async function getPriceList(tenantId) {
  if (DEMO) return DEFAULT_PRICE_LIST
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'billing'))
  return snap?.data()?.priceList ?? DEFAULT_PRICE_LIST
}

export async function queueInvoiceForConsult(tenantId, visit, consult, priceList) {
  const lines = []
  const isFollowUp = visit.visitType === 'follow_up' || /follow.?up/i.test(visit.complaint || '')
  const feeLabel = isFollowUp ? 'Follow-up consult (within 7 days)' : 'Consultation'
  const fee = priceList.find((p) => p.label === feeLabel) || priceList.find((p) => p.label === 'Consultation') || DEFAULT_PRICE_LIST[0]
  lines.push({ label: fee.label, amount: fee.amount, source: 'pricelist' })

  ;(consult.labs || []).forEach((code) => {
    const m = priceList.find((p) => p.label.toLowerCase() === code.toLowerCase())
    if (m) lines.push({ label: m.label, amount: m.amount, source: 'pricelist' })
  })

  ;(consult.rx || []).forEach((r) => {
    if (r.mrp) lines.push({ label: r.drug, amount: r.mrp, source: 'pharmacy' })
  })

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0)
  const payload = {
    visitId: visit.id, patientId: visit.patientId ?? null, patientName: visit.patientName,
    lines, total, mode: null, paidAt: null,
    createdAt: DEMO ? new Date().toISOString() : serverTimestamp(),
  }
  if (DEMO) return { id: 'inv-demo-' + visit.id, ...payload }
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'invoices'), payload)
  return { id: ref.id, ...payload }
}

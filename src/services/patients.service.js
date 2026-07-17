// Patient + queue data access. Identity key: mobile (10-digit, normalized)
// + name + dob. Age is DISPLAYED, never stored as identity (it changes yearly).
import { DEMO, db } from '../lib/firebase'
import {
  collection, query, where, getDocs, addDoc, onSnapshot,
  serverTimestamp, Timestamp, doc, getDoc,
} from 'firebase/firestore'

export const normalizeMobile = (raw) => (raw || '').replace(/\D/g, '').slice(-10)

export const ageFrom = (dobISO) => {
  if (!dobISO) return '—'
  const dob = new Date(dobISO)
  const now = new Date()
  let a = now.getFullYear() - dob.getFullYear()
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) a--
  return a
}

/* ---------------- demo data ---------------- */
const demoPatients = [
  { id: 'p1', name: 'Meena Ramesh', dob: '1992-03-12', sex: 'F', mobile: '9840012345',
    relation: 'Self', mrn: 'CLQ-0412', allergies: ['Penicillin (rash, 2021)'],
    conditions: ['Hypothyroidism (2023)', 'Migraine'] },
  { id: 'p2', name: 'Ayaan Ramesh', dob: '2020-01-05', sex: 'M', mobile: '9840012345',
    relation: 'Son', mrn: 'CLQ-0413', allergies: [], conditions: [] },
  { id: 'p3', name: 'Ramesh Kumar', dob: '1964-06-30', sex: 'M', mobile: '9840012345',
    relation: 'Father-in-law', mrn: 'CLQ-0288', allergies: [],
    conditions: ['T2DM', 'HTN'] },
]
let demoQueue = [
  { id: 'v1', token: 'T-21', patientId: 'p1', patientName: 'Meena Ramesh', dob: '1992-03-12', age: 34, sex: 'F',
    doctor: 'Dr. Priya', status: 'in_consult', vitals: { bp: '118/76', pulse: 92, temp: 101.2, spo2: 98 },
    allergyFlag: 'Penicillin' },
  { id: 'v2', token: 'T-22', patientId: null, patientName: 'Suresh K', dob: null, age: 58, sex: 'M',
    doctor: 'Dr. Priya', status: 'vitals', vitals: null, allergyFlag: null },
  { id: 'v3', token: 'T-23', patientId: 'p2', patientName: 'Ayaan Ramesh', dob: '2020-01-05', age: 6, sex: 'M',
    doctor: 'Dr. Arun', status: 'waiting', vitals: null, allergyFlag: null },
  { id: 'v4', token: 'T-24', patientId: null, patientName: 'Lakshmi V', dob: null, age: 71, sex: 'F',
    doctor: 'Dr. Priya', status: 'waiting', vitals: null, allergyFlag: null },
]
let demoListeners = []
const demoEmit = () => demoListeners.forEach((cb) => cb([...demoQueue]))

/* ---------------- API ---------------- */
export async function searchByMobile(tenantId, rawMobile) {
  const mobile = normalizeMobile(rawMobile)
  if (mobile.length < 10) return []
  if (DEMO) return demoPatients.filter((p) => p.mobile === mobile)
  const q = query(
    collection(db, 'tenants', tenantId, 'patients'),
    where('mobile', '==', mobile),
  )
  const snap = await getDocs(q)
  return snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []
}

export async function getPatient(tenantId, patientId) {
  if (!patientId) return null
  if (DEMO) return demoPatients.find((p) => p.id === patientId) || null
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'patients', patientId))
  return snap?.exists?.() ? { id: snap.id, ...snap.data() } : null
}

export function watchTodayQueue(tenantId, cb) {
  if (DEMO) {
    demoListeners.push(cb)
    cb([...demoQueue])
    return () => { demoListeners = demoListeners.filter((f) => f !== cb) }
  }
  const start = new Date(); start.setHours(0, 0, 0, 0)
  // NOTE: where() + orderBy() on different fields needs a composite index.
  // Session-1 rule: filter server-side, sort client-side (OHC lesson).
  const q = query(
    collection(db, 'tenants', tenantId, 'visits'),
    where('createdAt', '>=', Timestamp.fromDate(start)),
  )
  return onSnapshot(q, (snap) => {
    const rows = snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []
    rows.sort((a, b) => (a.tokenNum ?? 0) - (b.tokenNum ?? 0))
    cb(rows)
  })
}

// Demo-only mutator used by visits.service to move a visit through the
// waiting -> vitals -> in_consult -> completed lifecycle without a second
// source of truth for the in-memory queue.
export function _demoUpdateVisit(visitId, patch) {
  demoQueue = demoQueue.map((v) => (v.id === visitId ? { ...v, ...patch } : v))
  demoEmit()
}

export async function checkIn(tenantId, { patient, doctor, visitType, complaint, vitals }) {
  if (DEMO) {
    let patientId = patient.id
    if (!patientId) {
      patientId = 'p' + (demoPatients.length + 1)
      demoPatients.push({
        id: patientId, name: patient.name, dob: patient.dob, sex: patient.sex,
        mobile: normalizeMobile(patient.mobile), relation: patient.relation || 'Self',
        mrn: null, allergies: patient.allergies || [], conditions: patient.conditions || [],
      })
    }
    const n = 21 + demoQueue.length
    demoQueue = [...demoQueue, {
      id: 'v' + (demoQueue.length + 1), token: 'T-' + n, patientId,
      patientName: patient.name, dob: patient.dob, age: ageFrom(patient.dob), sex: patient.sex,
      doctor, visitType: visitType || 'walk_in', complaint: complaint || '',
      status: vitals?.bp ? 'vitals' : 'waiting', vitals: vitals?.bp ? vitals : null,
      allergyFlag: patient.allergies?.[0]?.split(' ')[0] || null,
    }]
    demoEmit()
    return { token: 'T-' + n, patientId }
  }
  // Every check-in gets a real patients/{id} doc, even brand-new walk-ins.
  // Allergy safety and family history both depend on this record existing.
  let patientId = patient.id ?? null
  if (!patientId) {
    const pRef = await addDoc(collection(db, 'tenants', tenantId, 'patients'), {
      name: patient.name, dob: patient.dob ?? null, sex: patient.sex ?? null,
      mobile: normalizeMobile(patient.mobile), relation: patient.relation || 'Self',
      allergies: patient.allergies || [], conditions: patient.conditions || [],
      createdAt: serverTimestamp(),
    })
    patientId = pRef.id
  }
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'visits'), {
    patientId,
    patientName: patient.name, dob: patient.dob ?? null, sex: patient.sex ?? null,
    mobile: normalizeMobile(patient.mobile),
    doctor, visitType: visitType || 'walk_in', complaint: complaint || '',
    vitals: vitals || null,
    status: vitals?.bp ? 'vitals' : 'waiting',
    createdAt: serverTimestamp(),
  })
  return { token: ref.id, patientId }
}

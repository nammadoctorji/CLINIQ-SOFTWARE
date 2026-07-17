// Visit lifecycle (waiting -> vitals -> in_consult -> completed) and
// per-doctor consult templates. Demo-mode visit mutations go through
// patients.service's _demoUpdateVisit so there is one source of truth
// for the in-memory queue that FrontDesk also renders.
import { DEMO, db } from '../lib/firebase'
import {
  collection, query, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, increment,
} from 'firebase/firestore'
import { _demoUpdateVisit } from './patients.service'

/* ---------------- demo templates ---------------- */
let demoTemplates = [
  { id: 'acute-pharyngitis', name: 'Acute pharyngitis', mode: 'quick',
    complaint: 'Fever __ days, sore throat. Throat congested, no exudate. Chest clear.',
    dx: 'J02.9 · Acute pharyngitis',
    advice: 'Warm saline gargles, fluids, rest. Review if fever persists beyond 48 h.',
    rx: [
      { drug: 'Paracetamol 650 mg', dose: '1 tab', freq: 'TDS after food', days: 3 },
      { drug: 'Cetirizine 10 mg', dose: '1 tab', freq: 'HS', days: 3 },
    ],
    labs: [], useCount: 0 },
]

/* ---------------- visit mutations ---------------- */
export async function updateVisit(tenantId, visitId, patch) {
  if (DEMO) return _demoUpdateVisit(visitId, patch)
  await updateDoc(doc(db, 'tenants', tenantId, 'visits', visitId), patch)
}

export function startConsult(tenantId, visitId) {
  return updateVisit(tenantId, visitId, { status: 'in_consult' })
}

export function saveConsultDraft(tenantId, visitId, consult) {
  return updateVisit(tenantId, visitId, { consult })
}

export function saveDoctorVitals(tenantId, visitId, vitals, editedBy) {
  return updateVisit(tenantId, visitId, {
    vitalsDoctor: { ...vitals, editedBy, editedAt: DEMO ? new Date().toISOString() : serverTimestamp() },
  })
}

export function completeConsult(tenantId, visitId, consult) {
  return updateVisit(tenantId, visitId, {
    consult, status: 'completed',
    completedAt: DEMO ? new Date().toISOString() : serverTimestamp(),
  })
}

/* ---------------- templates ---------------- */
export async function listTemplates(tenantId) {
  if (DEMO) return [...demoTemplates]
  const snap = await getDocs(query(collection(db, 'tenants', tenantId, 'templates')))
  return snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []
}

export async function saveTemplate(tenantId, tpl) {
  if (DEMO) {
    const t = { id: 'tpl' + (demoTemplates.length + 1), useCount: 0, ...tpl }
    demoTemplates = [...demoTemplates, t]
    return t
  }
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'templates'), {
    ...tpl, useCount: 0, createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...tpl }
}

export async function bumpTemplateUse(tenantId, templateId) {
  if (DEMO) {
    demoTemplates = demoTemplates.map((t) => (t.id === templateId ? { ...t, useCount: (t.useCount || 0) + 1 } : t))
    return
  }
  await updateDoc(doc(db, 'tenants', tenantId, 'templates', templateId), { useCount: increment(1) })
}

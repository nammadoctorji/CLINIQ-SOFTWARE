import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import { Chip, Stat, Modal, VitalInput } from '../components/ui'
import {
  searchByMobile, watchTodayQueue, checkIn, ageFrom, normalizeMobile,
} from '../services/patients.service'

const STATUS = {
  waiting: ['gray', 'Waiting'],
  vitals: ['amber', 'Vitals'],
  in_consult: ['teal', 'In consult'],
  completed: ['green', 'Completed'],
}

const EMPTY_VITALS = { bp: '', pulse: '', temp: '', spo2: '', weight: '' }

export default function FrontDesk() {
  const user = useAuth((s) => s.user)
  const nav = useNavigate()
  const [queue, setQueue] = useState([])
  const [phone, setPhone] = useState('')
  const [family, setFamily] = useState(null)   // null = untouched, [] = no match
  const [picked, setPicked] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', dob: '', sex: 'F', relation: 'Self', doctor: 'Dr. Priya', visitType: 'walk_in', complaint: '' })
  const [vitals, setVitals] = useState(EMPTY_VITALS)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => watchTodayQueue(user.tenantId, setQueue), [user.tenantId])

  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200) }

  const onPhone = async (v) => {
    setPhone(v)
    setPicked(null)
    if (normalizeMobile(v).length >= 10) {
      setFamily(await searchByMobile(user.tenantId, v))
    } else {
      setFamily(null)
    }
  }

  const openCheckin = (patient) => {
    setPicked(patient || null)
    setForm({
      name: patient?.name || '', dob: patient?.dob || '', sex: patient?.sex || 'F',
      relation: patient?.relation || 'Self', doctor: 'Dr. Priya', visitType: 'walk_in', complaint: '',
    })
    setVitals(EMPTY_VITALS)
    setModal(true)
  }

  const doCheckIn = async () => {
    if (!form.name) return toast('Name is required')
    const patient = picked || { ...form, mobile: phone, allergies: [] }
    const res = await checkIn(user.tenantId, {
      patient: { ...patient, ...form }, doctor: form.doctor,
      visitType: form.visitType, complaint: form.complaint,
      vitals: vitals.bp ? vitals : null,
    })
    setModal(false)
    toast(`Checked in · token ${res.token} · SMS queued to ${normalizeMobile(phone) || 'patient'}`)
  }

  const stats = useMemo(() => ({
    waiting: queue.filter((q) => q.status === 'waiting').length,
    consult: queue.filter((q) => q.status === 'in_consult').length,
    done: queue.filter((q) => q.status === 'completed').length,
  }), [queue])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }))

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <Stat k="Waiting" v={stats.waiting} />
        <Stat k="In consult" v={stats.consult} />
        <Stat k="Completed" v={stats.done} />
        <Stat k="In queue total" v={queue.length} />
      </div>

      <div className="card p-4 mb-4">
        <label className="lbl">Find patient or family by mobile number</label>
        <div className="flex gap-2.5 flex-wrap">
          <input
            className="inp !w-auto flex-1 min-w-[240px] font-mono !text-[14px] !py-2.5"
            placeholder="98400 12345"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
          />
          <button className="btn-pri" onClick={() => openCheckin(null)}>+ New check-in</button>
        </div>

        {family && (
          <div className="flex gap-2.5 mt-3 flex-wrap">
            {family.map((p) => (
              <button
                key={p.id}
                onClick={() => openCheckin(p)}
                className={`text-left bg-white border rounded-[10px] px-3.5 py-2.5 min-w-[150px] hover:border-teal hover:bg-teal-wash ${picked?.id === p.id ? 'border-teal border-2 bg-teal-wash' : 'border-line-strong'}`}
              >
                <b className="block text-[14px]">{p.name}</b>
                <small className="font-mono text-body-2 text-[12px]">{ageFrom(p.dob)} {p.sex} · {p.mrn}</small>
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  <Chip tone={p.relation === 'Self' ? 'teal' : 'gray'}>{p.relation}</Chip>
                  {p.allergies?.length > 0 && <Chip tone="red">⚠ {p.allergies[0].split(' ')[0]}</Chip>}
                  {p.conditions?.slice(0, 1).map((c) => <Chip key={c} tone="amber">{c.split(' ')[0]}</Chip>)}
                </div>
              </button>
            ))}
            <button
              onClick={() => openCheckin(null)}
              className="border border-dashed border-line-strong rounded-[10px] px-3.5 text-teal-dark font-medium hover:bg-teal-wash"
            >
              + New family member
            </button>
          </div>
        )}
        {family && family.length > 1 && (
          <p className="text-[12px] text-body-3 mt-2.5">
            {family.length} patients share this number. Records are kept separately by
            <b> name + date of birth</b> under the mobile number — select the right person before check-in.
          </p>
        )}
        {family && family.length === 0 && (
          <p className="text-[12px] text-body-3 mt-2.5">No patient with this number yet — use “New check-in” to register the first family member.</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-line flex-wrap gap-2">
          <b className="font-disp">Today's queue</b>
          <span className="text-[12px] text-body-3">Vitals can be recorded here by staff nurse, or later by the doctor in consult</span>
        </div>
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              <th className="th w-16">Token</th><th className="th">Patient</th>
              <th className="th w-28">Doctor</th><th className="th w-28">Vitals</th>
              <th className="th w-28">Status</th><th className="th w-24"></th>
            </tr>
          </thead>
          <tbody>
            {queue.map((v) => {
              const [tone, label] = STATUS[v.status] || STATUS.waiting
              return (
                <tr key={v.id} className="hover:bg-[#FBFAF7]">
                  <td className="td font-mono font-semibold">{v.token || v.id.slice(0, 4)}</td>
                  <td className="td">
                    <b>{v.patientName}</b> · {v.age ?? ageFrom(v.dob)} {v.sex}
                    {v.allergyFlag && <span className="chip-red ml-1.5">⚠ {v.allergyFlag}</span>}
                  </td>
                  <td className="td text-body-2">{v.doctor}</td>
                  <td className="td">{v.vitals ? <Chip tone="green">✓ Recorded</Chip> : <Chip tone="gray">Pending</Chip>}</td>
                  <td className="td"><Chip tone={tone}>{label}</Chip></td>
                  <td className="td">
                    {v.status === 'in_consult' && (
                      <button className="btn-ghost" onClick={() => nav('/consult', { state: { visitId: v.id } })}>Open →</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {queue.length === 0 && (
              <tr><td className="td text-body-3" colSpan={6}>No visits yet today. Check in the first patient above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal}
        title="Check in patient"
        onClose={() => setModal(false)}
        footer={<>
          <button className="btn" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-pri" onClick={doCheckIn}>Check in & assign token</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="lbl">Mobile number</label><input className="inp font-mono" value={phone} onChange={(e) => onPhone(e.target.value)} /></div>
          <div><label className="lbl">Full name</label><input className="inp" value={form.name} onChange={set('name')} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div><label className="lbl">Date of birth</label><input className="inp font-mono" type="date" value={form.dob} onChange={set('dob')} /></div>
          <div><label className="lbl">Sex</label>
            <select className="inp" value={form.sex} onChange={set('sex')}>
              <option value="F">Female</option><option value="M">Male</option><option value="O">Other</option>
            </select>
          </div>
          <div><label className="lbl">Relation</label>
            <select className="inp" value={form.relation} onChange={set('relation')}>
              {['Self', 'Spouse', 'Child', 'Parent', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="lbl">Doctor</label>
            <select className="inp" value={form.doctor} onChange={set('doctor')}>
              <option>Dr. Priya</option><option>Dr. Arun</option>
            </select>
          </div>
          <div><label className="lbl">Visit type</label>
            <select className="inp" value={form.visitType} onChange={set('visitType')}>
              <option value="walk_in">Walk-in</option>
              <option value="appointment">Appointment</option>
              <option value="review">Review / follow-up</option>
            </select>
          </div>
        </div>
        <div className="mb-3.5"><label className="lbl">Chief complaint (optional)</label>
          <input className="inp" placeholder="Fever for 2 days" value={form.complaint} onChange={set('complaint')} />
        </div>
        <div className="bg-[#FBFAF7] border border-line rounded-[10px] p-3.5">
          <b className="text-[13px]">Vitals at check-in <span className="font-normal text-body-3">(staff nurse — optional)</span></b>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
            <VitalInput label="BP" placeholder="120/80" value={vitals.bp} onChange={(v) => setVitals((s) => ({ ...s, bp: v }))} />
            <VitalInput label="Pulse" placeholder="76" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
            <VitalInput label="Temp °F" placeholder="98.6" value={vitals.temp} onChange={(v) => setVitals((s) => ({ ...s, temp: v }))} />
            <VitalInput label="SpO₂" placeholder="99" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
            <VitalInput label="Wt kg" placeholder="58" value={vitals.weight} onChange={(v) => setVitals((s) => ({ ...s, weight: v }))} />
          </div>
        </div>
      </Modal>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-ink text-white px-4.5 py-3 px-5 rounded-[10px] text-[13px] z-50 shadow-xl">{toastMsg}</div>
      )}
    </div>
  )
}

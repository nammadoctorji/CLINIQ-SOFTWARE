import { useState } from 'react'
import { staffLogin } from '../services/auth.service'
import { useAuth } from '../store/authStore'
import { DEMO } from '../lib/firebase'

const FEATURES = [
  ['One number, whole family', 'Search any mobile number and pick the right family member — history stays with name + DOB.'],
  ['Quick or full SOAP', 'Two-field quick consults for routine cases, full SOAP when it matters.'],
  ['Stock-aware prescribing', 'Type a drug, see live stock and near-expiry batches. First-expiry-first-out, automatically.'],
]

export default function Login() {
  const setUser = useAuth((s) => s.setUser)
  const [email, setEmail] = useState(DEMO ? 'dr.priya@sunriseclinic.in' : '')
  const [password, setPassword] = useState(DEMO ? 'demo' : '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const user = await staffLogin(email.trim(), password)
      setUser(user)
    } catch (ex) {
      setErr(ex.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-[1.1] bg-ink text-[#EDF3F2] flex-col justify-between p-12 hidden md:flex">
        <div>
          <h1 className="font-disp text-[34px] font-semibold">CLINI<span className="text-teal-bright">Q</span></h1>
          <p className="text-[15px] text-[#A9BDBB] max-w-[360px] mt-3">
            The clinic OS for Indian general practice. Fast consults, family records
            on one number, and stock that manages itself.
          </p>
        </div>
        <ul className="grid gap-3.5 list-none">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="flex gap-3 text-[13.5px] text-[#C6D5D3]">
              <span className="w-2 h-2 rounded-full bg-teal-bright mt-1.5 shrink-0" />
              <div><b className="block text-white text-[14px]">{t}</b>{d}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <form className="w-full max-w-[380px]" onSubmit={submit}>
          <h2 className="font-disp text-[22px] font-semibold mb-1">Sign in</h2>
          <p className="text-body-2 text-[13.5px] mb-5">
            {DEMO ? 'Demo mode — any credentials work' : 'Your role and clinic come from your account'}
          </p>
          <div className="mb-3.5">
            <label className="lbl">Email or staff ID</label>
            <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="mb-4">
            <label className="lbl">Password</label>
            <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p className="text-danger text-[13px] mb-3">{err}</p>}
          <button className="btn-pri w-full !py-[11px] !text-[14px] font-semibold" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-[12px] text-body-3 mt-3">
            Role decides what you see: doctors get consult + templates, staff nurses get
            vitals + queue, front desk gets check-in + billing.
          </p>
        </form>
      </div>
    </div>
  )
}

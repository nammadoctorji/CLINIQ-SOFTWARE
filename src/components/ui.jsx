export const Chip = ({ tone = 'gray', children }) => (
  <span className={`chip-${tone}`}>{children}</span>
)

export const Stat = ({ k, v, tone }) => (
  <div className="bg-white border border-line rounded-[10px] px-3.5 py-3">
    <div className="text-[11.5px] uppercase tracking-wide text-body-3">{k}</div>
    <div className={`font-mono text-[22px] font-medium mt-0.5 ${tone || ''}`}>{v}</div>
  </div>
)

export const Modal = ({ open, title, onClose, children, footer, width = 'max-w-[560px]' }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-ink/50 z-40 flex items-start justify-center overflow-auto p-4 pt-10">
      <div className={`bg-white rounded-[14px] w-full ${width}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-disp font-semibold text-[16px]">{title}</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-line">{footer}</div>
        )}
      </div>
    </div>
  )
}

export const VitalInput = ({ label, value, onChange, placeholder }) => (
  <div className="bg-[#FBFAF7] border border-line rounded-lg px-2.5 py-2">
    <span className="lbl !mb-0.5">{label}</span>
    <input
      className="w-full bg-transparent font-mono text-[16px] font-medium focus:outline-none focus:border-b-2 focus:border-teal"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)

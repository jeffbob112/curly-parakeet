// Made-up brand mark for "Parakeet Bank".
export default function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden="true">
        <path d="M6 42c14-5 28-20 52-30-9 15-21 31-44 36z" fill="#e11d48" />
        <path d="M6 30c11-4 22-12 40-20-7 10-16 19-35 23z" fill={light ? '#fff' : '#0b2a5b'} />
      </svg>
      <span className={`text-sm font-bold uppercase tracking-[0.18em] ${light ? 'text-white' : 'text-brand'}`}>Parakeet Bank</span>
    </span>
  )
}

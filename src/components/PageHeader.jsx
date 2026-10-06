export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

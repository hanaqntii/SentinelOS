interface KpiCardProps {
  title: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "border-slate-800",
  success: "border-emerald-700/60",
  warning: "border-amber-700/60",
  danger: "border-rose-700/60"
};

export function KpiCard({ title, value, tone = "default" }: KpiCardProps) {
  return (
    <div className={`rounded-xl border bg-slate-900 p-4 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "green" | "amber";
}) {
  const tones = {
    default: "bg-white text-slate-950",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-100 text-amber-950",
  };

  return (
    <section className={`rounded-lg border border-slate-200 p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-75">{label}</p>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </section>
  );
}

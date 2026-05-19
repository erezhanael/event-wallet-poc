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
    default: "glass-card text-white",
    green: "border-emerald-300/30 bg-emerald-300/[0.12] text-white shadow-[0_0_36px_rgba(56,255,156,0.18)]",
    amber: "border-amber-300/30 bg-amber-300/[0.12] text-white shadow-[0_0_36px_rgba(255,209,102,0.14)]",
  };

  return (
    <section className={`rounded-3xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/[0.62]">{label}</p>
        <span className="grid size-9 place-items-center rounded-2xl bg-white/10 text-emerald-200">
          <Icon size={18} />
        </span>
      </div>
      <p className="premium-heading mt-3 text-3xl font-black">{value}</p>
    </section>
  );
}

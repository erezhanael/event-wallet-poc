import { AppShell } from "@/components/app-shell";
import { getEvent, getMenuItems } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export default async function MenuPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, items] = await Promise.all([getEvent(eventId), getMenuItems(eventId)]);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-3xl font-semibold">Menu</h1>
        <p className="mt-2 text-slate-600">{event?.name}</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_120px_120px] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
        </div>
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_120px_120px] px-4 py-3 text-sm">
            <span className="font-medium">{item.name}</span>
            <span>{item.category}</span>
            <span>{formatMoney(item.price_cents, event?.currency)}</span>
          </div>
        ))}
      </section>
      <form className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px_120px]">
        <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Item name" />
        <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Category" />
        <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Price cents" />
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Add Item</button>
      </form>
    </AppShell>
  );
}

import { getTransactions } from "@/lib/data";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const transactions = await getTransactions(eventId);
  const rows = [
    ["id", "event_id", "wallet_id", "bartender_id", "type", "amount_cents", "created_at", "metadata"],
    ...transactions.map((transaction) => [
      transaction.id,
      transaction.event_id,
      transaction.wallet_id,
      transaction.bartender_id ?? "",
      transaction.type,
      transaction.amount_cents,
      transaction.created_at,
      JSON.stringify(transaction.metadata),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="event-${eventId}-transactions.csv"`,
    },
  });
}

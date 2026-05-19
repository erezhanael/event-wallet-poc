import { NextResponse } from "next/server";
import { getWalletByToken } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const walletToken = searchParams.get("walletToken")?.trim();

  if (!eventId || !walletToken) {
    return NextResponse.json({ error: "Missing eventId or walletToken" }, { status: 400 });
  }

  const wallet = await getWalletByToken(eventId, walletToken);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: wallet.id,
    event_id: wallet.event_id,
    balance_cents: wallet.balance_cents,
    qr_token: wallet.qr_token,
    status: wallet.status,
  });
}

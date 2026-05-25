import { NextResponse } from "next/server";
import { getWalletByNfcTag, getWalletByToken } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const walletToken = searchParams.get("walletToken")?.trim();
  const tagUid = searchParams.get("tagUid")?.trim();
  const walletId = searchParams.get("walletId")?.trim();

  if (!eventId || (!walletToken && !tagUid)) {
    return NextResponse.json({ error: "Missing eventId and wallet token or NFC tag UID" }, { status: 400 });
  }

  const wallet = tagUid ? await getWalletByNfcTag(eventId, tagUid, walletId) : await getWalletByToken(eventId, walletToken!);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: wallet.id,
    event_id: wallet.event_id,
    balance_cents: wallet.balance_cents,
    qr_token: wallet.qr_token,
    status: wallet.status,
    attendee_name: "attendee_name" in wallet ? wallet.attendee_name : null,
    nfc_status: "nfc_status" in wallet ? wallet.nfc_status : null,
  });
}

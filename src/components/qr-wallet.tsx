"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export function QrWallet({ token }: { token: string }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(token, {
      margin: 2,
      width: 280,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQr);
  }, [token]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="mx-auto grid aspect-square w-full max-w-[280px] place-items-center rounded-lg bg-slate-50">
        {qr ? (
          <Image src={qr} alt="Wallet QR code" width={280} height={280} unoptimized className="size-full p-3" />
        ) : (
          <span className="text-sm text-slate-500">Generating</span>
        )}
      </div>
      <p className="mt-3 break-all font-mono text-xs text-slate-500">{token}</p>
    </div>
  );
}

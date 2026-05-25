"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export function QrWallet({ token, label = "Wallet QR" }: { token: string; label?: string }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(token, {
      margin: 2,
      width: 280,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQr);
  }, [token]);

  return (
    <div className="glass-card rounded-[2rem] p-4 text-center">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
      <div className="scan-frame mx-auto grid aspect-square w-full max-w-[280px] place-items-center rounded-[1.6rem] border border-emerald-300/20 bg-black/35 shadow-[0_0_42px_rgba(56,255,156,0.16)]">
        {qr ? (
          <Image src={qr} alt="Wallet QR code" width={280} height={280} unoptimized className="size-full rounded-3xl p-5" />
        ) : (
          <span className="text-sm text-white/50">Generating</span>
        )}
      </div>
      <p className="mt-3 break-all font-mono text-xs text-white/45">{token}</p>
    </div>
  );
}

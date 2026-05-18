import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const metrics = await getDashboardMetrics(eventId);
  return NextResponse.json(metrics);
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/service-jobs — every service job for the operations pane. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const status = req.nextUrl.searchParams.get("status");

    const jobs = await db.serviceJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, businessName: true, slug: true } },
      },
    });

    const transformed = jobs.map((j) => ({
      id: j.id,
      code: j.code,
      title: j.title,
      description: j.description,
      category: j.category,
      budget: j.budget,
      quotedPrice: j.quotedPrice,
      location: j.location,
      status: j.status,
      scheduledFor: j.scheduledFor?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
      customer: {
        id: j.customer.id,
        name: j.customer.name,
        phone: j.customer.phone,
      },
      provider: j.provider,
    }));

    return NextResponse.json({ jobs: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/service-jobs GET] error", err);
    return NextResponse.json({ error: "Failed to load service jobs" }, { status: 500 });
  }
}

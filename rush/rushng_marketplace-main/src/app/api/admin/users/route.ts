import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/users
 *
 * Lists every user with their capabilities, vendor/provider/rider
 * profiles, and wallet. Supports a `?role=` filter to view only
 * customers, vendors, providers, riders, or admins.
 *
 * This is the operations pane — admins use it to find accounts, see
 * their capability status, and suspend / reactivate them.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const role = req.nextUrl.searchParams.get("role") || "ALL";
    const q = req.nextUrl.searchParams.get("q");

    // SQLite doesn't have first-class JSON queries, so we filter by
    // the `capabilities` field using a LIKE check. The capabilities
    // array is small and we cap the result set, so this is fine.
    let where: Record<string, unknown> = {};
    if (role !== "ALL") {
      where.capabilities = { contains: `"type":"${role}"` };
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        vendorProfile: { select: { id: true, businessName: true, slug: true } },
        providerProfile: { select: { id: true, businessName: true, slug: true } },
        riderProfile: {
          select: {
            id: true,
            name: true,
            status: true,
            licenseUploaded: true,
            documentsVerified: true,
          },
        },
        wallet: { select: { balance: true } },
      },
    });

    const transformed = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      location: u.location,
      capabilities: JSON.parse(u.capabilities),
      activeWorkspace: u.activeWorkspace,
      walletBalance: u.wallet?.balance ?? 0,
      vendorProfile: u.vendorProfile,
      providerProfile: u.providerProfile,
      riderProfile: u.riderProfile,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({ users: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/users GET] error", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

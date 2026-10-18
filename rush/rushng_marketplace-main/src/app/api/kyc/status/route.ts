import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { privateKycView, publicKycView } from "@/lib/kyc";

/**
 * GET /api/kyc/status
 *
 * Returns the calling vendor's full KYC record (including PII like
 * institutional email, PF/matric number, ID card URL, residential
 * address). Only the vendor themselves can call this — admins use
 * the admin endpoints.
 *
 * Returns 200 with `{ kyc: null }` if the caller has no vendor profile.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;

    if (!vendorProfile) {
      return NextResponse.json({ kyc: null });
    }

    // Re-fetch to get all KYC fields (the user include in getCurrentUser
    // returns the full document, but be explicit in case the include
    // shape changes).
    const fresh = await db.vendorProfile.findUnique({
      where: { id: vendorProfile.id },
    });

    if (!fresh) {
      return NextResponse.json({ kyc: null });
    }

    return NextResponse.json({
      kyc: privateKycView(fresh),
      // Also return the public view so the client can use the same
      // shape it gets from /api/stores for badge rendering.
      publicKyc: publicKycView(fresh),
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[kyc/status GET] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load KYC status." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, addCapability, serializeCapabilities } from "@/lib/auth";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Note: we deliberately do NOT require email verification here.
    // The user can create a store immediately after registering — they
    // just won't get the "Verified LASU Student/Staff" badge until they
    // complete KYC. This matches the product decision: let users sell
    // right away, verification is an upgrade (not a gate).

    const body = await req.json();
    const {
      businessName,
      category,
      description,
      location,
      phone,
      whatsapp,
      visibility = "PUBLIC",
    } = body;

    if (!businessName || !category || !location || !phone) {
      return NextResponse.json(
        { error: "Business name, category, location, and phone are required" },
        { status: 400 },
      );
    }

    if (user.vendorProfile) {
      return NextResponse.json(
        { error: "You already have a vendor profile" },
        { status: 400 },
      );
    }

    let slug = slugify(businessName);
    // Make slug unique
    let suffix = 0;
    while (await db.vendorProfile.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${slugify(businessName)}-${suffix}`;
    }

    const vendor = await db.vendorProfile.create({
      data: {
        userId: user.id,
        businessName,
        slug,
        description: description || "",
        category,
        logo:
          body.logo ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            businessName,
          )}&background=FF6B1A&color=fff`,
        coverImage:
          body.coverImage ||
          "https://images.unsplash.com/photo-1556745753-b290469f97e1?auto=format&fit=crop&w=1600&q=80",
        phone,
        whatsapp: whatsapp || null,
        location,
        visibility,
        verified: false,
        rating: 0,
        reviewCount: 0,
        followers: 0,
      },
    });

    // Add VENDOR capability
    const caps = addCapability(user, "VENDOR", "ACTIVE", vendor.id);
    await db.user.update({
      where: { id: user.id },
      data: {
        capabilities: serializeCapabilities(caps),
        activeWorkspace: "VENDOR",
      },
    });

    return NextResponse.json({ vendor });
  } catch (err: any) {
    console.error("[onboarding vendor] error", err);
    if (err instanceof Response) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to onboard vendor" },
      { status: 500 },
    );
  }
}

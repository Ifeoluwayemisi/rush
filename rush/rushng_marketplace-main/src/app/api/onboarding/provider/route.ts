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

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before registering as a service provider." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { businessName, tagline, category, description, location, startingPrice, services = [] } = body;

    if (!businessName || !category || !location || !startingPrice) {
      return NextResponse.json(
        { error: "Business name, category, location, and starting price are required" },
        { status: 400 },
      );
    }

    if (user.providerProfile) {
      return NextResponse.json(
        { error: "You already have a provider profile" },
        { status: 400 },
      );
    }

    let slug = slugify(businessName);
    let suffix = 0;
    while (await db.provider.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${slugify(businessName)}-${suffix}`;
    }

    const provider = await db.provider.create({
      data: {
        userId: user.id,
        businessName,
        slug,
        tagline: tagline || "",
        description: description || "",
        category,
        coverImage: body.coverImage || "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
        avatar: body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=1F2937&color=fff`,
        location,
        startingPrice: parseFloat(startingPrice),
        verified: false,
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
        services: {
          create: services.map((s: any) => ({
            name: s.name,
            description: s.description || "",
            price: parseFloat(s.price),
            duration: s.duration || "1 hour",
          })),
        },
      },
      include: { services: true },
    });

    const caps = addCapability(user, "SERVICE_PROVIDER", "PENDING_VERIFICATION", provider.id);
    await db.user.update({
      where: { id: user.id },
      data: { capabilities: serializeCapabilities(caps) },
    });

    return NextResponse.json({ provider });
  } catch (err: any) {
    console.error("[onboarding provider] error", err);
    if (err instanceof Response) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to onboard provider" },
      { status: 500 },
    );
  }
}

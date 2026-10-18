import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, addCapability, serializeCapabilities } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before registering as a rider." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      phone,
      location,
      mobility = ["DELIVERY", "PASSENGER_RIDES"],
      vehicleType = "BIKE",
      plate,
      vehicleModel,
      color,
      licenseNumber,
    } = body;

    if (!phone || !location || !plate || !licenseNumber) {
      return NextResponse.json(
        { error: "Phone, location, plate number, and license number are required" },
        { status: 400 },
      );
    }

    if (user.riderProfile) {
      return NextResponse.json(
        { error: "You already have a rider profile" },
        { status: 400 },
      );
    }

    const rider = await db.riderProfile.create({
      data: {
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        phone,
        status: "PENDING_VERIFICATION",
        mobility: JSON.stringify(mobility),
        licenseUploaded: true,
        documentsVerified: false,
        vehicle: {
          create: {
            type: vehicleType,
            plate,
            model: vehicleModel || "",
            color: color || "",
            licenseNumber,
            verified: false,
          },
        },
      },
      include: { vehicle: true },
    });

    const caps = addCapability(user, "RIDER", "PENDING_VERIFICATION", rider.id);
    await db.user.update({
      where: { id: user.id },
      data: { capabilities: serializeCapabilities(caps) },
    });

    return NextResponse.json({ rider });
  } catch (err: any) {
    console.error("[onboarding rider] error", err);
    if (err instanceof Response) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to onboard rider" },
      { status: 500 },
    );
  }
}

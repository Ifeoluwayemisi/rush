import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";

function serializeJob(job: any, providerName?: string | null) {
  return {
    id: job.id,
    code: job.code,
    customerId: job.customerId,
    providerId: job.providerId,
    providerName: providerName ?? job.provider?.businessName ?? null,
    title: job.title,
    description: job.description,
    category: job.category,
    budget: job.budget,
    quotedPrice: job.quotedPrice,
    location: job.location,
    status: job.status,
    scheduledFor: job.scheduledFor ? new Date(job.scheduledFor).toISOString() : null,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
  };
}

// GET /api/service-jobs?scope=customer|provider|open
//   customer — jobs the caller has requested
//   provider — jobs targeted at or claimed by the caller's provider profile
//   open     — unclaimed jobs (providerId null) in the caller's provider category,
//              for a provider to browse and quote
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ jobs: [] });

    const scope = req.nextUrl.searchParams.get("scope") || "customer";
    const providerProfile = (user as any).providerProfile;

    let jobs;
    if (scope === "provider") {
      if (!providerProfile) return NextResponse.json({ jobs: [] });
      jobs = await db.serviceJob.findMany({
        where: { providerId: providerProfile.id },
        orderBy: { createdAt: "desc" },
        include: { provider: { select: { businessName: true } } },
      });
    } else if (scope === "open") {
      if (!providerProfile) return NextResponse.json({ jobs: [] });
      jobs = await db.serviceJob.findMany({
        where: { providerId: null, status: "OPEN", category: providerProfile.category },
        orderBy: { createdAt: "desc" },
      });
    } else {
      jobs = await db.serviceJob.findMany({
        where: { customerId: user.id },
        orderBy: { createdAt: "desc" },
        include: { provider: { select: { businessName: true } } },
      });
    }

    return NextResponse.json({ jobs: jobs.map((j) => serializeJob(j)) });
  } catch (err) {
    console.error("[service-jobs GET] error", err);
    return NextResponse.json({ jobs: [] });
  }
}

// POST /api/service-jobs — customer creates a request.
// Body: { providerId?, serviceId?, title, description, category, budget?, location }
// If `serviceId` is given, the job is priced immediately (quotedPrice = that
// service's price) and just needs the provider to accept. Otherwise it's a
// custom job the provider still needs to quote.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before booking services." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { providerId, serviceId, title, description, category, budget, location } = body;

    if (!title || !description || !category || !location) {
      return NextResponse.json(
        { error: "Title, description, category, and location are required." },
        { status: 400 },
      );
    }

    let quotedPrice: number | null = null;
    let resolvedProviderId: string | null = providerId || null;

    if (serviceId) {
      const service = await db.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        return NextResponse.json({ error: "That service no longer exists." }, { status: 404 });
      }
      quotedPrice = service.price;
      resolvedProviderId = service.providerId;
    } else if (providerId) {
      const provider = await db.provider.findUnique({ where: { id: providerId } });
      if (!provider) {
        return NextResponse.json({ error: "Provider not found." }, { status: 404 });
      }
    }

    const code = `RSH-SVC-${Math.floor(1000 + Math.random() * 9000)}`;

    const job = await db.serviceJob.create({
      data: {
        code,
        customerId: user.id,
        providerId: resolvedProviderId,
        title,
        description,
        category,
        budget: budget !== undefined && budget !== null && budget !== "" ? Number(budget) : null,
        quotedPrice,
        location,
        status: "OPEN",
      },
      include: { provider: { select: { businessName: true } } },
    });

    return NextResponse.json({ job: serializeJob(job) });
  } catch (err: any) {
    if (err instanceof Response) throw err;
    console.error("[service-jobs POST] error", err);
    return NextResponse.json({ error: err.message || "Failed to create request" }, { status: 500 });
  }
}

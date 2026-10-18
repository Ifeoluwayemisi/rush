import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { customerCanCancel, getProviderAdvanceStep, isJobTerminal } from "@/lib/service-job-status";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const job = await db.serviceJob.findUnique({
    where: { id },
    include: { provider: { select: { businessName: true, userId: true } } },
  });
  if (!job) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const myProviderId = (user as any)?.providerProfile?.id;
  const isOwner =
    !!user &&
    (job.customerId === user.id ||
      (job.providerId && myProviderId === job.providerId) ||
      job.provider?.userId === user.id);
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ job: serializeJob(job) });
}

// PATCH /api/service-jobs/:id
// Customer actions:  { action: "CANCEL" } | { action: "APPROVE_QUOTE" } | { action: "DECLINE_QUOTE" }
// Provider actions:  { action: "QUOTE", quotedPrice? } | { action: "DECLINE" } | { action: "ADVANCE" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { action, quotedPrice } = body;

    const job = await db.serviceJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isCustomer = job.customerId === user.id;
    const myProviderId = (user as any).providerProfile?.id;
    const isThisProvider = !!myProviderId && job.providerId === myProviderId;
    const isUnclaimedOpenJob = !job.providerId && !!myProviderId;

    if (!isCustomer && !isThisProvider && !isUnclaimedOpenJob) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isJobTerminal(job.status) && action !== "CANCEL") {
      return NextResponse.json({ error: "This request is already finished." }, { status: 400 });
    }

    switch (action) {
      case "CANCEL": {
        if (!isCustomer) {
          return NextResponse.json({ error: "Only the customer can cancel this request." }, { status: 403 });
        }
        if (!customerCanCancel(job.status)) {
          return NextResponse.json({ error: "This request can no longer be cancelled." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({ where: { id }, data: { status: "CANCELLED" } });
        return NextResponse.json({ job: serializeJob(updated) });
      }

      case "APPROVE_QUOTE": {
        if (!isCustomer) {
          return NextResponse.json({ error: "Only the customer can approve a quote." }, { status: 403 });
        }
        if (job.status !== "QUOTED") {
          return NextResponse.json({ error: "There's no quote waiting for approval." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({ where: { id }, data: { status: "ASSIGNED" } });
        return NextResponse.json({ job: serializeJob(updated) });
      }

      case "DECLINE_QUOTE": {
        if (!isCustomer) {
          return NextResponse.json({ error: "Only the customer can decline a quote." }, { status: 403 });
        }
        if (job.status !== "QUOTED") {
          return NextResponse.json({ error: "There's no quote waiting for a decision." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({ where: { id }, data: { status: "CANCELLED" } });
        return NextResponse.json({ job: serializeJob(updated) });
      }

      case "QUOTE": {
        if (!isThisProvider && !isUnclaimedOpenJob) {
          return NextResponse.json({ error: "Only a provider can quote this request." }, { status: 403 });
        }
        if (job.status !== "OPEN") {
          return NextResponse.json({ error: "This request isn't open for a quote." }, { status: 400 });
        }

        // A specific listed Service already has a fixed price — accepting it
        // goes straight to ASSIGNED, no customer approval round-trip needed.
        if (job.quotedPrice !== null) {
          const updated = await db.serviceJob.update({
            where: { id },
            data: { providerId: myProviderId, status: "ASSIGNED" },
          });
          return NextResponse.json({ job: serializeJob(updated) });
        }

        const price = Number(quotedPrice);
        if (!Number.isFinite(price) || price <= 0) {
          return NextResponse.json({ error: "Enter a valid quote amount." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({
          where: { id },
          data: { providerId: myProviderId, quotedPrice: price, status: "QUOTED" },
        });
        return NextResponse.json({ job: serializeJob(updated) });
      }

      case "DECLINE": {
        if (!isThisProvider) {
          return NextResponse.json({ error: "This request isn't assigned to you." }, { status: 403 });
        }
        if (job.status !== "OPEN") {
          return NextResponse.json({ error: "This request can no longer be declined." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
        return NextResponse.json({ job: serializeJob(updated) });
      }

      case "ADVANCE": {
        if (!isThisProvider) {
          return NextResponse.json({ error: "This request isn't assigned to you." }, { status: 403 });
        }
        const next = getProviderAdvanceStep(job.status);
        if (!next) {
          return NextResponse.json({ error: "This request can't be advanced right now." }, { status: 400 });
        }
        const updated = await db.serviceJob.update({ where: { id }, data: { status: next.status } });
        if (next.status === "COMPLETED") {
          await db.provider.update({ where: { id: myProviderId }, data: { completedJobs: { increment: 1 } } });
        }
        return NextResponse.json({ job: serializeJob(updated) });
      }

      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[service-job PATCH] error", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

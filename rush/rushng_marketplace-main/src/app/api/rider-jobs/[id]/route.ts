import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isJobTerminal } from "@/lib/rider-job";

const nowTimestamp = () => new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

function pushTimeline(timelineJson: string, label: string) {
  const timeline = JSON.parse(timelineJson).map((t: any) => ({ ...t, completed: true }));
  timeline.push({ label, timestamp: nowTimestamp(), completed: true });
  return JSON.stringify(timeline);
}

/**
 * Thrown inside the accept transaction when another rider already claimed
 * the same ride. Caught and translated to a 409 response.
 */
class ConcurrencyError extends Error {}

// PATCH /api/rider-jobs/:id
// Body: { action: "ACCEPT" | "DECLINE" | "ADVANCE" }
// This is the single surface a rider uses to respond to and progress
// *any* job — delivery or ride. It applies the matching side effect to
// the underlying Order or Ride, so that record stays authoritative for
// what the customer/vendor sees.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const riderProfile = (user as any).riderProfile;
    if (!riderProfile) {
      return NextResponse.json({ error: "You don't have a rider profile." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    if (!["ACCEPT", "DECLINE", "ADVANCE"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const job = await db.riderJob.findUnique({ where: { id }, include: { order: true, ride: true } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.riderId !== riderProfile.id) {
      return NextResponse.json({ error: "This job isn't assigned to you." }, { status: 403 });
    }
    if (isJobTerminal(job.status)) {
      return NextResponse.json({ error: "This job is already finished." }, { status: 400 });
    }

    if (action === "ACCEPT") {
      if (job.status !== "OFFERED") {
        return NextResponse.json({ error: "This job isn't waiting on a response." }, { status: 400 });
      }

      // Atomic "first-rider-to-accept-wins" using an interactive Prisma
      // transaction. The previous implementation read `ride.status` outside
      // the write and then updated it — under concurrent load two riders
      // could both see SEARCHING and both transition to ASSIGNED. Here we
      // use updateMany with a `where` clause that requires the current
      // status; if 0 rows are updated, we know another rider already won.
      try {
        const result = await db.$transaction(async (tx) => {
          // 1. Atomically flip THIS job's OFFERED → ACCEPTED only if it's still OFFERED.
          //    This protects against the same rider double-accepting or a
          //    race with the job's own status having moved on.
          const jobFlip = await tx.riderJob.updateMany({
            where: { id, status: "OFFERED" },
            data: { status: "ACCEPTED", respondedAt: new Date() },
          });
          if (jobFlip.count === 0) {
            // Someone else already moved this job out of OFFERED.
            throw new ConcurrencyError("Job is no longer offered.");
          }

          if (job.type === "RIDE" && job.ride) {
            // 2. Atomically flip the ride SEARCHING → ASSIGNED, only if it's
            //    still SEARCHING. This is the actual "first-wins" gate.
            const rideFlip = await tx.ride.updateMany({
              where: { id: job.ride.id, status: "SEARCHING" },
              data: { status: "ASSIGNED", riderId: riderProfile.id },
            });
            if (rideFlip.count === 0) {
              // Another rider already claimed this ride.
              // Roll back our ACCEPTED by marking this job CANCELLED — the
              // transaction will undo the jobFlip above automatically.
              throw new ConcurrencyError("Another rider already accepted this trip.");
            }
            // 3. Cancel every other OFFERED job on this ride in the same tx.
            //    This is safe to do unconditionally now — we already won the
            //    ride; competing offers must be cleaned up.
            await tx.riderJob.updateMany({
              where: { rideId: job.ride.id, id: { not: id }, status: "OFFERED" },
              data: { status: "CANCELLED", respondedAt: new Date() },
            });
          } else if (job.type === "DELIVERY" && job.order) {
            // Deliveries are offered to a single rider at a time (the order's
            // `riderId` is set by the vendor's assignment). Accepting just
            // timestamps the timeline; there's no competing-offer cancellation.
            await tx.order.update({
              where: { id: job.order.id },
              data: {
                timeline: pushTimeline(job.order.timeline, "Rider accepted the delivery"),
              },
            });
          }

          return tx.riderJob.findUnique({ where: { id } });
        });

        return NextResponse.json({ job: result });
      } catch (err) {
        if (err instanceof ConcurrencyError) {
          // Mark the losing job as CANCELLED outside the transaction so the
          // rider sees it disappear from their queue.
          await db.riderJob.updateMany({
            where: { id, status: "OFFERED" },
            data: { status: "CANCELLED", respondedAt: new Date() },
          });
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
      }
    }

    if (action === "DECLINE") {
      if (job.status !== "OFFERED") {
        return NextResponse.json({ error: "This job isn't waiting on a response." }, { status: 400 });
      }

      if (job.type === "DELIVERY" && job.order) {
        // Send it back to the vendor to pick someone else — only if this
        // decline is for the order's *currently* assigned rider (guards
        // against a stale offer being declined after someone else already took it).
        if (job.order.riderId === riderProfile.id) {
          await db.order.update({
            where: { id: job.order.id },
            data: {
              status: "PREPARING",
              riderId: null,
              timeline: pushTimeline(job.order.timeline, "Rider declined — vendor is reassigning"),
            },
          });
        }
      }
      // For RIDE jobs, declining just removes this rider from the pool —
      // the ride stays SEARCHING for the other riders it was offered to.

      const updated = await db.riderJob.update({ where: { id }, data: { status: "CANCELLED", respondedAt: new Date() } });
      return NextResponse.json({ job: updated });
    }

    // ADVANCE — move the job (and its underlying order/ride) one step forward.
    if (job.status !== "ACCEPTED" && job.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "This job can't be advanced right now." }, { status: 400 });
    }

    if (job.type === "DELIVERY" && job.order) {
      if (job.status === "ACCEPTED") {
        // Picked up — heading to the customer.
        await db.order.update({
          where: { id: job.order.id },
          data: { status: "ON_THE_WAY", timeline: pushTimeline(job.order.timeline, "Order picked up — on the way") },
        });
        const updated = await db.riderJob.update({ where: { id }, data: { status: "IN_PROGRESS" } });
        return NextResponse.json({ job: updated });
      }
      // IN_PROGRESS -> COMPLETED: delivered.
      await db.order.update({
        where: { id: job.order.id },
        data: { status: "DELIVERED", timeline: pushTimeline(job.order.timeline, "Order delivered") },
      });
      await db.riderProfile.update({
        where: { id: riderProfile.id },
        data: { trips: { increment: 1 }, earningsToday: { increment: job.order.deliveryFee } },
      });
      // Release vendor funds: pending → available. Idempotent — if the
      // order PATCH route already did this, no-op. The vendor can now
      // withdraw this amount.
      try {
        const { releaseVendorFundsOnDelivery } = await import("@/lib/payments/vendor-wallet");
        await releaseVendorFundsOnDelivery({
          vendorId: job.order.vendorId,
          orderId: job.order.id,
        });
      } catch (e: any) {
        console.error(`[rider-jobs PATCH] releaseVendorFunds failed for ${job.order.id}:`, e?.message ?? e);
      }
      const updated = await db.riderJob.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
      return NextResponse.json({ job: updated });
    }

    if (job.type === "RIDE" && job.ride) {
      if (job.status === "ACCEPTED") {
        // Arrived and picked up the passenger — trip starts now.
        await db.ride.update({ where: { id: job.ride.id }, data: { status: "IN_PROGRESS" } });
        const updated = await db.riderJob.update({ where: { id }, data: { status: "IN_PROGRESS" } });
        return NextResponse.json({ job: updated });
      }
      // IN_PROGRESS -> COMPLETED: dropped off.
      await db.ride.update({ where: { id: job.ride.id }, data: { status: "COMPLETED" } });
      await db.riderProfile.update({
        where: { id: riderProfile.id },
        data: { trips: { increment: 1 }, earningsToday: { increment: job.ride.fare } },
      });
      const updated = await db.riderJob.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
      return NextResponse.json({ job: updated });
    }

    return NextResponse.json({ error: "Job is missing its underlying order or ride." }, { status: 500 });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[rider-jobs PATCH] error", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

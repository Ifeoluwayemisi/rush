/**
 * Order POST validation tests.
 *
 * We mock `@/lib/db` and `@/lib/auth` so the route handler runs in
 * isolation — no Mongo, no real auth. The goal is to verify the
 * security-validation paths we added in Sprint 1 + 3:
 *   - empty cart → 400
 *   - missing vendorId → 400
 *   - invalid quantity (0, negative, non-integer) → 400
 *   - cross-vendor product injection → 400
 *   - insufficient stock → 400
 *   - happy path → 201 + order returned
 *
 * The actual stock decrement logic also runs — we assert the
 * `updateMany` calls fire with the right precondition.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// In-memory db mock — we reset its state in beforeEach.
// Use `vi.hoisted` so the variable is available inside `vi.mock`
// factories (which are hoisted to the top of the file before any
// other statement runs).
const { dbState } = vi.hoisted(() => ({
  dbState: {
    vendors: {} as Record<string, any>,
    products: {} as Record<string, any>,
    orders: [] as any[],
    updateManyResults: {} as Record<string, number>,
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "buyer@test",
    name: "Buyer",
    phone: "+234 0",
    capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]),
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "buyer@test",
    name: "Buyer",
    phone: "+234 0",
    capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]),
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    vendorProfile: {
      findUnique: vi.fn(async ({ where: { id } }: any) => dbState.vendors[id] ?? null),
    },
    product: {
      findMany: vi.fn(async ({ where: { id: { in: ids } } }: any) =>
        ids.map((id: string) => dbState.products[id]).filter(Boolean),
      ),
      updateMany: vi.fn(async (args: any) => ({
        count: dbState.updateManyResults[args.where.id] ?? 1,
      })),
    },
    order: {
      create: vi.fn(async ({ data }: any) => {
        const order = { ...data, id: `order-${dbState.orders.length + 1}` };
        dbState.orders.push(order);
        return order;
      }),
      update: vi.fn(async ({ where, data }: any) => ({ ...where, ...data })),
    },
  },
}));

// Email + notify are fire-and-forget — stub them.
vi.mock("@/lib/email", () => ({
  sendOrderNotification: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));

// Import AFTER mocks are set up so the route picks up the mocked deps.
import { POST } from "@/app/api/orders/route";
// Import the (mocked) db so tests can assert on the spy.
import { db } from "@/lib/db";

// Helper: build a NextRequest with a JSON body.
function jsonReq(body: any): NextRequest {
  return new Request("https://test/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  // Reset in-memory state.
  dbState.vendors = {
    "vendor-1": {
      id: "vendor-1",
      userId: "vendor-user-1",
      businessName: "Test Store",
      deliveryEnabled: true,
      deliveryFee: 500,
      location: "Lagos",
    },
  };
  dbState.products = {
    "p-1": { id: "p-1", vendorId: "vendor-1", name: "Phone", price: 10000, stock: 5, images: "[]" },
    "p-2": { id: "p-2", vendorId: "vendor-1", name: "Case", price: 1500, stock: 10, images: "[]" },
    "p-3": { id: "p-3", vendorId: "vendor-other", name: "Not Ours", price: 999, stock: 1, images: "[]" },
  };
  dbState.orders = [];
  dbState.updateManyResults = {}; // default = success (count: 1)
});

describe("POST /api/orders — validation", () => {
  it("400s on empty cart", async () => {
    const res = await POST(jsonReq({ items: [], vendorId: "vendor-1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("400s on missing vendorId", async () => {
    const res = await POST(jsonReq({ items: [{ productId: "p-1", quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/vendor.*required/i);
  });

  it("400s on quantity = 0", async () => {
    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: 0 }],
      vendorId: "vendor-1",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid quantity/i);
  });

  it("400s on negative quantity", async () => {
    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: -2 }],
      vendorId: "vendor-1",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid quantity/i);
  });

  it("400s on non-integer quantity", async () => {
    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: 1.5 }],
      vendorId: "vendor-1",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid quantity/i);
  });

  it("404s when vendor doesn't exist", async () => {
    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: 1 }],
      vendorId: "no-such-vendor",
    }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/vendor.*not found/i);
  });

  it("400s on cross-vendor product injection", async () => {
    // Customer tries to order vendor-other's product under vendor-1's order.
    const res = await POST(jsonReq({
      items: [{ productId: "p-3", quantity: 1 }],
      vendorId: "vendor-1",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/doesn't belong/i);
  });

  it("400s on insufficient stock", async () => {
    // p-1 has stock=5; ask for 6.
    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: 6 }],
      vendorId: "vendor-1",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/stock/i);
  });
});

describe("POST /api/orders — happy path", () => {
  it("creates the order + decrements stock + returns 200", async () => {
    const res = await POST(jsonReq({
      items: [
        { productId: "p-1", quantity: 2 },
        { productId: "p-2", quantity: 1 },
      ],
      vendorId: "vendor-1",
      fulfilment: "DELIVERY",
      paymentMethod: "CARD",
      deliveryAddress: "14 Yaba St",
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order).toBeDefined();
    expect(body.order.code).toMatch(/^RSH-\d+$/);
    expect(body.order.status).toBe("PLACED");
    expect(body.order.total).toBe(10000 * 2 + 1500 * 1 + 500); // subtotal + deliveryFee from vendor

    // Stock decrement should have fired for both items.
    expect(db.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-1", stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      }),
    );
    expect(db.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-2", stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      }),
    );
  });
});

describe("POST /api/orders — oversell race", () => {
  it("409s + cancels the order when stock decrement loses the race", async () => {
    // Simulate: between our stock check and the decrement, another
    // request got the last item first. updateMany returns count: 0.
    dbState.updateManyResults["p-1"] = 0;

    const res = await POST(jsonReq({
      items: [{ productId: "p-1", quantity: 1 }],
      vendorId: "vendor-1",
    }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/insufficient stock/i);

    // The order was created (in PLACED) then flipped to CANCELLED.
    expect(db.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.any(String) },
        data: { status: "CANCELLED" },
      }),
    );
  });
});

"use client";

import { useEffect, useState } from "react";
import {
  Shield, Users, Store, Wrench, Car, Package, ClipboardList, Truck,
  Wrench as WrenchIcon, Activity, CheckCircle2, XCircle, Ban, Pause,
  Loader2, Search, AlertCircle, RefreshCw, Database, Flame, CreditCard,
  ShieldCheck, ExternalLink,
} from "lucide-react";
import { useRush } from "@/lib/store";
import { naira } from "@/lib/data";
import {
  useAdminStats, useAdminSystemStatus, useAdminUsers, useAdminVendors,
  useAdminProviders, useAdminRiders, useAdminProducts, useAdminOrders,
  useAdminRides, useAdminServiceJobs,
  useAdminUpdateUser, useAdminUpdateVendor, useAdminUpdateProvider,
  useAdminUpdateRider, useAdminDeleteProduct,
  useAdminKyc, useAdminReviewKyc,
  type AdminUser, type AdminVendor, type AdminProvider,
  type AdminRider, type AdminProduct, type AdminKycVendor,
} from "@/lib/admin-hooks";

type AdminTab = "dashboard" | "users" | "verifications" | "marketplace" | "operations";

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "verifications", label: "Verifications", icon: CheckCircle2 },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "operations", label: "Operations", icon: ClipboardList },
];

export function AdminPanel() {
  const { params, navigate } = useRush();
  const [tab, setTab] = useState<AdminTab>((params.tab as AdminTab) || "dashboard");

  // Keep the URL-less view-state in sync with the tab so the back button works.
  useEffect(() => {
    if (params.tab !== tab) {
      navigate("admin", { ...params, tab });
    }
     
  }, [tab]);

  return (
    <div className="pb-6">
      <header className="px-4 sm:px-6 pt-3 pb-2 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-ink text-white flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-ink">Rush Admin</h1>
              <p className="text-[10px] text-ink-soft">Internal operations panel</p>
            </div>
          </div>
          <button
            onClick={() => navigate("account")}
            className="text-xs font-semibold text-ink-soft hover:text-ink px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            ← Back to account
          </button>
        </div>
        <div className="mt-3 -mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 sm:px-6 pt-5 max-w-7xl">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "users" && <UsersTab />}
        {tab === "verifications" && <VerificationsTab />}
        {tab === "marketplace" && <MarketplaceTab />}
        {tab === "operations" && <OperationsTab />}
      </main>
    </div>
  );
}

// ============== Dashboard ==============
function DashboardTab() {
  const { data, isLoading, error } = useAdminStats();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;
  const cards: Array<{ label: string; value: string | number; tone: string; icon: typeof Users }> = [
    { label: "Users", value: data.users, tone: "text-blue-500", icon: Users },
    { label: "Vendors", value: data.vendors, tone: "text-orange-500", icon: Store },
    { label: "Providers", value: data.providers, tone: "text-purple-500", icon: WrenchIcon },
    { label: "Riders", value: data.riders, tone: "text-green-500", icon: Car },
    { label: "Products", value: data.products, tone: "text-cyan-500", icon: Package },
    { label: "Open orders", value: data.openOrders, tone: "text-amber-500", icon: ClipboardList },
    { label: "Active rides", value: data.activeRides, tone: "text-pink-500", icon: Truck },
    { label: "Open jobs", value: data.openServiceJobs, tone: "text-rose-500", icon: WrenchIcon },
  ];
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Live counts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-xl bg-card border border-border p-4">
                <div className={`flex items-center justify-between ${c.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink">{c.value}</p>
                <p className="text-xs text-ink-soft">{c.label}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Pending verifications
        </h2>
        <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {data.pendingVerifications} pending
            </p>
            <p className="text-xs text-ink-soft">
              {data.pendingRiders} rider applications · {data.pendingProviders} unverified providers
            </p>
          </div>
        </div>
      </section>

      <SystemStatusSection />
    </div>
  );
}

// ============== System Status ==============
function SystemStatusSection() {
  const { data, isLoading } = useAdminSystemStatus();
  if (isLoading || !data) return null;

  const items: Array<{
    label: string;
    icon: typeof Database;
    status: "ok" | "warn" | "missing";
    detail: string;
  }> = [
    {
      label: "Database",
      icon: Database,
      status: data.database.backend === "mongodb" ? "ok" : "warn",
      detail: data.database.label,
    },
    {
      label: "Firebase Auth",
      icon: Flame,
      status:
        data.firebase.clientConfigured && data.firebase.adminConfigured
          ? "ok"
          : "missing",
      detail:
        data.firebase.clientConfigured && data.firebase.adminConfigured
          ? "Client + Admin configured"
          : data.firebase.clientConfigured
            ? "Client only — Admin SDK missing"
            : "Not configured — email/password fallback active",
    },
    {
      label: "MongoDB Atlas",
      icon: Database,
      status: data.mongodb.active ? "ok" : data.mongodb.uriConfigured ? "warn" : "missing",
      detail: data.mongodb.active
        ? "Active"
        : data.mongodb.uriConfigured
          ? "URI set but schema not switched — run switch-to-mongodb.ts"
          : "Not configured — SQLite fallback active",
    },
    {
      label: "Paystack",
      icon: CreditCard,
      status: data.paystack.configured ? "ok" : "missing",
      detail: data.paystack.configured
        ? "Live keys configured"
        : "Not configured — mock payment mode active",
    },
  ];

  const tone = {
    ok: "bg-success/10 text-success",
    warn: "bg-warning/15 text-warning",
    missing: "bg-muted text-ink-soft",
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
        System integrations
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${tone[it.status].split(" ")[1]}`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tone[it.status]}`}>
                  {it.status === "ok" ? "OK" : it.status === "warn" ? "DEV" : "—"}
                </span>
              </div>
              <p className="text-xs font-bold text-ink mt-2">{it.label}</p>
              <p className="text-[10px] text-ink-soft mt-0.5">{it.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============== Users ==============
function UsersTab() {
  const [role, setRole] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useAdminUsers(role);
  const updateUser = useAdminUpdateUser();

  // The API accepts a free-text `?q=` (matches name/email/phone), but
  // we keep it simple in the UI and only filter on the client for now.
  const users = (data?.users || []).filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
        >
          {["ALL", "CUSTOMER", "VENDOR", "SERVICE_PROVIDER", "RIDER", "ADMIN"].map((r) => (
            <option key={r} value={r}>{r === "ALL" ? "All roles" : r}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-1.5 text-xs"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-ink-soft text-xs">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Capabilities</th>
                <th className="text-left p-3 hidden md:table-cell">Wallet</th>
                <th className="text-left p-3 hidden lg:table-cell">Joined</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-semibold text-ink">{u.name}</div>
                    <div className="text-xs text-ink-soft">{u.email}</div>
                    {u.phone && <div className="text-[10px] text-ink-soft">{u.phone}</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.capabilities.map((c) => (
                        <CapabilityBadge key={c.type} cap={c} />
                      ))}
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs">{naira(u.walletBalance)}</td>
                  <td className="p-3 hidden lg:table-cell text-xs text-ink-soft">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <CapabilityActions
                      user={u}
                      pending={updateUser.isPending}
                      onSet={(capability, status) =>
                        updateUser.mutate({ id: u.id, action: "SET_CAPABILITY_STATUS", capability, status })
                      }
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-ink-soft">No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CapabilityBadge({ cap }: { cap: { type: string; status: string } }) {
  const tone =
    cap.status === "ACTIVE" ? "bg-success/10 text-success"
    : cap.status === "SUSPENDED" ? "bg-destructive/10 text-destructive"
    : "bg-warning/15 text-warning";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tone}`}>
      {cap.type}
      <span className="opacity-60 ml-1">{cap.status}</span>
    </span>
  );
}

function CapabilityActions({
  user, pending, onSet,
}: {
  user: AdminUser;
  pending: boolean;
  onSet: (capability: string, status: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {user.capabilities.map((c) => (
        <select
          key={c.type}
          disabled={pending}
          value={c.status}
          onChange={(e) => onSet(c.type, e.target.value)}
          className="text-[10px] rounded border border-border bg-card px-1.5 py-1 disabled:opacity-50"
        >
          <option value="ACTIVE">Active</option>
          <option value="PENDING_VERIFICATION">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      ))}
    </div>
  );
}

// ============== Verifications ==============
function VerificationsTab() {
  const { data: riderData, isLoading: rLoading } = useAdminRiders();
  const { data: providerData, isLoading: pLoading } = useAdminProviders();
  const { data: kycData, isLoading: kycLoading } = useAdminKyc("PENDING");
  const updateRider = useAdminUpdateRider();
  const updateProvider = useAdminUpdateProvider();

  const pendingRiders = (riderData?.riders || []).filter(
    (r) => r.status === "PENDING_VERIFICATION" || (r.licenseUploaded && !r.documentsVerified),
  );
  const unverifiedProviders = (providerData?.providers || []).filter((p) => !p.verified);
  const pendingKyc = kycData?.vendors || [];

  return (
    <div className="space-y-6">
      {/* Vendor KYC submissions */}
      <section>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Vendor KYC submissions ({pendingKyc.length})
        </h2>
        {kycLoading ? <Loading /> : pendingKyc.length === 0 ? (
          <EmptyCard msg="No pending vendor KYC submissions." />
        ) : (
          <div className="space-y-2">
            {pendingKyc.map((v) => (
              <KycReviewCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Rider applications ({pendingRiders.length})
        </h2>
        {rLoading ? <Loading /> : pendingRiders.length === 0 ? (
          <EmptyCard msg="No pending rider applications." />
        ) : (
          <div className="space-y-2">
            {pendingRiders.map((r) => (
              <RiderVerificationCard
                key={r.id}
                rider={r}
                onApprove={() => updateRider.mutate({ id: r.id, action: "APPROVE" })}
                onReject={() => updateRider.mutate({ id: r.id, action: "REJECT" })}
                onVerifyDocs={() => updateRider.mutate({ id: r.id, action: "VERIFY_DOCS" })}
                pending={updateRider.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Unverified providers ({unverifiedProviders.length})
        </h2>
        {pLoading ? <Loading /> : unverifiedProviders.length === 0 ? (
          <EmptyCard msg="All providers verified." />
        ) : (
          <div className="space-y-2">
            {unverifiedProviders.map((p) => (
              <ProviderVerificationCard
                key={p.id}
                provider={p}
                onApprove={() => updateProvider.mutate({ id: p.id, action: "SET_VERIFIED", verified: true })}
                onReject={() => updateProvider.mutate({ id: p.id, action: "SUSPEND" })}
                pending={updateProvider.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * KycReviewCard — admin's view of a single pending vendor KYC submission.
 *
 * Shows everything the admin needs to make a decision in one place:
 *   - Vendor business name + category + location
 *   - Owner account name/email/phone
 *   - Verification tier (COMMUNITY_EXTERNAL, STUDENT_LASU, STAFF_LASU)
 *   - For external: ID card photo inline, ID type, residential address, phone
 *   - For institutional: institutional email, PF/matric number
 *   - Approve / Reject buttons (reject opens a reason prompt)
 */
function KycReviewCard({ vendor }: { vendor: AdminKycVendor }) {
  const reviewKyc = useAdminReviewKyc();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isExternal = vendor.verificationTier === "COMMUNITY_EXTERNAL";
  const isStudent = vendor.verificationTier === "STUDENT_LASU";
  const isStaff = vendor.verificationTier === "STAFF_LASU";

  function handleApprove() {
    reviewKyc.mutate({ id: vendor.id, action: "APPROVE" });
  }
  function handleReject() {
    if (!reason.trim()) return;
    reviewKyc.mutate({ id: vendor.id, action: "REJECT", reason: reason.trim() }, {
      onSuccess: () => {
        setRejectOpen(false);
        setReason("");
      },
    });
  }

  const idTypeLabel = (() => {
    switch (vendor.idType) {
      case "NIN": return "NIN Slip";
      case "VOTER_ID": return "Voter's Card";
      case "DRIVERS_LICENSE": return "Driver's License";
      default: return vendor.idType || "ID";
    }
  })();

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink text-sm">{vendor.businessName}</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rush-soft text-rush-deep">
              {isStudent && "LASU Student"}
              {isStaff && "LASU Staff"}
              {isExternal && "External (ID)"}
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {vendor.category} · {vendor.location} · {vendor.productCount} products · {vendor.orderCount} orders
          </p>
          <p className="text-[11px] text-ink-soft mt-1">
            Owner: {vendor.owner.name} ({vendor.owner.email})
            {vendor.owner.phone ? ` · ${vendor.owner.phone}` : ""}
          </p>
        </div>
        <a
          href={`/store/${vendor.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-rush flex items-center gap-1 shrink-0"
        >
          View store <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Submission details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {(isStudent || isStaff) && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <p><span className="text-ink-soft">Institutional email:</span> <span className="font-mono">{vendor.institutionalEmail}</span></p>
            {vendor.matricOrPfNumber && (
              <p><span className="text-ink-soft">{isStaff ? "PF number:" : "Matric number:"}</span> <span className="font-mono">{vendor.matricOrPfNumber}</span></p>
            )}
            <p className="text-[10px] text-ink-soft mt-1">
              {isStudent
                ? "Auto-verified via LASU student email OTP."
                : "Auto-verified via LASU staff email OTP. PF number stored for audit."}
            </p>
          </div>
        )}

        {isExternal && (
          <>
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <p><span className="text-ink-soft">ID type:</span> {idTypeLabel}</p>
              <p><span className="text-ink-soft">Phone:</span> {vendor.kycPhone}</p>
              <p><span className="text-ink-soft">Address:</span> {vendor.residentialAddress}</p>
            </div>
            {vendor.idCardUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={vendor.idCardUrl}
                  alt={`ID for ${vendor.businessName}`}
                  className="w-full max-h-56 object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject reason input */}
      {rejectOpen && (
        <div className="mb-3 rounded-lg bg-destructive/5 border border-destructive/30 p-3">
          <label className="block text-xs font-semibold text-ink-soft mb-1.5">
            Reason for rejection (visible to the vendor)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. ID photo is blurry — please re-upload a clearer photo."
            className="w-full bg-white rounded-md border border-input px-3 py-2 text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReject}
              disabled={reviewKyc.isPending || reason.trim().length < 5}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button
              onClick={() => { setRejectOpen(false); setReason(""); }}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!rejectOpen && (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => setRejectOpen(true)}
            disabled={reviewKyc.isPending}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50 flex items-center gap-1"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={reviewKyc.isPending}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/15 disabled:opacity-50 flex items-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </button>
        </div>
      )}
    </div>
  );
}

function RiderVerificationCard({
  rider, onApprove, onReject, onVerifyDocs, pending,
}: {
  rider: AdminRider;
  onApprove: () => void;
  onReject: () => void;
  onVerifyDocs: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-ink text-sm">{rider.name}</p>
          <span className="text-[10px] text-ink-soft bg-muted px-1.5 py-0.5 rounded">
            {rider.status}
          </span>
        </div>
        <p className="text-xs text-ink-soft mt-0.5">
          {rider.phone} · {rider.vehicle ? `${rider.vehicle.type} ${rider.vehicle.plate} (${rider.vehicle.model})` : "No vehicle"}
        </p>
        <p className="text-[10px] text-ink-soft mt-1">
          License uploaded: {rider.licenseUploaded ? "yes" : "no"} · Documents verified: {rider.documentsVerified ? "yes" : "no"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button disabled={pending} onClick={onVerifyDocs} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50">
          Verify docs
        </button>
        <button disabled={pending} onClick={onApprove} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/15 disabled:opacity-50 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
        <button disabled={pending} onClick={onReject} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50 flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}

function ProviderVerificationCard({
  provider, onApprove, onReject, pending,
}: {
  provider: AdminProvider;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-ink text-sm">{provider.businessName}</p>
        <p className="text-xs text-ink-soft">
          {provider.category} · {provider.location} · {naira(provider.startingPrice)}+ · {provider.completedJobs} jobs
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button disabled={pending} onClick={onApprove} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/15 disabled:opacity-50 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
        <button disabled={pending} onClick={onReject} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50 flex items-center gap-1">
          <Ban className="h-3.5 w-3.5" /> Suspend
        </button>
      </div>
    </div>
  );
}

// ============== Marketplace ==============
function MarketplaceTab() {
  const [sub, setSub] = useState<"vendors" | "products">("vendors");
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button
          onClick={() => setSub("vendors")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${sub === "vendors" ? "bg-ink text-white" : "bg-card border border-border"}`}
        >Vendors</button>
        <button
          onClick={() => setSub("products")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${sub === "products" ? "bg-ink text-white" : "bg-card border border-border"}`}
        >Products</button>
      </div>
      {sub === "vendors" ? <VendorsList /> : <ProductsList />}
    </div>
  );
}

function VendorsList() {
  const { data, isLoading, error } = useAdminVendors();
  const updateVendor = useAdminUpdateVendor();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-muted/50 text-ink-soft text-xs">
          <tr>
            <th className="text-left p-3">Store</th>
            <th className="text-left p-3">Owner</th>
            <th className="text-left p-3">Visibility</th>
            <th className="text-left p-3">Verified</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {data?.vendors.map((v) => (
            <VendorRow
              key={v.id}
              vendor={v}
              pending={updateVendor.isPending}
              onSetVisibility={(visibility) => updateVendor.mutate({ id: v.id, action: "SET_VISIBILITY", visibility })}
              onSetVerified={(verified) => updateVendor.mutate({ id: v.id, action: "SET_VERIFIED", verified })}
              onSuspend={() => updateVendor.mutate({ id: v.id, action: "SUSPEND" })}
              onReactivate={() => updateVendor.mutate({ id: v.id, action: "REACTIVATE" })}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VendorRow({
  vendor, pending, onSetVisibility, onSetVerified, onSuspend, onReactivate,
}: {
  vendor: AdminVendor;
  pending: boolean;
  onSetVisibility: (v: string) => void;
  onSetVerified: (v: boolean) => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const suspended = vendor.owner.capabilities.some((c: any) => c.type === "VENDOR" && c.status === "SUSPENDED");
  return (
    <tr className="hover:bg-muted/30">
      <td className="p-3">
        <div className="font-semibold text-ink">{vendor.businessName}</div>
        <div className="text-[11px] text-ink-soft">{vendor.category} · {vendor.location} · {vendor.productCount} products · {vendor.orderCount} orders</div>
      </td>
      <td className="p-3 text-xs">
        <div className="font-medium">{vendor.owner.name}</div>
        <div className="text-ink-soft">{vendor.owner.email}</div>
      </td>
      <td className="p-3">
        <select
          disabled={pending}
          value={vendor.visibility}
          onChange={(e) => onSetVisibility(e.target.value)}
          className="text-[11px] rounded border border-border bg-card px-1.5 py-1 disabled:opacity-50"
        >
          <option value="PUBLIC">Public</option>
          <option value="LINK_ONLY">Link only</option>
          <option value="PRIVATE">Private</option>
        </select>
      </td>
      <td className="p-3 text-center">
        <input
          type="checkbox"
          disabled={pending}
          checked={vendor.verified}
          onChange={(e) => onSetVerified(e.target.checked)}
        />
      </td>
      <td className="p-3 text-right">
        {suspended ? (
          <button
            disabled={pending}
            onClick={onReactivate}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/15 disabled:opacity-50"
          >Reactivate</button>
        ) : (
          <button
            disabled={pending}
            onClick={onSuspend}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50 flex items-center gap-1"
          >
            <Pause className="h-3.5 w-3.5" /> Suspend
          </button>
        )}
      </td>
    </tr>
  );
}

function ProductsList() {
  const { data, isLoading, error } = useAdminProducts();
  const del = useAdminDeleteProduct();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-muted/50 text-ink-soft text-xs">
          <tr>
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">Vendor</th>
            <th className="text-left p-3">Category</th>
            <th className="text-right p-3">Price</th>
            <th className="text-right p-3">Stock</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {data?.products.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt="" className="h-9 w-9 rounded object-cover" />
                  )}
                  <div>
                    <div className="font-semibold text-ink text-xs">{p.name}</div>
                    <div className="text-[10px] text-ink-soft line-clamp-1 max-w-[260px]">{p.condition || "—"}</div>
                  </div>
                </div>
              </td>
              <td className="p-3 text-xs">{p.vendor.businessName}</td>
              <td className="p-3 text-xs">{p.category}</td>
              <td className="p-3 text-right text-xs font-semibold">{naira(p.price)}</td>
              <td className="p-3 text-right text-xs">{p.stock}</td>
              <td className="p-3 text-right">
                <button
                  disabled={del.isPending}
                  onClick={() => {
                    if (confirm(`Remove "${p.name}" from the marketplace? This can't be undone.`)) {
                      del.mutate(p.id);
                    }
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== Operations ==============
function OperationsTab() {
  const [sub, setSub] = useState<"orders" | "rides" | "service-jobs">("orders");
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button
          onClick={() => setSub("orders")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${sub === "orders" ? "bg-ink text-white" : "bg-card border border-border"}`}
        >Orders</button>
        <button
          onClick={() => setSub("rides")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${sub === "rides" ? "bg-ink text-white" : "bg-card border border-border"}`}
        >Rides</button>
        <button
          onClick={() => setSub("service-jobs")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${sub === "service-jobs" ? "bg-ink text-white" : "bg-card border border-border"}`}
        >Service jobs</button>
      </div>
      {sub === "orders" && <OrdersTable />}
      {sub === "rides" && <RidesTable />}
      {sub === "service-jobs" && <ServiceJobsTable />}
    </div>
  );
}

function OrdersTable() {
  const { data, isLoading, error } = useAdminOrders();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const orders = data?.orders || [];
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-muted/50 text-ink-soft text-xs">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Vendor</th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Total</th>
            <th className="text-left p-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {orders.map((o: any) => (
            <tr key={o.id} className="hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">{o.code}</td>
              <td className="p-3 text-xs">
                <div>{o.customerName}</div>
                <div className="text-ink-soft">{o.customerPhone}</div>
              </td>
              <td className="p-3 text-xs">{o.vendorName}</td>
              <td className="p-3"><StatusBadge status={o.status} /></td>
              <td className="p-3 text-right text-xs font-semibold">{naira(o.total)}</td>
              <td className="p-3 text-xs text-ink-soft">
                {new Date(o.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-sm text-ink-soft">No orders.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RidesTable() {
  const { data, isLoading, error } = useAdminRides();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const rides = data?.rides || [];
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-muted/50 text-ink-soft text-xs">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Rider</th>
            <th className="text-left p-3">Route</th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Fare</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rides.map((r: any) => (
            <tr key={r.id} className="hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">{r.code}</td>
              <td className="p-3 text-xs">{r.type}</td>
              <td className="p-3 text-xs">
                <div>{r.customer?.name || "—"}</div>
                <div className="text-ink-soft">{r.customer?.phone}</div>
              </td>
              <td className="p-3 text-xs">{r.rider?.name || "Searching…"}</td>
              <td className="p-3 text-xs">
                <div className="line-clamp-1 max-w-[240px]">{r.pickup} → {r.destination}</div>
              </td>
              <td className="p-3"><StatusBadge status={r.status} /></td>
              <td className="p-3 text-right text-xs font-semibold">{naira(r.fare)}</td>
            </tr>
          ))}
          {rides.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-sm text-ink-soft">No rides.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ServiceJobsTable() {
  const { data, isLoading, error } = useAdminServiceJobs();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const jobs = data?.jobs || [];
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-muted/50 text-ink-soft text-xs">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Title</th>
            <th className="text-left p-3">Category</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Provider</th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Quote</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {jobs.map((j: any) => (
            <tr key={j.id} className="hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">{j.code}</td>
              <td className="p-3 text-xs">{j.title}</td>
              <td className="p-3 text-xs">{j.category}</td>
              <td className="p-3 text-xs">{j.customer?.name || "—"}</td>
              <td className="p-3 text-xs">{j.provider?.businessName || "Open"}</td>
              <td className="p-3"><StatusBadge status={j.status} /></td>
              <td className="p-3 text-right text-xs font-semibold">
                {j.quotedPrice != null ? naira(j.quotedPrice) : j.budget ? `${naira(j.budget)} cap` : "—"}
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-sm text-ink-soft">No service jobs.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============== Shared UI bits ==============
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" || status === "COMPLETED" ? "bg-success/10 text-success"
    : status === "CANCELLED" ? "bg-destructive/10 text-destructive"
    : status === "SEARCHING" || status === "OPEN" ? "bg-amber-100 text-amber-700"
    : "bg-muted text-ink-soft";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tone}`}>{status}</span>;
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12 text-ink-soft">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : "Failed to load";
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {msg}
    </div>
  );
}

function EmptyCard({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl bg-card border border-border border-dashed p-6 text-center text-sm text-ink-soft">
      {msg}
    </div>
  );
}

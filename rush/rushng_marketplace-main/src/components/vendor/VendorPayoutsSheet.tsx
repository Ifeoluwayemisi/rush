"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Wallet, Building2, ChevronRight, Check, AlertCircle,
  ArrowDownToLine, Clock, XCircle,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRush } from "@/lib/store";
import { naira } from "@/lib/data";
import { api, ApiError } from "@/lib/api-client";

/**
 * VendorPayoutsSheet — full payout flow for vendors.
 *
 * Three sections:
 *   1. Wallet balances — pending + available, with a refresh button
 *   2. Bank account — current account or setup form (resolve + save)
 *   3. Withdraw — amount input + withdraw button (debits available)
 *   4. History — recent payouts with status pills
 *
 * All data is fetched on open. The sheet is read-heavy — we don't
 * poll for payout status updates because the WebSocket pushes a
 * notification when a payout settles (transfer.success / failed).
 */

interface BankAccount {
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  bankCode: string | null;
  recipientCode: string | null;
  verified: boolean;
}

interface Bank {
  name: string;
  code: string;
}

interface WalletInfo {
  id: string;
  pendingBalance: number;
  availableBalance: number;
}

interface Payout {
  id: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  bankName: string | null;
  bankAccountNumber: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface VendorPayoutsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorPayoutsSheet({ open, onOpenChange }: VendorPayoutsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Payouts</SheetTitle>
        </SheetHeader>
        {open && <PayoutsContent onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function PayoutsContent({ onDone }: { onDone: () => void }) {
  const { pushToast } = useRush();

  // ─── State ──────────────────────────────────────────────────────────
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank-account setup form state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [pickedBank, setPickedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // ─── Load everything on mount ───────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    try {
      const [walletRes, bankRes, payoutsRes] = await Promise.all([
        api.get<{ wallet: WalletInfo }>("/api/vendor/wallet"),
        api.get<{ bankAccount: BankAccount | null }>("/api/vendor/bank-account"),
        api.get<{ payouts: Payout[] }>("/api/vendor/payouts"),
      ]);
      setWallet(walletRes.wallet);
      setBankAccount(bankRes.bankAccount);
      setPayouts(payoutsRes.payouts);
    } catch (e: any) {
      pushToast({ title: "Couldn't load payout data", description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!banks.length) {
      api.get<{ banks: Bank[] }>("/api/banks")
        .then((r) => setBanks(r.banks))
        .catch(() => setBanks([]));
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Bank account setup ─────────────────────────────────────────────
  async function handleResolveAccount() {
    if (!pickedBank || accountNumber.length !== 10) {
      pushToast({ title: "Pick a bank and enter a 10-digit account number" });
      return;
    }
    setResolving(true);
    setResolvedName(null);
    try {
      const r = await api.post<{ accountName: string }>(
        "/api/vendor/bank-account/resolve",
        { accountNumber, bankCode: pickedBank.code },
      );
      setResolvedName(r.accountName);
    } catch (e: any) {
      pushToast({
        title: "Couldn't resolve account",
        description: e instanceof ApiError ? e.message : undefined,
      });
    } finally {
      setResolving(false);
    }
  }

  async function handleSaveBank() {
    if (!pickedBank || accountNumber.length !== 10 || !resolvedName) {
      pushToast({ title: "Resolve the account first" });
      return;
    }
    setSavingBank(true);
    try {
      await api.post("/api/vendor/bank-account", {
        accountNumber,
        bankCode: pickedBank.code,
        bankName: pickedBank.name,
        accountName: resolvedName,
      });
      pushToast({ title: "Bank account saved ✅" });
      setShowBankForm(false);
      setAccountNumber("");
      setResolvedName(null);
      setPickedBank(null);
      await loadAll();
    } catch (e: any) {
      pushToast({
        title: "Couldn't save bank account",
        description: e instanceof ApiError ? e.message : undefined,
      });
    } finally {
      setSavingBank(false);
    }
  }

  // ─── Withdraw ───────────────────────────────────────────────────────
  async function handleWithdraw() {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushToast({ title: "Enter a valid amount" });
      return;
    }
    if (amount < 1000) {
      pushToast({ title: "Minimum withdrawal is ₦1,000" });
      return;
    }
    if (wallet && amount > wallet.availableBalance) {
      pushToast({
        title: "Insufficient available balance",
        description: `You have ${naira(wallet.availableBalance)} available.`,
      });
      return;
    }
    setWithdrawing(true);
    try {
      const r = await api.post<{ message: string }>("/api/vendor/payouts/withdraw", { amount });
      pushToast({ title: "Withdrawal initiated", description: r.message });
      setWithdrawAmount("");
      await loadAll();
    } catch (e: any) {
      pushToast({
        title: "Withdrawal failed",
        description: e instanceof ApiError ? e.message : undefined,
      });
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pb-4 pt-6 flex items-center justify-center text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2 space-y-5">
      {/* ─── Wallet balances ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Balances</h3>
          <button
            onClick={loadAll}
            className="text-[11px] font-semibold text-rush"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-rush-soft/60 p-3">
            <p className="text-[10px] font-semibold text-ink-soft uppercase">Available</p>
            <p className="text-base font-extrabold text-rush-deep mt-1">
              {naira(wallet?.availableBalance ?? 0)}
            </p>
            <p className="text-[10px] text-ink-soft mt-0.5">Withdrawable now</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-[10px] font-semibold text-ink-soft uppercase">Pending</p>
            <p className="text-base font-extrabold text-ink mt-1">
              {naira(wallet?.pendingBalance ?? 0)}
            </p>
            <p className="text-[10px] text-ink-soft mt-0.5">Releases on delivery</p>
          </div>
        </div>
      </section>

      {/* ─── Bank account ────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">
          Payout bank account
        </h3>
        {bankAccount ? (
          <div className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">
                {bankAccount.bankName || "Bank"}
              </p>
              <p className="text-[11px] text-ink-soft">
                {bankAccount.accountNumber} · {bankAccount.accountName || "—"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowBankForm(true);
                setPickedBank(null);
                setAccountNumber("");
                setResolvedName(null);
              }}
              className="text-[11px] font-semibold text-rush"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowBankForm(true)}
            className="w-full text-left rounded-xl border-2 border-dashed border-border p-4 hover:border-rush hover:bg-rush-soft/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted text-ink-soft flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Add payout bank account</p>
                <p className="text-[11px] text-ink-soft">Required before you can withdraw</p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-soft ml-auto" />
            </div>
          </button>
        )}

        {showBankForm && (
          <div className="mt-3 rounded-xl bg-muted/40 p-3 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Bank</label>
              <select
                value={pickedBank?.code ?? ""}
                onChange={(e) => {
                  const b = banks.find((x) => x.code === e.target.value) || null;
                  setPickedBank(b);
                  setResolvedName(null);
                }}
                className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border"
              >
                <option value="">Select bank…</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                Account number (10 digits)
              </label>
              <Input
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setResolvedName(null);
                }}
                placeholder="0123456789"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResolveAccount}
                disabled={!pickedBank || accountNumber.length !== 10 || resolving}
              >
                {resolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Resolve
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBank}
                disabled={!resolvedName || savingBank}
              >
                {savingBank ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save account
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBankForm(false)}
              >
                Cancel
              </Button>
            </div>
            {resolvedName && (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <Check className="h-3 w-3" />
                <span className="font-semibold">{resolvedName}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Withdraw ────────────────────────────────────────────────── */}
      {bankAccount && (
        <section>
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">
            Withdraw to bank
          </h3>
          <div className="rounded-xl bg-card border border-border p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-soft">Available</span>
              <span className="font-bold text-rush-deep">
                {naira(wallet?.availableBalance ?? 0)}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (₦)"
                disabled={withdrawing}
              />
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || !wallet?.availableBalance}
                size="sm"
              >
                {withdrawing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowDownToLine className="h-3 w-3 mr-1" />}
                Withdraw
              </Button>
            </div>
            <p className="text-[10px] text-ink-soft">
              Min ₦1,000 · Funds arrive in 1-5 minutes · No fee
            </p>
          </div>
        </section>
      )}

      {/* ─── History ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">
          Recent payouts
        </h3>
        {payouts.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <Wallet className="h-6 w-6 text-ink-soft mx-auto mb-1" />
            <p className="text-xs font-semibold text-ink">No payouts yet</p>
            <p className="text-[11px] text-ink-soft">Your withdrawal history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="rounded-lg bg-card border border-border p-2.5 flex items-center gap-2.5"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  p.status === "SUCCESS"
                    ? "bg-success/10 text-success"
                    : p.status === "FAILED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/15 text-warning"
                }`}>
                  {p.status === "SUCCESS" ? (
                    <Check className="h-4 w-4" />
                  ) : p.status === "FAILED" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">{naira(p.amount)}</p>
                  <p className="text-[10px] text-ink-soft">
                    {p.bankName} · {p.bankAccountNumber}
                    {" · "}
                    {new Date(p.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                  {p.status === "FAILED" && p.failureReason && (
                    <p className="text-[10px] text-destructive mt-0.5 line-clamp-2">
                      {p.failureReason}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.status === "SUCCESS"
                    ? "bg-success/10 text-success"
                    : p.status === "FAILED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/15 text-warning"
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <SheetFooter className="px-0 pt-1">
        <Button variant="outline" className="w-full" onClick={onDone}>
          Done
        </Button>
      </SheetFooter>
    </div>
  );
}

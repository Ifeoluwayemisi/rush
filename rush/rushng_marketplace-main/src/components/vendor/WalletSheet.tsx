"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRush } from "@/lib/store";
import { naira } from "@/lib/data";
import { api, ApiError } from "@/lib/api-client";

interface BankAccount {
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  bankCode: string | null;
  recipientCode: string | null;
}

interface Bank {
  name: string;
  code: string;
}

interface WalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletSheet({ open, onOpenChange }: WalletSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Rush Wallet</SheetTitle>
        </SheetHeader>
        {open && <WalletContent onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function WalletContent({ onDone }: { onDone: () => void }) {
  const { user, setAuthenticatedUser, pushToast } = useRush();
  const [tab, setTab] = useState<"fund" | "withdraw">("fund");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Bank account state
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [pickedBank, setPickedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Compute live wallet balance
  const balance = (user as any)?.wallet?.balance ?? (user as any)?.walletBalance ?? 0;

  const loadBankAccount = useCallback(() => {
    api.get<{ bankAccount: BankAccount | null }>("/api/wallet/bank-account")
      .then((r) => setBankAccount(r.bankAccount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBankAccount();
    api.get<{ banks: Bank[] }>("/api/banks")
      .then((r) => setBanks(r.banks || []))
      .catch(() => setBanks([]));
  }, [loadBankAccount]);

  // ─── Fund wallet ─────────────────────────────────────────────────
  async function handleFund() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast({ title: "Enter a valid amount" });
      return;
    }
    if (amt < 100) {
      pushToast({ title: "Minimum top-up is ₦100" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        reference: string;
        authorizationUrl: string;
        isMock?: boolean;
      }>("/api/payments/initiate", {
        amount: amt,
        type: "wallet_topup",
      });

      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        throw new Error("No authorization URL returned from gateway.");
      }
    } catch (e: any) {
      pushToast({
        title: "Top-up failed",
        description: e instanceof ApiError ? e.message : e.message || "Failed to initiate payment",
      });
    } finally {
      setLoading(false);
    }
  }

  // ─── Withdraw ────────────────────────────────────────────────────
  async function handleWithdraw() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast({ title: "Enter a valid amount" });
      return;
    }
    if (amt < 1000) {
      pushToast({ title: "Minimum withdrawal is ₦1,000" });
      return;
    }
    if (amt > balance) {
      pushToast({
        title: "Insufficient balance",
        description: `You have ${naira(balance)}.`,
      });
      return;
    }
    if (!bankAccount?.recipientCode) {
      pushToast({ title: "Add a bank account first" });
      setShowBankForm(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string; ok: boolean }>("/api/wallet/withdraw", {
        amount: amt,
      });

      pushToast({
        title: "Withdrawal initiated",
        description: res.message || "Funds will arrive in your bank account shortly.",
      });
      setAmount("");

      // Update the client user state without reloading
      try {
        const me = await api.get<{ user: any }>("/api/auth/me");
        if (me?.user) {
          setAuthenticatedUser(me.user);
        }
      } catch {
        window.location.reload();
      }

      onDone();
    } catch (e: any) {
      pushToast({
        title: "Withdrawal failed",
        description: e instanceof ApiError ? e.message : e.message || "Could not process withdrawal",
      });
    } finally {
      setLoading(false);
    }
  }

  // ─── Bank account setup ──────────────────────────────────────────
  async function handleResolveAccount() {
    if (!pickedBank || accountNumber.length !== 10) {
      pushToast({ title: "Pick a bank and enter a 10-digit account number" });
      return;
    }
    setResolving(true);
    setResolvedName(null);
    try {
      const r = await api.post<{ accountName: string }>("/api/wallet/bank-account/resolve", {
        accountNumber,
        bankCode: pickedBank.code,
      });
      setResolvedName(r.accountName);
    } catch (e: any) {
      pushToast({
        title: "Couldn't resolve account",
        description: e instanceof ApiError ? e.message : e.message || "Invalid bank details",
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
      await api.post("/api/wallet/bank-account", {
        accountNumber,
        bankCode: pickedBank.code,
        bankName: pickedBank.name,
      });
      pushToast({ title: "Bank account saved ✅" });
      setShowBankForm(false);
      setAccountNumber("");
      setResolvedName(null);
      setPickedBank(null);
      loadBankAccount();
    } catch (e: any) {
      pushToast({
        title: "Couldn't save bank account",
        description: e instanceof ApiError ? e.message : e.message || "Save failed",
      });
    } finally {
      setSavingBank(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-2 space-y-4">
      {/* Balance display */}
      <div className="rounded-2xl rush-gradient p-4 text-white shadow-rush relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-[11px] opacity-90">Wallet balance</p>
          <p className="text-2xl font-extrabold mt-1">{naira(balance)}</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("fund");
            setAmount("");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            tab === "fund" ? "rush-gradient text-white shadow-rush" : "bg-muted text-ink-soft"
          }`}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Fund wallet
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("withdraw");
            setAmount("");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            tab === "withdraw" ? "rush-gradient text-white shadow-rush" : "bg-muted text-ink-soft"
          }`}
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" /> Withdraw
        </button>
      </div>

      {/* ─── Withdraw: bank account section ─────────────────────── */}
      {tab === "withdraw" && (
        <div>
          {bankAccount ? (
            <div className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{bankAccount.bankName || "Bank"}</p>
                <p className="text-[11px] text-ink-soft truncate">
                  {bankAccount.accountNumber} · {bankAccount.accountName || "—"}
                </p>
              </div>
              <button
                type="button"
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
              type="button"
              onClick={() => setShowBankForm(true)}
              className="w-full text-left rounded-xl border-2 border-dashed border-border p-4 hover:border-rush hover:bg-rush-soft/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted text-ink-soft flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Add bank account</p>
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
                    setPickedBank(banks.find((b) => b.code === e.target.value) || null);
                    setResolvedName(null);
                  }}
                  className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="">Select bank…</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
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
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={!pickedBank || accountNumber.length !== 10 || resolving}
                >
                  {resolving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Resolve
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleSaveBank}
                  disabled={!resolvedName || savingBank}
                >
                  {savingBank && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
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
        </div>
      )}

      {/* Amount input */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">
          {tab === "fund" ? "Amount to add" : "Amount to withdraw"}
        </label>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="₦0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2">
        {tab === "fund"
          ? [500, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(String(amt))}
                className="flex-1 py-2 rounded-lg bg-muted text-xs font-semibold text-ink hover:bg-rush-soft hover:text-rush transition-colors"
              >
                +{naira(amt)}
              </button>
            ))
          : [1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(String(Math.min(amt, balance)))}
                className="flex-1 py-2 rounded-lg bg-muted text-xs font-semibold text-ink hover:bg-rush-soft hover:text-rush transition-colors disabled:opacity-40"
                disabled={amt > balance}
              >
                {naira(amt)}
              </button>
            ))}
      </div>

      <SheetFooter>
        <button
          type="button"
          onClick={tab === "fund" ? handleFund : handleWithdraw}
          disabled={loading || !amount}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </>
          ) : tab === "fund" ? (
            <>
              <ArrowDownToLine className="h-4 w-4" /> Add{" "}
              {amount ? naira(Number(amount)) : "funds"}
            </>
          ) : (
            <>
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw{" "}
              {amount ? naira(Number(amount)) : ""}
            </>
          )}
        </button>
      </SheetFooter>

      <p className="text-[10px] text-ink-soft text-center">
        {tab === "fund"
          ? "Funds are added instantly via Paystack. No fee."
          : "Min ₦1,000 · Funds arrive in 1-5 minutes · No fee"}
      </p>
    </div>
  );
}

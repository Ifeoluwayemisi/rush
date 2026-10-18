"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRush } from "@/lib/store";
import { api } from "@/lib/api-client";
import { naira } from "@/lib/data";

type VerifyResponse = {
  status?: string;
  amount?: number;
  orderId?: string | null;
  purpose?: string;
  payment?: { status?: string; amount?: number };
};

export function PaymentReturnHandler() {
  const qc = useQueryClient();
  const navigate = useRush((s) => s.navigate);
  const pushToast = useRush((s) => s.pushToast);
  const clearCart = useRush((s) => s.clearCart);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;

    const q = new URLSearchParams(window.location.search);
    const reference = q.get("reference") || q.get("trxref");

    // Paystack redirects with ?wallet=funded, ?pay=wallet, or a reference prefixed with rush-wallet- / wallet-
    const isWallet =
      q.get("pay") === "wallet" ||
      q.has("wallet") ||
      (reference ? reference.startsWith("rush-wallet-") || reference.startsWith("wallet-") : false);

    const isOrder = q.get("pay") === "order" || q.has("order");

    if (!reference) return;
    if (!isWallet && !isOrder && !q.get("pay")) return;

    ran.current = true;

    // Strip params from the address bar without triggering a navigation event
    window.history.replaceState({}, "", window.location.pathname);

    api
      .post<VerifyResponse>("/api/payments/verify", { reference })
      .then(async (r) => {
        const status = r.status ?? r.payment?.status;
        const amount = r.amount ?? r.payment?.amount ?? 0;

        // Invalidate TanStack query cache to instantly show updated balance
        await qc.invalidateQueries({ queryKey: ["me"] });
        await qc.invalidateQueries({ queryKey: ["user"] });

        if (status !== "SUCCESS") {
          pushToast({
            title: status === "PENDING" ? "Payment pending" : "Payment not completed",
            description:
              status === "PENDING"
                ? "We will update your balance as soon as Paystack confirms the transaction."
                : "You were not charged. Please try again.",
          });
          return;
        }

        if (isWallet || r.purpose === "WALLET_TOPUP") {
          pushToast({
            title: "Wallet topped up!",
            description: `${naira(amount)} added to your wallet.`,
          });
          navigate("account");
        } else {
          clearCart();
          pushToast({
            title: "Order placed!",
            description: "Your payment was received.",
          });
          if (r.orderId) navigate("order-tracking", { orderId: r.orderId });
          else navigate("activity");
        }
      })
      .catch((err) => {
        console.error("[PaymentReturnHandler] verification failed:", err);
        pushToast({
          title: "Confirming payment…",
          description: "Payment received. Your balance will update shortly.",
        });
      });
  }, [qc, navigate, pushToast, clearCart]);

  return null;
}

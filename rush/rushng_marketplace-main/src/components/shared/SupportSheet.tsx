"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRush } from "@/lib/store";
import { api, ApiError } from "@/lib/api-client";

/**
 * SupportSheet — user submits feedback/complaints/questions/bug reports.
 *
 * Sends to Rush4servicesupport@gmail.com via POST /api/support.
 * Rate-limited to 5 per hour server-side.
 */

interface SupportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPES = [
  { id: "feedback", label: "Feedback", icon: "💬" },
  { id: "complaint", label: "Complaint", icon: "⚠️" },
  { id: "question", label: "Question", icon: "❓" },
  { id: "bug", label: "Bug Report", icon: "🐛" },
] as const;

export function SupportSheet({ open, onOpenChange }: SupportSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Help & support</SheetTitle>
        </SheetHeader>
        {open && <SupportContent onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SupportContent({ onDone }: { onDone: () => void }) {
  const { pushToast } = useRush();
  const [type, setType] = useState<string>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) {
      pushToast({ title: "Enter a subject (min 3 characters)" });
      return;
    }
    if (message.trim().length < 10) {
      pushToast({ title: "Enter a message (min 10 characters)" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/api/support", {
        type,
        subject: subject.trim(),
        message: message.trim(),
      });
      pushToast({ title: "Message sent!", description: res.message });
      setSubject("");
      setMessage("");
      onDone();
    } catch (e: any) {
      pushToast({
        title: "Couldn't send message",
        description: e instanceof ApiError ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-6 pt-2 space-y-4">
      <p className="text-xs text-ink-soft leading-relaxed">
        Have a question, complaint, or feedback? Send us a message and our
        team will get back to you. You can also email us directly at
        {" "}
        <a
          href="mailto:Rush4servicesupport@gmail.com"
          className="text-rush font-semibold underline"
        >
          Rush4servicesupport@gmail.com
        </a>.
      </p>

      {/* Type selector */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">
          What's this about?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-colors ${
                type === t.id
                  ? "rush-gradient text-white shadow-rush"
                  : "bg-muted text-ink-soft"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">
          Subject
        </label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your message"
          maxLength={100}
          disabled={loading}
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">
          Message
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind…"
          rows={4}
          maxLength={2000}
          disabled={loading}
        />
        <p className="text-[10px] text-ink-soft mt-1 text-right">
          {message.length}/2000
        </p>
      </div>

      <SheetFooter>
        <button
          type="submit"
          disabled={loading || !subject.trim() || !message.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            <><Send className="h-4 w-4" /> Send message</>
          )}
        </button>
      </SheetFooter>
    </form>
  );
}

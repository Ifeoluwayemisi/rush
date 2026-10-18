"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateServiceJob } from "@/lib/hooks";
import { useRush } from "@/lib/store";
import { ApiError } from "@/lib/api-client";

interface ServiceRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  category: string;
  defaultLocation?: string;
}

export function ServiceRequestSheet({
  open,
  onOpenChange,
  providerId,
  providerName,
  category,
  defaultLocation,
}: ServiceRequestSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Request a custom job</SheetTitle>
        </SheetHeader>
        {open && (
          <ServiceRequestForm
            key={providerId}
            providerId={providerId}
            providerName={providerName}
            category={category}
            defaultLocation={defaultLocation}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ServiceRequestForm({
  providerId,
  providerName,
  category,
  defaultLocation,
  onDone,
}: {
  providerId: string;
  providerName: string;
  category: string;
  defaultLocation?: string;
  onDone: () => void;
}) {
  const { pushToast, navigate } = useRush();
  const createJob = useCreateServiceJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState(defaultLocation || "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || !location.trim()) {
      setError("Title, description, and location are required.");
      return;
    }

    try {
      const res = await createJob.mutateAsync({
        providerId,
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budget ? Number(budget) : undefined,
        location: location.trim(),
      });
      pushToast({ title: "Request sent", description: `${providerName} will respond with a quote shortly` });
      onDone();
      navigate("service-job-tracking", { jobId: res.job.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3.5">
      <label className="block">
        <span className="block text-xs font-semibold text-ink-soft mb-1">What do you need done?</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix kitchen sink leak" />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-ink-soft mb-1">Describe the job</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Give as much detail as you can — this helps the provider quote accurately."
          rows={4}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-ink-soft mb-1">Location</span>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where should this happen?" />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-ink-soft mb-1">Your budget (₦, optional)</span>
        <Input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Helps the provider quote fairly" />
      </label>

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      <SheetFooter className="px-0 pt-1">
        <button
          type="submit"
          disabled={createJob.isPending}
          className="w-full py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {createJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send request
        </button>
      </SheetFooter>
    </form>
  );
}

"use client";

import { Bike, Loader2, Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAvailableRiders } from "@/lib/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RiderPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (riderId: string) => void;
  assigning?: boolean;
}

export function RiderPickerSheet({ open, onOpenChange, onSelect, assigning }: RiderPickerSheetProps) {
  const { data, isLoading } = useAvailableRiders(open);
  const riders = data?.riders || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Assign a rider</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="py-10 flex justify-center text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : riders.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 p-6 text-center">
              <Bike className="h-8 w-8 text-ink-soft mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink">No active riders right now</p>
              <p className="text-xs text-ink-soft mt-1">
                Riders need to be verified and active before they can accept deliveries.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {riders.map((r) => (
                <button
                  key={r.id}
                  disabled={assigning}
                  onClick={() => onSelect(r.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left hover:shadow-card transition-shadow disabled:opacity-60"
                >
                  <Avatar className="h-10 w-10">
                    {r.avatar && <AvatarImage src={r.avatar} alt={r.name} />}
                    <AvatarFallback>{r.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink line-clamp-1">{r.name}</p>
                    <p className="text-[11px] text-ink-soft flex items-center gap-1">
                      {r.vehicleType && <span>{r.vehicleType}</span>}
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-warning text-warning" /> {r.rating || "New"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      r.online ? "bg-success/10 text-success" : "bg-muted text-ink-soft"
                    }`}
                  >
                    {r.online ? "Online" : "Offline"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

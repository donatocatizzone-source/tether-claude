import { Home, BedDouble, Bath, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAddress, type Property } from "@/lib/showings";

// Extracted from the markup that used to render TeamMemberView's
// MOCK_PROPERTIES, so the agent list and the Overwatch properties console
// (phase 3a) share one card rather than drifting apart.

const STATUS_STYLES: Record<Property["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  sold: "bg-slate-500/15 text-muted-foreground",
  off_market: "bg-slate-500/15 text-muted-foreground",
  withdrawn: "bg-slate-500/15 text-muted-foreground",
};

const STATUS_LABELS: Record<Property["status"], string> = {
  active: "Active",
  pending: "Pending",
  sold: "Sold",
  off_market: "Off market",
  withdrawn: "Withdrawn",
};

function formatPrice(value: number | null): string | null {
  if (value === null) return null;
  return `$${Math.round(value).toLocaleString()}`;
}

interface Props {
  property: Property;
  /** Optional trailing control, e.g. a "Start now" button. */
  action?: React.ReactNode;
  className?: string;
}

export function PropertyCard({ property, action, className }: Props) {
  const price = formatPrice(property.list_price);

  return (
    <div className={cn("flex gap-3 rounded-xl border border-border bg-card p-3", className)}>
      {property.image_url ? (
        <img
          src={property.image_url}
          alt=""
          className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <Home className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{property.address_line1}</p>
          <span
            className={cn(
              "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              STATUS_STYLES[property.status],
            )}
          >
            {STATUS_LABELS[property.status]}
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">{formatAddress(property)}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {property.beds !== null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" /> {property.beds}
            </span>
          )}
          {property.baths !== null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" /> {property.baths}
            </span>
          )}
          {property.sqft !== null && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" /> {property.sqft.toLocaleString()} sqft
            </span>
          )}
          {price && <span className="font-semibold text-foreground">{price}</span>}
        </div>

        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

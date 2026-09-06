import { useState, useEffect, useCallback, useMemo } from "react";
import { Home, Plus, Loader2, MapPinOff, Building2, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/overwatch/KpiCard";
import { PropertyFormModal } from "@/components/overwatch/PropertyFormModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatAddress, type Property } from "@/lib/showings";
import { cn } from "@/lib/utils";

// The brokerage's listings. Uses the same Table primitives as AuditLog and
// OverwatchLive so the console stays visually consistent.

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

const FILTERS = ["all", "active", "pending", "sold", "off_market", "withdrawn"] as const;
type Filter = (typeof FILTERS)[number];

interface Props {
  onSelect: (propertyId: string) => void;
}

export function PropertiesView({ onSelect }: Props) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const fetchProperties = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [propsRes, assignRes] = await Promise.all([
      supabase.from("properties").select("*").order("created_at", { ascending: false }),
      supabase.from("property_assignments").select("property_id"),
    ]);

    if (propsRes.error) {
      setError(propsRes.error.message);
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of assignRes.data ?? []) {
      const id = (row as { property_id: string }).property_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }

    setError(null);
    setProperties(propsRes.data ?? []);
    setAssignmentCounts(counts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!term) return true;
      return (
        p.address_line1.toLowerCase().includes(term) ||
        p.city.toLowerCase().includes(term) ||
        p.mls_number.toLowerCase().includes(term)
      );
    });
  }, [properties, filter, search]);

  const activeCount = properties.filter((p) => p.status === "active").length;
  const unpinnedCount = properties.filter((p) => p.lat === null || p.lng === null).length;
  const unassignedCount = properties.filter((p) => !assignmentCounts[p.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground">Listings, agent coverage, and geofence readiness</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Listing
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Total Listings" value={properties.length} color="text-sky-400" />
        <KpiCard icon={CheckCircle2} label="Active" value={activeCount} color="text-emerald-400" />
        {/* Both of these are actionable gaps, not vanity metrics: an unpinned
            property can't geofence, an unassigned one has nobody covering it. */}
        <KpiCard icon={MapPinOff} label="Missing Map Pin" value={unpinnedCount} color="text-amber-400" />
        <KpiCard icon={Users} label="Unassigned" value={unassignedCount} color="text-amber-400" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address, city, or MLS #"
          className="max-w-xs border-border bg-secondary text-foreground"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-40 border-border bg-secondary text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-background">
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f === "all" ? "All statuses" : STATUS_LABELS[f as Property["status"]]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading listings…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-medium text-foreground">Couldn't load listings</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Home className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No listings yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add one to start scheduling showings and assigning agents.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            <Plus size={16} className="mr-2" /> Add Listing
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No listings match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead>Geofence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => {
                const assigned = assignmentCounts[p.id] ?? 0;
                const pinned = p.lat !== null && p.lng !== null;
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className="cursor-pointer border-border"
                  >
                    <TableCell>
                      <p className="font-medium text-foreground">{p.address_line1}</p>
                      <p className="text-xs text-muted-foreground">{formatAddress(p)}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          STATUS_STYLES[p.status],
                        )}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">
                      {p.list_price !== null ? `$${Math.round(p.list_price).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("text-sm", assigned === 0 && "text-amber-500")}>{assigned}</span>
                    </TableCell>
                    <TableCell>
                      {pinned ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{p.geofence_radius_m}m</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                          <MapPinOff size={12} /> No pin
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PropertyFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchProperties} />
    </div>
  );
}

export default PropertiesView;

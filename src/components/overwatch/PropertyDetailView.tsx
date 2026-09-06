import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Pencil, Loader2, UserPlus, Trash2, MapPinOff, ShieldCheck, Lock, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GoogleMapView } from "@/components/maps/GoogleMapView";
import { PropertyFormModal } from "@/components/overwatch/PropertyFormModal";
import { SellerLinkPanel } from "@/components/overwatch/SellerLinkPanel";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatAddress, formatWindow, effectiveShowingStatus, showingDurationMin,
  STATUS_LABELS, ACTIVITY_LABELS, type Property, type Showing,
} from "@/lib/showings";
import { cn } from "@/lib/utils";

// Drill-in for one listing: map, agent assignment, showing history.
// The seller-facing share link lives here too, but is phase 4.

interface AssignmentRow {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
}

interface OrgMember {
  user_id: string;
  full_name: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  listing_agent: "Listing agent",
  co_listing_agent: "Co-listing agent",
  showing_agent: "Showing agent",
};

interface Props {
  propertyId: string;
  onBack: () => void;
}

export function PropertyDetailView({ propertyId, onBack }: Props) {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addingUserId, setAddingUserId] = useState("");
  const [addingRole, setAddingRole] = useState("showing_agent");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [propRes, assignRes, showRes, memberRes] = await Promise.all([
      supabase.from("properties").select("*").eq("id", propertyId).maybeSingle(),
      supabase.from("property_assignments").select("id, user_id, role").eq("property_id", propertyId),
      supabase.from("showings").select("*").eq("property_id", propertyId).order("scheduled_start", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    setProperty(propRes.data ?? null);
    setShowings((showRes.data ?? []) as Showing[]);
    setMembers((memberRes.data ?? []) as OrgMember[]);

    // Join names client-side: property_assignments has no FK to profiles
    // (it references auth.users), so PostgREST can't embed it directly.
    const nameById = new Map((memberRes.data ?? []).map((m) => [m.user_id, m.full_name]));
    setAssignments(
      (assignRes.data ?? []).map((a) => ({
        ...(a as { id: string; user_id: string; role: string }),
        full_name: nameById.get((a as { user_id: string }).user_id) ?? null,
      })),
    );

    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign() {
    if (!addingUserId || !user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("property_assignments").insert({
        property_id: propertyId,
        user_id: addingUserId,
        role: addingRole,
        assigned_by: user.id,
      });
      if (error) throw error;
      setAddingUserId("");
      await load();
      toast.success("Agent assigned");
    } catch (err) {
      // The (property_id, user_id) unique constraint surfaces as 23505.
      const message =
        err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505"
          ? "That agent is already assigned to this listing"
          : err instanceof Error
            ? err.message
            : "Failed to assign";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("property_assignments").delete().eq("id", id);
      if (error) throw error;
      await load();
      toast.success("Agent removed from listing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listing…
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">That listing no longer exists.</p>
      </div>
    );
  }

  const pinned = property.lat !== null && property.lng !== null;
  const assignedIds = new Set(assignments.map((a) => a.user_id));
  const assignable = members.filter((m) => !assignedIds.has(m.user_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{property.address_line1}</h1>
            <p className="text-sm text-muted-foreground">{formatAddress(property)}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil size={16} className="mr-2" /> Edit
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-border bg-secondary">
          <CardContent className="p-0">
            {pinned ? (
              <GoogleMapView
                center={{ lat: property.lat as number, lng: property.lng as number }}
                zoom={15}
                marker={{ lat: property.lat as number, lng: property.lng as number }}
                className="h-64 w-full"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 bg-muted text-center">
                <MapPinOff className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No map pin set</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Showings here can't arm a geofence or be GPS-verified on the seller's record.
                </p>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="mt-1">
                  Add a pin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border bg-secondary">
            <CardContent className="space-y-2 p-4 text-sm">
              <Row label="Status" value={property.status.replace("_", " ")} />
              <Row
                label="Price"
                value={property.list_price !== null ? `$${Math.round(property.list_price).toLocaleString()}` : "—"}
              />
              <Row
                label="Details"
                value={
                  [
                    property.beds !== null ? `${property.beds} bd` : null,
                    property.baths !== null ? `${property.baths} ba` : null,
                    property.sqft !== null ? `${property.sqft.toLocaleString()} sqft` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <Row label="MLS #" value={property.mls_number || "—"} />
              <Row label="Seller" value={property.seller_name || "—"} />
              <Row label="Geofence" value={pinned ? `${property.geofence_radius_m} m` : "Not set"} />
            </CardContent>
          </Card>

          {property.access_notes && (
            <Card className="border-border bg-secondary">
              <CardContent className="p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Lock size={12} /> Access Notes
                </p>
                <p className="text-sm text-foreground">{property.access_notes}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Internal only — never included in the seller's shared record.
                </p>
              </CardContent>
            </Card>
          )}

          <SellerLinkPanel property={property} onChanged={load} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Assigned Agents</h2>

        <div className="mb-3 flex flex-wrap gap-2">
          <Select value={addingUserId} onValueChange={setAddingUserId}>
            <SelectTrigger className="w-56 border-border bg-secondary text-foreground">
              <SelectValue placeholder={assignable.length ? "Select an agent" : "Everyone is assigned"} />
            </SelectTrigger>
            <SelectContent className="border-border bg-background">
              {assignable.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name || "Unnamed member"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={addingRole} onValueChange={setAddingRole}>
            <SelectTrigger className="w-44 border-border bg-secondary text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAssign} disabled={!addingUserId || busy}>
            <UserPlus size={16} className="mr-2" /> Assign
          </Button>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-foreground">Nobody is covering this listing</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Assigned agents see it on their phone and can start a showing from it.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{a.full_name || "Unnamed member"}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[a.role] ?? a.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleUnassign(a.id)} disabled={busy}>
                  <Trash2 size={16} className="text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Showing History</h2>
        {showings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No showings recorded at this listing yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showings.map((s) => {
                  const status = effectiveShowingStatus(s);
                  const duration = showingDurationMin(s);
                  return (
                    <TableRow key={s.id} className="border-border">
                      <TableCell className="text-sm text-foreground">
                        <p>{new Date(s.scheduled_start).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatWindow(s.scheduled_start, s.scheduled_end)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{s.agent_display_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ACTIVITY_LABELS[s.activity_type]}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs",
                            status === "no_show" ? "text-red-500" : "text-muted-foreground",
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-foreground">
                        {duration !== null ? (
                          <span className="flex items-center justify-end gap-1">
                            <Clock size={12} className="text-muted-foreground" /> {duration}m
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {s.verified_at ? (
                          <ShieldCheck size={16} className="text-emerald-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <PropertyFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={load}
        property={property}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm capitalize text-foreground">{value}</span>
    </div>
  );
}

export default PropertyDetailView;

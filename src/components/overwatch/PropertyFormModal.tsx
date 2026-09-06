import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Home, Loader2, MapPin, Lock } from "lucide-react";
import type { Property } from "@/lib/showings";

// Create/edit a listing. Follows InviteTeamModal's shape (same Dialog/Input/
// Select primitives, same try/catch + toast.error(err instanceof Error ...)).

const STATUS_OPTIONS: { value: Property["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "off_market", label: "Off market" },
  { value: "withdrawn", label: "Withdrawn" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Present when editing; omit to create. */
  property?: Property | null;
}

type FormState = {
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  lat: string;
  lng: string;
  geofence_radius_m: string;
  beds: string;
  baths: string;
  sqft: string;
  list_price: string;
  mls_number: string;
  image_url: string;
  status: Property["status"];
  seller_name: string;
  seller_email: string;
  access_notes: string;
};

const EMPTY: FormState = {
  address_line1: "",
  city: "",
  state: "",
  postal_code: "",
  lat: "",
  lng: "",
  geofence_radius_m: "150",
  beds: "",
  baths: "",
  sqft: "",
  list_price: "",
  mls_number: "",
  image_url: "",
  status: "active",
  seller_name: "",
  seller_email: "",
  access_notes: "",
};

/** "" -> null, so a blank optional number doesn't become 0. */
function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function PropertyFormModal({ open, onClose, onSaved, property }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const isEdit = !!property;

  useEffect(() => {
    if (!open) return;
    setForm(
      property
        ? {
            address_line1: property.address_line1,
            city: property.city,
            state: property.state,
            postal_code: property.postal_code,
            lat: property.lat?.toString() ?? "",
            lng: property.lng?.toString() ?? "",
            geofence_radius_m: property.geofence_radius_m.toString(),
            beds: property.beds?.toString() ?? "",
            baths: property.baths?.toString() ?? "",
            sqft: property.sqft?.toString() ?? "",
            list_price: property.list_price?.toString() ?? "",
            mls_number: property.mls_number,
            image_url: property.image_url,
            status: property.status,
            seller_name: property.seller_name,
            seller_email: property.seller_email,
            access_notes: property.access_notes,
          }
        : EMPTY,
    );
  }, [open, property]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation isn't available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude.toFixed(6));
        set("lng", pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("Pinned to your current location");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't read your location");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function handleSave() {
    if (!user || !form.address_line1.trim()) return;
    setSaving(true);

    try {
      const payload = {
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postal_code: form.postal_code.trim(),
        lat: num(form.lat),
        lng: num(form.lng),
        geofence_radius_m: num(form.geofence_radius_m) ?? 150,
        beds: num(form.beds),
        baths: num(form.baths),
        sqft: num(form.sqft),
        list_price: num(form.list_price),
        mls_number: form.mls_number.trim(),
        image_url: form.image_url.trim(),
        status: form.status,
        seller_name: form.seller_name.trim(),
        seller_email: form.seller_email.trim(),
        access_notes: form.access_notes.trim(),
      };

      if (isEdit && property) {
        const { error } = await supabase.from("properties").update(payload).eq("id", property.id);
        if (error) throw error;
        toast.success("Listing updated");
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile?.organization_id) {
          toast.error("You must belong to an organization to add a listing");
          return;
        }

        const { error } = await supabase.from("properties").insert({
          ...payload,
          organization_id: profile.organization_id,
          created_by: user.id,
        });
        if (error) throw error;
        toast.success("Listing added");
      }

      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the listing");
    } finally {
      setSaving(false);
    }
  }

  const hasPin = num(form.lat) !== null && num(form.lng) !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Home size={18} /> {isEdit ? "Edit Listing" : "Add Listing"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Street Address</Label>
            <Input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
              placeholder="123 Maple Street"
              className="border-border bg-secondary text-foreground"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">ZIP</Label>
              <Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
          </div>

          {/* The geofence is driven off these coordinates, so the consequence
              of leaving them blank is spelled out rather than left implicit. */}
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={13} /> Map Pin
              </Label>
              <Button size="sm" variant="outline" onClick={useCurrentLocation} disabled={locating}>
                {locating ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <MapPin size={13} className="mr-1.5" />}
                Use current location
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={form.lat}
                onChange={(e) => set("lat", e.target.value)}
                placeholder="Latitude"
                inputMode="decimal"
                className="border-border bg-background text-foreground"
              />
              <Input
                value={form.lng}
                onChange={(e) => set("lng", e.target.value)}
                placeholder="Longitude"
                inputMode="decimal"
                className="border-border bg-background text-foreground"
              />
              <Input
                value={form.geofence_radius_m}
                onChange={(e) => set("geofence_radius_m", e.target.value)}
                placeholder="Radius (m)"
                inputMode="numeric"
                className="border-border bg-background text-foreground"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {hasPin
                ? "Showings here arm a geofence on arrival, and count as GPS-verified on the seller's record."
                : "Without a pin, showings here can't be geofenced or GPS-verified."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Beds</Label>
              <Input value={form.beds} onChange={(e) => set("beds", e.target.value)} inputMode="decimal" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Baths</Label>
              <Input value={form.baths} onChange={(e) => set("baths", e.target.value)} inputMode="decimal" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Sq Ft</Label>
              <Input value={form.sqft} onChange={(e) => set("sqft", e.target.value)} inputMode="numeric" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">List Price</Label>
              <Input value={form.list_price} onChange={(e) => set("list_price", e.target.value)} inputMode="numeric" className="border-border bg-secondary text-foreground" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">MLS #</Label>
              <Input value={form.mls_number} onChange={(e) => set("mls_number", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Property["status"])}>
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-background">
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Photo URL</Label>
              <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Seller Name</Label>
              <Input value={form.seller_name} onChange={(e) => set("seller_name", e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Seller Email</Label>
              <Input
                type="email"
                value={form.seller_email}
                onChange={(e) => set("seller_email", e.target.value)}
                className="border-border bg-secondary text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Lock size={13} /> Access Notes
            </Label>
            <Textarea
              value={form.access_notes}
              onChange={(e) => set("access_notes", e.target.value)}
              placeholder="Lockbox code, alarm code, gate instructions…"
              className="border-border bg-secondary text-foreground"
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">
              Internal only — never shown on the seller's shared record.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.address_line1.trim()}>
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Home size={16} className="mr-2" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PropertyFormModal;

import { useState } from "react";
import { Link2, Copy, Check, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Property } from "@/lib/showings";

// Manager-side control for the seller-facing showing record.
//
// Sharing is OFF by default and has to be turned on deliberately per
// property, because the link exposes the address and the visit history to
// anyone holding the URL.

interface Props {
  property: Property;
  onChanged: () => void;
}

export function SellerLinkPanel({ property, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmUpcoming, setConfirmUpcoming] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const link = `${window.location.origin}/property/share/${property.share_token}`;

  async function update(patch: Partial<Property>, message: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("properties").update(patch).eq("id", property.id);
      if (error) throw error;
      onChanged();
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update sharing");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Seller link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-border bg-secondary">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Link2 size={14} /> Seller Link
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A page the seller can open showing every visit to their home.
            </p>
          </div>
          <Switch
            checked={property.share_enabled}
            disabled={busy}
            onCheckedChange={(on) =>
              update({ share_enabled: on }, on ? "Seller link is live" : "Seller link disabled")
            }
          />
        </div>

        {property.share_enabled ? (
          <>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="border-border bg-background text-xs text-foreground" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {property.share_include_upcoming ? <Eye size={12} /> : <EyeOff size={12} />}
                  Show upcoming showings
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {property.share_include_upcoming
                    ? "Anyone with the link can see when the home will next be shown."
                    : "Only visits that have already happened are shown."}
                </p>
              </div>
              <Switch
                checked={property.share_include_upcoming}
                disabled={busy}
                onCheckedChange={(on) => {
                  // Turning this ON publishes the occupancy schedule of a
                  // possibly-vacant house, so it gets an explicit confirmation.
                  // Turning it off is always safe.
                  if (on) setConfirmUpcoming(true);
                  else update({ share_include_upcoming: false }, "Upcoming showings hidden");
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground">
                Turning the link off is reversible. Regenerating permanently breaks every copy already shared.
              </p>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRegenerate(true)}>
                {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RefreshCw size={14} className="mr-1.5" />}
                Regenerate
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sharing is off. The link won't open for anyone until you turn it on.
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirmUpcoming} onOpenChange={setConfirmUpcoming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Publish the upcoming schedule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anyone holding this link will be able to see when the home is due to be shown next — including when
              it's likely to be empty. Only turn this on if the seller has asked for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => update({ share_include_upcoming: true }, "Upcoming showings are now visible")}
            >
              Show upcoming
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate this link?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link stops working immediately and can't be restored. Anyone you've already sent it to
              will need the new one. To pause access temporarily, switch the link off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                update({ share_token: crypto.randomUUID() }, "New seller link generated")
              }
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default SellerLinkPanel;

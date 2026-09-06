import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Calendar, Loader2, Home, Phone, Globe, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

// The one consumer-facing surface of the B2B side: the seller's record of
// every showing at their home. Public, no auth — opened from a text message,
// so it's mobile-first and low-chrome.
//
// Reached ONLY through get_property_showing_record(), a security-definer RPC
// that hand-picks columns. properties/showings grant anon nothing, so this
// page cannot read anything the RPC didn't choose to return. In particular it
// never sees agent GPS, lockbox codes, internal notes, buyer names, or the
// list price — see the function body in the migration.
//
// Deliberately does NOT mount TopBar/AppShell/MenuDrawer: there's no signed-in
// user here and no app chrome to show.

interface RecordShowing {
  id: string;
  scheduled_start: string;
  actual_start: string | null;
  actual_end: string | null;
  duration_min: number | null;
  status: string;
  verified_at: string | null;
  agent_name: string;
  agent_brokerage: string | null;
  feedback: string | null;
}

interface ShowingRecord {
  property: {
    address: string;
    city: string;
    state: string;
    postal_code: string;
    image_url: string;
  };
  brokerage: { name: string; logo_url: string; phone: string; website: string } | null;
  showings: RecordShowing[];
}

/** Keeps the token out of Referer headers and out of search indexes. */
function usePrivatePageMeta() {
  useEffect(() => {
    const tags: HTMLMetaElement[] = [];
    const add = (name: string, content: string) => {
      const el = document.createElement("meta");
      el.name = name;
      el.content = content;
      document.head.appendChild(el);
      tags.push(el);
    };
    add("robots", "noindex,nofollow");
    add("referrer", "no-referrer");
    return () => tags.forEach((t) => t.remove());
  }, []);
}

export default function PropertyShowingRecordPage() {
  const { token } = useParams<{ token: string }>();
  const [record, setRecord] = useState<ShowingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  usePrivatePageMeta();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("get_property_showing_record", { _token: token });
      setRecord((data as unknown as ShowingRecord) ?? null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // A bad token, a disabled link and an expired link all land here. The RPC
  // returns null identically for all three, so this page can't be used to
  // work out which properties exist.
  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Home className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground">This link isn't active</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            It may have been turned off or replaced. Ask your agent for an up-to-date link.
          </p>
        </div>
      </div>
    );
  }

  const { property, brokerage, showings } = record;
  const completed = showings.filter((s) => s.duration_min !== null);
  const verifiedCount = showings.filter((s) => s.verified_at).length;
  const avgDuration =
    completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.duration_min ?? 0), 0) / completed.length)
      : null;
  const earliest = showings.length > 0 ? showings[showings.length - 1].scheduled_start : null;

  return (
    <div className="min-h-screen bg-background pb-16">
      {brokerage && (
        <header className="border-b border-border bg-card">
          <PageContainer className="flex items-center gap-3 py-4">
            {brokerage.logo_url ? (
              <img src={brokerage.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground text-xs font-bold text-background">
                {brokerage.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{brokerage.name}</p>
              <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                {brokerage.phone && (
                  <a href={`tel:${brokerage.phone}`} className="flex items-center gap-1 hover:underline">
                    <Phone className="h-3 w-3" /> {brokerage.phone}
                  </a>
                )}
                {brokerage.website && (
                  <a
                    href={brokerage.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </div>
          </PageContainer>
        </header>
      )}

      <PageContainer className="pt-6">
        {property.image_url && (
          <img
            src={property.image_url}
            alt=""
            className="mb-5 h-48 w-full rounded-2xl object-cover sm:h-64"
            loading="lazy"
          />
        )}

        <h1 className="text-2xl font-bold tracking-tight text-foreground">{property.address}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[property.city, property.state, property.postal_code].filter(Boolean).join(", ")}
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            <strong>
              {showings.length} showing{showings.length === 1 ? "" : "s"}
            </strong>
            {earliest && <> since {new Date(earliest).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</>}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {avgDuration !== null && <span>Average visit {avgDuration} min</span>}
            {verifiedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> {verifiedCount} GPS-verified on site
              </span>
            )}
          </div>
        </div>

        {showings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Calendar className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No showings recorded yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This page updates automatically as showings happen.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-3">
            {showings.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(s.actual_start ?? s.scheduled_start).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.actual_start ?? s.scheduled_start).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {s.duration_min !== null && (
                        <>
                          {" · "}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.duration_min} min
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <VerifiedBadge verified={!!s.verified_at} />
                </div>

                <p className="mt-2 text-sm text-foreground">{s.agent_name}</p>
                {s.agent_brokerage && <p className="text-xs text-muted-foreground">{s.agent_brokerage}</p>}

                {s.feedback && (
                  <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                    "{s.feedback}"
                  </p>
                )}
              </motion.li>
            ))}
          </ol>
        )}

        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            "GPS-verified" means the agent's device was confirmed inside the property boundary during the visit.
            Visits without it still happened — they just weren't location-confirmed, usually because the agent's
            phone had location turned off.
          </span>
        </p>
      </PageContainer>
    </div>
  );
}

/**
 * Shown for both states on purpose. A record that quietly omitted its own
 * gaps would be misleading — the seller should be able to see which visits
 * were location-confirmed and which weren't.
 */
function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        verified
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {verified ? (
        <>
          <ShieldCheck className="h-3 w-3" /> Verified on site
        </>
      ) : (
        "Not GPS-verified"
      )}
    </span>
  );
}

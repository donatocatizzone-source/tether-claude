import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Download, Loader2,
  AlertTriangle, ShieldCheck, MapPinOff, CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/overwatch/KpiCard";
import { ScheduleShowingModal } from "@/components/overwatch/ScheduleShowingModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/csv";
import {
  effectiveShowingStatus, findConflicts, formatWindow, formatAddress, showingDurationMin,
  STATUS_LABELS, ACTIVITY_LABELS, type Property, type Showing,
} from "@/lib/showings";
import { cn } from "@/lib/utils";

// The brokerage's day: who is where, what overlaps, and what's uncovered.
// Grouped by agent rather than by time, because the question a broker asks is
// "is anyone free at 4?" not "what happens at 4?".

type ShowingWithProp = Showing & { property: Property | null };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function ScheduleView() {
  const { user } = useAuth();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [range, setRange] = useState<"day" | "week">("day");
  const [showings, setShowings] = useState<ShowingWithProp[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const spanDays = range === "day" ? 1 : 7;
  const rangeStart = day;
  const rangeEnd = addDays(day, spanDays);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [showRes, propRes] = await Promise.all([
      supabase
        .from("showings")
        .select("*, property:properties(*)")
        .gte("scheduled_start", rangeStart.toISOString())
        .lt("scheduled_start", rangeEnd.toISOString())
        .order("scheduled_start", { ascending: true }),
      supabase.from("properties").select("*").eq("status", "active"),
    ]);

    if (showRes.error) {
      setError(showRes.error.message);
      setLoading(false);
      return;
    }

    setError(null);
    setShowings((showRes.data ?? []) as ShowingWithProp[]);
    setProperties((propRes.data ?? []) as Property[]);
    setLoading(false);
    // rangeStart/rangeEnd are derived from day+range; depending on their ISO
    // strings keeps this stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rangeStart.toISOString(), rangeEnd.toISOString()]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const conflicts = useMemo(() => findConflicts(showings), [showings]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.a.id);
      ids.add(c.b.id);
    }
    return ids;
  }, [conflicts]);

  const byAgent = useMemo(() => {
    const groups = new Map<string, { name: string; rows: ShowingWithProp[] }>();
    for (const s of showings) {
      const key = s.agent_id ?? "unassigned";
      const name = s.agent_id ? s.agent_display_name : "Unassigned";
      if (!groups.has(key)) groups.set(key, { name, rows: [] });
      groups.get(key)!.rows.push(s);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [showings]);

  // Active listings with nothing booked in this window — the thing a broker
  // can actually act on, as opposed to a count of what's already covered.
  const uncovered = useMemo(() => {
    const booked = new Set(showings.map((s) => s.property_id));
    return properties.filter((p) => !booked.has(p.id));
  }, [properties, showings]);

  const noShows = showings.filter((s) => effectiveShowingStatus(s) === "no_show").length;

  function exportCsv() {
    downloadCsv(
      `showings-${rangeStart.toISOString().slice(0, 10)}`,
      ["Date", "Window", "Agent", "Property", "Type", "Status", "Duration (min)", "GPS verified", "Buyer brokerage"],
      showings.map((s) => [
        new Date(s.scheduled_start).toLocaleDateString(),
        formatWindow(s.scheduled_start, s.scheduled_end),
        s.agent_display_name,
        formatAddress(s.property),
        ACTIVITY_LABELS[s.activity_type],
        STATUS_LABELS[effectiveShowingStatus(s)],
        showingDurationMin(s) ?? "",
        s.verified_at ? "yes" : "no",
        s.buyer_agent_brokerage,
      ]),
    );
  }

  const rangeLabel =
    range === "day"
      ? day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
      : `${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(day, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <p className="text-sm text-muted-foreground">Agent coverage, conflicts, and gaps</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={showings.length === 0}>
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Schedule Showing
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, -spanDays))}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, spanDays))}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" onClick={() => setDay(startOfDay(new Date()))}>
            Today
          </Button>
        </div>

        <p className="text-sm font-semibold text-foreground">{rangeLabel}</p>

        <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
          {(["day", "week"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                range === r ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CalendarDays} label="Showings" value={showings.length} color="text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Conflicts" value={conflicts.length} color={conflicts.length ? "text-red-400" : "text-muted-foreground"} />
        <KpiCard icon={CalendarX} label="No-shows" value={noShows} color={noShows ? "text-amber-400" : "text-muted-foreground"} />
        <KpiCard icon={MapPinOff} label="Uncovered Listings" value={uncovered.length} color={uncovered.length ? "text-amber-400" : "text-muted-foreground"} />
      </div>

      {conflicts.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <AlertTriangle size={16} className="text-red-500" /> {conflicts.length} scheduling conflict
              {conflicts.length === 1 ? "" : "s"}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {conflicts.map((c, i) => (
                <li key={i}>
                  <strong className="text-foreground">
                    {c.kind === "agent" ? c.a.agent_display_name : formatAddress(c.a.property)}
                  </strong>{" "}
                  — {c.kind === "agent" ? "double-booked" : "two agents at once"}:{" "}
                  {formatWindow(c.a.scheduled_start, c.a.scheduled_end)} and{" "}
                  {formatWindow(c.b.scheduled_start, c.b.scheduled_end)}
                  {c.kind === "property" && " (fine for an open house — flagged so you can check)"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-medium text-foreground">Couldn't load the schedule</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : showings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nothing scheduled in this window</p>
          <Button onClick={() => setModalOpen(true)} className="mt-4">
            <Plus size={16} className="mr-2" /> Schedule Showing
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {byAgent.map((group) => (
            <div key={group.name}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.name} · {group.rows.length}
              </h3>
              <ul className="space-y-2">
                {group.rows.map((s) => {
                  const status = effectiveShowingStatus(s);
                  const conflicted = conflictIds.has(s.id);
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3",
                        conflicted ? "border-red-500/40" : "border-border",
                      )}
                    >
                      <span className="w-36 flex-shrink-0 text-sm font-semibold text-foreground">
                        {formatWindow(s.scheduled_start, s.scheduled_end)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {formatAddress(s.property)}
                      </span>
                      <span className="text-xs text-muted-foreground">{ACTIVITY_LABELS[s.activity_type]}</span>
                      <span
                        className={cn(
                          "text-xs",
                          status === "no_show" ? "text-red-500" : "text-muted-foreground",
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                      {s.verified_at && <ShieldCheck size={14} className="text-emerald-500" />}
                      {conflicted && <AlertTriangle size={14} className="text-red-500" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!loading && uncovered.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active listings with nothing booked
          </h3>
          <div className="flex flex-wrap gap-2">
            {uncovered.map((p) => (
              <span key={p.id} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {p.address_line1}
              </span>
            ))}
          </div>
        </section>
      )}

      <ScheduleShowingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onScheduled={load}
        defaultDate={day}
      />
    </div>
  );
}

export default ScheduleView;

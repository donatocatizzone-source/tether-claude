import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CalendarDays, Clock, ShieldCheck, CalendarX, Loader2, Download, MapPinOff, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/overwatch/KpiCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/csv";
import { formatAddress, type Property, type Showing } from "@/lib/showings";
import {
  perAgentStats, showingsPerDay, coverageGaps, summarise, formatRate,
} from "@/lib/brokerageMetrics";

// Real-estate operations metrics, as opposed to OverwatchAnalytics' safety
// ones. All maths lives in lib/brokerageMetrics (tested) — this file only
// fetches and renders.

const WINDOW_DAYS = 30;

export function BrokerageAnalytics() {
  const { user } = useAuth();
  const [showings, setShowings] = useState<Showing[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Resolve loading rather than returning early: bailing without clearing
      // it leaves the spinner up forever instead of showing an empty state.
      if (!user) {
        setLoading(false);
        return;
      }
      const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
      const [showRes, propRes] = await Promise.all([
        supabase.from("showings").select("*").gte("scheduled_start", since),
        supabase.from("properties").select("*"),
      ]);
      setShowings((showRes.data ?? []) as Showing[]);
      setProperties((propRes.data ?? []) as Property[]);
      setLoading(false);
    })();
  }, [user]);

  const summary = useMemo(() => summarise(showings), [showings]);
  const agents = useMemo(() => perAgentStats(showings), [showings]);
  const trend = useMemo(() => showingsPerDay(showings, WINDOW_DAYS), [showings]);
  const gaps = useMemo(() => coverageGaps(properties, showings), [properties, showings]);

  const neverShown = gaps.filter((g) => g.daysSinceLastShowing === null).length;

  function exportAgents() {
    downloadCsv(
      "agent-performance",
      ["Agent", "Showings", "Completed", "Avg duration (min)", "On-time", "No-show", "GPS-verified", "Booked hours"],
      agents.map((a) => [
        a.name,
        a.showings,
        a.completed,
        a.avgDurationMin ?? "",
        formatRate(a.onTimeRate),
        formatRate(a.noShowRate),
        formatRate(a.verifiedRate),
        (a.bookedMinutes / 60).toFixed(1),
      ]),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading brokerage metrics…
      </div>
    );
  }

  if (showings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No showings in the last {WINDOW_DAYS} days</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Metrics appear here once showings are scheduled and completed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CalendarDays} label={`Showings (${WINDOW_DAYS}d)`} value={summary.totalShowings} color="text-sky-400" />
        <KpiCard icon={Clock} label="Avg Duration" value={summary.avgDurationMin !== null ? `${summary.avgDurationMin}m` : "—"} color="text-sky-400" />
        <KpiCard icon={ShieldCheck} label="GPS-verified" value={formatRate(summary.verifiedRate)} color="text-emerald-400" />
        <KpiCard icon={CalendarX} label="No-show Rate" value={formatRate(summary.noShowRate)} color={summary.noShowRate && summary.noShowRate > 0.1 ? "text-red-400" : "text-muted-foreground"} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Clock} label="On-time Rate" value={formatRate(summary.onTimeRate)} color="text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Double-bookings" value={summary.conflicts} color={summary.conflicts ? "text-red-400" : "text-muted-foreground"} />
        <KpiCard icon={MapPinOff} label="Never Shown" value={neverShown} color={neverShown ? "text-amber-400" : "text-muted-foreground"} />
        <KpiCard icon={CalendarDays} label="Active Agents" value={agents.length} color="text-sky-400" />
      </div>

      <Card className="border-border bg-secondary">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-bold text-foreground">Showings — last {WINDOW_DAYS} days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="showings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border bg-secondary">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-bold text-foreground">Showings per agent</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, agents.length * 42)}>
            <BarChart data={agents} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="showings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Agent performance</h3>
          <Button size="sm" variant="outline" onClick={exportAgents}>
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Showings</TableHead>
                <TableHead className="text-right">Avg</TableHead>
                <TableHead className="text-right">On-time</TableHead>
                <TableHead className="text-right">No-show</TableHead>
                <TableHead className="text-right">Verified</TableHead>
                <TableHead className="text-right">Booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.agentId} className="border-border">
                  <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                  <TableCell className="text-right text-foreground">{a.showings}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {a.avgDurationMin !== null ? `${a.avgDurationMin}m` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRate(a.onTimeRate)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRate(a.noShowRate)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRate(a.verifiedRate)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(a.bookedMinutes / 60).toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          A dash means there was nothing to measure — not a score of zero.
        </p>
      </section>

      {gaps.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold text-foreground">Coverage gaps</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Active listing</TableHead>
                  <TableHead className="text-right">Last shown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.slice(0, 10).map((g) => (
                  <TableRow key={g.property.id} className="border-border">
                    <TableCell>
                      <p className="font-medium text-foreground">{g.property.address_line1}</p>
                      <p className="text-xs text-muted-foreground">{formatAddress(g.property)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {g.daysSinceLastShowing === null ? (
                        <span className="text-amber-500">Never shown</span>
                      ) : g.daysSinceLastShowing === 0 ? (
                        <span className="text-muted-foreground">Today</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {g.daysSinceLastShowing}d ago
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}

export default BrokerageAnalytics;

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, TrendingUp, Clock, Users, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/overwatch/KpiCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Port of OLD/src/components/tether/overwatch/OverwatchAnalytics.tsx (see
// CLAUDE.md > Ground truth).
interface IncidentRow {
  id: string;
  severity: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

interface SessionRow {
  id: string;
  status: string;
  start_time: string;
  expected_end_time: string;
  user_id: string;
}

const COLORS = ["hsl(142,71%,45%)", "hsl(48,96%,53%)", "hsl(25,95%,53%)", "hsl(0,84%,60%)"];
const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

export function OverwatchAnalytics() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Was `if (!user) return;`, which left the spinner up indefinitely
      // instead of resolving to an empty state.
      if (!user) {
        setLoading(false);
        return;
      }
      const [incRes, sessRes, profileRes] = await Promise.all([
        supabase.from("incidents").select("id, severity, status, created_at, acknowledged_at, resolved_at"),
        supabase.from("professional_sessions").select("id, status, start_time, expected_end_time, user_id"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      setIncidents((incRes.data as IncidentRow[]) || []);
      setSessions((sessRes.data as SessionRow[]) || []);
      setNames(
        Object.fromEntries(
          (profileRes.data ?? [])
            .filter((p) => p.full_name)
            .map((p) => [p.user_id, p.full_name as string]),
        ),
      );
      setLoading(false);
    })();
  }, [user]);

  const trendData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    incidents.forEach((inc) => {
      const day = inc.created_at.slice(0, 10);
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), incidents: count }));
  }, [incidents]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    incidents.forEach((inc) => {
      counts[inc.severity] = (counts[inc.severity] || 0) + 1;
    });
    return SEVERITY_ORDER.map((s) => ({ name: s, value: counts[s] }));
  }, [incidents]);

  const avgResponseMin = useMemo(() => {
    const responded = incidents.filter((i) => i.acknowledged_at);
    if (responded.length === 0) return null;
    const total = responded.reduce((sum, i) => sum + (new Date(i.acknowledged_at!).getTime() - new Date(i.created_at).getTime()), 0);
    return Math.round(total / responded.length / 60000);
  }, [incidents]);

  const avgResolutionMin = useMemo(() => {
    const resolved = incidents.filter((i) => i.resolved_at);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((sum, i) => sum + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()), 0);
    return Math.round(total / resolved.length / 60000);
  }, [incidents]);

  // Previously labelled these "Member 1..5" — the user_id was discarded and
  // replaced with an index — purely because no profiles join was done. A chart
  // a manager can't map to a person is not worth showing, so it joins now.
  const teamActivity = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      counts[s.user_id] = (counts[s.user_id] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ name: names[userId] ?? "Unknown member", sessions: count }));
  }, [sessions, names]);

  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const totalSessions = sessions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <BarChart3 size={24} /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Incident trends, response times, and team activity</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={AlertTriangle} label="Total Incidents" value={totalIncidents} color="text-amber-400" />
        <KpiCard icon={ShieldCheck} label="Open Incidents" value={openIncidents} color="text-red-400" />
        <KpiCard icon={Clock} label="Avg Response" value={avgResponseMin !== null ? `${avgResponseMin}m` : "—"} color="text-sky-400" />
        <KpiCard icon={Users} label="Total Sessions" value={totalSessions} color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-secondary">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp size={16} /> Incidents (Last 30 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="incidents" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle size={16} /> Severity Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                  >
                    {severityData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-secondary">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users size={16} /> Team Activity (Sessions)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock size={16} /> Response Metrics
            </h3>
            <div className="flex h-64 flex-col items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Time to Acknowledge</p>
                <p className="text-4xl font-bold text-sky-400">{avgResponseMin !== null ? `${avgResponseMin}m` : "—"}</p>
              </div>
              <div className="h-px w-32 bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Time to Resolve</p>
                <p className="text-4xl font-bold text-emerald-400">{avgResolutionMin !== null ? `${avgResolutionMin}m` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OverwatchAnalytics;

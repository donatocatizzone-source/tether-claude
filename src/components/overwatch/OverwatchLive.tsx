import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/components/overwatch/dummyData";
import { GoogleMapView, type MarkerColor } from "@/components/maps/GoogleMapView";

// Port of OLD/src/components/tether/overwatch/OverwatchLive.tsx (see
// CLAUDE.md > Ground truth). Status is time-derived from
// professional_sessions.expected_end_time, recomputed every 15s.
interface LiveAgent {
  id: string;
  userId: string;
  name: string;
  clientName: string;
  address: string;
  status: "green" | "yellow" | "red" | "gray";
  statusLabel: string;
  lat: number | null;
  lng: number | null;
  expectedEnd: string | null;
}

const statusConfig = {
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400", label: "Active" },
  yellow: { dot: "bg-amber-500", bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400", label: "Expiring Soon" },
  red: { dot: "bg-red-500", bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400", label: "Distress" },
  gray: { dot: "bg-muted-foreground", bg: "bg-muted/30", border: "border-border", text: "text-muted-foreground", label: "Off Duty" },
};

function computeStatus(session: { status: string; expected_end_time: string } | null): { status: LiveAgent["status"]; label: string } {
  if (!session) return { status: "gray", label: "Off Duty" };
  if (session.status === "duress_alert") return { status: "red", label: "DISTRESS" };
  if (session.status === "expired") return { status: "red", label: "EXPIRED" };
  const remaining = Math.max(0, (new Date(session.expected_end_time).getTime() - Date.now()) / 60_000);
  if (remaining <= 0) return { status: "red", label: "EXPIRED" };
  if (remaining < 5) return { status: "yellow", label: `${Math.ceil(remaining)}m left` };
  return { status: "green", label: `${Math.ceil(remaining)}m left` };
}

export function OverwatchLive({ employees: _employees }: { employees: Employee[] }) {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [, setTick] = useState(0);

  const fetchLiveData = async () => {
    const { data: sessions } = await supabase
      .from("professional_sessions")
      .select("id, user_id, client_name, address, status, expected_end_time")
      .in("status", ["active", "extended", "duress_alert", "expired"]);

    if (!sessions || sessions.length === 0) {
      setAgents([]);
      return;
    }

    const userIds = [...new Set(sessions.map((s) => s.user_id))];

    const [profilesRes, locationsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("user_locations").select("user_id, lat, lng").in("user_id", userIds),
    ]);

    const nameMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name]) || []);
    const locMap = new Map(locationsRes.data?.map((l) => [l.user_id, { lat: l.lat, lng: l.lng }]) || []);

    const liveAgents: LiveAgent[] = sessions.map((s) => {
      const { status, label } = computeStatus(s);
      const loc = locMap.get(s.user_id);
      return {
        id: s.id,
        userId: s.user_id,
        name: nameMap.get(s.user_id) || "Unknown",
        clientName: s.client_name,
        address: s.address || "",
        status,
        statusLabel: label,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        expectedEnd: s.expected_end_time,
      };
    });

    setAgents(liveAgents);
  };

  useEffect(() => {
    fetchLiveData();

    const sessionsChannel = supabase
      .channel("overwatch-sessions-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "professional_sessions" }, () => fetchLiveData())
      .subscribe();

    const locationsChannel = supabase
      .channel("overwatch-locations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => fetchLiveData())
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  const displayAgents = agents.map((a) => {
    if (!a.expectedEnd) return a;
    const { status, label } = computeStatus({
      status: a.status === "red" && a.statusLabel === "DISTRESS" ? "duress_alert" : "active",
      expected_end_time: a.expectedEnd,
    });
    return { ...a, status, statusLabel: label };
  });

  if (displayAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock size={40} className="mb-3 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No Active Sessions</p>
        <p className="text-sm text-muted-foreground">Team members who start a job will appear here in real-time.</p>
      </div>
    );
  }

  const withLoc = displayAgents.filter((a) => a.lat != null);
  const mapCenter = withLoc.length > 0 ? { lat: withLoc[0].lat!, lng: withLoc[0].lng! } : { lat: 30.2672, lng: -97.7431 };
  const mapColor: Record<LiveAgent["status"], MarkerColor> = { red: "red", yellow: "amber", green: "green", gray: "blue" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Sessions</h1>
        <p className="text-sm text-muted-foreground">
          {displayAgents.length} active agent{displayAgents.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card className="overflow-hidden border-border bg-secondary">
        <CardContent className="relative p-0">
          <GoogleMapView
            center={mapCenter}
            zoom={12}
            markers={displayAgents.filter((a) => a.lat != null).map((a) => ({ position: { lat: a.lat!, lng: a.lng! }, color: mapColor[a.status] }))}
            className="h-64 w-full"
          />
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            {displayAgents.map((agent) => {
              const cfg = statusConfig[agent.status];
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: agent.status === "red" ? ["0 0 0 0 rgba(239,68,68,0)", "0 0 0 6px rgba(239,68,68,0.3)", "0 0 0 0 rgba(239,68,68,0)"] : "none",
                  }}
                  transition={{ boxShadow: agent.status === "red" ? { repeat: Infinity, duration: 1.5 } : undefined }}
                  className={`flex items-center gap-2 rounded-lg border ${cfg.border} bg-background/80 px-3 py-2 backdrop-blur-sm`}
                >
                  {agent.status === "red" ? <AlertTriangle size={14} className="text-red-500" /> : <MapPin size={14} className={cfg.text} />}
                  <span className="text-xs font-semibold text-foreground">{agent.name}</span>
                  <span className={`text-[10px] font-medium ${cfg.text}`}>{agent.statusLabel}</span>
                </motion.div>
              );
            })}
          </div>
          <p className="px-4 py-2 text-[10px] text-muted-foreground">Showing all team members with active sessions. Location updates every 30s.</p>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {displayAgents.map((agent) => {
          const cfg = statusConfig[agent.status];
          return (
            <motion.div key={agent.id} animate={agent.status === "red" ? { opacity: [1, 0.6, 1] } : {}} transition={agent.status === "red" ? { duration: 1, repeat: Infinity } : {}}>
              <Card className={`border ${cfg.border} ${cfg.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                      <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                    </div>
                    <span className={`text-xs font-bold ${cfg.text}`}>{agent.statusLabel}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield size={10} />
                      {agent.clientName}
                    </span>
                    {agent.address && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {agent.address}
                      </span>
                    )}
                  </div>
                  {agent.status === "red" && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-400">
                      <AlertTriangle size={12} /> IMMEDIATE ACTION REQUIRED
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="hidden border-border bg-secondary md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Client / Task</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Coords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAgents.map((agent) => {
                const cfg = statusConfig[agent.status];
                return (
                  <TableRow key={agent.id} className={`border-border ${agent.status === "red" ? "animate-pulse" : ""}`}>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {agent.statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{agent.name}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.address || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{agent.lat != null ? `${agent.lat.toFixed(4)}, ${agent.lng?.toFixed(4)}` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default OverwatchLive;

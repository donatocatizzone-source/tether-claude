import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ResolutionModal } from "@/components/overwatch/ResolutionModal";
import type { LocalIncident } from "@/components/overwatch/dummyData";

// Port of OLD/src/components/tether/overwatch/AlertStream.tsx (see
// CLAUDE.md > Ground truth). Incident response workflow: new ->
// acknowledged -> resolved, merging locally-created incidents (from
// EmployeeDetailView) with real `incidents` rows via Realtime.
interface DbIncident {
  id: string;
  organization_id: string;
  user_id: string;
  session_id: string | null;
  status: "new" | "acknowledged" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  acknowledged_by: string | null;
  resolved_by: string | null;
  outcome: string | null;
  resolution_notes: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  user_name?: string;
}

interface DisplayIncident {
  id: string;
  employee_name: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "acknowledged" | "resolved";
  created_at: string;
  source: "local" | "db";
  dbIncident?: DbIncident;
}

const severityConfig = {
  critical: { color: "bg-red-500", text: "text-red-400", label: "Critical" },
  high: { color: "bg-orange-500", text: "text-orange-400", label: "High" },
  medium: { color: "bg-amber-500", text: "text-amber-400", label: "Medium" },
  low: { color: "bg-blue-500", text: "text-blue-400", label: "Low" },
};

interface AlertStreamProps {
  localIncidents: LocalIncident[];
  onUpdateLocal: (incidents: LocalIncident[]) => void;
}

export function AlertStream({ localIncidents, onUpdateLocal }: AlertStreamProps) {
  const { user } = useAuth();
  const [dbIncidents, setDbIncidents] = useState<DbIncident[]>([]);
  const [resolveTarget, setResolveTarget] = useState<DbIncident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .in("status", ["new", "acknowledged"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        const userIds = [...new Set(data.map((d) => d.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
          const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
          setDbIncidents(data.map((d) => ({ ...d, user_name: nameMap.get(d.user_id) || undefined })) as DbIncident[]);
        } else {
          setDbIncidents(data as DbIncident[]);
        }
      }
      setLoading(false);
    };
    fetchIncidents();

    const channel = supabase
      .channel("incidents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDbIncidents((prev) => [payload.new as DbIncident, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as DbIncident;
          if (updated.status === "resolved") {
            setDbIncidents((prev) => prev.filter((i) => i.id !== updated.id));
          } else {
            setDbIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayIncidents: DisplayIncident[] = [
    ...localIncidents
      .filter((li) => li.status !== "resolved")
      .map((li) => ({
        id: li.id,
        employee_name: li.employee_name,
        type: li.type,
        severity: li.severity,
        status: li.status,
        created_at: li.created_at,
        source: "local" as const,
      })),
    ...dbIncidents.map((di) => ({
      id: di.id,
      employee_name: di.user_name || `User ${di.user_id.slice(0, 8)}…`,
      type: di.severity === "critical" ? "PANIC — Emergency" : "Incident",
      severity: di.severity,
      status: di.status,
      created_at: di.created_at,
      source: "db" as const,
      dbIncident: di,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAcknowledge = async (inc: DisplayIncident) => {
    if (inc.source === "local") {
      onUpdateLocal(localIncidents.map((li) => (li.id === inc.id ? { ...li, status: "acknowledged" as const } : li)));
      toast.success("Incident acknowledged");
      return;
    }
    if (!user || !inc.dbIncident) return;
    const { error } = await supabase
      .from("incidents")
      .update({ status: "acknowledged", acknowledged_by: user.id, acknowledged_at: new Date().toISOString() })
      .eq("id", inc.id);
    if (error) toast.error("Failed to acknowledge incident");
    else toast.success("Incident acknowledged");
  };

  const handleResolveLocal = (inc: DisplayIncident) => {
    onUpdateLocal(localIncidents.map((li) => (li.id === inc.id ? { ...li, status: "resolved" as const } : li)));
    toast.success("Incident resolved");
  };

  const handleResolved = () => {
    setResolveTarget(null);
    toast.success("Incident resolved and moved to audit log");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  if (loading) {
    return (
      <Card className="border-border bg-secondary">
        <CardContent className="p-6 text-center text-muted-foreground">Loading incidents...</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border bg-secondary">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Incidents</h3>
            <Badge variant="outline" className="text-xs">
              {displayIncidents.length} open
            </Badge>
          </div>

          {displayIncidents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <CheckCircle size={24} />
              <p className="text-sm">All clear — no active incidents</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {displayIncidents.map((inc) => {
                  const sev = severityConfig[inc.severity];
                  const isNew = inc.status === "new";

                  return (
                    <motion.div
                      key={inc.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        boxShadow: isNew
                          ? ["0 0 0 0 rgba(239,68,68,0)", "0 0 0 4px rgba(239,68,68,0.3)", "0 0 0 0 rgba(239,68,68,0)"]
                          : "none",
                      }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ boxShadow: isNew ? { repeat: Infinity, duration: 2 } : undefined }}
                      className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${
                        isNew ? "border-red-500/50 bg-red-500/5" : "border-border bg-background/50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isNew ? "bg-red-500/20" : "bg-amber-500/10"}`}>
                        <AlertTriangle size={18} className={isNew ? "text-red-500" : "text-amber-400"} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{inc.employee_name}</p>
                          <Badge className={`${sev.color} text-[10px] text-white`}>{sev.label}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{inc.type}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Clock size={10} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{timeAgo(inc.created_at)}</span>
                          {inc.status === "acknowledged" && (
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <User size={10} /> Handled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {isNew && (
                          <Button size="sm" variant="outline" onClick={() => handleAcknowledge(inc)} className="text-xs">
                            Acknowledge
                          </Button>
                        )}
                        {inc.status === "acknowledged" && inc.source === "local" && (
                          <Button size="sm" onClick={() => handleResolveLocal(inc)} className="text-xs">
                            Resolve
                          </Button>
                        )}
                        {inc.status === "acknowledged" && inc.source === "db" && inc.dbIncident && (
                          <Button size="sm" onClick={() => setResolveTarget(inc.dbIncident!)} className="text-xs">
                            Resolve
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <ResolutionModal incident={resolveTarget} open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)} onResolved={handleResolved} />
    </>
  );
}

export default AlertStream;

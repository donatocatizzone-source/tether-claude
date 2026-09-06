import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";

// Port of OLD/src/components/tether/overwatch/AuditLog.tsx (see CLAUDE.md
// > Ground truth). CSV export runs entirely client-side (Blob + object
// URL), no external calls — now via the shared lib/csv helper.
interface ResolvedIncident {
  id: string;
  user_id: string;
  severity: string;
  outcome: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

const outcomeLabels: Record<string, string> = {
  false_alarm: "False Alarm",
  user_safe: "User Safe",
  emergency_services_called: "Emergency Services Called",
  test: "Test",
};

export function AuditLog() {
  const [incidents, setIncidents] = useState<ResolvedIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("incidents").select("*").eq("status", "resolved").order("resolved_at", { ascending: false });
      if (data) setIncidents(data as ResolvedIncident[]);
      setLoading(false);
    })();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getDuration = (created: string, resolved: string | null) => {
    if (!resolved) return "—";
    const diff = new Date(resolved).getTime() - new Date(created).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const exportCSV = () => {
    // Notes are no longer comma-stripped — downloadCsv quotes them, so the
    // exported text matches what the manager actually wrote.
    downloadCsv(
      "incident-audit-log",
      ["Date", "Employee", "Severity", "Outcome", "Resolved By", "Duration", "Notes"],
      incidents.map((i) => [
        formatDate(i.created_at),
        i.user_id.slice(0, 8),
        i.severity,
        i.outcome ? outcomeLabels[i.outcome] || i.outcome : "",
        i.resolved_by?.slice(0, 8) || "",
        getDuration(i.created_at, i.resolved_at),
        i.resolution_notes || "",
      ]),
    );
  };

  return (
    <Card className="border-border bg-secondary">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Audit Log</h3>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={incidents.length === 0} className="gap-2 text-xs">
            <Download size={14} />
            Download CSV
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <FileText size={24} />
            <p className="text-sm">No resolved incidents yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Resolved By</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="text-xs">{formatDate(inc.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium">{inc.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {inc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{inc.outcome ? outcomeLabels[inc.outcome] || inc.outcome : "—"}</TableCell>
                    <TableCell className="text-xs">{inc.resolved_by?.slice(0, 8) || "—"}</TableCell>
                    <TableCell className="text-xs">{getDuration(inc.created_at, inc.resolved_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditLog;

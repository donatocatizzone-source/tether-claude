import { Card, CardContent } from "@/components/ui/card";
import type { Employee } from "@/components/overwatch/dummyData";

// Port of OLD/src/components/tether/overwatch/StatusBoard.tsx (see
// CLAUDE.md > Ground truth).
const statusColors = {
  idle: "bg-primary/20 border-primary/30",
  active: "bg-amber-500/20 border-amber-500/30",
  emergency: "bg-destructive/20 border-destructive/30 animate-pulse",
};

const dotColors = {
  idle: "bg-primary",
  active: "bg-amber-500",
  emergency: "bg-red-500",
};

export function StatusBoard({ employees }: { employees: Employee[] }) {
  return (
    <Card className="border-border bg-secondary">
      <CardContent className="p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Live Status</h3>
        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className={`flex items-center gap-3 rounded-lg border p-3 ${statusColors[emp.status]}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotColors[emp.status]}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.role}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{emp.lastCheckIn}</span>
            </div>
          ))}
          {employees.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No team members yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatusBoard;

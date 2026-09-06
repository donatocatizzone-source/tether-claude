import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee } from "@/components/overwatch/dummyData";
import { toast } from "sonner";
import { AddEmployeeModal } from "@/components/overwatch/AddEmployeeModal";

// Port of OLD/src/components/tether/overwatch/TeamTable.tsx (see
// CLAUDE.md > Ground truth).
const statusBadge = {
  idle: "bg-primary/20 text-primary",
  active: "bg-amber-500/20 text-amber-400",
  emergency: "bg-destructive/20 text-red-400",
};

interface TeamTableProps {
  employees: Employee[];
  onSelectEmployee?: (employee: Employee) => void;
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (id: string) => void;
}

export function TeamTable({ employees, onSelectEmployee, onAddEmployee, onRemoveEmployee }: TeamTableProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = (data: { name: string; role: string; email: string }) => {
    const newEmp: Employee = {
      id: crypto.randomUUID(),
      name: data.name,
      role: data.role,
      status: "idle",
      lastCheckIn: "Just added",
    };
    onAddEmployee(newEmp);
    toast.success(`${data.name} added to team`);
  };

  const handleRemove = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    onRemoveEmployee(id);
    toast.success(`${name} removed from team`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-sm text-muted-foreground">Add, remove, and manage team members</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="h-10 rounded-lg bg-gradient-to-r from-primary to-teal-500 text-primary-foreground">
          <Plus size={16} className="mr-2" /> Add Employee
        </Button>
      </div>

      <Card className="border-border bg-secondary">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Check-in</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} className="cursor-pointer border-border transition-colors hover:bg-accent/50" onClick={() => onSelectEmployee?.(emp)}>
                  <TableCell className="font-medium text-foreground">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.role}</TableCell>
                  <TableCell>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[emp.status]}`}>{emp.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.lastCheckIn}</TableCell>
                  <TableCell>
                    <button onClick={(e) => handleRemove(e, emp.id, emp.name)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No team members yet. Click "Add Employee" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
}

export default TeamTable;

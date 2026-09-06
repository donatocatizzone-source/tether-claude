import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Port of OLD/src/components/tether/overwatch/AddEmployeeModal.tsx (see
// CLAUDE.md > Ground truth).
interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (employee: { name: string; role: string; email: string }) => void;
}

const roles = ["Field Agent", "Security Guard", "Patrol Officer", "Manager"];

export function AddEmployeeModal({ open, onClose, onAdd }: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !role || !email.trim()) return;
    onAdd({ name: name.trim(), role, email: email.trim() });
    setName("");
    setEmail("");
    setRole("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Full Name</Label>
            <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className="border-border bg-secondary text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="border-border bg-background">
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !role || !email.trim()}
            className="w-full bg-gradient-to-r from-primary to-teal-500 text-primary-foreground"
          >
            Add Employee
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddEmployeeModal;

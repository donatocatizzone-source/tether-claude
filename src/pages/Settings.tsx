import { User, Bell, Users, Shield, HelpCircle, ChevronRight } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-settings (~line 920).
// None of the rows have onclick handlers in the reference — they're
// placeholder navigation targets — so they're rendered inert here too.
const SECTIONS = [
  {
    label: "Account",
    rows: [
      { icon: User, title: "Edit Profile" },
      { icon: Bell, title: "Notifications" },
    ],
  },
  {
    label: "Safety",
    rows: [
      { icon: Users, title: "Manage Circle" },
      { icon: Shield, title: "Privacy & Data" },
    ],
  },
  {
    label: "Support",
    rows: [{ icon: HelpCircle, title: "Get Help" }],
  },
];

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col p-6 pb-24 pt-16">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Settings</h2>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </h3>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {section.rows.map((row, i) => (
                  <button
                    key={row.title}
                    className={`flex w-full items-center justify-between p-4 hover:bg-muted ${
                      i < section.rows.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <row.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{row.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button className="w-full rounded-xl py-3 text-sm font-medium text-red-500 transition hover:bg-red-50">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

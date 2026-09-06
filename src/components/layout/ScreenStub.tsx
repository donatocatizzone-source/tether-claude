import type { ReactNode } from "react";

export function ScreenStub({
  eyebrow,
  title,
  description,
  specRef,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  specRef: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-mode-safe">{eyebrow}</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
      <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Not built out yet — full spec in <code className="font-mono-data text-xs">{specRef}</code>.
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, FileText } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-vault (~line 881). Static
// grid, no onclick handlers in the reference — thumbnails are decorative.
export default function Vault() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative flex h-full flex-col p-6 pt-12">
        <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-background py-2">
          <button
            onClick={() => navigate("/consumer")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm transition hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Evidence Vault</h2>
            <p className="text-xs text-muted-foreground">Encrypted &amp; Locked</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transition group-hover:opacity-50"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80')",
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <Lock className="mb-2 h-6 w-6 text-mode-safe" />
              <span className="font-mono-data text-[10px] text-muted-foreground">IMG_2921.enc</span>
            </div>
          </div>

          <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
            <div className="absolute inset-0 bg-muted opacity-50 transition group-hover:opacity-60" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <FileText className="mb-2 h-6 w-6 text-mode-ride" />
              <span className="font-mono-data text-[10px] text-muted-foreground">LOG_8821.txt</span>
            </div>
          </div>

          <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transition group-hover:opacity-50"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80')",
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <Lock className="mb-2 h-6 w-6 text-mode-safe" />
              <span className="font-mono-data text-[10px] text-muted-foreground">IMG_2922.enc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ScreenStub } from "@/components/layout/ScreenStub";

// Port target: reference/tether-app-demo.html #screen-guardian (~line 1061).
export default function Guardian() {
  return (
    <ScreenStub
      eyebrow="Guardian Dashboard"
      title="Mom's view"
      description="Live map pin + bottom sheet with destination ETA, speed, and an emergency-audio override row."
      specRef="reference/tether-app-demo.html #screen-guardian"
    />
  );
}

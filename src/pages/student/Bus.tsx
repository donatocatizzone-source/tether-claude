import { ScreenStub } from "@/components/layout/ScreenStub";

// Port target: reference/tether-app-demo.html #screen-student-bus (~line 661)
// + runBusSim()/runBusDeviation()/resetBusSim() (~line 1712).
export default function StudentBus() {
  return (
    <ScreenStub
      eyebrow="Student Mode"
      title="Bus tracking"
      description="Live bus ETA on a route map, with a simulate-route / simulate-deviation control pair."
      specRef="reference/tether-app-demo.html #screen-student-bus"
    />
  );
}

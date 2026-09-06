import { ScreenStub } from "@/components/layout/ScreenStub";

// Port target: reference/tether-app-demo.html #screen-student-walk (~line 697)
// + startWalkSim()/runWalkDeviation()/resetWalkSim() (~line 1777).
export default function StudentWalk() {
  return (
    <ScreenStub
      eyebrow="Student Mode"
      title="Walk-home timer"
      description="A shrinking countdown ring + progress bar tracking distance remaining to a saved destination."
      specRef="reference/tether-app-demo.html #screen-student-walk"
    />
  );
}

import { ScreenStub } from "@/components/layout/ScreenStub";

// Port target: reference/tether-app-demo.html #screen-student-hangout (~line 736)
// + toggleFriend() (~line 1829).
export default function StudentHangout() {
  return (
    <ScreenStub
      eyebrow="Student Mode"
      title="Hangout check-in"
      description="Pick which friends you're with, confirm the location pin, and send a Guardian notification."
      specRef="reference/tether-app-demo.html #screen-student-hangout"
    />
  );
}

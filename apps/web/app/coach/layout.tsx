import { CoachAuthGate } from "../../components/coach-auth-gate";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <CoachAuthGate>{children}</CoachAuthGate>;
}

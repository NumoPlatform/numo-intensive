import type { Metadata } from "next";
import StudentAccountEditor from "./StudentAccountEditor";

export const metadata: Metadata = {
  title: "Manage student account",
  robots: { index: false, follow: false },
};

export default function StudentAccountPage() {
  return <StudentAccountEditor />;
}

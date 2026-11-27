import type { Metadata } from "next";
import { AuthGate } from "@/components/auth-gate";
import { SiteDetails } from "@/components/site-details";

export const metadata: Metadata = { title: "Сайт — PingBoard" };

export default function SitePage() {
  return (
    <AuthGate allow="authenticated">
      <SiteDetails />
    </AuthGate>
  );
}

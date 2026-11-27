import type { Metadata } from "next";
import { VerifyEmail } from "@/components/verify-email";

export const metadata: Metadata = { title: "Подтверждение email — PingBoard" };

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}

import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthGate } from "@/components/auth-gate";

export const metadata: Metadata = { title: "Вход — PingBoard" };

export default function LoginPage() {
  return (
    <AuthGate allow="guest">
      <AuthForm mode="login" />
    </AuthGate>
  );
}

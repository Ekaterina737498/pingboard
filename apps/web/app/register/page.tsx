import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthGate } from "@/components/auth-gate";

export const metadata: Metadata = { title: "Регистрация — PingBoard" };

export default function RegisterPage() {
  return (
    <AuthGate allow="guest">
      <AuthForm mode="register" />
    </AuthGate>
  );
}

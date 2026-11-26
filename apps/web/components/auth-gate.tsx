"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppSelector } from "@/lib/store";

type Props = { allow: "guest" | "authenticated"; children: ReactNode };

// Это только удобство интерфейса. Настоящую защиту обеспечивает API.
export function AuthGate({ allow, children }: Props) {
  const status = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && status !== allow) {
      router.replace(allow === "guest" ? "/" : "/login");
    }
  }, [status, allow, router]);

  if (status !== allow) {
    return <p className="m-auto text-sm opacity-60">Загрузка…</p>;
  }
  return children;
}

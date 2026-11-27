"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { getErrorMessage } from "@/lib/error-message";
import { FormError } from "./form-error";
import { fadeUp } from "./motion-presets";

export function VerifyEmailCard({
  onConfirm,
}: {
  onConfirm: (token: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  // Подтверждаем только по нажатию: почтовые сканеры сами открывают ссылки.
  const confirm = async () => {
    setError(null);
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (!token) {
      setError("Откройте эту страницу по ссылке из письма");
      return;
    }
    setStatus("sending");
    try {
      await onConfirm(token);
      setStatus("done");
    } catch (reason) {
      setError(getErrorMessage(reason));
      setStatus("idle");
    }
  };

  return (
    <motion.main
      {...fadeUp}
      className="m-auto flex w-full max-w-sm flex-col gap-4 p-4 text-center"
    >
      <h1 className="text-2xl font-semibold">Подтверждение email</h1>

      {status === "done" ? (
        <p role="status" className="text-green-600">
          Email подтверждён
        </p>
      ) : (
        <>
          <p className="text-sm opacity-70">
            Нажмите кнопку, только если вы сами регистрировались в PingBoard.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={status === "sending"}
            className="cursor-pointer rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            {status === "sending" ? "Подождите…" : "Подтвердить email"}
          </button>
        </>
      )}

      {error && <FormError role="alert">{error}</FormError>}
      <Link href="/" className="text-sm underline">
        Перейти в PingBoard
      </Link>
    </motion.main>
  );
}

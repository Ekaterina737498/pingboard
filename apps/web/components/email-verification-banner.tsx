"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { getErrorMessage } from "@/lib/error-message";
import { FormError } from "./form-error";
import { fadeUp } from "./motion-presets";

export function EmailVerificationBanner({
  onResend,
}: {
  onResend: () => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setStatus("sending");
    setError(null);
    try {
      await onResend();
      setStatus("sent");
    } catch (reason) {
      setError(getErrorMessage(reason));
      setStatus("idle");
    }
  };

  return (
    <motion.section
      {...fadeUp}
      className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-amber-400 p-4"
    >
      <p className="text-sm">
        <strong>Подтвердите email.</strong> Пока он не подтверждён, письма о
        падении сайтов не отправляются. Проверьте почту и папку «Спам». Если вы
        уже подтвердили адрес, обновите страницу.
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={status !== "idle"}
        className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:cursor-default disabled:opacity-50 dark:border-zinc-700"
      >
        {status === "sending" ? "Отправляем…" : "Отправить письмо ещё раз"}
      </button>
      {status === "sent" && (
        <p role="status" className="text-sm text-green-600">
          Письмо поставлено в очередь на отправку
        </p>
      )}
      {error && <FormError role="alert">{error}</FormError>}
    </motion.section>
  );
}

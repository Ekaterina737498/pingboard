"use client";

import { useSearchParams } from "next/navigation";
import { FormError } from "./form-error";

const ERRORS: Record<string, string> = {
  google_unavailable: "Вход через Google на этом сервере не настроен",
  google_link:
    "Этот Google-аккаунт нельзя привязать к существующему. Войдите по паролю",
  google_failed: "Не удалось войти через Google. Попробуйте ещё раз",
};

export function GoogleSignIn() {
  const reason = useSearchParams().get("error");
  const message = reason ? ERRORS[reason] : undefined;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {/* Обычная ссылка: нужен полный переход браузера, а не роутинг Next.js. */}
      <a
        href="/auth/google"
        className="rounded-lg border border-zinc-300 px-4 py-2 text-center font-medium dark:border-zinc-700"
      >
        Войти через Google
      </a>
      {message && <FormError role="alert">{message}</FormError>}
    </div>
  );
}

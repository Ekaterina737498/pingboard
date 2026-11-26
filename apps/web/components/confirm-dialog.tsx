"use client";

import { motion } from "motion/react";
import { useId, useLayoutEffect, useRef } from "react";
import { FormError } from "./form-error";

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// Нативный <dialog> сам удерживает фокус внутри окна и закрывает остальную страницу.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // Закрываем до удаления из DOM, чтобы браузер вернул фокус назад.
    return () => dialog?.close();
  }, []);

  const cancel = () => {
    if (!pending) onCancel();
  };

  return (
    <motion.dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ duration: 0.18 }}
      // Escape: закрытием управляет React, иначе не будет анимации.
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) cancel();
      }}
      // Клик по самому dialog, а не по содержимому, означает клик по фону.
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-200 bg-background text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:border-zinc-800"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-lg font-semibold break-words">
          {title}
        </h2>
        <p id={descriptionId} className="text-sm opacity-70">
          {description}
        </p>

        {error && <FormError role="alert">{error}</FormError>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:cursor-default disabled:opacity-50 dark:border-zinc-700"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Подождите…" : confirmLabel}
          </button>
        </div>
      </div>
    </motion.dialog>
  );
}

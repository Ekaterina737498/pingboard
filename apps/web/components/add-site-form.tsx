"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getErrorMessage } from "@/lib/error-message";
import { addSiteSchema, type AddSiteValues } from "@/lib/site-schema";
import { FormError } from "./form-error";
import { TextField } from "./text-field";

type Props = { onAdd: (values: AddSiteValues) => Promise<void> };

// Форма не знает про Apollo: сохранение приходит снаружи, поэтому её легко тестировать.
export function AddSiteForm({ onAdd }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddSiteValues>({
    resolver: zodResolver(addSiteSchema),
    defaultValues: { name: "", url: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onAdd(values);
      reset();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_2fr]">
        <TextField
          label="Название"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Адрес сайта"
          type="url"
          placeholder="https://example.com"
          error={errors.url?.message}
          {...register("url")}
        />
      </div>

      {serverError && <FormError role="alert">{serverError}</FormError>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="cursor-pointer self-start rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:cursor-default disabled:opacity-50"
      >
        {isSubmitting ? "Добавляем…" : "Добавить сайт"}
      </button>
    </form>
  );
}

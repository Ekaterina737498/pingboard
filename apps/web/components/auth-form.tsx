"use client";

import { useApolloClient, useMutation } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { sessionStarted } from "@/lib/auth-slice";
import { getErrorMessage } from "@/lib/error-message";
import { LOGIN, REGISTER } from "@/lib/operations";
import { withAuthLock } from "@/lib/refresh";
import {
  loginSchema,
  registerSchema,
  type AuthFormValues,
} from "@/lib/schemas";
import { useAppDispatch } from "@/lib/store";
import { TextField } from "./text-field";

const TEXT = {
  login: {
    title: "Вход",
    submit: "Войти",
    question: "Нет аккаунта?",
    link: "Зарегистрироваться",
    href: "/register",
  },
  register: {
    title: "Регистрация",
    submit: "Создать аккаунт",
    question: "Уже есть аккаунт?",
    link: "Войти",
    href: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: keyof typeof TEXT }) {
  const text = TEXT[mode];
  const dispatch = useAppDispatch();
  const client = useApolloClient();
  const [login] = useMutation(LOGIN);
  const [createUser] = useMutation(REGISTER);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      if (mode === "register") {
        await createUser({ variables: { input } });
      }
      const { data } = await withAuthLock(() =>
        login({ variables: { input } }),
      );
      if (!data) throw new Error("Empty response");

      await client.clearStore();
      // Next.js может сохранить страницу в памяти: не оставляем в ней пароль.
      reset();
      dispatch(sessionStarted(data.login.accessToken));
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  });

  return (
    <main className="m-auto w-full max-w-sm p-4">
      <h1 className="mb-6 text-2xl font-semibold">{text.title}</h1>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Пароль"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={errors.password?.message}
          {...register("password")}
        />

        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:cursor-default disabled:opacity-50"
        >
          {isSubmitting ? "Подождите…" : text.submit}
        </button>
      </form>

      <p className="mt-4 text-sm">
        {text.question}{" "}
        <Link href={text.href} className="underline">
          {text.link}
        </Link>
      </p>
    </main>
  );
}

"use client";

import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { sessionEnded } from "@/lib/auth-slice";
import { LOGOUT, ME } from "@/lib/operations";
import { withAuthLock } from "@/lib/refresh";
import { useAppDispatch } from "@/lib/store";
import { SitesSection } from "./sites-section";

export function Dashboard() {
  const dispatch = useAppDispatch();
  const client = useApolloClient();
  const { data, loading, error } = useQuery(ME);
  const [logout, logoutState] = useMutation(LOGOUT);

  const onLogout = async () => {
    try {
      await withAuthLock(() => logout());
    } catch {
      return; // Ошибка показана через logoutState.error.
    }
    dispatch(sessionEnded());
    await client.clearStore();
  };

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">PingBoard</h1>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutState.loading}
          className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          Выйти
        </button>
      </header>

      {logoutState.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          Не удалось выйти. Попробуйте ещё раз
        </p>
      )}
      {loading && <p className="mt-6">Загрузка…</p>}
      {error && (
        <p role="alert" className="mt-6 text-red-600">
          Не удалось загрузить профиль
        </p>
      )}
      {data && (
        <p className="mt-6">
          Вы вошли как <strong>{data.me.email}</strong> ({data.me.role})
        </p>
      )}

      <SitesSection />
    </main>
  );
}

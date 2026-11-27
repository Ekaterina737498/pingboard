"use client";

import { useQuery } from "@apollo/client/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getErrorMessage } from "@/lib/error-message";
import { SITE_PAGE } from "@/lib/operations";
import { ChecksTable } from "./checks-table";
import { FormError } from "./form-error";
import { fadeUp } from "./motion-presets";

export function SiteDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(SITE_PAGE, {
    variables: { id },
    pollInterval: 30_000,
  });

  return (
    <motion.main {...fadeUp} className="mx-auto w-full max-w-3xl p-4">
      <Link href="/" className="text-sm underline">
        ← Все сайты
      </Link>

      {loading && !data && <p className="mt-6">Загрузка…</p>}
      {error && (
        <div className="mt-6">
          <FormError role="alert">{getErrorMessage(error)}</FormError>
        </div>
      )}

      {data && (
        <>
          <h1 className="mt-6 text-2xl font-semibold break-words">
            {data.site.name}
          </h1>
          <a
            href={data.site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm break-all underline opacity-60"
          >
            {data.site.url}
          </a>

          <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm opacity-60">Аптайм за 24 часа</p>
            <p className="mt-1 text-3xl font-semibold">
              {data.siteUptime === null ? "Нет данных" : `${data.siteUptime}%`}
            </p>
          </div>

          <h2 className="mt-8 mb-3 text-xl font-semibold">
            Последние проверки
          </h2>
          <ChecksTable checks={data.siteChecks} />
        </>
      )}
    </motion.main>
  );
}

"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ADD_SITE, REMOVE_SITE, SITES, type Site } from "@/lib/operations";
import { AddSiteForm } from "./add-site-form";
import { ConfirmDialog } from "./confirm-dialog";
import { FormError } from "./form-error";
import { fadeUp } from "./motion-presets";
import { SiteCard } from "./site-card";

// API проверяет сайты раз в минуту, поэтому чаще спрашивать нет смысла.
const POLL_INTERVAL_MS = 30_000;

export function SitesSection() {
  const { data, loading, error } = useQuery(SITES, {
    pollInterval: POLL_INTERVAL_MS,
  });
  const refetch = { refetchQueries: [SITES], awaitRefetchQueries: true };
  const [addSite] = useMutation(ADD_SITE, refetch);
  const [removeSite, removeState] = useMutation(REMOVE_SITE, refetch);

  const [siteToRemove, setSiteToRemove] = useState<Site | null>(null);

  const openDialog = (site: Site) => {
    removeState.reset(); // Убираем ошибку от прошлой попытки.
    setSiteToRemove(site);
  };

  const confirmRemove = async (site: Site) => {
    try {
      await removeSite({ variables: { id: site.id } });
      setSiteToRemove(null);
    } catch {
      // Окно остаётся открытым и показывает removeState.error.
    }
  };

  return (
    <section className="mt-8 flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Мои сайты</h2>

      <AddSiteForm
        onAdd={async (input) => {
          await addSite({ variables: { input } });
        }}
      />

      {loading && !data && <p>Загрузка…</p>}
      {error && <FormError role="alert">Не удалось обновить список</FormError>}
      {data?.sites.length === 0 && (
        <motion.p {...fadeUp} className="opacity-60">
          Пока нет ни одного сайта. Добавьте первый.
        </motion.p>
      )}

      <ul className="flex flex-col gap-3">
        <AnimatePresence>
          {data?.sites.map((site) => (
            <motion.li
              key={site.id}
              layout
              {...fadeUp}
              exit={{ opacity: 0, x: -24 }}
            >
              <SiteCard site={site} onRemove={() => openDialog(site)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {siteToRemove && (
          <ConfirmDialog
            title={`Удалить «${siteToRemove.name}»?`}
            description="Сайт и история его проверок будут удалены без возможности восстановления."
            confirmLabel="Удалить"
            pending={removeState.loading}
            error={removeState.error ? "Не удалось удалить сайт" : null}
            onConfirm={() => confirmRemove(siteToRemove)}
            onCancel={() => setSiteToRemove(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

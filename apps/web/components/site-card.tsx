import type { Site } from "@/lib/operations";

type Props = {
  site: Site;
  onRemove: () => void;
};

function getStatus({ lastCheck }: Site) {
  if (!lastCheck) {
    return { label: "Ожидает проверки", dot: "bg-zinc-400" };
  }
  return lastCheck.ok
    ? { label: "Работает", dot: "bg-green-500" }
    : { label: "Недоступен", dot: "bg-red-500" };
}

function getDetails({ lastCheck }: Site) {
  if (!lastCheck) return null;

  return [
    lastCheck.statusCode ? `HTTP ${lastCheck.statusCode}` : lastCheck.error,
    lastCheck.responseTimeMs !== null && `${lastCheck.responseTimeMs} мс`,
    `проверен в ${new Date(lastCheck.checkedAt).toLocaleTimeString("ru-RU")}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SiteCard({ site, onRemove }: Props) {
  const status = getStatus(site);
  const details = getDetails(site);

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="min-w-0">
        <h3 className="truncate font-semibold">{site.name}</h3>
        <p className="truncate text-sm opacity-60">{site.url}</p>
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span aria-hidden className={`size-2 rounded-full ${status.dot}`} />
          {status.label}
        </p>
        {details && <p className="mt-1 text-xs opacity-60">{details}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить ${site.name}`}
        className="cursor-pointer text-sm text-red-600"
      >
        Удалить
      </button>
    </div>
  );
}

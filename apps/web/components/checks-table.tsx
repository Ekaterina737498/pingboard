import type { Check } from "@/lib/operations";

const COLUMNS = ["Время", "Результат", "Код", "Ответ", "Ошибка"];

export function ChecksTable({ checks }: { checks: Check[] }) {
  if (checks.length === 0) {
    return (
      <p className="opacity-60">
        Проверок пока нет. Первая появится примерно через минуту.
      </p>
    );
  }

  return (
    // На узком экране прокручивается только таблица, а не вся страница.
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr
              key={check.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
            >
              <td className="px-3 py-2 whitespace-nowrap">
                {new Date(check.checkedAt).toLocaleString("ru-RU")}
              </td>
              <td
                className={`px-3 py-2 ${check.ok ? "text-green-600" : "text-red-600"}`}
              >
                {check.ok ? "Успешно" : "Сбой"}
              </td>
              <td className="px-3 py-2">{check.statusCode ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {check.responseTimeMs === null
                  ? "—"
                  : `${check.responseTimeMs} мс`}
              </td>
              <td className="px-3 py-2">{check.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

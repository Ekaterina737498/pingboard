let pending: Promise<string | null> | null = null;

// Web Locks не дают двум вкладкам менять refresh-cookie одновременно.
export async function withAuthLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return (await navigator.locks.request("pingboard-auth", task)) as T;
  }
  return task();
}

async function requestAccessToken(): Promise<string | null> {
  try {
    const response = await fetch("/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "mutation Refresh { refresh { accessToken } }",
      }),
    });
    const body = await response.json();
    return body.data?.refresh?.accessToken ?? null;
  } catch {
    return null;
  }
}

// Refresh-токен одноразовый: повторное использование API считает кражей.
// Поэтому все одновременные вызовы получают результат одного запроса.
export function refreshAccessToken(): Promise<string | null> {
  pending ??= withAuthLock(requestAccessToken).finally(() => {
    pending = null;
  });
  return pending;
}

"use client";

import { ApolloProvider } from "@apollo/client/react";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeApolloClient } from "@/lib/apollo-client";
import { sessionEnded, sessionStarted } from "@/lib/auth-slice";
import { refreshAccessToken } from "@/lib/refresh";
import { makeStore } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  const [{ store, client }] = useState(() => {
    const store = makeStore();
    return { store, client: makeApolloClient(store) };
  });

  // После перезагрузки страницы восстанавливаем сессию по httpOnly cookie.
  useEffect(() => {
    if (store.getState().auth.status !== "loading") return;
    void refreshAccessToken().then((token) => {
      store.dispatch(token ? sessionStarted(token) : sessionEnded());
    });
  }, [store]);

  return (
    <Provider store={store}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </Provider>
  );
}

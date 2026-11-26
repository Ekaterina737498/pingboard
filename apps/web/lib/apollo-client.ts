import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { HttpLink } from "@apollo/client/link/http";
import { from, switchMap, throwError } from "rxjs";
import { sessionEnded, sessionStarted } from "./auth-slice";
import { refreshAccessToken } from "./refresh";
import type { AppStore } from "./store";

// Для этих операций ошибка входа не означает, что пора обновить токен.
const PUBLIC_OPERATIONS = ["Login", "Register", "Logout"];

export function makeApolloClient(store: AppStore) {
  const errorLink = new ErrorLink(({ error, operation, forward }) => {
    const unauthenticated =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED");

    if (
      !unauthenticated ||
      operation.getContext().retried ||
      PUBLIC_OPERATIONS.includes(operation.operationName ?? "")
    ) {
      return;
    }
    operation.setContext({ retried: true });

    return from(refreshAccessToken()).pipe(
      switchMap((token) => {
        if (!token) {
          store.dispatch(sessionEnded());
          return throwError(() => error);
        }
        store.dispatch(sessionStarted(token));
        return forward(operation);
      }),
    );
  });

  const authLink = new SetContextLink((prevContext) => {
    const token = store.getState().auth.accessToken;
    return {
      headers: {
        ...prevContext.headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return new ApolloClient({
    link: ApolloLink.from([
      errorLink,
      authLink,
      new HttpLink({ uri: "/graphql" }),
    ]),
    cache: new InMemoryCache({
      // У LastCheck нет id: новый результат просто заменяет старый.
      typePolicies: { Site: { fields: { lastCheck: { merge: false } } } },
    }),
  });
}

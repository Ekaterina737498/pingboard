"use client";

import { useApolloClient, useMutation } from "@apollo/client/react";
import { VERIFY_EMAIL } from "@/lib/operations";
import { VerifyEmailCard } from "./verify-email-card";

export function VerifyEmail() {
  const client = useApolloClient();
  const [verifyEmail] = useMutation(VERIFY_EMAIL);

  return (
    <VerifyEmailCard
      onConfirm={async (token) => {
        await verifyEmail({ variables: { token } });
        // Сбрасываем кэш, чтобы главная заново загрузила статус email.
        await client.clearStore();
      }}
    />
  );
}

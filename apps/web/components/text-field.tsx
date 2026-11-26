import { useId, type ComponentProps } from "react";
import { FormError } from "./form-error";

type Props = ComponentProps<"input"> & { label: string; error?: string };

export function TextField({ label, error, ...inputProps }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 aria-invalid:border-red-500 dark:border-zinc-700"
      />
      {error && <FormError id={errorId}>{error}</FormError>}
    </div>
  );
}

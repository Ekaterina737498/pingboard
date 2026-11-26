import { z } from "zod";

function isHttpUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    return new URL(value).hostname.includes(".");
  } catch {
    return false;
  }
}

// Правила повторяют AddSiteInput на сервере. Окончательную проверку делает API.
export const addSiteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Минимум 2 символа")
    .max(100, "Максимум 100 символов"),
  url: z
    .string()
    .trim()
    .max(2048, "Слишком длинный адрес")
    .refine(isHttpUrl, "Введите адрес вида https://example.com"),
});

export type AddSiteValues = z.infer<typeof addSiteSchema>;

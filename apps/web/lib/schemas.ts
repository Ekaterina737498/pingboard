import { z } from "zod";

const email = z.email("Введите корректный email");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Введите пароль"),
});

// Правила совпадают с RegisterInput на сервере.
export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(72, "Максимум 72 символа")
    .regex(/[A-Za-zА-Яа-я]/, "Добавьте хотя бы одну букву")
    .regex(/[0-9]/, "Добавьте хотя бы одну цифру"),
});

export type AuthFormValues = z.infer<typeof loginSchema>;

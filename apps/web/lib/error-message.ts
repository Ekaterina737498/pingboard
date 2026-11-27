export function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message === "Invalid credentials") return "Неверный email или пароль";
  if (message === "Site not found") return "Сайт не найден";
  if (message === "Email is already registered") {
    return "Этот email уже зарегистрирован";
  }

  const limit = message.match(/^You can monitor up to (\d+) sites/)?.[1];
  if (limit) return `Можно отслеживать не больше ${limit} сайтов`;

  const seconds = message.match(/^Too many attempts.*?(\d+) seconds/)?.[1];
  if (seconds) {
    const minutes = Math.ceil(Number(seconds) / 60);
    return `Слишком много попыток. Повторите через ${minutes} мин.`;
  }

  return "Что-то пошло не так. Попробуйте ещё раз";
}

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { VerifyEmailCard } from "@/components/verify-email-card";

afterEach(() => {
  window.location.hash = "";
});

describe("VerifyEmailCard", () => {
  const button = () =>
    screen.getByRole("button", { name: "Подтвердить email" });

  it("confirms only after a click, using the token from the link", async () => {
    window.location.hash = "token=abc123";
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<VerifyEmailCard onConfirm={onConfirm} />);
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(button());

    expect(onConfirm).toHaveBeenCalledWith("abc123");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Email подтверждён",
    );
  });

  it("asks to use the link when there is no token", async () => {
    const onConfirm = vi.fn();
    render(<VerifyEmailCard onConfirm={onConfirm} />);

    await userEvent.click(button());

    expect(screen.getByRole("alert")).toHaveTextContent("по ссылке из письма");
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("EmailVerificationBanner", () => {
  it("reports that the email was queued", async () => {
    const onResend = vi.fn().mockResolvedValue(undefined);
    render(<EmailVerificationBanner onResend={onResend} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Отправить письмо ещё раз" }),
    );

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });
});

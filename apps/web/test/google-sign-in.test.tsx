import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleSignIn } from "@/components/google-sign-in";

let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
}));

describe("GoogleSignIn", () => {
  beforeEach(() => {
    query = new URLSearchParams();
  });

  it("links to the Google sign-in endpoint", () => {
    render(<GoogleSignIn />);

    expect(
      screen.getByRole("link", { name: "Войти через Google" }),
    ).toHaveAttribute("href", "/auth/google");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains why the sign-in failed", () => {
    query = new URLSearchParams("error=google_failed");

    render(<GoogleSignIn />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось войти через Google",
    );
  });
});

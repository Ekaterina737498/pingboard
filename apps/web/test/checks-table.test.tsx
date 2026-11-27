import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecksTable } from "@/components/checks-table";

const base = { checkedAt: "2026-01-01T12:00:00.000Z" };

describe("ChecksTable", () => {
  it("explains that there are no checks yet", () => {
    render(<ChecksTable checks={[]} />);

    expect(screen.getByText(/Проверок пока нет/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows successful and failed checks", () => {
    render(
      <ChecksTable
        checks={[
          {
            ...base,
            id: "1",
            ok: true,
            statusCode: 200,
            responseTimeMs: 120,
            error: null,
          },
          {
            ...base,
            id: "2",
            ok: false,
            statusCode: null,
            responseTimeMs: null,
            error: "timeout",
          },
        ]}
      />,
    );

    // Одна строка заголовка и две проверки.
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "120 мс" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "timeout" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Сбой" })).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddSiteForm } from "@/components/add-site-form";

function setup(onAdd = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  render(<AddSiteForm onAdd={onAdd} />);

  return {
    onAdd,
    user,
    name: screen.getByLabelText("Название"),
    url: screen.getByLabelText("Адрес сайта"),
    submit: screen.getByRole("button", { name: "Добавить сайт" }),
  };
}

describe("AddSiteForm", () => {
  it("shows errors and does not submit an empty form", async () => {
    const { onAdd, user, submit } = setup();

    await user.click(submit);

    expect(await screen.findByText("Минимум 2 символа")).toBeInTheDocument();
    expect(
      screen.getByText("Введите адрес вида https://example.com"),
    ).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it.each(["example.com", "ftp://example.com", "http://localhost"])(
    "rejects the address %s",
    async (address) => {
      const { onAdd, user, name, url, submit } = setup();

      await user.type(name, "Shop");
      await user.type(url, address);
      await user.click(submit);

      expect(
        await screen.findByText("Введите адрес вида https://example.com"),
      ).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    },
  );

  it("submits trimmed values and clears the form", async () => {
    const { onAdd, user, name, url, submit } = setup();

    await user.type(name, "  Shop  ");
    await user.type(url, "https://example.com");
    await user.click(submit);

    await waitFor(() => expect(name).toHaveValue(""));
    expect(onAdd).toHaveBeenCalledWith({
      name: "Shop",
      url: "https://example.com",
    });
    expect(url).toHaveValue("");
  });

  it("shows a server error and keeps the entered values", async () => {
    const onAdd = vi
      .fn()
      .mockRejectedValue(new Error("You can monitor up to 10 sites"));
    const { user, name, url, submit } = setup(onAdd);

    await user.type(name, "Shop");
    await user.type(url, "https://example.com");
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Можно отслеживать не больше 10 сайтов",
    );
    expect(name).toHaveValue("Shop");
  });
});

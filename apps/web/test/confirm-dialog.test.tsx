import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/confirm-dialog";

// jsdom не умеет открывать <dialog>, поэтому подменяем только эти два метода.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

function setup(pending = false) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Удалить «Shop»?"
      description="История проверок будет удалена."
      confirmLabel="Удалить"
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel, user: userEvent.setup() };
}

describe("ConfirmDialog", () => {
  it("opens with a title", () => {
    setup();

    expect(
      screen.getByRole("dialog", { name: "Удалить «Shop»?" }),
    ).toBeInTheDocument();
  });

  it("confirms the action", async () => {
    const { onConfirm, onCancel, user } = setup();

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels without confirming", async () => {
    const { onConfirm, onCancel, user } = setup();

    await user.click(screen.getByRole("button", { name: "Отмена" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables both buttons while the request is running", () => {
    setup(true);

    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Подождите…" })).toBeDisabled();
  });
});

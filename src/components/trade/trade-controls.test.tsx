import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberPad } from "@/components/trade/NumberPad";
import { SwipeToSubmit } from "@/components/trade/SwipeToSubmit";

describe("trade entry controls", () => {
  it("accepts digits and a single decimal up to the configured precision", () => {
    const onChange = vi.fn();
    render(<NumberPad value="12.34" onChange={onChange} maxDecimals={2} />);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Decimal point" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete last digit" }));
    expect(onChange).toHaveBeenCalledWith("12.3");
  });

  it("starts a decimal amount cleanly and deletes the last character", () => {
    const onChange = vi.fn();
    render(<NumberPad value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Decimal point" }));
    expect(onChange).toHaveBeenCalledWith("0.");
    fireEvent.click(screen.getByRole("button", { name: "Delete last digit" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("supports keyboard confirmation and respects the disabled state", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<SwipeToSubmit onConfirm={onConfirm} />);
    const submit = screen.getByRole("button", { name: "Submit trade" });
    fireEvent.keyDown(submit, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(<SwipeToSubmit onConfirm={onConfirm} disabled />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Submit trade" }), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

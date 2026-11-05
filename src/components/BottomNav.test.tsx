import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/invstock-app";

describe("bottom navigation", () => {
  afterEach(cleanup);
  it("exposes the five user-facing destinations with Discover as the label", () => {
    render(<BottomNav active="Home" onChange={() => undefined} />);

    for (const label of ["Home", "Discover", "Options", "News", "Account"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("marks the active destination and changes tabs when selected", () => {
    const onChange = vi.fn();
    render(<BottomNav active="Home" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(onChange).toHaveBeenCalledWith("Options");
  });
});

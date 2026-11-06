import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsScreen } from "@/components/news/NewsScreen";

const items = [
  { id: 1, source: "Trading Post", time: "7h 4m ago", ticker: "NVDA", name: "Nvidia", tone: "up" as const, title: "Nvidia beats estimates" },
  { id: 2, source: "Finance Daily", time: "Jan 6", ticker: "MSFT", name: "Microsoft", tone: "down" as const, title: "Microsoft hit with lawsuit" }
];

describe("News screen", () => {
  afterEach(cleanup);
  it("renders source, time, headline and ticker for each story and opens the tapped one", () => {
    const onOpen = vi.fn();
    render(<NewsScreen items={items} filter="All" onFilterChange={vi.fn()} onOpen={onOpen} />);
    expect(screen.getByRole("heading", { name: "News" })).toBeTruthy();
    expect(screen.getByText("· 7h 4m ago")).toBeTruthy();
    expect(screen.getByText("MSFT")).toBeTruthy();
    fireEvent.click(screen.getByText("Microsoft hit with lawsuit"));
    expect(onOpen).toHaveBeenCalledWith(1);
  });
  it("switches filters and shows an empty state", () => {
    const onFilterChange = vi.fn();
    render(<NewsScreen items={[]} filter="My stocks" onFilterChange={onFilterChange} onOpen={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "My stocks" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Market" }));
    expect(onFilterChange).toHaveBeenCalledWith("Market");
    expect(screen.getByText(/No headlines yet/)).toBeTruthy();
  });
});

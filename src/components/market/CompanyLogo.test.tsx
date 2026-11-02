import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { companyLogoFor } from "@/lib/company-logos";
import { createMarket } from "@/lib/market";

describe("company branding", () => {
  it("resolves a logo strategy or visible ticker fallback for every listed company and ETF", () => {
    for (const stock of createMarket()) {
      const identity = companyLogoFor(stock.ticker);
      expect(identity.fallback).toBe(stock.ticker.slice(0, 4));
      expect(identity.domain || identity.simpleIcon).toBeTruthy();
    }
  });

  it("shows the ticker fallback when the remote company logo fails", () => {
    render(<CompanyLogo ticker="MSFT" name="Microsoft" />);
    const logo = screen.getByRole("img", {name:"Microsoft logo"});
    fireEvent.error(logo);
    expect(screen.getByText("MSFT")).toBeTruthy();
  });
});

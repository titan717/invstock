import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("InvStock PWA manifest", () => {
  it("declares an installable standalone application", () => {
    const app = manifest();
    expect(app.name).toContain("InvStock");
    expect(app.short_name).toBe("InvStock");
    expect(app.start_url).toBe("/");
    expect(app.scope).toBe("/");
    expect(app.display).toBe("standalone");
    expect(app.theme_color).toBe("#0B0E11");
    expect(app.background_color).toBe("#0B0E11");
  });

  it("provides a maskable application icon", () => {
    const icons = manifest().icons ?? [];
    expect(icons.some((icon) => icon.src === "/icon.svg" && icon.purpose === "any")).toBe(true);
    expect(icons.some((icon) => icon.src === "/icon.svg" && icon.purpose === "maskable")).toBe(true);
  });
});

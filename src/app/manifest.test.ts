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
    const icon = manifest().icons?.[0];
    expect(icon?.src).toBe("/icon.svg");
    expect(icon?.purpose).toContain("maskable");
  });
});

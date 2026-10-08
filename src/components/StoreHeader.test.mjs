import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const headerPath = new URL("./StoreHeader.tsx", import.meta.url);
const header = readFileSync(headerPath, "utf8");
const logoPath = new URL("../../public/mega-utilidades-logo.jpeg", import.meta.url);

describe("store header logo", () => {
  it("uses the supplied logo image in place of the text wordmark", () => {
    expect(existsSync(logoPath)).toBe(true);
    expect(header).toContain('src="/mega-utilidades-logo.jpeg?v=2"');
    expect(header).toContain('alt="Mega Utilidades"');
    expect(header).not.toMatch(/[⭐★☆]/u);
    expect(header).not.toContain("brand.showText");
    expect(header).toMatch(/<Link[\s\S]*?<img[\s\S]*?\/>[\s\S]*?<\/Link>/);
  });

  it("uses a black background for the header", () => {
    expect(header).toMatch(/<header className="[^"]*\bstore-header\b/);
    expect(readFileSync(new URL("../styles.css", import.meta.url), "utf8")).toMatch(
      /\.store-header\s*\{\s*background-color:\s*#000000\s*!important;\s*\}/,
    );
  });
});

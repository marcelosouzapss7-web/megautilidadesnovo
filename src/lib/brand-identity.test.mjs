import { describe, expect, it } from "bun:test";
import { canAccessAdmin, getBrandPresentation, getLogoFileProblem } from "./brand-identity.ts";

describe("brand identity settings", () => {
  it("supports text, image, and combined header presentation", () => {
    expect(
      getBrandPresentation({
        brand_name: "Loja Nova",
        logo_url: "/logo.png",
        logo_display: "text",
      }),
    ).toEqual({
      name: "Loja Nova",
      logoUrl: "/logo.png",
      showImage: false,
      showText: true,
    });
    expect(
      getBrandPresentation({
        brand_name: "Loja Nova",
        logo_url: "/logo.png",
        logo_display: "image",
      }).showImage,
    ).toBe(true);
    expect(
      getBrandPresentation({
        brand_name: "Loja Nova",
        logo_url: "/logo-novo.png",
        logo_display: "image",
      }),
    ).toMatchObject({ showImage: true, showText: false, logoUrl: "/logo-novo.png" });
    expect(
      getBrandPresentation({
        brand_name: "Loja Nova",
        logo_url: "/logo.png",
        logo_display: "both",
      }),
    ).toMatchObject({ showImage: true, showText: true });
  });

  it("falls back to the brand name when no logo is available", () => {
    expect(
      getBrandPresentation({ brand_name: "  Minha Loja  ", logo_display: "image" }),
    ).toMatchObject({
      name: "Minha Loja",
      logoUrl: null,
      showImage: false,
      showText: true,
    });
    expect(getBrandPresentation(null).name).toBe("Mega Utilidades");
  });

  it("accepts only PNG, SVG, and JPG under the storage size limit", () => {
    expect(getLogoFileProblem({ name: "logo.svg", type: "image/svg+xml", size: 1024 })).toBeNull();
    expect(getLogoFileProblem({ name: "logo.jpeg", type: "image/jpeg", size: 1024 })).toBeNull();
    expect(getLogoFileProblem({ name: "logo.gif", type: "image/gif", size: 1024 })).toContain(
      "PNG, SVG ou JPG",
    );
    expect(getLogoFileProblem({ name: "logo.png", type: "image/jpeg", size: 1024 })).toContain(
      "não corresponde",
    );
    expect(
      getLogoFileProblem({ name: "logo.png", type: "image/png", size: 2 * 1024 * 1024 + 1 }),
    ).toContain("2 MB");
  });

  it("grants the admin panel only when the authenticated role check succeeds", () => {
    expect(canAccessAdmin(true, null)).toBe(true);
    expect(canAccessAdmin(false, null)).toBe(false);
    expect(canAccessAdmin(true, new Error("not authorized"))).toBe(false);
    expect(canAccessAdmin(null, null)).toBe(false);
  });
});

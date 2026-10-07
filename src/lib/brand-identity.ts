export type LogoDisplay = "text" | "image" | "both";

export type BrandSettings = {
  brand_name?: string | null | undefined;
  logo_url?: string | null | undefined;
  logo_display?: LogoDisplay | string | null | undefined;
};

export function canAccessAdmin(isAdmin: boolean | null, error: unknown): boolean {
  return error == null && isAdmin === true;
}

export function getBrandPresentation(settings: BrandSettings | null | undefined) {
  const name = settings?.brand_name?.trim() || "Mega Utilidades";
  const logoUrl = settings?.logo_url?.trim() || null;
  const mode: LogoDisplay =
    settings?.logo_display === "text" || settings?.logo_display === "image"
      ? settings.logo_display
      : "both";
  const showImage = Boolean(logoUrl && mode !== "text");
  const showText = mode !== "image" || !logoUrl;

  return { name, logoUrl, showImage, showText };
}

export function getLogoFileProblem(file: Pick<File, "name" | "type" | "size">): string | null {
  if (file.size > 2 * 1024 * 1024) return "O arquivo precisa ter até 2 MB.";

  const extension = file.name.split(".").pop()?.toLowerCase();
  const expectedType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "svg"
          ? "image/svg+xml"
          : null;

  if (!expectedType) return "Escolha um arquivo PNG, SVG ou JPG.";
  if (file.type && file.type !== expectedType)
    return "O formato do arquivo não corresponde à extensão.";
  return null;
}

export async function prepareLogoUpload(file: File): Promise<File> {
  const problem = getLogoFileProblem(file);
  if (problem) throw new Error(problem);

  const image = await createImageBitmap(file);
  try {
    if (file.type !== "image/svg+xml") return file;

    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem SVG.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível converter o SVG."))),
        "image/png",
      ),
    );
    return new File([png], `${file.name.replace(/\.svg$/i, "")}.png`, { type: "image/png" });
  } finally {
    image.close();
  }
}

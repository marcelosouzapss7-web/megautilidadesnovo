export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateProductImage(file) {
  if (!file || !ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("Cada imagem deve ter no máximo 10 MB.");
  }
}

export function createProductImagePath(productId, extension = "webp") {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Identificador de produto inválido.");
  if (extension !== "webp" && extension !== "jpg") throw new Error("Formato de imagem inválido.");
  return `${productId}/${crypto.randomUUID()}.${extension}`;
}

export async function compressProductImage(file, maxDimension = 1600) {
  validateProductImage(file);
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar esta imagem.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob;
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Não foi possível comprimir esta imagem.")),
          "image/webp",
          quality,
        );
      });
      if (blob.size <= 5 * 1024 * 1024) break;
    }
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("A imagem continua muito grande após a compressão.");
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return { blob, extension };
  } finally {
    bitmap.close();
  }
}

export async function uploadProductImage(client, productId, file, prepare = compressProductImage) {
  validateProductImage(file);
  const { blob, extension } = await prepare(file);
  const path = createProductImagePath(productId, extension);
  const { error } = await client.storage.from("products").upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return { path, url: client.storage.from("products").getPublicUrl(path).data.publicUrl };
}

export function productImagePathFromPublicUrl(value, storageBaseUrl) {
  if (typeof value !== "string" || typeof storageBaseUrl !== "string" || !storageBaseUrl)
    return null;
  const prefix = `${storageBaseUrl.replace(/\/$/, "")}/storage/v1/object/public/products/`;
  if (!value.startsWith(prefix)) return null;
  const path = decodeURIComponent(value.slice(prefix.length));
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/i.test(path) ? path : null;
}

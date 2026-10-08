import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductImagePath,
  productImagePathFromPublicUrl,
  uploadProductImage,
  validateProductImage,
} from "../src/lib/product-images.mjs";

const productId = "f0c6e9a2-954b-4ac6-a01b-49bf58174408";
const validFile = { type: "image/png", size: 1200 };

test("accepts supported image files and rejects unsupported or oversized files", () => {
  assert.doesNotThrow(() => validateProductImage(validFile));
  assert.throws(
    () => validateProductImage({ ...validFile, type: "text/html" }),
    /JPG, PNG ou WebP/,
  );
  assert.throws(() => validateProductImage({ ...validFile, size: 10 * 1024 * 1024 + 1 }), /10 MB/);
});

test("creates namespaced paths and rejects malformed product ids", () => {
  assert.match(
    createProductImagePath(productId),
    new RegExp(`^${productId}/[0-9a-f-]{36}\\.webp$`, "i"),
  );
  assert.throws(() => createProductImagePath("../products"), /Identificador/);
});

test("uploads a prepared image and returns its public URL", async () => {
  const calls = [];
  const client = {
    storage: {
      from(bucket) {
        return {
          upload: async (path, blob, options) => {
            calls.push({ bucket, path, blob, options });
            return { error: null };
          },
          getPublicUrl: (path) => ({
            data: { publicUrl: `https://storage.test/storage/v1/object/public/products/${path}` },
          }),
        };
      },
    },
  };
  const result = await uploadProductImage(client, productId, validFile, async () => ({
    blob: new Blob(["image"], { type: "image/webp" }),
    extension: "webp",
  }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bucket, "products");
  assert.equal(calls[0].options.upsert, false);
  assert.equal(result.url, `https://storage.test/storage/v1/object/public/products/${result.path}`);
  assert.equal(productImagePathFromPublicUrl(result.url, "https://storage.test"), result.path);
});

test("surfaces Storage failures and ignores URLs outside the product bucket", async () => {
  const client = {
    storage: { from: () => ({ upload: async () => ({ error: new Error("upload denied") }) }) },
  };
  await assert.rejects(
    uploadProductImage(client, productId, validFile, async () => ({
      blob: new Blob(["x"], { type: "image/webp" }),
      extension: "webp",
    })),
    /upload denied/,
  );
  assert.equal(
    productImagePathFromPublicUrl(
      "https://storage.test/storage/v1/object/public/other/x.webp",
      "https://storage.test",
    ),
    null,
  );
});

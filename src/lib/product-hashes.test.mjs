import { describe, expect, it } from "bun:test";
import {
  getChangedProductHashValues,
  getProductHashValues,
  fetchAllProductHashes,
  PRODUCT_HASH_PAGE_SIZE,
  saveProductHashChanges,
  updateProductHashDraft,
} from "./product-hashes.ts";

describe("product hash editing", () => {
  it("loads all product pages and advances using the last product id", async () => {
    const firstPage = Array.from({ length: 2 }, (_, index) => ({
      id: `000${index + 1}`,
      name: `Produto ${index + 1}`,
      product_hash: null,
      offer_hash: null,
    }));
    const secondPage = [{ id: "0003", name: "Produto 3", product_hash: null, offer_hash: null }];
    const cursors = [];
    const products = await fetchAllProductHashes(async (cursor, size) => {
      cursors.push({ cursor, size });
      return cursor === null ? firstPage : secondPage;
    }, 2);

    expect(cursors).toEqual([
      { cursor: null, size: 2 },
      { cursor: "0002", size: 2 },
    ]);
    expect(products.map((product) => product.id)).toEqual(["0001", "0002", "0003"]);
    expect(PRODUCT_HASH_PAGE_SIZE).toBe(500);
  });

  it("stops on an empty first page and surfaces failed or non-advancing pages", async () => {
    await expect(fetchAllProductHashes(async () => [])).resolves.toEqual([]);
    await expect(
      fetchAllProductHashes(async () => {
        throw new Error("token expired");
      }),
    ).rejects.toThrow("token expired");
    const fullPage = Array.from({ length: 2 }, (_, index) => ({
      id: `000${index + 1}`,
      name: `Produto ${index + 1}`,
      product_hash: null,
      offer_hash: null,
    }));
    await expect(fetchAllProductHashes(async () => fullPage, 2)).rejects.toThrow("não avançou");
  });

  it("keeps each field and product draft independent", () => {
    const first = updateProductHashDraft({}, "product-a", "product_hash", "sku-a");
    const second = updateProductHashDraft(first, "product-b", "offer_hash", "offer-b");

    expect(second).toEqual({
      "product-a": { product_hash: "sku-a" },
      "product-b": { offer_hash: "offer-b" },
    });
    expect(first).toEqual({ "product-a": { product_hash: "sku-a" } });
  });

  it("uses saved values for untouched fields and represents empty hashes", () => {
    expect(
      getProductHashValues(
        { product_hash: "existing-product", offer_hash: "existing-offer" },
        { offer_hash: "" },
      ),
    ).toEqual({ product_hash: "existing-product", offer_hash: "" });
  });

  it("saves only the hash field that changed", () => {
    expect(
      getChangedProductHashValues(
        { product_hash: "same", offer_hash: null },
        { product_hash: "same", offer_hash: "new-offer" },
      ),
    ).toEqual({ offer_hash: "new-offer" });
  });

  it("persists a product hash and reports database authorization errors", async () => {
    const products = [{ id: "product-a", name: "Produto A", product_hash: null, offer_hash: null }];
    const drafts = { "product-a": { product_hash: "new-product" } };
    const writes = [];
    const success = await saveProductHashChanges(
      products.map((product) => product.id),
      products,
      drafts,
      async (id, changes) => {
        writes.push({ id, changes });
        return { error: null };
      },
    );
    expect(writes).toEqual([{ id: "product-a", changes: { product_hash: "new-product" } }]);
    expect(success).toEqual([{ productId: "product-a", error: null }]);

    const denied = await saveProductHashChanges(["product-a"], products, drafts, async () => ({
      error: new Error("permission denied"),
    }));
    expect(denied[0].error.message).toBe("permission denied");
  });
});

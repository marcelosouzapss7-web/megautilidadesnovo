export type ProductHashFields = {
  product_hash: string;
  offer_hash: string;
};

export type ProductHashDrafts = Record<string, Partial<ProductHashFields>>;
export type ProductHashProduct = {
  id: string;
  name: string;
  product_hash: string | null;
  offer_hash: string | null;
};

export const PRODUCT_HASH_PAGE_SIZE = 500;

export async function fetchAllProductHashes(
  fetchPage: (afterId: string | null, pageSize: number) => Promise<ProductHashProduct[]>,
  pageSize = PRODUCT_HASH_PAGE_SIZE,
): Promise<ProductHashProduct[]> {
  const products: ProductHashProduct[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor, pageSize);
    if (page.length === 0) return products;

    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor || (cursor !== null && nextCursor <= cursor)) {
      throw new Error("A paginação não avançou para o próximo produto.");
    }

    products.push(...page);
    if (page.length < pageSize) return products;
    cursor = nextCursor;
  }
}

export function updateProductHashDraft(
  drafts: ProductHashDrafts,
  productId: string,
  field: keyof ProductHashFields,
  value: string,
): ProductHashDrafts {
  return {
    ...drafts,
    [productId]: {
      ...drafts[productId],
      [field]: value,
    },
  };
}

export function getProductHashValues(
  product: { product_hash: string | null; offer_hash: string | null },
  draft: Partial<ProductHashFields> | undefined,
): ProductHashFields {
  return {
    product_hash: draft?.product_hash ?? product.product_hash ?? "",
    offer_hash: draft?.offer_hash ?? product.offer_hash ?? "",
  };
}

export function getChangedProductHashValues(
  product: { product_hash: string | null; offer_hash: string | null },
  values: ProductHashFields,
): Partial<ProductHashFields> {
  const changes: Partial<ProductHashFields> = {};
  if (values.product_hash !== (product.product_hash ?? "")) {
    changes.product_hash = values.product_hash;
  }
  if (values.offer_hash !== (product.offer_hash ?? "")) {
    changes.offer_hash = values.offer_hash;
  }
  return changes;
}

export async function saveProductHashChanges(
  productIds: string[],
  products: ProductHashProduct[],
  drafts: ProductHashDrafts,
  update: (
    productId: string,
    changes: Partial<ProductHashFields>,
  ) => Promise<{ error: unknown | null }>,
) {
  return Promise.all(
    productIds.map(async (productId) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return { productId, error: new Error("Produto não encontrado") };
      const values = getProductHashValues(product, drafts[productId]);
      const changes = getChangedProductHashValues(product, values);
      if (Object.keys(changes).length === 0) return { productId, error: null };
      try {
        const { error } = await update(productId, changes);
        return { productId, error };
      } catch (error) {
        return { productId, error };
      }
    }),
  );
}

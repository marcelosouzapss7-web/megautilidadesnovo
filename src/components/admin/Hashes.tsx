import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getChangedProductHashValues,
  fetchAllProductHashes,
  getProductHashValues,
  PRODUCT_HASH_PAGE_SIZE,
  saveProductHashChanges,
  updateProductHashDraft,
  type ProductHashDrafts,
} from "@/lib/product-hashes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Hashes() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<ProductHashDrafts>({});
  const [saving, setSaving] = useState(false);
  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product-hashes"],
    queryFn: async () => {
      const products = await fetchAllProductHashes(async (afterId, pageSize) => {
        let query = supabase
          .from("products")
          .select("id,name,product_hash,offer_hash")
          .order("id", { ascending: true })
          .limit(pageSize);
        if (afterId) query = query.gt("id", afterId);
        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      }, PRODUCT_HASH_PAGE_SIZE);
      return products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    retry: false,
  });

  const changedProducts = products.filter(
    (product) =>
      Object.keys(
        getChangedProductHashValues(product, getProductHashValues(product, drafts[product.id])),
      ).length > 0,
  );

  function change(productId: string, field: "product_hash" | "offer_hash", value: string) {
    setDrafts((current) => updateProductHashDraft(current, productId, field, value));
  }

  async function save(productIds: string[]) {
    if (productIds.length === 0) return;
    setSaving(true);
    try {
      const results = await saveProductHashChanges(
        productIds,
        products,
        drafts,
        async (productId, changes) =>
          await supabase.from("products").update(changes).eq("id", productId),
      );

      const failed = results.filter((result) => result.error);
      const succeeded = results.filter((result) => !result.error).map((result) => result.productId);
      if (succeeded.length > 0) {
        setDrafts((current) => {
          const next = { ...current };
          succeeded.forEach((id) => delete next[id]);
          return next;
        });
        await queryClient.invalidateQueries({ queryKey: ["product-hashes"] });
      }
      if (failed.length > 0)
        toast.error(
          "Não foi possível salvar todos os hashes. Confira seu acesso e tente novamente.",
        );
      else
        toast.success(
          succeeded.length === 1
            ? "Hashes do produto salvos"
            : "Hashes salvos para todos os produtos",
        );
    } catch {
      toast.error("Não foi possível salvar os hashes. Confira sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Hashes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os hashes de produto e oferta de forma independente.
          </p>
        </div>
        <Button
          onClick={() => save(changedProducts.map((product) => product.id))}
          disabled={saving || changedProducts.length === 0}
        >
          {saving ? "Salvando…" : "Salvar Todos"}
        </Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Carregando produtos…</p> : null}
      {isError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-background p-4 text-sm text-destructive"
        >
          Não foi possível carregar os produtos. Atualize a página e tente novamente.
        </p>
      ) : null}
      {!isLoading && !isError && products.length === 0 ? (
        <p className="rounded-lg bg-background p-4 text-sm text-muted-foreground">
          Nenhum produto cadastrado.
        </p>
      ) : null}
      {!isLoading && !isError && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => {
            const values = getProductHashValues(product, drafts[product.id]);
            const dirty = Object.keys(getChangedProductHashValues(product, values)).length > 0;
            return (
              <section
                key={product.id}
                className="grid gap-4 rounded-xl bg-background p-4 shadow-sm lg:grid-cols-[minmax(10rem,0.8fr)_1fr_1fr_auto] lg:items-end"
              >
                <h2 className="min-w-0 break-words font-semibold">{product.name}</h2>
                <div className="space-y-2">
                  <Label htmlFor={`product-hash-${product.id}`}>product_hash</Label>
                  <Input
                    id={`product-hash-${product.id}`}
                    value={values.product_hash}
                    onChange={(event) => change(product.id, "product_hash", event.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`offer-hash-${product.id}`}>offer_hash</Label>
                  <Input
                    id={`offer-hash-${product.id}`}
                    value={values.offer_hash}
                    onChange={(event) => change(product.id, "offer_hash", event.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => save([product.id])}
                  disabled={saving || !dirty}
                >
                  Salvar
                </Button>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

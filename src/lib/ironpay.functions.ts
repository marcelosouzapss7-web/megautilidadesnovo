import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const schema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(99), size: z.string().max(10) })).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(255),
    phone: z.string().regex(/^\d{10,11}$/),
    document: z.string().regex(/^\d{11}$|^\d{14}$/),
    zip: z.string().regex(/^\d{8}$/).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
  }),
});

export const criarPix = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const token = process.env["IRONPAY_API_TOKEN"];
    const offer = process.env["IRONPAY_OFFER_HASH"];
    const productHash = process.env["IRONPAY_PRODUCT_HASH"];
    if (!token || !offer || !productHash) return { ok: false as const, error: "Pagamento Pix ainda não configurado." };

    // Preços sempre conferidos no banco (nunca confiar no navegador)
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
    });
    const ids = [...new Set(data.items.map((i) => i.id))];
    const { data: prods, error } = await sb.from("products").select("id,name,price").in("id", ids);
    if (error || !prods) return { ok: false as const, error: "Não foi possível conferir os produtos." };

    const cart = data.items.map((i) => {
      const p = prods.find((x) => x.id === i.id);
      if (!p) throw new Error("Produto não encontrado");
      return { product_hash: productHash, title: `${p.name} ${i.size}`.slice(0, 200), cover: null, price: Math.round(Number(p.price) * 100), quantity: i.qty, operation_type: 1, tangible: true };
    });
    const amount = cart.reduce((s, c) => s + c.price * c.quantity, 0);

    const res = await fetch(`https://api.ironpayapp.com.br/api/public/v1/transactions?api_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        amount, offer_hash: offer, payment_method: "pix",
        customer: {
          name: data.customer.name, email: data.customer.email, phone_number: data.customer.phone, document: data.customer.document,
          zip_code: data.customer.zip, number: data.customer.number, complement: data.customer.complement,
        },
        cart, expire_in_days: 1, transaction_origin: "api",
      }),
    });
    const text = await res.text();
    if (!res.ok) { console.error(`IronPay [${res.status}]: ${text}`); return { ok: false as const, error: "A IronPay recusou o pagamento. Confira seus dados e tente novamente." }; }
    const j = JSON.parse(text);
    const t = j.data ?? j;
    const pixCode = t.pix_code ?? t.pix?.pix_qr_code ?? t.pix_qr_code ?? null;
    const qr = t.qr_code ?? t.pix?.qr_code_base64 ?? null;
    if (!pixCode) { console.error("IronPay sem código Pix:", text); return { ok: false as const, error: "Não foi possível gerar o Pix." }; }
    return { ok: true as const, hash: String(t.hash ?? ""), pixCode: String(pixCode), qrCode: qr ? String(qr) : null, amount };
  });

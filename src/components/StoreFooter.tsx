import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Instagram, Facebook, MessageCircle } from "lucide-react";

const grupos = [
  { titulo: "SOBRE NÓS", itens: ["nossas lojas", "quem somos", "seja um(a) revendedor(a)", "trabalhe conosco"] },
  { titulo: "ATENDIMENTO AO CLIENTE", itens: ["minha conta", "pedidos", "perguntas frequentes"] },
  { titulo: "TERMOS E CONDIÇÕES", itens: ["política de privacidade", "pagamento", "troca e devolução"] },
];

const pagamentos = ["VISA", "Master", "Diners", "AMEX", "Hipercard", "elo", "pix", "Boleto", "PicPay", "CREDZ"];

function TikTok() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z" />
    </svg>
  );
}

export function StoreFooter() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const titulo = "pb-4 pt-8 text-center text-base font-bold text-foreground";

  return (
    <footer className="bg-muted px-4 pb-10 pt-8 text-foreground">
      <h2 className="text-center text-base font-bold">INSCREVA-SE PARA RECEBER NOSSAS NOVIDADES</h2>
      <form
        onSubmit={(e) => { e.preventDefault(); if (email) { setOk(true); setEmail(""); } }}
        className="mt-4 flex items-center border-b border-muted-foreground/40 pb-2"
      >
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="seu e-mail*"
          className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-foreground"
        />
        <button type="submit" aria-label="Enviar" className="text-muted-foreground"><ArrowRight className="h-5 w-5" /></button>
      </form>
      {ok && <p className="mt-2 text-center text-xs text-primary">Inscrição realizada!</p>}
      <p className="mt-4 text-center text-xs leading-relaxed">
        eu li e entendi a política de privacidade e concordo em receber a newsletter e outras comunicações de marketing, conforme nela estabelecido.
      </p>

      {grupos.map((g) => (
        <div key={g.titulo}>
          <h3 className={titulo}>{g.titulo}</h3>
          <div className="grid grid-cols-2 gap-3">
            {g.itens.map((i) => (
              <a key={i} href="#" className="rounded-md bg-background px-2 py-3 text-center text-sm text-foreground/80 shadow-sm">{i}</a>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 flex justify-center gap-3">
        {[Instagram, Facebook].map((I, k) => (
          <a key={k} href="#" className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><I className="h-6 w-6" /></a>
        ))}
        <a href="#" className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><TikTok /></a>
      </div>

      {settings?.payment_logo_url ? (
        <img src={settings.payment_logo_url} alt="Formas de pagamento" className="mx-auto mt-6 max-h-24 max-w-full object-contain" />
      ) : (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {pagamentos.map((p) => (
            <span key={p} className="rounded bg-background px-2 py-0.5 text-[11px] font-bold italic text-foreground/80">{p}</span>
          ))}
        </div>
      )}

      <a href="https://wa.me/5511918509381" target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><MessageCircle className="h-6 w-6" /></span>
        <span className="leading-tight">
          <span className="block text-lg font-bold">(11) 9.1850-9381</span>
          <span className="block text-xs">seg. a sex. 9h às 18h</span>
        </span>
      </a>

      <div className="mt-8 border-t border-muted-foreground/20 pt-8 text-center text-xs leading-relaxed">
        <p>Manchester Comércio Varejista de Roupas e Acessórios Ltda</p>
        <p>CNPJ: 37.729.889/0006-87</p>
        <p>Avenida Benedito Quina da Silva, 586, Galpão B3</p>
        <p>Loteamento Multivias - Jundiaí - SP</p>
      </div>
    </footer>
  );
}

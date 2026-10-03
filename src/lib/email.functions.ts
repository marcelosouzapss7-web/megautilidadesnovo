import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const enviarEmailPagamentoAprovado = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any

    // Verifica se o chamador é admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (!isAdmin) throw new Error('Acesso negado')

    const { data: pedido, error } = await supabase
      .from('orders')
      .select('id, total, customer')
      .eq('id', data.orderId)
      .single()
    if (error || !pedido) throw new Error('Pedido não encontrado')

    const email = pedido.customer?.email
    if (!email) throw new Error('Pedido sem e-mail do cliente')

    const total = Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const result = await sendTemplateEmail('pagamento-aprovado', email, {
      templateData: {
        nome: pedido.customer?.name ?? '',
        pedidoId: `#${pedido.id.slice(0, 8)}`,
        total,
      },
      idempotencyKey: `pagamento-aprovado-${pedido.id}`,
    })
    return result
  })

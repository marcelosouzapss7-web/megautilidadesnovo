import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nome?: string
}

const Email = ({ nome }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Pagamento em análise — MEGA SHOPPING</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>MEGA SHOPPING</Heading>
        </Section>
        <Heading style={title}>Pagamento em análise</Heading>
        <Text style={text}>{nome ? `Olá, ${nome}!` : 'Olá!'}</Text>
        <Text style={text}>
          O seu pedido foi recebido e está <b>em análise</b> neste momento. Estamos com
          uma <b>alta demanda de pedidos</b>, e assim que o pagamento for <b>aprovado</b>,
          <b>entraremos em contato</b> com você.
        </Text>
        <Text style={text}>
          Percebemos que o <b>pagamento do seu pedido ainda não foi finalizado</b>.
          Para garantir seus itens, <b>volte à loja e finalize a compra</b> — é rápido e
          leva menos de um minuto.
        </Text>
        <Section style={ctaBox}>
          <Button style={cta} href="https://megashoppingribeirao.shop">
            Voltar à loja e finalizar compra
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          MEGA SHOPPING — Ribeirão Preto
          <br />
          Este é um e-mail automático referente ao seu pedido. Em caso de dúvidas, responda esta mensagem.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Pagamento em análise — MEGA SHOPPING',
  displayName: 'Pagamento em análise',
  previewData: { nome: 'Maria' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px 25px' }
const header = { backgroundColor: '#FFC10E', borderRadius: '8px', padding: '16px', textAlign: 'center' as const }
const logo = { color: '#E6000C', fontSize: '24px', fontWeight: 800, margin: 0 }
const title = { color: '#111111', fontSize: '22px', marginTop: '24px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '24px' }
const ctaBox = { textAlign: 'center' as const, margin: '24px 0' }
const cta = { backgroundColor: '#FFC10E', color: '#111111', fontWeight: 700, padding: '12px 28px', borderRadius: '8px', textDecoration: 'none' }
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const footer = { color: '#888888', fontSize: '12px', lineHeight: '18px' }

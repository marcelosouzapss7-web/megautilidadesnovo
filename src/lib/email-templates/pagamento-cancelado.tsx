import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nome?: string
}

const Email = ({ nome }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sobre o seu pedido — MEGA SHOPPING</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>MEGA SHOPPING</Heading>
        </Section>
        <Heading style={title}>Sobre o seu pedido</Heading>
        <Text style={text}>{nome ? `Olá, ${nome}!` : 'Olá!'}</Text>
        <Text style={text}>
          Infelizmente, o produto do seu pedido está <b>sem estoque</b> no momento.
        </Text>
        <Text style={text}>
          <b>Nenhum valor será cobrado</b> por este pedido. Caso o valor já tenha sido
          debitado, <b>será totalmente estornado</b> em poucos dias úteis.
        </Text>
        <Text style={text}>
          Em breve, entraremos em contato com você. Em caso de dúvidas, responda esta
          mensagem que nossa equipe ajudará você.
        </Text>
        <Section style={ctaBox}>
          <Button style={cta} href="https://megashoppingribeirao.shop">
            Voltar para a loja
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
  subject: 'Sobre o seu pedido — MEGA SHOPPING',
  displayName: 'Pagamento cancelado',
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

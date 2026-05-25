/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NGCAD LMS'

interface Props {
  name?: string
  otp?: string
}

const PasswordResetOtpEmail = ({ name, otp }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} password reset code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Reset Code</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hello,'} we received a request to reset your {SITE_NAME} password.
          Use the code below to continue. It expires in 10 minutes.
        </Text>
        <Section style={otpBox}>
          <Text style={otpText}>{otp ?? '000000'}</Text>
        </Section>
        <Text style={text}>
          If you did not request this, you can safely ignore this email.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetOtpEmail,
  subject: 'Your NGCAD LMS password reset code',
  displayName: 'Password reset code',
  previewData: { name: 'Ali', otp: '482913' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: 'hsl(213, 50%, 20%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 18px' }
const otpBox = { background: 'hsl(213, 90%, 96%)', border: '1px solid hsl(213, 70%, 80%)', borderRadius: '8px', padding: '18px', textAlign: 'center' as const, margin: '12px 0 22px' }
const otpText = { fontSize: '32px', fontWeight: 700, letterSpacing: '8px', color: 'hsl(213, 80%, 35%)', margin: 0 }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
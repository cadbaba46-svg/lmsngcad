/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NGCAD LMS'

interface Props { name?: string }

const PasswordResetConfirmationEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} password was changed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Changed Successfully</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hello,'} your {SITE_NAME} account password has been reset successfully.
          You can now log in with your new password.
        </Text>
        <Text style={text}>
          If you did not perform this action, please contact the academy administration immediately.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetConfirmationEmail,
  subject: 'Your NGCAD LMS password has been reset',
  displayName: 'Password reset confirmation',
  previewData: { name: 'Ali' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: 'hsl(213, 50%, 20%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 18px' }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
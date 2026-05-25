/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NGCAD LMS'
const LOGIN_URL = 'https://lms.ngcad.org/login'

interface Props {
  name?: string
  email?: string
  password?: string
  rollNumber?: string
}

const WelcomeCredentialsEmail = ({ name, email, password, rollNumber }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — your login credentials</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to {SITE_NAME}</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hello,'} your account has been created. Below are your login
          credentials. For security, you will be required to change your password on first login.
        </Text>
        <Section style={creds}>
          {rollNumber && (
            <Text style={credRow}><b>Registration No:</b> {rollNumber}</Text>
          )}
          <Text style={credRow}><b>Email:</b> {email}</Text>
          <Text style={credRow}><b>Temporary Password:</b> {password}</Text>
        </Section>
        <Button href={LOGIN_URL} style={btn}>Log in to LMS</Button>
        <Text style={footer}>
          Keep this email confidential. If you did not expect this account, please contact the academy.
          <br />— The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeCredentialsEmail,
  subject: 'Welcome to NGCAD LMS — your login credentials',
  displayName: 'Welcome credentials',
  previewData: { name: 'Ali Khan', email: 'student@example.com', password: 'Temp@1234', rollNumber: 'NGCAD-2026-1234' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: 'hsl(213, 50%, 20%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 18px' }
const creds = { background: 'hsl(213, 90%, 96%)', border: '1px solid hsl(213, 70%, 85%)', borderRadius: '8px', padding: '16px 18px', margin: '12px 0 22px' }
const credRow = { fontSize: '14px', color: '#222', margin: '4px 0' }
const btn = { background: 'hsl(213, 80%, 45%)', color: '#fff', padding: '12px 22px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#888', margin: '28px 0 0', lineHeight: 1.6 }
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as passwordResetOtp } from './password-reset-otp.tsx'
import { template as passwordResetConfirmation } from './password-reset-confirmation.tsx'
import { template as welcomeCredentials } from './welcome-credentials.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'password-reset-otp': passwordResetOtp,
  'password-reset-confirmation': passwordResetConfirmation,
  'welcome-credentials': welcomeCredentials,
}
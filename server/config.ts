export type RuntimeMode = 'development' | 'test' | 'production';

function truthy(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function runtimeMode(): RuntimeMode {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

export function demoApiAllowed(): boolean {
  return runtimeMode() !== 'production' && truthy(process.env.ALLOW_DEMO_API ?? 'true');
}

export function allowedOrigins(): string[] {
  return (process.env.APP_ORIGINS || process.env.VITE_APP_URL || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export interface ReadinessCheck {
  key: string;
  ready: boolean;
  required: boolean;
  message: string;
}

export function getReadinessChecks(): ReadinessCheck[] {
  const production = runtimeMode() === 'production';
  const has = (...keys: string[]) => keys.every((key) => Boolean(process.env[key]?.trim()));
  return [
    { key: 'supabase', ready: has('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'), required: true, message: 'Supabase server credentials' },
    { key: 'frontendSupabase', ready: has('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'), required: true, message: 'Supabase browser credentials' },
    { key: 'origins', ready: allowedOrigins().every((origin) => /^https:\/\//.test(origin) || !production), required: true, message: 'Trusted HTTPS application origins' },
    { key: 'cron', ready: has('CRON_SECRET'), required: production, message: 'Scheduled job authentication secret' },
    { key: 'fileScan', ready: has('FILE_SCAN_API_URL', 'FILE_SCAN_API_KEY'), required: production, message: 'Malware scanning service' },
    { key: 'viva', ready: has('VIVAWALLET_CLIENT_ID', 'VIVAWALLET_CLIENT_SECRET', 'VIVAWALLET_SOURCE_CODE', 'VIVAWALLET_WEBHOOK_KEY'), required: false, message: 'Viva Wallet payments' },
    { key: 'email', ready: has('RESEND_API_KEY', 'EMAIL_FROM'), required: false, message: 'Transactional email' },
    { key: 'sms', ready: has('SMS_PROVIDER', 'SMS_API_KEY', 'SMS_FROM'), required: false, message: 'SMS notifications' },
    { key: 'mydata', ready: has('AADE_USER_ID', 'AADE_SUBSCRIPTION_KEY'), required: false, message: 'AADE/myDATA transport' },
    { key: 'ocr', ready: has('ANTHROPIC_API_KEY'), required: false, message: 'Receipt OCR' },
  ];
}

export function assertProductionConfiguration(): void {
  if (runtimeMode() !== 'production') return;
  const missing = getReadinessChecks().filter((check) => check.required && !check.ready);
  if (missing.length) throw new Error(`Production configuration incomplete: ${missing.map((item) => item.message).join(', ')}`);
}

export function integrationEnabled(name: 'viva' | 'email' | 'sms' | 'mydata' | 'ocr'): boolean {
  return getReadinessChecks().find((check) => check.key === name)?.ready ?? false;
}

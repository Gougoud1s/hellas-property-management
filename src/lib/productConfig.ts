export type ProductMode = 'single-tenant' | 'multi-tenant';

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const productConfig = {
  mode: (env.VITE_PRODUCT_MODE === 'multi-tenant' ? 'multi-tenant' : 'single-tenant') as ProductMode,
  tenantId: env.VITE_SINGLE_TENANT_ID || '10000000-0000-4000-8000-000000000011',
  tenantName: env.VITE_SINGLE_TENANT_NAME || 'Anastassiadis Group',
};

export function isSingleTenant(): boolean {
  return productConfig.mode === 'single-tenant';
}

export function userAllowedInDeployment(user: { tenantId: string; role: string }): boolean {
  const allowedTenantIds = new Set([productConfig.tenantId, 'tenant-anastassiadis']);
  return !isSingleTenant() || (user.role !== 'platform_admin' && allowedTenantIds.has(user.tenantId));
}

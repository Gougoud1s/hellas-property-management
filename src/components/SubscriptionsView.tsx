import React, { useMemo } from 'react';
import { BadgeEuro, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  SubscriptionStatus,
  TenantSubscription
} from '../types';

interface SubscriptionsViewProps {
  subscriptions: TenantSubscription[];
  canManage: boolean;
  onUpdateSubscription: (subscription: TenantSubscription) => void;
}

const PLAN_ORDER: SubscriptionPlan[] = ['starter', 'professional', 'enterprise'];
const STATUS_ORDER: SubscriptionStatus[] = ['trial', 'active', 'past_due', 'canceled'];

const STATUS_META: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: 'Ενεργή', className: 'bg-teal-50 text-teal-700' },
  trial: { label: 'Δοκιμή', className: 'bg-sky-50 text-sky-700' },
  past_due: { label: 'Ληξιπρόθεσμη', className: 'bg-amber-50 text-amber-700' },
  canceled: { label: 'Ακυρωμένη', className: 'bg-surface-container-high text-on-surface-variant' }
};

export default function SubscriptionsView({ subscriptions, canManage, onUpdateSubscription }: SubscriptionsViewProps) {
  const metrics = useMemo(() => {
    const billable = subscriptions.filter((s) => s.status !== 'canceled');
    const mrr = billable.reduce((sum, s) => sum + SUBSCRIPTION_PLANS[s.plan].pricePerMonth, 0);
    const counts = STATUS_ORDER.reduce(
      (acc, status) => ({ ...acc, [status]: subscriptions.filter((s) => s.status === status).length }),
      {} as Record<SubscriptionStatus, number>
    );
    return { mrr, counts, active: counts.active };
  }, [subscriptions]);

  const selectClass = 'rounded-lg border border-outline bg-surface-container-lowest px-2 py-1 text-xs font-semibold outline-none focus:border-primary';

  return (
    <div id="subscriptions-view" className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
          <CreditCard className="h-5 w-5" />
          Συνδρομές πλατφόρμας
        </h2>
        <p className="mt-1 text-sm text-outline">
          {canManage
            ? 'Διαχείριση των συνδρομών όλων των tenants της πλατφόρμας.'
            : 'Προβολή των συνδρομών (μόνο ανάγνωση).'}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-outline">
            <TrendingUp className="h-4 w-4 text-primary" />
            MRR
          </div>
          <div className="mt-2 text-2xl font-black text-primary">{metrics.mrr.toLocaleString('el-GR')}€</div>
          <div className="text-[11px] text-outline">μηνιαία έσοδα</div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-outline">
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
            Ενεργές
          </div>
          <div className="mt-2 text-2xl font-black text-on-surface">{metrics.active}</div>
          <div className="text-[11px] text-outline">από {subscriptions.length} συνολικά</div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-outline">
            <BadgeEuro className="h-4 w-4 text-sky-600" />
            Δοκιμές
          </div>
          <div className="mt-2 text-2xl font-black text-on-surface">{metrics.counts.trial}</div>
          <div className="text-[11px] text-outline">σε trial</div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-outline">
            <CreditCard className="h-4 w-4 text-amber-600" />
            Ληξιπρόθεσμες
          </div>
          <div className="mt-2 text-2xl font-black text-on-surface">{metrics.counts.past_due}</div>
          <div className="text-[11px] text-outline">απαιτούν προσοχή</div>
        </div>
      </div>

      {/* Plan catalog */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const info = SUBSCRIPTION_PLANS[plan];
          return (
            <div key={plan} className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="text-sm font-black uppercase text-primary">{info.label}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-on-surface">{info.pricePerMonth}€</span>
                <span className="text-xs text-outline">/μήνα</span>
              </div>
              <div className="mt-1 text-xs text-outline">
                {info.propertiesLimit === null ? 'Απεριόριστες πολυκατοικίες' : `Έως ${info.propertiesLimit} πολυκατοικίες`}
              </div>
              <ul className="mt-4 space-y-1.5">
                {info.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-teal-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Subscriptions table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-xs font-bold uppercase tracking-wide text-outline">
                <th className="px-6 py-4">Tenant</th>
                <th className="w-40 px-6 py-4">Πλάνο</th>
                <th className="w-40 px-6 py-4">Κατάσταση</th>
                <th className="w-24 px-6 py-4">Θέσεις</th>
                <th className="w-36 px-6 py-4">Ανανέωση</th>
                <th className="w-28 px-6 py-4 text-right">€/μήνα</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-container-low/40">
                  <td className="px-6 py-4 font-bold text-on-surface">{sub.tenantName}</td>
                  <td className="px-6 py-4">
                    {canManage ? (
                      <select
                        value={sub.plan}
                        onChange={(e) => onUpdateSubscription({ ...sub, plan: e.target.value as SubscriptionPlan })}
                        className={selectClass}
                      >
                        {PLAN_ORDER.map((plan) => (
                          <option key={plan} value={plan}>{SUBSCRIPTION_PLANS[plan].label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold text-on-surface">{SUBSCRIPTION_PLANS[sub.plan].label}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {canManage ? (
                      <select
                        value={sub.status}
                        onChange={(e) => onUpdateSubscription({ ...sub, status: e.target.value as SubscriptionStatus })}
                        className={selectClass}
                      >
                        {STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>{STATUS_META[status].label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[sub.status].className}`}>
                        {STATUS_META[sub.status].label}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {canManage ? (
                      <input
                        type="number"
                        min={1}
                        value={sub.seats}
                        onChange={(e) => onUpdateSubscription({ ...sub, seats: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-20 rounded-lg border border-outline bg-surface-container-lowest px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                      />
                    ) : (
                      <span className="text-on-surface-variant">{sub.seats}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{sub.renewalDate}</td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">{SUBSCRIPTION_PLANS[sub.plan].pricePerMonth}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

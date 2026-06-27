import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Building2, CreditCard, FileDown, LifeBuoy, WalletCards } from 'lucide-react';
import { AuthUser } from '../lib/auth';
import { Issue, Property, Unit } from '../types';
import PaymentLinkModal from './PaymentLinkModal';
import StatementPrintView from './StatementPrintView';

interface Props { currentUser: AuthUser; properties: Property[]; units: Unit[]; issues: Issue[]; onOpenIssues: () => void; }

export default function OwnerDashboardView({ currentUser, properties, units, issues, onOpenIssues }: Props) {
  const [payUnit, setPayUnit] = useState<Unit | null>(null);
  const total = units.reduce((sum, unit) => sum + Math.max(0, unit.balance), 0);
  const openIssues = issues.filter((issue) => issue.status !== 'Resolved');
  const property = properties[0];
  const dueDate = useMemo(() => new Date(2026, 6, 10).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' }), []);
  return <div className="owner-dashboard space-y-6">
    <section className="owner-welcome"><div><span>Καλημέρα, {currentUser.fullName.split(' ')[0]}</span><h1>Το σπίτι σας, χωρίς εκκρεμότητες.</h1><p>{property?.name} · {property?.address}</p></div><Building2 size={42}/></section>
    <div className="owner-metrics"><article className="balance-card"><div><span>Συνολικό υπόλοιπο</span><strong>{total.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}</strong><small>Πληρωμή έως {dueDate}</small></div><WalletCards/><button onClick={() => setPayUnit(units.find((unit) => unit.balance > 0) || units[0])}>Πληρωμή τώρα <ArrowUpRight size={16}/></button></article><article><LifeBuoy/><span>Ανοιχτές βλάβες</span><strong>{openIssues.length}</strong><button onClick={onOpenIssues}>Προβολή αιτημάτων</button></article><article><FileDown/><span>Τελευταίο ειδοποιητήριο</span><strong>{property?.period || '—'}</strong><button onClick={() => window.print()}>Λήψη PDF</button></article></div>
    <section className="owner-section"><header><div><span className="eyebrow">Οι μονάδες μου</span><h2>Υπόλοιπα και πληρωμές</h2></div></header><div className="unit-balance-list">{units.map((unit) => <article key={unit.id}><div className="unit-mark">{unit.id}</div><div><strong>{unit.type} · {unit.floor}</strong><span>{unit.ownerName}</span></div><div className={unit.balance > 0 ? 'amount-due' : 'amount-clear'}>{unit.balance > 0 ? `${unit.balance.toFixed(2)} €` : 'Εξοφλημένο'}</div><button disabled={unit.balance <= 0} onClick={() => setPayUnit(unit)}><CreditCard size={16}/> Πληρωμή</button></article>)}</div></section>
    {openIssues.length > 0 && <div className="owner-alert"><AlertTriangle/><div><strong>{openIssues[0].title}</strong><span>Κατάσταση: {openIssues[0].status}</span></div><button onClick={onOpenIssues}>Λεπτομέρειες</button></div>}
    {property && units[0] && <StatementPrintView property={property} unit={units[0]}/>} {payUnit && property && <PaymentLinkModal unit={payUnit} property={property} onClose={() => setPayUnit(null)}/>} 
  </div>;
}

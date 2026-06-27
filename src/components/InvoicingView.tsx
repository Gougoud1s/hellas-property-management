import { useMemo, useState } from 'react';
import { BadgeCheck, Ban, Braces, Landmark, Loader2, Send } from 'lucide-react';
import { Expense, Property, Unit } from '../types';
import { MyDataTransmission } from '../featureTypes';

interface Props {
  property: Property | null;
  properties: Property[];
  expenses: Expense[];
  units: Unit[];
}

export default function InvoicingView({ property, properties, expenses, units }: Props) {
  const storageKey = 'hpm_mydata_transmissions';
  const [records, setRecords] = useState<MyDataTransmission[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const rows = useMemo(() => properties.map((item) => {
    const existing = records.find((record) => record.propertyId === item.id && record.period === item.period);
    return existing || { id: `mydata-${item.id}-${item.period}`, propertyId: item.id, period: item.period, status: 'draft' as const };
  }), [properties, records]);

  const persist = (next: MyDataTransmission[]) => {
    setRecords(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const transmit = async (row: MyDataTransmission) => {
    setBusyId(row.id);
    try {
      const selected = properties.find((item) => item.id === row.propertyId)!;
      const response = await fetch('/api/mydata/transmit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: selected, period: row.period, expenses: expenses.filter((e) => e.propertyId === row.propertyId), units: units.filter((u) => u.propertyId === row.propertyId) })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Transmission failed');
      persist([...records.filter((item) => item.id !== row.id), { ...row, status: 'transmitted', mark: String(payload.mark), transmittedAt: new Date().toISOString() }]);
    } catch (error) {
      persist([...records.filter((item) => item.id !== row.id), { ...row, status: 'error', errorMessage: error instanceof Error ? error.message : 'Transmission failed' }]);
    } finally { setBusyId(null); }
  };

  const cancel = async (row: MyDataTransmission) => {
    if (!row.mark) return;
    await fetch(`/api/mydata/cancel/${row.mark}`, { method: 'POST' });
    persist(records.map((item) => item.id === row.id ? { ...item, status: 'cancelled' } : item));
  };

  return <div className="space-y-6">
    <section className="feature-hero">
      <div><div className="eyebrow">AADE · myDATA</div><h1>Ηλεκτρονικά παραστατικά</h1><p>Έλεγχος, προεπισκόπηση και ασφαλής διαβίβαση των δημοσιευμένων περιόδων.</p></div>
      <div className="compliance-seal"><Landmark size={22}/><span>13.1</span><small>Κοινόχρηστα</small></div>
    </section>
    <div className="feature-table-wrap">
      <table className="feature-table"><thead><tr><th>Πολυκατοικία / περίοδος</th><th>Κατάσταση</th><th>ΜΑΡΚ</th><th className="text-right">Ενέργειες</th></tr></thead>
        <tbody>{rows.map((row) => { const item = properties.find((p) => p.id === row.propertyId)!; return <tr key={row.id}>
          <td><strong>{item.name}</strong><small>{row.period} · {item.status === 'Published' ? 'Δημοσιευμένη' : 'Πρόχειρη περίοδος'}</small></td>
          <td><span className={`status-pill status-${row.status}`}>{row.status === 'transmitted' ? 'Διαβιβάστηκε' : row.status === 'cancelled' ? 'Ακυρώθηκε' : row.status === 'error' ? 'Σφάλμα' : 'Πρόχειρο'}</span></td>
          <td className="font-mono">{row.mark || '—'}</td>
          <td><div className="table-actions"><button className="icon-action" onClick={() => setPreviewId(previewId === row.id ? null : row.id)} title="XML preview"><Braces size={16}/></button>{row.status === 'transmitted' ? <button className="danger-action" onClick={() => cancel(row)}><Ban size={15}/> Ακύρωση</button> : <button className="primary-action" disabled={busyId === row.id || item.status !== 'Published'} onClick={() => transmit(row)}>{busyId === row.id ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Διαβίβαση</button>}</div></td>
        </tr>})}</tbody></table>
    </div>
    {previewId && <div className="xml-preview"><div><BadgeCheck size={18}/> Προεπισκόπηση IAPR</div><pre>{`<invoice issuer="EL099999999" type="13.1" currency="EUR">\n  <property>${property?.name || 'Portfolio property'}</property>\n  <period>${rows.find((r) => r.id === previewId)?.period}</period>\n  <classification category="common-expenses" />\n</invoice>`}</pre></div>}
  </div>;
}

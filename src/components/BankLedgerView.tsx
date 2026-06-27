import React, { useState } from 'react';
import { CheckCircle2, ArrowLeftRight, Check, Sparkles, Landmark, Plus, Link2 } from 'lucide-react';
import { Property, Unit, BankTransaction, PaymentLedger } from '../types';
import PaymentLinkModal from './PaymentLinkModal';

interface BankLedgerViewProps {
  selectedProperty: Property | null;
  units: Unit[];
  bankTransactions: BankTransaction[];
  paymentLedger: PaymentLedger[];
  onMatchPayment: (transactionId: string, unitId: string, amount: number) => void;
  onAddCashPayment: (unitId: string, amount: number, payer: string) => void;
  onSelectPropertyPrompt: () => void;
  canReconcileBank: boolean;
}

export default function BankLedgerView({
  selectedProperty,
  units,
  bankTransactions,
  paymentLedger,
  onMatchPayment,
  onAddCashPayment,
  onSelectPropertyPrompt,
  canReconcileBank
}: BankLedgerViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'ledger'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cash Logging States
  const [showCashForm, setShowCashForm] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashPayer, setCashPayer] = useState('');

  // Celebrate animation state
  const [celebrateId, setCelebrateId] = useState<string | null>(null);

  // Payment link modal
  const [paymentLinkUnit, setPaymentLinkUnit] = useState<Unit | null>(null);

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">account_balance_wallet</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να συνδυάσετε τραπεζικά εμβάσματα ή να δείτε το καθολικό πληρωμών.
        </p>
        <button
          onClick={onSelectPropertyPrompt}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0d5c63]"
        >
          Μετάβαση στις Πολυκατοικίες
        </button>
      </div>
    );
  }

  const handleMatchClick = (tx: BankTransaction) => {
    const matchedUnit = units.find((u) => u.id === tx.suggestedUnit);
    if (!matchedUnit) return;

    // Trigger celebration styling
    setCelebrateId(tx.id);
    setTimeout(() => {
      onMatchPayment(tx.id, matchedUnit.id, tx.amount);
      setCelebrateId(null);
    }, 1200);
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !cashAmount || !cashPayer) return;

    onAddCashPayment(selectedUnitId, Number(cashAmount), cashPayer);

    // Reset Form
    setSelectedUnitId('');
    setCashAmount('');
    setCashPayer('');
    setShowCashForm(false);
  };

  return (
    <div id="bank-ledger-container" className="space-y-6">
      {/* Portfolio Info Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            className="h-16 w-16 rounded-lg object-cover border border-outline-variant"
            src={selectedProperty.imageUrl}
            alt={selectedProperty.name}
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name} — Οικονομικό Καθολικό</h2>
            <p className="text-sm text-outline font-medium">Τραπεζικές Καταθέσεις & Συμφωνία Λογαριασμών</p>
          </div>
        </div>

        {canReconcileBank && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const unitsWithBalance = units.filter((u) => u.balance > 0);
                setPaymentLinkUnit(unitsWithBalance[0] ?? units[0] ?? null);
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#004349] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63] transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Σύνδεσμος Πληρωμής
            </button>
            <button
              onClick={() => setShowCashForm(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#97462f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#772e19] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Μετρητά
            </button>
          </div>
        )}
      </div>

      {/* Sub tabs switches */}
      <div className="border-b border-outline-variant/50 flex gap-6">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeSubTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Εκκρεμείς Καταθέσεις Τραπέζης ({bankTransactions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeSubTab === 'ledger'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Ιστορικό Πληρωμών ({paymentLedger.length})
        </button>
      </div>

      {activeSubTab === 'pending' ? (
        <div className="space-y-4">
          <div className="bg-primary/5 rounded-xl p-4 border border-[#0d5c63]/20 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-primary uppercase">Έξυπνη Συμφωνία Πληρωμών (Smart Match)</h4>
              <p className="text-xs text-outline-variant text-on-surface mt-1 leading-relaxed">
                Το σύστημα αναγνωρίζει αυτόματα τις καταθέσεις τραπέζης συγκρίνοντας τις καταθέσεις, τις ονομασίες και τις οφειλές.
                {canReconcileBank ? ' Πατήστε Έγκριση Match για να εξοφληθεί η αντίστοιχη μονάδα και να ενημερωθούν τα υπόλοιπα.' : ' Η συμφωνία πληρωμών ολοκληρώνεται από την εταιρεία διαχείρισης.'}
              </p>
            </div>
          </div>

          {/* Pending table feed */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low text-xs font-bold text-outline border-b border-outline-variant/50">
                  <th className="px-6 py-4">ΗΜΕΡΟΜΗΝΙΑ</th>
                  <th className="px-6 py-4">ΤΡΑΠΕΖΑ / ΚΩΔ. ΑΝΑΦΟΡΑΣ</th>
                  <th className="px-6 py-4">ΑΙΤΙΟΛΟΓΙΑ ΚΑΤΑΘΕΣΗΣ</th>
                  <th className="px-6 py-4 text-right">ΠΟΣΟ</th>
                  <th className="px-6 py-4 text-center">ΑΥΤΟΜΑΤΗ ΠΡΟΤΑΣΗ ΣΥΜΦΩΝΙΑΣ</th>
                  {canReconcileBank && <th className="px-6 py-4 text-center">ΕΝΕΡΓΕΙΑ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium">
                {bankTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={canReconcileBank ? 6 : 5} className="px-6 py-10 text-center text-outline">
                      Δεν υπάρχουν εκκρεμείς τραπεζικές συναλλαγές προς συμφωνία. Όλα τα εμβάσματα έχουν αντιστοιχηθεί!
                    </td>
                  </tr>
                ) : (
                  bankTransactions.map((tx) => {
                    const isCelebrating = celebrateId === tx.id;
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-all duration-500 ${
                          isCelebrating ? 'bg-teal-50 scale-95 opacity-50' : 'hover:bg-surface-container-low/30'
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-xs text-outline">{tx.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                            <Landmark className="h-3.5 w-3.5 text-primary" />
                            {tx.bank}
                          </div>
                          <div className="text-[10px] text-outline font-mono mt-0.5">REF: {tx.ref}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-on-surface-variant max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[#97462f]">
                          {tx.amount.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tx.suggestedUnit ? (
                            <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 text-xs">
                              <span className="h-5 w-5 rounded bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center font-mono">
                                {tx.suggestedUnit}
                              </span>
                              <span className="text-teal-800 font-semibold">{tx.suggestedOwner}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-outline italic">Δεν βρέθηκε πρότυπο</span>
                          )}
                        </td>
                        {canReconcileBank && (
                          <td className="px-6 py-4 text-center">
                            {tx.suggestedUnit ? (
                              <button
                                onClick={() => handleMatchClick(tx)}
                                disabled={!!celebrateId}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-all flex items-center gap-1 mx-auto ${
                                  isCelebrating
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-primary text-white hover:bg-[#0d5c63]'
                                }`}
                              >
                                {isCelebrating ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 animate-bounce" />
                                    Έγινε Match!
                                  </>
                                ) : (
                                  <>
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                    Έγκριση Match
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-outline italic">Χειροκίνητη Αντιστοίχιση</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Historical ledger */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low text-xs font-bold text-outline border-b border-outline-variant/50">
                  <th className="px-6 py-4">ΗΜΕΡΟΜΗΝΙΑ</th>
                  <th className="px-6 py-4">ΚΑΤΑΘΕΤΗΣ</th>
                  <th className="px-6 py-4">ΜΟΝΑΔΑ</th>
                  <th className="px-6 py-4">ΚΩΔΙΚΟΣ ΣΥΝΑΛΛΑΓΗΣ</th>
                  <th className="px-6 py-4 text-right">ΠΟΣΟ</th>
                  <th className="px-6 py-4 text-center">ΜΕΘΟΔΟΣ</th>
                  <th className="px-6 py-4 text-center">ΤΥΠΟΣ MATCH</th>
                  <th className="px-6 py-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium">
                {paymentLedger.map((pay) => (
                  <tr key={pay.id} className="hover:bg-surface-container-low/20">
                    <td className="px-6 py-4 font-mono text-xs text-outline">{pay.date}</td>
                    <td className="px-6 py-4 font-semibold text-on-surface">{pay.payer}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs font-mono">
                        {pay.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-outline">{pay.paymentCode}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#0d5c63]">
                      {pay.amount.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                        pay.method === 'Τράπεζα' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {pay.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        pay.matchType === 'ΑΥΤΟΜΑΤΗ'
                          ? 'bg-teal-50 text-teal-700'
                          : pay.matchType === 'ΧΕΙΡΟΚΙΝΗΤΗ'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {pay.matchType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {paymentLinkUnit && selectedProperty && (
        <PaymentLinkModal
          unit={paymentLinkUnit}
          property={selectedProperty}
          onClose={() => setPaymentLinkUnit(null)}
        />
      )}

      {/* Cash Logging Modal Popup Form */}
      {showCashForm && canReconcileBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest p-6 shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
              <h2 className="text-lg font-bold text-primary">Καταγραφή Πληρωμής Μετρητών</h2>
              <button onClick={() => setShowCashForm(false)} className="rounded-full p-1 hover:bg-surface-container text-outline">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCashSubmit} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΕΠΙΛΟΓΗ ΜΟΝΑΔΑΣ *</label>
                <select
                  required
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    const unit = units.find((u) => u.id === e.target.value);
                    if (unit) {
                      setCashPayer(unit.residentName || unit.ownerName);
                      setCashAmount(unit.balance.toString());
                    }
                  }}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Επιλέξτε Διαμέρισμα</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Διαμέρισμα {u.id} (Οφειλή: {u.balance.toLocaleString('el-GR')} €)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΟΝΟΜΑΤΕΠΩΝΥΜΟ ΚΑΤΑΘΕΤΗ *</label>
                <input
                  type="text"
                  required
                  placeholder="π.χ. Παπαδόπουλος Ιωάννης"
                  value={cashPayer}
                  onChange={(e) => setCashPayer(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΠΟΣΟ ΕΙΣΠΡΑΞΗΣ (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex gap-3 border-t border-outline-variant/50 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCashForm(false)}
                  className="flex-1 rounded-lg border border-outline px-4 py-2 text-sm font-semibold hover:bg-surface-container"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5c63]"
                >
                  Καταγραφή
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

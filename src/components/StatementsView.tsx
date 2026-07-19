import React, { useEffect, useState } from 'react';
import { FileText, Printer, Check, Send, Eye, AlertCircle, Layers, CreditCard, MailCheck, RotateCcw, History, X } from 'lucide-react';
import { Property, Unit, Expense, DistributionRule, AccountNotice, StatementBatch } from '../types';
import PaymentLinkModal from './PaymentLinkModal';
import {
  buildStatements,
  calculateCategoryShare,
  getCategoryTotals,
  resolveChargeResponsibility,
  statementCurrentCharges,
  getIssuedExpenses
} from '../lib/propertyStatementAdapter';

interface StatementsViewProps {
  selectedProperty: Property | null;
  units: Unit[];
  allocationUnits: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
  onPublishPeriod: () => void;
  onPublishCorrection: (expenseIds: string[], reason: string) => Promise<void> | void;
  onSelectPropertyPrompt: () => void;
  canPublishStatements: boolean;
  notices: AccountNotice[];
  onSaveNotices: (notices: AccountNotice[]) => void;
  organizationName: string;
  focusSection?: 'issuance' | 'notices';
  statementBatches: StatementBatch[];
}

export default function StatementsView({
  selectedProperty,
  units,
  allocationUnits,
  expenses,
  rules,
  onPublishPeriod,
  onPublishCorrection,
  onSelectPropertyPrompt,
  canPublishStatements,
  notices,
  onSaveNotices,
  organizationName,
  focusSection,
  statementBatches
}: StatementsViewProps) {
  const [selectedUnitForInvoice, setSelectedUnitForInvoice] = useState<Unit | null>(null);
  const [paymentLinkUnit, setPaymentLinkUnit] = useState<Unit | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isPublishingCorrection, setIsPublishingCorrection] = useState(false);
  useEffect(() => {
    if (!focusSection) return;
    const target = document.getElementById(focusSection === 'notices' ? 'notice-delivery-section' : 'statement-issuance-section');
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [focusSection]);

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">table_chart</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να συντάξετε τους μηνιαίους λογαριασμούς κοινοχρήστων.
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

  const verifiedExpenses = expenses.filter((e) => e.status === 'Verified');
  const calculationExpenses = selectedProperty.status === 'Published' && !canPublishStatements && statementBatches.length > 0
    ? getIssuedExpenses(expenses, statementBatches)
    : expenses;
  const calculationVerifiedExpenses = calculationExpenses.filter((expense) => expense.status === 'Verified');
  const includedExpenseIds = new Set(statementBatches.flatMap((batch) => batch.expenseIds));
  const correctionExpenses = selectedProperty.status === 'Published'
    ? verifiedExpenses.filter((expense) => !includedExpenseIds.has(expense.id))
    : [];
  const correctionTotal = correctionExpenses.reduce((total, expense) => total + expense.amount, 0);
  const correctionBatches = statementBatches.filter((batch) => batch.kind === 'correction').sort((a, b) => b.sequence - a.sequence);
  const totalVerifiedExpenses = calculationVerifiedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const categoryTotals = getCategoryTotals(calculationExpenses);
  const expensesByCategory = categoryTotals.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = item.amount;
    return acc;
  }, {});
  const generatedStatements = buildStatements({
    period: selectedProperty.period,
    units: allocationUnits,
    expenses: calculationExpenses,
    rules
  });
  const statementsByUnit = new Map(generatedStatements.map((statement) => [statement.unitCode, statement]));

  const calculateUnitShareForCategory = (unit: Unit, category: string, totalCategoryAmount: number): number => {
    return calculateCategoryShare({ unit, category, amount: totalCategoryAmount, units: allocationUnits, rules });
  };

  const calculateUnitTotalCharges = (unit: Unit): number => {
    const statement = statementsByUnit.get(unit.id);
    return statement ? statementCurrentCharges(statement) : 0;
  };

  const sendNotices = (targetUnits: Unit[]) => {
    const sentAt = new Date().toISOString();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueDate = due.toISOString().slice(0, 10);
    onSaveNotices(targetUnits.map((unit) => ({
      id: `${selectedProperty.id}:${selectedProperty.period}:${unit.id}`,
      tenantId: selectedProperty.tenantId || '', propertyId: selectedProperty.id, unitId: unit.id,
      period: selectedProperty.period,
      recipient: unit.ownerEmail || unit.ownerPhone || unit.residentName || unit.ownerName,
      amount: unit.prevBalance + calculateUnitTotalCharges(unit),
      channel: unit.ownerEmail ? 'email' : unit.ownerPhone ? 'sms' : 'print',
      status: 'sent', sentAt, dueDate
    })));
  };

  const publishCorrection = async () => {
    if (!correctionReason.trim() || correctionExpenses.length === 0) return;
    setIsPublishingCorrection(true);
    try {
      await onPublishCorrection(correctionExpenses.map((expense) => expense.id), correctionReason.trim());
      setCorrectionReason('');
      setShowCorrectionDialog(false);
    } finally {
      setIsPublishingCorrection(false);
    }
  };

  return (
    <div id="statements-view-container" className="space-y-6">
      {/* Portfolio Info Bar */}
      <div id="statement-issuance-section" className="scroll-mt-24 flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            className="h-16 w-16 rounded-lg object-cover border border-outline-variant"
            src={selectedProperty.imageUrl}
            alt={selectedProperty.name}
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name} — Κοινόχρηστα</h2>
            <p className="text-sm text-outline font-medium">Σύνταξη Λογαριασμών • {selectedProperty.period}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">Σταθερό αποθεματικό {(selectedProperty.reserveFund ?? 0).toLocaleString('el-GR')} €</span>
              <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-700">Διαθέσιμο ταμείο {(selectedProperty.cashAvailable ?? 0).toLocaleString('el-GR')} €</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canPublishStatements && (
            <button onClick={() => sendNotices(units)} disabled={units.length === 0} className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50">
              <MailCheck className="h-4 w-4" /> Αποστολή ειδοποιητηρίων
            </button>
          )}
          {selectedProperty.status === 'Draft' && canPublishStatements ? (
            <button
              onClick={onPublishPeriod}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
              Οριστικοποίηση & Δημοσίευση
            </button>
          ) : selectedProperty.status === 'Published' ? (
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-4 py-2.5 text-xs font-bold text-teal-800">
              <Check className="h-4 w-4 text-teal-600" />
              Εκδόθηκε & Δημοσιεύθηκε
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest border border-outline-variant px-4 py-2.5 text-xs font-bold text-outline">
              <Eye className="h-4 w-4" />
              Προβολή περιόδου
            </div>
          )}
        </div>
      </div>

      {selectedProperty.status === 'Published' && correctionExpenses.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm" aria-labelledby="correction-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-700" />
                <h3 id="correction-heading" className="font-bold text-amber-950">Νέα έξοδα μετά την αρχική έκδοση</h3>
              </div>
              <p className="mt-1 text-sm text-amber-900">
                {correctionExpenses.length} {correctionExpenses.length === 1 ? 'εγκεκριμένο έξοδο' : 'εγκεκριμένα έξοδα'} συνολικής αξίας <strong>{correctionTotal.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</strong> δεν έχει χρεωθεί.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {correctionExpenses.map((expense) => (
                  <span key={expense.id} className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950">
                    {expense.supplier} · {expense.amount.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                  </span>
                ))}
              </div>
            </div>
            {canPublishStatements && (
              <button onClick={() => setShowCorrectionDialog(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-900">
                <RotateCcw className="h-4 w-4" /> Διορθωτική έκδοση
              </button>
            )}
          </div>
        </section>
      )}

      {correctionBatches.length > 0 && (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><History className="h-4 w-4" /> Ιστορικό διορθωτικών εκδόσεων</h3>
          <div className="mt-3 divide-y divide-outline-variant/40">
            {correctionBatches.map((batch) => (
              <div key={batch.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div><strong className="text-primary">Δ{String(batch.sequence).padStart(2, '0')}</strong><span className="ml-2 text-on-surface">{batch.reason}</span></div>
                <div className="text-xs text-outline">{batch.expenseIds.length} έξοδα · {Object.values(batch.unitCharges).reduce((sum, amount) => sum + amount, 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })} € · {new Date(batch.createdAt).toLocaleDateString('el-GR')}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verified expenses compiled breakdown */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-3 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          ΣΥΝΟΛΟ ΕΓΚΕΚΡΙΜΕΝΩΝ ΕΞΟΔΩΝ ΠΡΟΣ ΚΑΤΑΝΟΜΗ: <span className="font-mono text-secondary text-sm">{totalVerifiedExpenses.toLocaleString('el-GR')} €</span>
        </h3>
        {verifiedExpenses.length === 0 ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg mt-3 text-xs text-amber-800 font-medium">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span>
              Δεν υπάρχουν εγκεκριμένες δαπάνες προς κατανομή. Παρακαλούμε μεταβείτε στην καρτέλα <b>Έξοδα & Δαπάνες</b> και εγκρίνετε τα τιμολόγια (status verified) για να εκδοθούν τα κοινόχρηστα.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-5 text-center">
            {Object.entries(expensesByCategory).map(([cat, amt]) => (
              <div key={cat} className="bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30">
                <div className="text-[10px] font-bold text-outline uppercase">{cat}</div>
                <div className="text-sm font-extrabold text-primary mt-1 font-mono">{amt.toLocaleString('el-GR')} €</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statement Table */}
      <div id="notice-delivery-section" className="scroll-mt-24 overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-low/20">
          <h3 className="font-bold text-primary text-sm uppercase">Αναλυτικος Πινακας Κοινοχρηστων</h3>
          <span className="text-[10px] text-outline font-bold">Κλικ σε μια σειρά για προεπισκόπηση ειδοποιητηρίου</span>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-bold text-outline border-b border-outline-variant/50">
              <th className="px-6 py-3.5">ΜΟΝΑΔΑ</th>
              <th className="px-6 py-3.5">ΕΝΟΙΚΟΣ / ΙΔΙΟΚΤΗΤΗΣ</th>
              <th className="px-6 py-3.5 text-right">ΠΡΟΗΓ. ΥΠΟΛΟΙΠΟ</th>
              {Object.keys(expensesByCategory).map((cat) => (
                <th key={cat} className="px-4 py-3.5 text-right uppercase text-[10px]">{cat}</th>
              ))}
              <th className="px-6 py-3.5 text-right">ΤΡΕΧΟΥΣΑ ΧΡΕΩΣΗ</th>
              <th className="px-6 py-3.5 text-right">ΕΚΔΟΘΗΚΕ</th>
              <th className="px-6 py-3.5 text-right">ΠΛΗΡΩΘΗΚΕ</th>
              <th className="px-6 py-3.5 text-right">ΥΠΟΛΟΙΠΟ</th>
              <th className="px-6 py-3.5 text-center">ΕΙΔΟΠΟΙΗΤΗΡΙΟ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 font-medium">
            {units.map((unit) => {
              const statement = statementsByUnit.get(unit.id);
              const currentCharges = statement?.currentCharges || calculateUnitTotalCharges(unit);
              const totalPayable = statement?.totalDue || unit.prevBalance + currentCharges;
              const remaining = Math.max(0, unit.balance);
              const paid = Math.max(0, Math.round((totalPayable - remaining) * 100) / 100);
              return (
                <tr
                  key={unit.id}
                  onClick={() => setSelectedUnitForInvoice(unit)}
                  className="hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs font-mono">
                      {unit.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-on-surface font-semibold">{unit.residentName || unit.ownerName}</div>
                    <div className="text-[10px] text-outline font-medium">{unit.residentType}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-outline">
                    {unit.prevBalance > 0 ? `${unit.prevBalance.toLocaleString('el-GR')} €` : '0,00 €'}
                  </td>
                  {Object.entries(expensesByCategory).map(([cat, amt]) => {
                    const share = calculateUnitShareForCategory(unit, cat, amt);
                    return (
                      <td key={cat} className="px-4 py-4 text-right font-mono text-on-surface-variant text-xs">
                        {share > 0 ? `${share.toFixed(2)} €` : '—'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right font-mono text-[#0d5c63] font-bold">
                    {currentCharges.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-[#97462f] font-extrabold">
                    {totalPayable.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-teal-700">
                    {paid.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-extrabold text-[#97462f]">
                    {remaining.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {notices.some((notice) => notice.unitId === unit.id && notice.period === selectedProperty.period && notice.status === 'sent') ? (
                      <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700"><Check className="h-3 w-3" /> Εστάλη</span>
                    ) : canPublishStatements ? (
                      <button onClick={() => sendNotices([unit])} className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100"><Send className="h-3 w-3" /> Αποστολή</button>
                    ) : null}
                    <div>
                    <button
                      onClick={() => setSelectedUnitForInvoice(unit)}
                      className="inline-flex items-center gap-1 rounded bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 text-xs font-bold text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Εικόνα
                    </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Viva Wallet Payment Link Modal */}
      {paymentLinkUnit && (
        <PaymentLinkModal
          unit={paymentLinkUnit}
          property={selectedProperty}
          onClose={() => setPaymentLinkUnit(null)}
        />
      )}

      {/* Greek Invoice Statement Preview Dialog Modal */}
      {selectedUnitForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#004349] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#90d2da]" />
                <span className="font-bold tracking-wide">ΠΡΟΕΠΙΣΚΟΠΗΣΗ ΕΙΔΟΠΟΙΗΤΗΡΙΟΥ (Unit {selectedUnitForInvoice.id})</span>
              </div>
              <button
                onClick={() => setSelectedUnitForInvoice(null)}
                className="rounded-full p-1 hover:bg-white/10 text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* printable document container */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-50 font-sans" id="printable-statement">
              <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-lg max-w-xl mx-auto space-y-6">
                
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-5">
                  <div>
                    <h1 className="text-lg font-extrabold tracking-tight text-[#004349]">{organizationName.toUpperCase()}</h1>
                    <p className="text-[10px] text-gray-500 font-medium">ΔΙΑΧΕΙΡΙΣΗ ΚΑΙ ΣΥΝΤΗΡΗΣΗ ΚΤΙΡΙΩΝ</p>
                    <p className="text-[10px] text-gray-500 mt-1">info@hellaspm.gr • 210-9993311</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-bold text-gray-800">ΕΙΔΟΠΟΙΗΤΗΡΙΟ</h2>
                    <p className="text-xs text-gray-600 font-bold mt-1 uppercase">{selectedProperty.period}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">ΚΩΔ: {selectedProperty.id}-{selectedUnitForInvoice.id}</p>
                  </div>
                </div>

                {/* Building / Unit metadata block */}
                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-gray-500 block">ΚΤΙΡΙΟ / ΔΙΕΥΘΥΝΣΗ</span>
                    <span className="font-bold text-gray-800 mt-0.5 block">{selectedProperty.name}</span>
                    <span className="text-gray-600 block">{selectedProperty.address}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-500 block">ΔΙΑΜΕΡΙΣΜΑ / ΕΝΟΙΚΟΣ</span>
                    <span className="font-bold text-[#97462f] mt-0.5 block">Διαμέρισμα {selectedUnitForInvoice.id} ({selectedUnitForInvoice.floor})</span>
                    <span className="font-semibold text-gray-800 block">{selectedUnitForInvoice.residentName || selectedUnitForInvoice.ownerName}</span>
                    <span className="text-gray-500 block">Χιλιοστά: {selectedUnitForInvoice.share.toFixed(1)}‰</span>
                  </div>
                </div>

                {/* Detailed split table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-1">Ανάλυση Δαπανών Περιόδου</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                      <span>ΚΑΤΗΓΟΡΙΑ ΔΑΠΑΝΗΣ</span>
                      <span>ΣΥΝΟΛΟ ΚΤΙΡΙΟΥ</span>
                      <span className="text-right">ΜΕΡΙΔΙΟ ΔΙΑΜΕΡΙΣΜΑΤΟΣ</span>
                    </div>

                    <div className="divide-y divide-gray-100 text-xs font-medium">
                      {Object.entries(expensesByCategory).map(([cat, amt]) => {
                        const unitShare = calculateUnitShareForCategory(selectedUnitForInvoice, cat, amt);
                        const line = statementsByUnit
                          .get(selectedUnitForInvoice.id)
                          ?.lines.find((candidate) => candidate.categoryCode === cat);
                        const responsibility = resolveChargeResponsibility(
                          selectedUnitForInvoice,
                          line?.responsibleParty || 'resident_or_tenant'
                        );
                        return (
                          <div key={cat} className="flex justify-between py-2">
                            <span className="text-gray-700">
                              {cat}
                              <span className="mt-0.5 block text-[10px] text-gray-400">
                                Υπόχρεος: {responsibility.payerName} · {responsibility.label}
                              </span>
                            </span>
                            <span className="text-gray-500 font-mono">{amt.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                            <span className="font-bold font-mono text-gray-900 text-right">{unitShare.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Summary Accounting details */}
                <div className="border-t border-gray-200 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Προηγούμενο Ανεξόφλητο Υπόλοιπο</span>
                    <span className="font-mono">{selectedUnitForInvoice.prevBalance.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Σύνολο Τρεχουσών Δαπανών</span>
                    <span className="font-mono text-[#0d5c63] font-bold">+{calculateUnitTotalCharges(selectedUnitForInvoice).toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Καταχωρημένες πληρωμές</span>
                    <span className="font-mono font-bold text-teal-700">−{Math.max(0, selectedUnitForInvoice.prevBalance + calculateUnitTotalCharges(selectedUnitForInvoice) - selectedUnitForInvoice.balance).toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-[#97462f] border-t border-dashed border-gray-300 pt-3">
                    <span>ΥΠΟΛΟΙΠΟ ΠΡΟΣ ΠΛΗΡΩΜΗ</span>
                    <span className="font-mono">{Math.max(0, selectedUnitForInvoice.balance).toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>

                {/* Payment Slip section */}
                <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-[#004349]/5 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-[#004349] uppercase tracking-wider">Οδηγίες Εξόφλησης</div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    Παρακαλούμε για την έγκαιρη εξόφληση εντός 30 ημερών.
                    Χρησιμοποιήστε τον μοναδικό κωδικό πληρωμής: <b className="font-mono text-primary bg-white px-1.5 py-0.5 rounded border border-gray-200">{selectedProperty.id}-{selectedUnitForInvoice.id}</b>
                  </p>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-100 p-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Printer className="h-4 w-4" />
                Εκτύπωση
              </button>
              <button
                onClick={() => {
                  setPaymentLinkUnit(selectedUnitForInvoice);
                  setSelectedUnitForInvoice(null);
                }}
                className="flex-1 rounded-lg bg-[#004349] text-white px-4 py-2.5 text-xs font-bold hover:bg-[#0d5c63] flex items-center justify-center gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Πληρωμή Online (Viva)
              </button>
              <button
                onClick={() => setSelectedUnitForInvoice(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold hover:bg-gray-50"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="correction-dialog-title">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="correction-dialog-title" className="text-lg font-bold text-primary">Διορθωτική έκδοση Δ{String(Math.max(0, ...statementBatches.map((batch) => batch.sequence)) + 1).padStart(2, '0')}</h2>
                <p className="mt-1 text-sm text-outline">Θα εκδοθούν νέα ειδοποιητήρια μόνο για τα {correctionTotal.toLocaleString('el-GR', { minimumFractionDigits: 2 })} € των νέων εξόδων.</p>
              </div>
              <button onClick={() => setShowCorrectionDialog(false)} className="rounded-lg p-2 text-outline hover:bg-surface-container" aria-label="Κλείσιμο"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
              <p className="font-bold text-on-surface">Τι θα συμβεί</p>
              <p className="mt-1 text-xs leading-relaxed text-outline">Η αρχική έκδοση και οι πληρωμές της δεν αλλάζουν. Δημιουργείται ξεχωριστή χρέωση ανά διαμέρισμα, νέα προθεσμία 30 ημερών και αντίστοιχη υπενθύμιση ημερολογίου.</p>
            </div>
            <label className="mt-5 block text-xs font-bold text-outline" htmlFor="correction-reason">ΑΙΤΙΟΛΟΓΙΑ *</label>
            <textarea id="correction-reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={3} placeholder="π.χ. Εκπρόθεσμη παραλαβή λογαριασμού ΕΥΔΑΠ Ιουλίου" className="mt-1.5 w-full rounded-lg border border-outline bg-white p-3 text-base outline-none focus:border-primary" />
            <div className="mt-6 flex gap-3 border-t border-outline-variant pt-4">
              <button onClick={() => setShowCorrectionDialog(false)} className="flex-1 rounded-lg border border-outline px-4 py-2.5 text-sm font-semibold hover:bg-surface-container">Ακύρωση</button>
              <button onClick={publishCorrection} disabled={!correctionReason.trim() || isPublishingCorrection} className="flex-1 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-900 disabled:opacity-50">{isPublishingCorrection ? 'Έκδοση…' : 'Έκδοση & Αποστολή'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

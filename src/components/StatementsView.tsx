import React, { useState } from 'react';
import { FileText, Printer, Check, Send, Eye, AlertCircle, Layers, CreditCard } from 'lucide-react';
import { Property, Unit, Expense, DistributionRule } from '../types';
import PaymentLinkModal from './PaymentLinkModal';
import {
  buildStatements,
  calculateCategoryShare,
  getCategoryTotals,
  resolveChargeResponsibility,
  statementCurrentCharges
} from '../lib/propertyStatementAdapter';

interface StatementsViewProps {
  selectedProperty: Property | null;
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
  onPublishPeriod: () => void;
  onSelectPropertyPrompt: () => void;
  canPublishStatements: boolean;
}

export default function StatementsView({
  selectedProperty,
  units,
  expenses,
  rules,
  onPublishPeriod,
  onSelectPropertyPrompt,
  canPublishStatements
}: StatementsViewProps) {
  const [selectedUnitForInvoice, setSelectedUnitForInvoice] = useState<Unit | null>(null);
  const [paymentLinkUnit, setPaymentLinkUnit] = useState<Unit | null>(null);

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
  const totalVerifiedExpenses = verifiedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const categoryTotals = getCategoryTotals(expenses);
  const expensesByCategory = categoryTotals.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = item.amount;
    return acc;
  }, {});
  const generatedStatements = buildStatements({
    period: selectedProperty.period,
    units,
    expenses,
    rules
  });
  const statementsByUnit = new Map(generatedStatements.map((statement) => [statement.unitCode, statement]));

  const calculateUnitShareForCategory = (unit: Unit, category: string, totalCategoryAmount: number): number => {
    return calculateCategoryShare({ unit, category, amount: totalCategoryAmount, units, rules });
  };

  const calculateUnitTotalCharges = (unit: Unit): number => {
    const statement = statementsByUnit.get(unit.id);
    return statement ? statementCurrentCharges(statement) : 0;
  };

  return (
    <div id="statements-view-container" className="space-y-6">
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
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name} — Κοινόχρηστα</h2>
            <p className="text-sm text-outline font-medium">Σύνταξη Λογαριασμών • {selectedProperty.period}</p>
          </div>
        </div>

        <div className="flex gap-3">
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
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
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
              <th className="px-6 py-3.5 text-right">ΣΥΝΟΛΟ ΠΛΗΡΩΤΕΟ</th>
              <th className="px-6 py-3.5 text-center">ΕΙΔΟΠΟΙΗΤΗΡΙΟ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 font-medium">
            {units.map((unit) => {
              const statement = statementsByUnit.get(unit.id);
              const currentCharges = statement?.currentCharges || calculateUnitTotalCharges(unit);
              const totalPayable = statement?.totalDue || unit.prevBalance + currentCharges;
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
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedUnitForInvoice(unit)}
                      className="inline-flex items-center gap-1 rounded bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 text-xs font-bold text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Εικόνα
                    </button>
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
                    <h1 className="text-lg font-extrabold tracking-tight text-[#004349]">HELLAS PROPERTY MANAGEMENT</h1>
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
                  <div className="flex justify-between text-base font-extrabold text-[#97462f] border-t border-dashed border-gray-300 pt-3">
                    <span>ΤΕΛΙΚΟ ΠΟΣΟ ΠΛΗΡΩΜΗΣ</span>
                    <span className="font-mono">{(selectedUnitForInvoice.prevBalance + calculateUnitTotalCharges(selectedUnitForInvoice)).toLocaleString('el-GR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>

                {/* Payment Slip section */}
                <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-[#004349]/5 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-[#004349] uppercase tracking-wider">Οδηγίες Εξόφλησης</div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    Παρακαλούμε για την έγκαιρη εξόφληση έως τις <b>30/06/2026</b>.
                    Κατάθεση σε Alpha Bank με μοναδικό κωδικό πληρωμής: <b className="font-mono text-primary bg-white px-1.5 py-0.5 rounded border border-gray-200">HELLAS-{selectedProperty.id}-{selectedUnitForInvoice.id}</b>
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
    </div>
  );
}

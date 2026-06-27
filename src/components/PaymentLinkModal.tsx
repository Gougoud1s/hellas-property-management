import React, { useState } from 'react';
import { X, Link2, Copy, ExternalLink, CheckCircle2, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Unit, Property } from '../types';

interface PaymentLinkModalProps {
  unit: Unit;
  property: Property;
  onClose: () => void;
}

type Step = 'configure' | 'generating' | 'ready' | 'error';

export default function PaymentLinkModal({ unit, property, onClose }: PaymentLinkModalProps) {
  const defaultAmount = unit.balance > 0 ? unit.balance.toFixed(2) : '';
  const [amount, setAmount] = useState(defaultAmount);
  const [step, setStep] = useState<Step>('configure');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('generating');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          amount: Number(amount),
          ownerName: unit.ownerName,
          ownerEmail: unit.ownerEmail,
          propertyName: property.name,
          period: property.period,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Failed to create payment order');
      }

      const data = await res.json() as { checkoutUrl: string; orderCode: string | number; demo: boolean };
      setCheckoutUrl(data.checkoutUrl);
      setOrderCode(String(data.orderCode));
      setIsDemo(data.demo);
      setStep('ready');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Αδυναμία δημιουργίας συνδέσμου πληρωμής.');
      setStep('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkoutUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#004349] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <CreditCard className="h-5 w-5 text-[#90d2da]" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Αποστολή Συνδέσμου Πληρωμής</div>
              <div className="text-[11px] text-white/60 font-medium">
                {property.name} · Διαμ. {unit.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Payer info strip */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 p-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#004349]/10 text-[#004349] font-extrabold text-sm font-mono">
              {unit.id}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{unit.ownerName}</div>
              <div className="text-xs text-gray-500">{unit.ownerEmail || 'Χωρίς email'} · {unit.residentType}</div>
            </div>
            {unit.balance > 0 && (
              <div className="ml-auto text-right">
                <div className="text-[10px] text-gray-500 font-semibold uppercase">Εκκρεμής Οφειλή</div>
                <div className="font-extrabold text-[#97462f] font-mono text-sm">
                  {unit.balance.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                </div>
              </div>
            )}
          </div>

          {/* Step: configure */}
          {(step === 'configure' || step === 'error') && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                  Ποσό προς είσπραξη (€) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-sm font-mono font-bold outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#004349]/10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">€</span>
                </div>
              </div>

              {step === 'error' && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-800 leading-relaxed">
                <span className="font-bold">Viva Wallet Smart Checkout</span> — δημιουργείται ασφαλής σύνδεσμος πληρωμής με κάρτα ή IRIS.
                Ο ιδιοκτήτης μπορεί να πληρώσει χωρίς εγγραφή.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#004349] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d5c63] transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Δημιουργία Συνδέσμου
                </button>
              </div>
            </form>
          )}

          {/* Step: generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#004349]" />
              <div className="text-sm font-semibold text-gray-600">Δημιουργία παραγγελίας Viva Wallet…</div>
            </div>
          )}

          {/* Step: ready */}
          {step === 'ready' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-700">
                <CheckCircle2 className="h-5 w-5 text-teal-500" />
                <span className="font-bold text-sm">
                  Σύνδεσμος έτοιμος
                  {isDemo && <span className="ml-2 rounded bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">DEMO MODE</span>}
                </span>
              </div>

              {isDemo && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
                  Ο server τρέχει σε demo mode (χωρίς Viva credentials). Ο σύνδεσμος είναι ενδεικτικός.
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Κωδικός Παραγγελίας</span>
                  <span className="font-mono text-xs font-bold text-gray-800">{orderCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Ποσό</span>
                  <span className="font-mono text-sm font-extrabold text-[#97462f]">
                    {Number(amount).toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>

              {/* URL copy field */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Σύνδεσμος Πληρωμής</span>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <span className="flex-1 text-xs font-mono text-gray-700 truncate">{checkoutUrl}</span>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      copied
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Αντιγράφηκε!' : 'Αντιγραφή'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Κλείσιμο
                </button>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-[#004349] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d5c63] transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Άνοιγμα Checkout
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

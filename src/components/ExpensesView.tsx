import React, { useState, useRef } from 'react';
import { Search, Plus, Trash2, CheckCircle2, AlertCircle, FileText, UploadCloud, PieChart, Tag, DollarSign, Calendar, User, Sparkles, Loader2 } from 'lucide-react';
import { Property, Expense } from '../types';
import { apiFetch } from '../lib/apiClient';

interface ExpensesViewProps {
  selectedProperty: Property | null;
  expenses: Expense[];
  onAddExpense: (newExpense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onVerifyExpense: (id: string) => void;
  onSelectPropertyPrompt: () => void;
  canManageExpenses: boolean;
}

export default function ExpensesView({
  selectedProperty,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onVerifyExpense,
  onSelectPropertyPrompt,
  canManageExpenses
}: ExpensesViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Expense form states
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('Καθαριότητα');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-06-15');
  const [fileName, setFileName] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">receipt_long</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να καταχωρήσετε ή να προβάλετε τις δαπάνες κοινοχρήστων.
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const scanReceipt = async (file: File) => {
    if (!aiMode || !file.type.startsWith('image/')) return;
    setIsScanning(true); setAiFilled(false);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const response = await apiFetch('/api/expenses/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl.split(',')[1], mediaType: file.type, fileName: file.name }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Scan failed');
      setSupplier(payload.supplier || ''); setAmount(payload.amount ? String(payload.amount) : ''); setDate(payload.date || date); setCategory(payload.category || 'Γενικά / Άλλα'); setAiFilled(true);
    } catch (error) { alert(error instanceof Error ? error.message : 'Η σάρωση απέτυχε.'); } finally { setIsScanning(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]; setFileName(file.name); void scanReceipt(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setFileName(file.name); void scanReceipt(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !amount) return;

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = date.split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: formattedDate,
      supplier,
      category,
      amount: Number(amount),
      fileName: fileName || undefined,
      status: 'Draft'
    };

    onAddExpense(newExp);

    // Reset Form
    setSupplier('');
    setCategory('Καθαριότητα');
    setAmount('');
    setDate('2026-06-15');
    setFileName('');
    setShowAddForm(false);
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Category summary sums
  const categoryBreakdown = expenses.reduce((acc: { [key: string]: number }, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const totalExpenseAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const verifiedAmount = expenses.filter((e) => e.status === 'Verified').reduce((acc, curr) => acc + curr.amount, 0);

  const categoriesList = ['Καθαριότητα', 'Συντήρηση Ασανσέρ', 'Κηπουρός', 'ΔΕΗ / Ρεύμα', 'ΕΥΔΑΠ / Νερό', 'Θέρμανση / Πετρέλαιο', 'Γενικά / Άλλα'];

  return (
    <div id="expenses-view-container" className="space-y-6">
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
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name} — Δαπάνες</h2>
            <p className="text-sm text-outline font-medium">Τρέχουσα Περίοδος: {selectedProperty.period}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-right">
          <div>
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ</span>
            <div className="text-xl font-bold text-secondary mt-0.5 font-mono">{totalExpenseAmount.toLocaleString('el-GR')} €</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΕΓΚΕΚΡΙΜΕΝΑ ΤΙΜΟΛΟΓΙΑ</span>
            <div className="text-xl font-bold text-teal-700 mt-0.5 font-mono">
              {verifiedAmount.toLocaleString('el-GR')} €
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Expenses table and Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                <input
                  type="text"
                  placeholder="Αναζήτηση προμηθευτή..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-outline">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-sm font-semibold outline-none text-on-surface"
                >
                  <option value="all">Όλες οι Κατηγορίες</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {canManageExpenses && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63]"
              >
                <Plus className="h-4 w-4" />
                Καταχώρηση Εξόδου
              </button>
            )}
          </div>

          {/* Expenses list */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low text-xs font-bold text-outline border-b border-outline-variant/50">
                  <th className="px-6 py-3.5">ΗΜΕΡΟΜΗΝΙΑ</th>
                  <th className="px-6 py-3.5">ΠΡΟΜΗΘΕΥΤΗΣ / ΚΑΤΗΓΟΡΙΑ</th>
                  <th className="px-6 py-3.5">ΠΑΡΑΣΤΑΤΙΚΟ</th>
                  <th className="px-6 py-3.5 text-right">ΠΟΣΟ (€)</th>
                  <th className="px-6 py-3.5 text-center">STATUS</th>
                  {canManageExpenses && <th className="px-6 py-3.5 text-center">ΕΝΕΡΓΕΙΑ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={canManageExpenses ? 6 : 5} className="px-6 py-10 text-center text-outline">
                      Δεν υπάρχουν καταχωρημένες δαπάνες για αυτήν την περίοδο.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-6 py-4 text-on-surface-variant font-mono text-xs">{exp.date}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-on-surface">{exp.supplier}</div>
                          <span className="inline-flex items-center gap-1 rounded bg-[#0d5c63]/5 px-1.5 py-0.5 text-[10px] font-bold text-[#0d5c63] mt-1">
                            <Tag className="h-2.5 w-2.5" />
                            {exp.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {exp.fileName ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#0d5c63] font-semibold hover:underline cursor-pointer">
                            <FileText className="h-3.5 w-3.5" />
                            {exp.fileName}
                          </div>
                        ) : (
                          <span className="text-xs text-outline italic">Χωρίς αρχείο</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-on-surface">
                        {exp.amount.toLocaleString('el-GR', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exp.status === 'Verified' ? (
                          <button
                            onClick={() => onVerifyExpense(exp.id)}
                            disabled={!canManageExpenses}
                            className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 border border-teal-200"
                            title="Κλικ για αλλαγή σε Draft"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Εγκεκριμένο
                          </button>
                        ) : (
                          <button
                            onClick={() => onVerifyExpense(exp.id)}
                            disabled={!canManageExpenses}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200"
                            title="Κλικ για έγκριση"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            Εκκρεμεί
                          </button>
                        )}
                      </td>
                      {canManageExpenses && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Διαγραφή"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Category Breakdown visualizer */}
        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4" />
              ΚΑΤΑΝΟΜΗ ΔΑΠΑΝΩΝ
            </h3>
            {Object.keys(categoryBreakdown).length === 0 ? (
              <p className="text-xs text-outline text-center py-8">Δεν υπάρχουν δεδομένα προς κατανομή.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(categoryBreakdown).map(([cat, amt]) => {
                  const percentage = totalExpenseAmount > 0 ? (amt / totalExpenseAmount) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-on-surface">
                        <span>{cat}</span>
                        <span className="font-mono">{amt.toLocaleString('el-GR', { minimumFractionDigits: 2 })} € ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant bg-[#0d5c63]/5 p-5">
            <h4 className="text-xs font-bold text-[#004349] uppercase tracking-wide">Υποσημείωση Διαχειριστή</h4>
            <p className="text-xs text-outline-variant text-on-surface mt-2 leading-relaxed">
              Μόνο οι <b>Εγκεκριμένες</b> δαπάνες συμμετέχουν στον υπολογισμό των κοινοχρήστων λογαριασμών. Οι δαπάνες σε κατάσταση <b>Εκκρεμεί</b> (Draft) μπορούν να τροποποιηθούν ή να διαγραφούν ελεύθερα.
            </p>
          </div>
        </div>
      </div>

      {/* Add Expense Slide-over Form */}
      {showAddForm && canManageExpenses && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onDragEnter={handleDrag}>
          <div className="w-full max-w-md bg-surface-container-lowest p-6 shadow-2xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
                <h2 className="text-lg font-bold text-primary">Καταχωρηση Νεου Εξοδου</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-full p-1 hover:bg-surface-container text-outline"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΠΡΟΜΗΘΕΥΤΗΣ / ΠΑΡΟΧΟΣ *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      required
                      placeholder="π.χ. ΔΕΗ, CleanX, Ανελκυστήρες ΑΕ"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΚΑΤΗΓΟΡΙΑ ΔΑΠΑΝΗΣ *</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary font-medium"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΠΟΣΟ (€) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΗΜΕΡΟΜΗΝΙΑ *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Drag and Drop File Upload */}
                <div>
                  <div className="mb-2 flex items-center justify-between"><label className="block text-xs font-semibold text-outline">ΠΑΡΑΣΤΑΤΙΚΟ / ΤΙΜΟΛΟΓΙΟ</label><button type="button" className={`ai-toggle ${aiMode ? 'active' : ''}`} onClick={() => setAiMode(!aiMode)}><Sparkles size={13}/> Σάρωση με AI</button></div>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : fileName
                        ? 'border-teal-500 bg-teal-50/20'
                        : 'border-outline hover:bg-surface-container'
                    }`}
                  >
                    {isScanning ? <Loader2 className="h-8 w-8 mb-2 animate-spin text-primary"/> : <UploadCloud className={`h-8 w-8 mb-2 ${fileName ? 'text-teal-600' : 'text-outline'}`} />}
                    {isScanning ? <div className="text-xs font-semibold text-primary">Ανάγνωση παραστατικού…</div> : fileName ? (
                      <div className="text-xs">
                        <p className="font-semibold text-teal-700">{fileName}</p>
                        <p className="text-[10px] text-outline mt-1">Κάντε κλικ για αλλαγή αρχείου</p>
                      </div>
                    ) : (
                      <div className="text-xs text-outline">
                        <p className="font-semibold text-on-surface">Σύρετε το αρχείο εδώ ή κάντε κλικ</p>
                        <p className="text-[10px] mt-0.5">Υποστηρίζει PDF, PNG, JPG (έως 10MB)</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                  </div>
                  {aiFilled && <p className="ai-success"><Sparkles size={13}/> Τα πεδία συμπληρώθηκαν αυτόματα — ελέγξτε τα πριν την αποθήκευση.</p>}
                </div>
              </form>
            </div>

            <div className="flex gap-3 border-t border-outline-variant/50 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-lg border border-outline px-4 py-2.5 text-sm font-semibold hover:bg-surface-container"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d5c63]"
              >
                Αποθήκευση Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

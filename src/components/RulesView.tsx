import React, { useState } from 'react';
import { Settings, Calculator, HelpCircle, Edit3, Save, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Property, Unit, DistributionRule } from '../types';
import { calculateSimulationRows, getResidentsCount } from '../lib/propertyStatementAdapter';

interface RulesViewProps {
  selectedProperty: Property | null;
  units: Unit[];
  rules: DistributionRule[];
  onUpdateRule: (updatedRule: DistributionRule) => void;
  onSelectPropertyPrompt: () => void;
  canManageRules: boolean;
}

export default function RulesView({
  selectedProperty,
  units,
  rules,
  onUpdateRule,
  onSelectPropertyPrompt,
  canManageRules
}: RulesViewProps) {
  const [activeCategory, setActiveCategory] = useState('Ασανσέρ');
  const [simAmount, setSimAmount] = useState<number>(300);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editMethod, setEditMethod] = useState<'Χιλιοστά' | 'Ισομερής Κατανομή' | 'Βάσει Εμβαδού' | 'Βάσει Ατόμων'>('Χιλιοστά');

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">rule</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να διαχειριστείτε τους κανόνες κατανομής δαπανών.
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

  const handleEditRuleClick = (rule: DistributionRule) => {
    setEditingCategory(rule.category);
    setEditMethod(rule.method);
  };

  const handleSaveRule = (categoryName: string) => {
    const existingRule = rules.find((r) => r.category === categoryName);
    if (existingRule) {
      onUpdateRule({
        ...existingRule,
        method: editMethod
      });
    }
    setEditingCategory(null);
  };

  const selectedRule = rules.find((r) => r.category === activeCategory) || rules[0];

  const simulationRows = calculateSimulationRows({
    category: activeCategory,
    amount: simAmount,
    units,
    rules
  });
  const simulationByUnit = new Map(simulationRows.map((row) => [row.unitCode, row]));

  const calculateSimShare = (unit: Unit): number => {
    return simulationByUnit.get(unit.id)?.amount || 0;
  };

  const totalSimulated = units.reduce((acc, curr) => acc + calculateSimShare(curr), 0);

  return (
    <div id="rules-view-container" className="space-y-6">
      {/* Overview header */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Κανόνες Κατανομής & Προσομοιωτής Χρέωσης
        </h2>
        <p className="text-sm text-outline mt-1 max-w-2xl leading-relaxed">
          Διαμορφώστε τον τρόπο με τον οποίο κατανέμονται οι δαπάνες της πολυκατοικίας {selectedProperty.name}. Επιλέξτε μια κατηγορία και εισάγετε ένα ποσό για να δείτε ζωντανά την κατανομή ανά διαμέρισμα.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Rules configuration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="border-b border-outline-variant/50 px-6 py-4">
              <h3 className="font-bold text-primary text-sm uppercase">Ορισμός Κανόνων ανά Κατηγορία</h3>
            </div>
            <div className="divide-y divide-outline-variant/30">
              {rules.map((rule) => {
                const isEditing = editingCategory === rule.category;
                const isSelected = activeCategory === rule.category;
                return (
                  <div
                    key={rule.category}
                    className={`p-4 hover:bg-surface-container-low/20 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer ${
                      isSelected ? 'bg-[#0d5c63]/5 border-l-4 border-primary' : ''
                    }`}
                    onClick={() => setActiveCategory(rule.category)}
                  >
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{rule.category}</span>
                        {isSelected && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary font-sans uppercase">
                            ACTIVE SIM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-outline leading-relaxed">{rule.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing && canManageRules ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={editMethod}
                            onChange={(e) => setEditMethod(e.target.value as any)}
                            className="rounded border border-outline bg-surface-container-lowest px-2 py-1 text-xs outline-none focus:border-primary font-semibold"
                          >
                            <option value="Χιλιοστά">Χιλιοστά (‰)</option>
                            <option value="Ισομερής Κατανομή">Ισομερής</option>
                            <option value="Βάσει Εμβαδού">Εμβαδόν (m²)</option>
                            <option value="Βάσει Ατόμων">Άτομα</option>
                          </select>
                          <button
                            onClick={() => handleSaveRule(rule.category)}
                            className="rounded bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700 flex items-center gap-1"
                          >
                            <Save className="h-3.5 w-3.5" />
                            OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-[#0d5c63]">
                            {rule.method}
                          </span>
                          {canManageRules && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRuleClick(rule);
                              }}
                              className="rounded p-1 hover:bg-surface-container text-primary"
                              title="Επεξεργασία κανόνα"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Simulator widget */}
        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <Calculator className="h-4 w-4 text-secondary" />
              ΠΡΟΣΟΜΟΙΩΤΗΣ {activeCategory.toUpperCase()}
            </h3>

            {/* Slider / input for simulated expense */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-outline">
                <span>ΔΟΚΙΜΑΣΤΙΚΟ ΠΟΣΟ</span>
                <span className="font-mono text-secondary">{simAmount.toLocaleString('el-GR')} €</span>
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="10"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-surface-container-high appearance-none cursor-pointer"
              />
              <div className="relative">
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 px-3 text-sm font-mono text-right font-semibold"
                />
                <span className="absolute left-3 top-2 text-xs text-outline font-bold">ΠΟΣΟ:</span>
              </div>
            </div>

            {/* Simulated split list for units */}
            <div className="space-y-3 pt-3">
              <div className="flex justify-between text-[10px] font-bold text-outline uppercase border-b border-outline-variant/30 pb-1.5">
                <span>Μονάδα</span>
                <span>Μερίδιο</span>
                <span className="text-right">Ποσό Χρέωσης</span>
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {units.map((u) => {
                  const shareVal = calculateSimShare(u);
                  const isExcluded = activeCategory === 'Ασανσέρ' && u.floor === 'Ισόγειο';
                  return (
                    <div key={u.id} className="flex justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="h-5 w-5 bg-surface-container-high rounded text-[10px] font-mono flex items-center justify-center font-bold">
                          {u.id}
                        </span>
                        <span className="text-outline-variant text-[10px]">({u.residentType === 'Κενό' ? 'Κενό' : u.floor})</span>
                      </div>
                      
                      <span className="text-outline font-mono text-[11px]">
                        {isExcluded ? (
                          'Εξαιρείται'
                        ) : selectedRule.method === 'Χιλιοστά' ? (
                          `${u.share.toFixed(1)}‰`
                        ) : selectedRule.method === 'Βάσει Εμβαδού' ? (
                          `${u.size}m²`
                        ) : selectedRule.method === 'Βάσει Ατόμων' ? (
                          `${getResidentsCount(u)} άτ.`
                        ) : (
                          '1 μερ.'
                        )}
                      </span>

                      <span className={`font-mono font-bold text-right ${shareVal > 0 ? 'text-secondary' : 'text-outline/50'}`}>
                        {shareVal.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Checksum sanity */}
              <div className="flex justify-between text-xs font-bold text-[#004349] border-t border-outline-variant/50 pt-3">
                <span>ΣΥΝΟΛΟ ΚΑΤΑΝΟΜΗΣ</span>
                <span className="font-mono">
                  {totalSimulated.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-amber-50/30 p-4 flex gap-3">
            <Info className="h-5 w-5 text-amber-700 flex-shrink-0" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <b>Συντελεστής Ασανσέρ:</b> Το ισόγειο εξαιρείται πλήρως από τις δαπάνες του ανελκυστήρα (0‰ συμμετοχή) βάσει του καταστατικού της πολυκατοικίας Athenian Court.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

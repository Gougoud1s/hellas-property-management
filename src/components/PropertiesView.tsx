import React, { useState } from 'react';
import { Search, Plus, Filter, MapPin, Building, AlertCircle, FileText, Check, ChevronRight } from 'lucide-react';
import { Property } from '../types';

interface PropertiesViewProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  selectedProperty: Property | null;
  onAddProperty: (newProperty: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>) => void;
  canManageProperties: boolean;
}

export default function PropertiesView({
  properties,
  onSelectProperty,
  selectedProperty,
  onAddProperty,
  canManageProperties
}: PropertiesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Published' | 'Draft'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newUnitsCount, setNewUnitsCount] = useState(12);
  const [newPeriod, setNewPeriod] = useState('Ιούνιος 2026');
  const [newOccupancy, setNewOccupancy] = useState(100);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAddress) return;
    onAddProperty({
      name: newName,
      address: newAddress,
      unitsCount: Number(newUnitsCount),
      period: newPeriod,
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      occupancy: Number(newOccupancy)
    });
    // Reset fields
    setNewName('');
    setNewAddress('');
    setNewUnitsCount(12);
    setNewOccupancy(100);
    setShowAddForm(false);
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalOutstanding = properties.reduce((acc, curr) => acc + curr.dues, 0);
  const totalUnits = properties.reduce((acc, curr) => acc + curr.unitsCount, 0);
  const totalIssues = properties.reduce((acc, curr) => acc + curr.issuesCount, 0);

  return (
    <div id="properties-view-container" className="space-y-6">
      {/* Overview stats header */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-outline">ΣΥΝΟΛΟ ΜΟΝΑΔΩΝ</span>
            <span className="material-symbols-outlined text-primary text-2xl">grid_view</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-primary font-sans">{totalUnits}</div>
          <div className="mt-1 text-xs text-outline font-medium">Σε {properties.length} Πολυκατοικίες</div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-outline">ΕΚΚΡΕΜΕΙΣ ΟΦΕΙΛΕΣ</span>
            <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-secondary font-mono">
            {totalOutstanding.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="mt-1 text-xs text-outline font-medium">Προς είσπραξη τρέχουσας περιόδου</div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-outline">ΕΝΕΡΓΕΣ ΒΛΑΒΕΣ</span>
            <span className="material-symbols-outlined text-tertiary text-2xl">handyman</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-tertiary font-sans">{totalIssues}</div>
          <div className="mt-1 text-xs text-outline font-medium">Χρειάζονται ανάθεση τεχνικού</div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Αναζήτηση κτιρίου, διεύθυνσης, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-outline">
            <Filter className="h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-sm font-medium outline-none text-on-surface"
            >
              <option value="all">Όλα τα Status</option>
              <option value="Published">Δημοσιευμένα (Live)</option>
              <option value="Draft">Πρόχειρα (Draft)</option>
            </select>
          </div>
        </div>

        {canManageProperties && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Νέα Πολυκατοικία
          </button>
        )}
      </div>

      {/* Grid of properties */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.map((p) => {
          const isSelected = selectedProperty?.id === p.id;
          return (
            <div
              key={p.id}
              className={`group overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm hover:shadow-md transition-all duration-300 ${
                isSelected ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant'
              }`}
            >
              {/* Cover Image */}
              <div className="relative h-44 w-full bg-surface-container-high">
                <img
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={p.imageUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* ID badge */}
                <span className="absolute left-4 top-4 rounded bg-black/40 px-2 py-1 text-[11px] font-bold tracking-wider text-white font-mono backdrop-blur-sm">
                  {p.id}
                </span>

                {/* Status Badge */}
                <span
                  className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${
                    p.status === 'Published'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {p.status === 'Published' ? 'Δημοσιευμένο' : 'Πρόχειρο'}
                </span>

                {/* Bottom Overlay Title */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-sans text-lg font-bold text-white tracking-tight">{p.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-white/80 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#90d2da]" />
                    {p.address}
                  </p>
                </div>
              </div>

              {/* Stats & Actions body */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 border-b border-outline-variant/30 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΠΕΡΙΟΔΟΣ</span>
                    <div className="text-sm font-semibold text-primary mt-0.5">{p.period}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΜΟΝΑΔΕΣ</span>
                    <div className="text-sm font-semibold text-on-surface mt-0.5">{p.unitsCount} Διαμερίσματα</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΕΚΚΡΕΜΟΤΗΤΕΣ</span>
                    <div className="text-sm font-bold text-secondary mt-0.5 font-mono">
                      {p.dues > 0 ? `${p.dues.toLocaleString('el-GR')} €` : 'Εξοφλήθηκε'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΕΝΕΡΓΕΣ ΒΛΑΒΕΣ</span>
                    <div className="text-sm font-semibold text-tertiary mt-0.5 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {p.issuesCount} Βλάβες
                    </div>
                  </div>
                </div>

                {/* Occupancy Indicator */}
                <div className="mt-2 mb-4">
                  <div className="flex items-center justify-between text-[10px] text-outline font-bold uppercase">
                    <span>Πληρότητα</span>
                    <span>{p.occupancy}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${p.occupancy}%` }}
                    ></div>
                  </div>
                </div>

                {/* Select context button */}
                <button
                  onClick={() => onSelectProperty(p)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Επιλεγμένο Κτίριο
                    </>
                  ) : (
                    <>
                      Επιλογή για Διαχείριση
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Property Slide-over Form */}
      {showAddForm && canManageProperties && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest p-6 shadow-2xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
                <h2 className="text-lg font-bold text-primary">Νέα Πολυκατοικία</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-full p-1 hover:bg-surface-container text-outline"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΟΝΟΜΑ ΚΤΙΡΙΟΥ *</label>
                  <input
                    type="text"
                    required
                    placeholder="π.χ. Athenian Court"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΔΙΕΥΘΥΝΣΗ *</label>
                  <input
                    type="text"
                    required
                    placeholder="π.χ. Λεωφ. Κηφισίας 124, Αθήνα"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΑΡΙΘΜΟΣ ΜΟΝΑΔΩΝ</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newUnitsCount}
                      onChange={(e) => setNewUnitsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΠΛΗΡΟΤΗΤΑ (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={newOccupancy}
                      onChange={(e) => setNewOccupancy(Number(e.target.value))}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΤΡΕΧΟΥΣΑ ΠΕΡΙΟΔΟΣ</label>
                  <input
                    type="text"
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                  />
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
                Δημιουργία
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

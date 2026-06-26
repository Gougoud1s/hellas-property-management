import React, { useState } from 'react';
import { Search, Plus, Edit2, ShieldAlert, Home, User, Check, Trash2, ArrowLeftRight } from 'lucide-react';
import { Property, Unit } from '../types';

interface UnitsViewProps {
  selectedProperty: Property | null;
  units: Unit[];
  onAddUnit: (newUnit: Unit) => void;
  onUpdateUnit: (updatedUnit: Unit) => void;
  onSelectPropertyPrompt: () => void;
  canManageUnits: boolean;
}

export default function UnitsView({
  selectedProperty,
  units,
  onAddUnit,
  onUpdateUnit,
  onSelectPropertyPrompt,
  canManageUnits
}: UnitsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form states (Add/Edit)
  const [unitId, setUnitId] = useState('');
  const [floor, setFloor] = useState('1ος');
  const [type, setType] = useState('Διαμέρισμα');
  const [size, setSize] = useState(80);
  const [share, setShare] = useState(100);
  const [coeff, setCoeff] = useState(1.00);
  const [owner, setOwner] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [resident, setResident] = useState('');
  const [residentType, setResidentType] = useState<'Ιδιοκατοίκηση' | 'Ενοικιαστής' | 'Κενό'>('Ιδιοκατοίκηση');
  const [status, setStatus] = useState<'Ενεργό' | 'Κενό'>('Ενεργό');
  const [balance, setBalance] = useState(0);
  const [deposit, setDeposit] = useState(200);

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">corporate_fare</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να δείτε τον αναλυτικό κατάλογο των μονάδων της.
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

  const handleEditClick = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitId(unit.id);
    setFloor(unit.floor);
    setType(unit.type);
    setSize(unit.size);
    setShare(unit.share);
    setCoeff(unit.coefficient);
    setOwner(unit.ownerName);
    setOwnerPhone(unit.ownerPhone || '');
    setOwnerEmail(unit.ownerEmail || '');
    setResident(unit.residentName);
    setResidentType(unit.residentType);
    setStatus(unit.status);
    setBalance(unit.balance);
    setDeposit(unit.deposit);
    setShowAddForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !owner) return;

    const unitData: Unit = {
      id: unitId,
      floor,
      type,
      size: Number(size),
      share: Number(share),
      coefficient: Number(coeff),
      ownerName: owner,
      ownerPhone,
      ownerEmail,
      residentName: residentType === 'Κενό' ? '' : resident,
      residentType,
      status: residentType === 'Κενό' ? 'Κενό' : status,
      balance: Number(balance),
      prevBalance: editingUnit ? editingUnit.prevBalance : 0,
      deposit: Number(deposit)
    };

    if (editingUnit) {
      onUpdateUnit(unitData);
    } else {
      onAddUnit(unitData);
    }

    // Reset Form
    setEditingUnit(null);
    setUnitId('');
    setOwner('');
    setOwnerPhone('');
    setOwnerEmail('');
    setResident('');
    setSize(80);
    setShare(100);
    setShowAddForm(false);
  };

  const filteredUnits = units.filter((u) => {
    const matchesSearch = u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.residentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFloor = floorFilter === 'all' || u.floor === floorFilter;
    return matchesSearch && matchesFloor;
  });

  // Unique floors list for filters
  const uniqueFloors = Array.from(new Set(units.map((u) => u.floor)));

  const totalShares = units.reduce((acc, curr) => acc + curr.share, 0);
  const totalM2 = units.reduce((acc, curr) => acc + curr.size, 0);
  const activeCount = units.filter((u) => u.status === 'Ενεργό').length;

  return (
    <div id="units-view-container" className="space-y-6">
      {/* Portfolio Info Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#004349]/20 bg-[#004349]/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            className="h-16 w-16 rounded-lg object-cover border border-[#004349]/20"
            src={selectedProperty.imageUrl}
            alt={selectedProperty.name}
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name}</h2>
            <p className="text-sm text-outline flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-sm">map</span>
              {selectedProperty.address}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="border-r border-outline-variant/50 pr-4">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΣΥΝΟΛΟ ΜΟΝΑΔΩΝ</span>
            <div className="text-lg font-bold text-primary mt-0.5">{units.length}</div>
          </div>
          <div className="border-r border-outline-variant/50 px-4">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΣΥΝΟΛΟ ΧΙΛΙΟΣΤΩΝ</span>
            <div className="text-lg font-bold text-[#97462f] mt-0.5 font-mono">{totalShares.toFixed(2)}/1000</div>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">ΕΝΕΡΓΕΣ / ΚΕΝΕΣ</span>
            <div className="text-lg font-bold text-teal-700 mt-0.5">
              {activeCount} / {units.length - activeCount}
            </div>
          </div>
        </div>
      </div>

      {/* Table search & triggers */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Αναζήτηση με αριθμό διαμερίσματος, ιδιοκτήτη..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-outline">
            <span>Όροφος:</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none text-on-surface"
            >
              <option value="all">Όλοι οι Όροφοι</option>
              {uniqueFloors.map((fl) => (
                <option key={fl} value={fl}>{fl}</option>
              ))}
            </select>
          </div>
        </div>

        {canManageUnits && (
          <button
            onClick={() => {
              setEditingUnit(null);
              setUnitId('');
              setOwner('');
              setResident('');
              setSize(80);
              setShare(100);
              setShowAddForm(true);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Νέα Μονάδα
          </button>
        )}
      </div>

      {/* Units Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-bold text-outline border-b border-outline-variant/50">
              <th className="px-6 py-4">ΜΟΝΑΔΑ</th>
              <th className="px-6 py-4">ΟΡΟΦΟΣ</th>
              <th className="px-6 py-4">ΤΥΠΟΣ / ΕΜΒΑΔΟΝ</th>
              <th className="px-6 py-4">ΧΙΛΙΟΣΤΑ (‰)</th>
              <th className="px-6 py-4">ΙΔΙΟΚΤΗΤΗΣ</th>
              <th className="px-6 py-4">ΕΝΟΙΚΙΑΣΤΗΣ / STATUS</th>
              <th className="px-6 py-4 text-right">ΥΠΟΛΟΙΠΟ</th>
              {canManageUnits && <th className="px-6 py-4 text-center">ΕΝΕΡΓΕΙΑ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 font-medium">
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={canManageUnits ? 8 : 7} className="px-6 py-10 text-center text-outline">
                  Δεν βρέθηκαν καταχωρημένες μονάδες με αυτά τα κριτήρια.
                </td>
              </tr>
            ) : (
              filteredUnits.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d5c63]/10 text-[#0d5c63] font-bold text-xs font-mono">
                        {u.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant font-mono">{u.floor}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-on-surface">{u.type}</div>
                      <div className="text-xs text-outline font-mono">{u.size} m²</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-secondary font-bold">
                      {u.share.toFixed(2)} ‰
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-on-surface">{u.ownerName}</div>
                      {u.ownerEmail && (
                        <div className="text-[10px] text-outline font-mono mt-0.5">{u.ownerEmail}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.residentType === 'Κενό' ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Κενό
                      </span>
                    ) : (
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1">
                          <User className="h-3 w-3 text-primary" />
                          {u.residentName}
                        </div>
                        <span className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          u.residentType === 'Ιδιοκατοίκηση' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {u.residentType}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-secondary">
                    {u.balance > 0 ? `${u.balance.toLocaleString('el-GR')} €` : '0,00 €'}
                  </td>
                  {canManageUnits && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="rounded p-1 text-primary hover:bg-primary/5 inline-block"
                        title="Επεξεργασία"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Unit Slide-over Form */}
      {showAddForm && canManageUnits && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-container-lowest p-6 shadow-2xl h-full flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
                <h2 className="text-lg font-bold text-primary">
                  {editingUnit ? `Επεξεργασία Μονάδας ${editingUnit.id}` : 'Νέα Μονάδα'}
                </h2>
                <button
                  onClick={() => {
                    setEditingUnit(null);
                    setShowAddForm(false);
                  }}
                  className="rounded-full p-1 hover:bg-surface-container text-outline"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΚΩΔΙΚΟΣ ΜΟΝΑΔΑΣ *</label>
                    <input
                      type="text"
                      required
                      placeholder="π.χ. Α1, Β2"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      disabled={!!editingUnit}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΟΡΟΦΟΣ *</label>
                    <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="Ισόγειο">Ισόγειο</option>
                      <option value="1ος">1ος Όροφος</option>
                      <option value="2ος">2ος Όροφος</option>
                      <option value="3ος">3ος Όροφος</option>
                      <option value="4ος">4ος Όροφος</option>
                      <option value="Δώμα">Δώμα / Ρετιρέ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΤΥΠΟΣ</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="Διαμέρισμα">Διαμέρισμα</option>
                      <option value="Parking">Parking</option>
                      <option value="Αποθήκη">Αποθήκη</option>
                      <option value="Κατάστημα">Κατάστημα</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΕΜΒΑΔΟΝ (m²)</label>
                    <input
                      type="number"
                      value={size}
                      onChange={(e) => setSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΧΙΛΙΟΣΤΑ (‰) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={share}
                      onChange={(e) => setShare(Number(e.target.value))}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-outline mb-1.5">ΣΥΝΤΕΛΕΣΤΗΣ (elevator)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={coeff}
                      onChange={(e) => setCoeff(Number(e.target.value))}
                      className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-outline-variant/30 pt-4 mt-4">
                  <h3 className="text-xs font-bold text-primary uppercase mb-3">Στοιχεία Ιδιοκτήτη</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-outline mb-1">ΟΝΟΜΑΤΕΠΩΝΥΜΟ ΙΔΙΟΚΤΗΤΗ *</label>
                      <input
                        type="text"
                        required
                        placeholder="π.χ. Παπαδόπουλος Ιωάννης"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-outline mb-1">ΤΗΛΕΦΩΝΟ</label>
                        <input
                          type="text"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-outline mb-1">EMAIL</label>
                        <input
                          type="email"
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-outline-variant/30 pt-4 mt-4">
                  <h3 className="text-xs font-bold text-primary uppercase mb-3">Στοιχεία Ένοικου / Status</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-outline mb-1">ΤΥΠΟΣ ΕΝΟΙΚΟΥ</label>
                        <select
                          value={residentType}
                          onChange={(e) => setResidentType(e.target.value as any)}
                          className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="Ιδιοκατοίκηση">Ιδιοκατοίκηση</option>
                          <option value="Ενοικιαστής">Ενοικιαστής</option>
                          <option value="Κενό">Κενό</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-outline mb-1">STATUS ΜΟΝΑΔΑΣ</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                          disabled={residentType === 'Κενό'}
                        >
                          <option value="Ενεργό">Ενεργό</option>
                          <option value="Κενό">Κενό / Ανενεργό</option>
                        </select>
                      </div>
                    </div>

                    {residentType !== 'Κενό' && (
                      <div>
                        <label className="block text-xs font-medium text-outline mb-1">ΟΝΟΜΑ ΕΝΟΙΚΟΥ</label>
                        <input
                          type="text"
                          placeholder="π.χ. Παπαδόπουλος Ι. ή Νικολάου Ανδρέας"
                          value={resident}
                          onChange={(e) => setResident(e.target.value)}
                          className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#97462f]/20 pt-4 mt-4 bg-[#97462f]/5 p-4 rounded-lg">
                  <h3 className="text-xs font-bold text-[#97462f] uppercase mb-3">Οικονομικά Υπόλοιπα</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-outline mb-1">ΤΡΕΧΟΝ ΥΠΟΛΟΙΠΟ (€)</label>
                      <input
                        type="number"
                        value={balance}
                        onChange={(e) => setBalance(Number(e.target.value))}
                        className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-[#97462f] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-outline mb-1">ΑΠΟΘΕΜΑΤΙΚΟ (€)</label>
                      <input
                        type="number"
                        value={deposit}
                        onChange={(e) => setDeposit(Number(e.target.value))}
                        className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-[#97462f] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-3 border-t border-outline-variant/50 pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setEditingUnit(null);
                  setShowAddForm(false);
                }}
                className="flex-1 rounded-lg border border-outline px-4 py-2.5 text-sm font-semibold hover:bg-surface-container"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d5c63]"
              >
                {editingUnit ? 'Αποθήκευση' : 'Προσθήκη'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

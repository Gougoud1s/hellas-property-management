import React, { useState } from 'react';
import { Search, Plus, FileText, Download, Shield, Eye, Trash2, Folder, Filter, Calendar } from 'lucide-react';
import { Property, Document } from '../types';

interface DocumentsViewProps {
  selectedProperty: Property | null;
  documents: Document[];
  onAddDocument: (newDoc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onSelectPropertyPrompt: () => void;
  canManageDocuments: boolean;
}

export default function DocumentsView({
  selectedProperty,
  documents,
  onAddDocument,
  onDeleteDocument,
  onSelectPropertyPrompt,
  canManageDocuments
}: DocumentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'Σύμβαση' | 'Παραστατικό' | 'Πρακτικά' | 'Τεχνικό'>('Σύμβαση');
  const [docVisibility, setDocVisibility] = useState<'Μόνο Εταιρεία' | 'Ιδιοκτήτες' | 'Όλοι'>('Μόνο Εταιρεία');
  const [fileSize, setFileSize] = useState('1.5 MB');

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container-low p-12 text-center">
        <span className="material-symbols-outlined text-[#004349] text-6xl">folder_open</span>
        <h3 className="mt-4 text-lg font-bold text-primary">Δεν έχει επιλεγεί κτίριο</h3>
        <p className="mt-2 max-w-sm text-sm text-outline">
          Παρακαλούμε επιλέξτε μια πολυκατοικία από το χαρτοφυλάκιο για να δείτε τα έγγραφα του ψηφιακού αρχείου.
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

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: docName,
      date: formattedDate,
      type: docType,
      property: selectedProperty.name,
      visibility: docVisibility,
      size: fileSize
    };

    onAddDocument(newDoc);

    // Reset Form
    setDocName('');
    setDocType('Σύμβαση');
    setDocVisibility('Μόνο Εταιρεία');
    setShowAddForm(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    // Show only documents associated with this property
    const matchesProperty = doc.property === selectedProperty.name;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesProperty && matchesSearch && matchesType;
  });

  const getVisibilityBadge = (visibility: Document['visibility']) => {
    switch (visibility) {
      case 'Μόνο Εταιρεία':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-bold text-red-700 font-sans uppercase">
            <Shield className="h-3 w-3" />
            Staff Only
          </span>
        );
      case 'Ιδιοκτήτες':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-700 font-sans uppercase">
            Owners Access
          </span>
        );
      case 'Όλοι':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200 px-2.5 py-1 text-[10px] font-bold text-teal-700 font-sans uppercase">
            Public View
          </span>
        );
    }
  };

  return (
    <div id="documents-view-container" className="space-y-6">
      {/* Portfolio Info Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Folder className="h-10 w-10 text-[#004349]" />
          <div>
            <h2 className="text-xl font-bold text-primary">{selectedProperty.name} — Ψηφιακό Αρχείο</h2>
            <p className="text-sm text-outline font-medium">Συμβάσεις, Τιμολόγια & Πρακτικά Συνελεύσεων</p>
          </div>
        </div>

        {canManageDocuments && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63]"
          >
            <Plus className="h-4 w-4" />
            Μεταφόρτωση Εγγράφου
          </button>
        )}
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Αναζήτηση εγγράφου με τίτλο..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-outline">
            <Filter className="h-4 w-4" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none text-on-surface"
            >
              <option value="all">Όλοι οι Τύποι</option>
              <option value="Σύμβαση">Συμβάσεις</option>
              <option value="Παραστατικό">Παραστατικά / Τιμολόγια</option>
              <option value="Πρακτικά">Πρακτικά</option>
              <option value="Τεχνικό">Τεχνικά Έγγραφα</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center text-outline">
            Δεν υπάρχουν καταχωρημένα έγγραφα για αυτό το κτήριο.
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative group"
            >
              {/* Document Icon and details */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-red-50 p-2 text-red-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-sm font-black text-on-surface truncate pr-6" title={doc.name}>
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-outline font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{doc.date}</span>
                    <span>•</span>
                    <span className="font-mono">{doc.size}</span>
                  </div>
                </div>
              </div>

              {/* Badges and tags */}
              <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                {getVisibilityBadge(doc.visibility)}

                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                  {doc.type}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1.5">
                <button
                  onClick={() => alert(`Προσομοίωση Λήψης: Λήψη αρχείου ${doc.name} (${doc.size})`)}
                  className="flex-1 rounded border border-outline hover:bg-surface-container-low py-1.5 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Λήψη PDF
                </button>
                
                {canManageDocuments && (
                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="rounded border border-red-200 hover:bg-red-50 p-1.5 text-red-600"
                    title="Διαγραφή"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Document slide-over */}
      {showAddForm && canManageDocuments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest p-6 shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
              <h2 className="text-lg font-bold text-primary">Μεταφόρτωση Νέου Εγγράφου</h2>
              <button onClick={() => setShowAddForm(false)} className="rounded-full p-1 hover:bg-surface-container text-outline">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5 uppercase">ΤΙΤΛΟΣ ΕΓΓΡΑΦΟΥ *</label>
                <input
                  type="text"
                  required
                  placeholder="π.χ. Πιστοποιητικό Ανελκυστήρα 2026"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΤΥΠΟΣ ΕΓΓΡΑΦΟΥ</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-medium"
                  >
                    <option value="Σύμβαση">Σύμβαση</option>
                    <option value="Παραστατικό">Παραστατικό</option>
                    <option value="Πρακτικά">Πρακτικά</option>
                    <option value="Τεχνικό">Τεχνικό Έγγραφο</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline mb-1.5">ΜΕΓΕΘΟΣ</label>
                  <select
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                  >
                    <option value="1.2 MB">1.2 MB</option>
                    <option value="2.4 MB">2.4 MB</option>
                    <option value="540 KB">540 KB</option>
                    <option value="6.8 MB">6.8 MB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΔΙΚΑΙΩΜΑΤΑ ΠΡΟΣΒΑΣΗΣ</label>
                <select
                  value={docVisibility}
                  onChange={(e) => setDocVisibility(e.target.value as any)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="Μόνο Εταιρεία">Staff-Only (Μόνο Εταιρεία)</option>
                  <option value="Ιδιοκτήτες">Owners (Ιδιοκτήτες & Ένοικοι)</option>
                  <option value="Όλοι">Public (Όλοι οι επισκέπτες)</option>
                </select>
              </div>

              <div className="flex gap-3 border-t border-outline-variant/50 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 rounded-lg border border-outline px-4 py-2 text-sm font-semibold hover:bg-surface-container"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5c63]"
                >
                  Μεταφόρτωση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

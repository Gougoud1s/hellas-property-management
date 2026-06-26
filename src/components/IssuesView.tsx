import React, { useState } from 'react';
import { Search, Plus, User, Wrench, Clock, AlertTriangle, ShieldCheck, ChevronRight, CheckCircle, Sliders } from 'lucide-react';
import { Property, Issue } from '../types';

interface IssuesViewProps {
  selectedProperty: Property | null;
  issues: Issue[];
  onAddIssue: (newIssue: Issue) => void;
  onUpdateIssueStatus: (id: string, newStatus: Issue['status']) => void;
  onAssignTechnician: (id: string, technician: string, estimate: number) => void;
  onSelectPropertyPrompt: () => void;
  canManageIssues: boolean;
}

export default function IssuesView({
  selectedProperty,
  issues,
  onAddIssue,
  onUpdateIssueStatus,
  onAssignTechnician,
  onSelectPropertyPrompt,
  canManageIssues
}: IssuesViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<'High' | 'Medium' | 'Low' | 'Urgent'>('Medium');
  const [newEstimate, setNewEstimate] = useState('100');
  const [newTechnician, setNewTechnician] = useState('Papamichael Plumbing');

  // Assign modal state
  const [assigningIssueId, setAssigningIssueId] = useState<string | null>(null);
  const [techName, setTechName] = useState('Lift-Tech SA');
  const [estCost, setEstCost] = useState('150');

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newIssue: Issue = {
      id: `issue-${Date.now()}`,
      title: newTitle,
      property: selectedProperty ? selectedProperty.name : 'Athenian Court',
      severity: newSeverity,
      status: 'New',
      reportedAt: 'Μόλις τώρα',
      estimate: Number(newEstimate),
      technician: newTechnician || undefined
    };

    onAddIssue(newIssue);

    setNewTitle('');
    setNewSeverity('Medium');
    setNewEstimate('100');
    setShowAddForm(false);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningIssueId) return;

    onAssignTechnician(assigningIssueId, techName, Number(estCost));
    setAssigningIssueId(null);
  };

  // Filter issues based on search and selection
  const filteredIssues = issues.filter((i) => {
    // If a property is selected, only show issues of that property
    const matchesProperty = !selectedProperty || i.property === selectedProperty.name;
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.technician && i.technician.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    return matchesProperty && matchesSearch && matchesSeverity;
  });

  const getSeverityBadge = (severity: Issue['severity']) => {
    switch (severity) {
      case 'Urgent':
        return <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800 uppercase tracking-wide border border-red-200">ΕΠΕΙΓΟΝ</span>;
      case 'High':
        return <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 uppercase tracking-wide border border-orange-200">ΥΨΗΛΗ</span>;
      case 'Medium':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wide border border-amber-200">ΜΕΣΑΙΑ</span>;
      case 'Low':
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase tracking-wide border border-slate-200">ΧΑΜΗΛΗ</span>;
    }
  };

  // Group columns
  const columns: { title: string; status: Issue['status']; color: string; icon: string }[] = [
    { title: 'ΝΕΕΣ ΑΝΑΦΟΡΕΣ', status: 'New', color: 'border-t-4 border-t-red-500 bg-red-500/5', icon: 'campaign' },
    { title: 'ΥΠΟ ΕΛΕΓΧΟ', status: 'Under Inspection', color: 'border-t-4 border-t-amber-500 bg-amber-500/5', icon: 'find_in_page' },
    { title: 'ΑΝΑΤΕΘΗΚΕ', status: 'Assigned', color: 'border-t-4 border-t-indigo-500 bg-indigo-500/5', icon: 'engineering' },
    { title: 'ΣΕ ΕΞΕΛΙΞΗ', status: 'In Progress', color: 'border-t-4 border-t-teal-500 bg-teal-500/5', icon: 'rotate_right' },
    { title: 'ΟΛΟΚΛΗΡΩΘΗΚΕ', status: 'Resolved', color: 'border-t-4 border-t-emerald-500 bg-emerald-500/5', icon: 'check_circle' }
  ];

  const techniciansList = ['Lift-Tech SA', 'Garden Solutions', 'Papamichael Plumbing', 'Elektra Service', 'Clean & Shine'];

  return (
    <div id="issues-view-container" className="space-y-6">
      {/* Overview stats */}
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">handyman</span>
            Διαχείριση Τεχνικών Βλαβών & Συντήρησης
          </h2>
          <p className="text-sm text-outline mt-1 font-medium">
            {selectedProperty ? `Κτήριο: ${selectedProperty.name}` : 'Όλα τα Διαχειριζόμενα Κτήρια'}
          </p>
        </div>

        {canManageIssues && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d5c63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Αναφορά Βλάβης
          </button>
        )}
      </div>

      {/* Control Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Αναζήτηση βλάβης, τεχνικού..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-outline">
          <span>Προτεραιότητα:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none text-on-surface"
          >
            <option value="all">Όλες οι Βαθμίδες</option>
            <option value="Urgent">Επείγον</option>
            <option value="High">Υψηλή</option>
            <option value="Medium">Μεσαία</option>
            <option value="Low">Χαμηλή</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-5 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colIssues = filteredIssues.filter((i) => i.status === col.status);
          return (
            <div
              key={col.status}
              className={`rounded-xl border border-outline-variant p-4 flex flex-col justify-start h-[640px] max-h-[640px] ${col.color}`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">{col.icon}</span>
                  <span className="text-xs font-black text-primary tracking-wide">{col.title}</span>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary font-mono">
                  {colIssues.length}
                </span>
              </div>

              {/* Column Scroll container */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {colIssues.length === 0 ? (
                  <p className="text-[11px] text-outline text-center py-10 font-medium">Κανένα δελτίο</p>
                ) : (
                  colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm space-y-3 hover:shadow-md transition-shadow cursor-default"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-black text-on-surface leading-normal">{issue.title}</h4>
                        {getSeverityBadge(issue.severity)}
                      </div>

                      <div className="text-[10px] text-outline flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-xs">apartment</span>
                        {issue.property}
                      </div>

                      {/* Progress slider if in progress */}
                      {issue.status === 'In Progress' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-outline font-bold uppercase">
                            <span>Πρόοδος</span>
                            <span>{issue.progress || 50}%</span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-surface-container-high overflow-hidden">
                            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${issue.progress || 50}%` }}></div>
                          </div>
                        </div>
                      )}

                      {/* Technician assignment state display */}
                      {issue.technician ? (
                        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded border border-outline-variant/30">
                          {issue.technicianImg ? (
                            <img className="h-5 w-5 rounded-full object-cover" src={issue.technicianImg} alt={issue.technician} referrerPolicy="no-referrer" />
                          ) : (
                            <span className="material-symbols-outlined text-primary text-sm">engineering</span>
                          )}
                          <span className="text-[10px] text-on-surface font-semibold truncate">{issue.technician}</span>
                        </div>
                      ) : canManageIssues ? (
                        <button
                          onClick={() => setAssigningIssueId(issue.id)}
                          className="w-full rounded bg-indigo-50 border border-indigo-200 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">assignment_ind</span>
                          Ανάθεση Τεχνικού
                        </button>
                      ) : (
                        <div className="rounded bg-surface-container-low border border-outline-variant/30 py-1 text-center text-[10px] font-bold text-outline">
                          Δεν έχει ανατεθεί τεχνικός
                        </div>
                      )}

                      {/* Drag flow button mock */}
                      <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-[10px] text-outline font-mono">
                        <span>Κόστος: <b>{issue.estimate}€</b></span>
                        
                        {col.status !== 'Resolved' && canManageIssues && (
                          <button
                            onClick={() => {
                              const nextStatusMap: { [key in Issue['status']]: Issue['status'] } = {
                                'New': 'Under Inspection',
                                'Under Inspection': 'Assigned',
                                'Assigned': 'In Progress',
                                'In Progress': 'Resolved',
                                'Resolved': 'Resolved'
                              };
                              onUpdateIssueStatus(issue.id, nextStatusMap[col.status]);
                            }}
                            className="text-primary hover:underline font-bold flex items-center gap-0.5"
                          >
                            Επόμενο
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Issue Modal */}
      {showAddForm && canManageIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest p-6 shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
              <h2 className="text-lg font-bold text-primary">Αναφορά Νέας Βλάβης</h2>
              <button onClick={() => setShowAddForm(false)} className="rounded-full p-1 hover:bg-surface-container text-outline">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5 font-sans uppercase">ΤΙΤΛΟΣ ΒΛΑΒΗΣ *</label>
                <input
                  type="text"
                  required
                  placeholder="π.χ. Διαρροή νερού στον κεντρικό σωλήνα"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΠΡΟΤΕΡΑΙΟΤΗΤΑ</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-medium"
                >
                  <option value="Low">Χαμηλή</option>
                  <option value="Medium">Μεσαία (Default)</option>
                  <option value="High">Υψηλή</option>
                  <option value="Urgent">Επείγον / Άμεση ανάγκη</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΕΚΤΙΜΩΜΕΝΟ ΚΟΣΤΟΣ (€)</label>
                <input
                  type="number"
                  value={newEstimate}
                  onChange={(e) => setNewEstimate(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΠΡΟΤΕΙΝΟΜΕΝΟΣ ΤΕΧΝΙΚΟΣ</label>
                <select
                  value={newTechnician}
                  onChange={(e) => setNewTechnician(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Χωρίς ανάθεση (Draft)</option>
                  {techniciansList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
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
                  Αποστολή Δελτίου
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {assigningIssueId && canManageIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-container-lowest p-6 shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
              <h2 className="text-sm font-bold text-primary uppercase">Ανάθεση Εργολαβίας Τεχνικού</h2>
              <button onClick={() => setAssigningIssueId(null)} className="rounded-full p-1 hover:bg-surface-container text-outline">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΕΠΙΛΟΓΗ ΤΕΧΝΙΚΟΥ / ΣΥΝΕΡΓΕΙΟΥ</label>
                <select
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-medium"
                >
                  {techniciansList.map((tech) => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline mb-1.5">ΚΟΣΤΟΣ ΕΡΓΑΣΙΑΣ / ΥΛΙΚΩΝ (€)</label>
                <input
                  type="number"
                  value={estCost}
                  onChange={(e) => setEstCost(e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex gap-3 border-t border-outline-variant/50 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setAssigningIssueId(null)}
                  className="flex-1 rounded-lg border border-outline px-4 py-2 text-xs font-bold hover:bg-surface-container"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Ολοκλήρωση Ανάθεσης
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

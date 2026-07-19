import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Link2, Plus, RefreshCw, Trash2, Unlink, X } from 'lucide-react';
import { AuthUser } from '../lib/auth';
import { CalendarEvent, Expense, Issue, Property } from '../types';
import { downloadIcs, googleCalendarUrl } from '../lib/calendarExport';
import { apiFetch } from '../lib/apiClient';

interface CalendarViewProps {
  currentUser: AuthUser;
  properties: Property[];
  expenses: Expense[];
  issues: Issue[];
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  canManage: boolean;
}

const TYPE_META: Record<CalendarEvent['type'], { label: string; color: string }> = {
  payment: { label: 'Πληρωμή', color: 'bg-teal-600' },
  maintenance: { label: 'Συντήρηση', color: 'bg-amber-600' },
  assembly: { label: 'Συνέλευση', color: 'bg-blue-600' },
  deadline: { label: 'Προθεσμία', color: 'bg-red-600' },
  other: { label: 'Λοιπό', color: 'bg-slate-500' }
};

const isoToday = () => new Date().toISOString().slice(0, 10);

export default function CalendarView({ currentUser, properties, expenses, issues, events, onAddEvent, onDeleteEvent, canManage }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(isoToday());
  const [type, setType] = useState<CalendarEvent['type']>('maintenance');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [feedToken, setFeedToken] = useState(() => localStorage.getItem(`atlas-calendar-feed:${currentUser.id}`) ?? '');
  const [feedUrls, setFeedUrls] = useState<{ httpUrl: string; webcalUrl: string } | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const combined = useMemo<CalendarEvent[]>(() => {
    const visiblePropertyIds = new Set(properties.map((property) => property.id));
    const expenseEvents = expenses
      .filter((expense) => expense.tenantId === currentUser.tenantId && (!expense.propertyId || visiblePropertyIds.has(expense.propertyId)) && /^\d{4}-\d{2}-\d{2}$/.test(expense.date))
      .map((expense) => ({ id: `expense:${expense.id}`, tenantId: currentUser.tenantId, propertyId: expense.propertyId, title: `${expense.supplier} · ${expense.amount.toLocaleString('el-GR')} €`, date: expense.date, type: 'payment' as const, notes: expense.category }));
    const issueEvents = issues
      .filter((issue) => issue.tenantId === currentUser.tenantId && (!issue.propertyId || visiblePropertyIds.has(issue.propertyId)) && /^\d{2}\/\d{2}\/\d{4}$/.test(issue.reportedAt))
      .map((issue) => {
        const [day, eventMonth, eventYear] = issue.reportedAt.split('/');
        return { id: `issue:${issue.id}`, tenantId: currentUser.tenantId, propertyId: issue.propertyId, title: issue.title, date: `${eventYear}-${eventMonth}-${day}`, type: 'maintenance' as const, notes: issue.property };
      });
    return [...events.filter((event) => !event.propertyId || visiblePropertyIds.has(event.propertyId)), ...expenseEvents, ...issueEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [currentUser.tenantId, events, expenses, issues, properties]);

  const monthEvents = combined.filter((event) => event.date.startsWith(monthKey));
  const toExportEvent = (event: CalendarEvent) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    description: event.notes,
    location: properties.find((property) => property.id === event.propertyId)?.address
  });
  const exportEvents = useMemo(() => combined.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    description: event.notes,
    location: properties.find((property) => property.id === event.propertyId)?.address,
  })), [combined, properties]);

  const updateFeed = async (token = feedToken) => {
    const response = await apiFetch('/api/calendar-feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token || undefined, calendarName: 'Atlas PM · Προσωπικές υπενθυμίσεις', events: exportEvents }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Calendar sync failed');
    setFeedToken(payload.token);
    setFeedUrls({ httpUrl: payload.httpUrl, webcalUrl: payload.webcalUrl });
    localStorage.setItem(`atlas-calendar-feed:${currentUser.id}`, payload.token);
    return payload;
  };

  useEffect(() => {
    if (!feedToken) return;
    const timeout = window.setTimeout(() => {
      void updateFeed(feedToken).catch(() => setSyncMessage('Ο συγχρονισμός θα επαναληφθεί όταν είναι διαθέσιμος ο server.'));
    }, 500);
    return () => window.clearTimeout(timeout);
    // exportEvents is the authoritative feed payload; update after any change.
  }, [exportEvents, feedToken]);

  const enableSync = async () => {
    setSyncBusy(true); setSyncMessage('');
    try { await updateFeed(); setSyncMessage('Το προσωπικό feed είναι ενεργό και ενημερώνεται αυτόματα.'); }
    catch (error) { setSyncMessage(error instanceof Error ? error.message : 'Η σύνδεση απέτυχε.'); }
    finally { setSyncBusy(false); }
  };

  const revokeSync = async () => {
    if (!feedToken) return;
    setSyncBusy(true);
    try { await apiFetch(`/api/calendar-feeds/${feedToken}`, { method: 'DELETE' }); } finally {
      localStorage.removeItem(`atlas-calendar-feed:${currentUser.id}`);
      setFeedToken(''); setFeedUrls(null); setSyncBusy(false); setSyncMessage('Ο παλιός σύνδεσμος απενεργοποιήθηκε.');
    }
  };
  const eventsByDay = new Map<number, CalendarEvent[]>();
  monthEvents.forEach((event) => {
    const day = Number(event.date.slice(8, 10));
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !date) return;
    onAddEvent({ id: `cal-${Date.now()}`, tenantId: currentUser.tenantId, propertyId: propertyId || undefined, title: title.trim(), date, type, notes: notes.trim() || undefined });
    setTitle(''); setNotes(''); setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-outline-variant pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-primary"><CalendarDays className="h-5 w-5" />Ημερολόγιο εργασιών</h2>
          <p className="mt-1 text-sm text-outline">Πληρωμές, συντηρήσεις, συνελεύσεις και προθεσμίες όλων των συνδεδεμένων κτιρίων.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setShowSync(true); if (feedToken && !feedUrls) void enableSync(); }} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary"><Link2 className="h-4 w-4" />{feedToken ? 'Ημερολόγιο συνδεδεμένο' : 'Σύνδεση ημερολογίου'}</button>
          <button onClick={() => downloadIcs(monthEvents.map(toExportEvent), `atlas-pm-${monthKey}.ics`)} disabled={monthEvents.length === 0} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-50"><Download className="h-4 w-4" />Apple / Android (.ics)</button>
          {canManage && <button onClick={() => setShowForm(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Νέο γεγονός</button>}
        </div>
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant px-5 py-3"><h3 className="text-sm font-black uppercase text-primary">Γεγονότα & υπενθυμίσεις μήνα</h3><p className="mt-1 text-xs text-outline">Τα ειδοποιητήρια εμφανίζονται ως προθεσμίες πληρωμής με ειδοποίηση 3 ημέρες και 1 ημέρα πριν.</p></div>
        <div className="divide-y divide-outline-variant/40">
          {monthEvents.map((event) => (
            <div key={`agenda-${event.id}`} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${TYPE_META[event.type].color}`} /><div><div className="font-semibold text-on-surface">{event.title}</div><div className="mt-0.5 text-xs text-outline">{new Date(`${event.date}T12:00:00`).toLocaleDateString('el-GR')} · {TYPE_META[event.type].label}{event.notes ? ` · ${event.notes}` : ''}</div></div></div>
              <div className="flex flex-none gap-2">
                <button onClick={() => downloadIcs([toExportEvent(event)], `atlas-pm-${event.date}.ics`)} className="flex min-h-11 items-center gap-1.5 rounded-lg border border-outline px-3 text-xs font-bold text-primary"><Download className="h-3.5 w-3.5" />iOS / Android</button>
                <a href={googleCalendarUrl(toExportEvent(event))} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-1.5 rounded-lg border border-outline px-3 text-xs font-bold text-primary"><ExternalLink className="h-3.5 w-3.5" />Google</a>
              </div>
            </div>
          ))}
          {monthEvents.length === 0 && <div className="px-5 py-8 text-center text-sm text-outline">Δεν υπάρχουν γεγονότα για αυτόν τον μήνα.</div>}
        </div>
      </section>

      <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-container" aria-label="Προηγούμενος μήνας"><ChevronLeft /></button>
        <div className="text-center"><div className="text-lg font-black capitalize text-primary">{cursor.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}</div><div className="text-xs text-outline">{monthEvents.length} γεγονότα</div></div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-container" aria-label="Επόμενος μήνας"><ChevronRight /></button>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="hidden grid-cols-7 border-b border-outline-variant bg-surface-container-low text-center text-[11px] font-black uppercase text-outline sm:grid">{['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].map((day) => <div key={day} className="p-3">{day}</div>)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-7">
          {Array.from({ length: startOffset }).map((_, index) => <div key={`empty-${index}`} className="hidden min-h-28 border-b border-r border-outline-variant/40 bg-surface-container-low/30 sm:block" />)}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = `${monthKey}-${String(day).padStart(2, '0')}` === isoToday();
            return <div key={day} className="min-h-24 border-b border-r border-outline-variant/40 p-2 sm:min-h-28"><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-primary text-white' : 'text-on-surface'}`}>{day}</div><div className="space-y-1">{dayEvents.slice(0, 3).map((event) => <div key={event.id} title={event.title} className="group flex items-center gap-1.5 rounded bg-surface-container-low px-2 py-1 text-[10px] font-semibold"><span className={`h-2 w-2 flex-none rounded-full ${TYPE_META[event.type].color}`} /><span className="min-w-0 flex-1 truncate">{event.title}</span>{event.id.startsWith('cal-') && canManage && <button onClick={() => onDeleteEvent(event.id)} className="hidden text-error group-hover:block" aria-label="Διαγραφή"><Trash2 className="h-3 w-3" /></button>}</div>)}{dayEvents.length > 3 && <div className="text-[10px] font-bold text-outline">+{dayEvents.length - 3} ακόμη</div>}</div></div>;
          })}
        </div>
      </div>

      {showForm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setShowForm(false)}><form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-primary">Νέο γεγονός</h3><button type="button" onClick={() => setShowForm(false)} className="p-2"><X /></button></div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Τίτλος" required className="min-h-11 w-full rounded-lg border border-outline px-3 text-base" /><div className="grid gap-3 sm:grid-cols-2"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 rounded-lg border border-outline px-3 text-base" /><select value={type} onChange={(event) => setType(event.target.value as CalendarEvent['type'])} className="min-h-11 rounded-lg border border-outline px-3 text-base">{Object.entries(TYPE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></div><select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="min-h-11 w-full rounded-lg border border-outline px-3 text-base"><option value="">Όλα / χωρίς κτίριο</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Σημειώσεις" className="min-h-24 w-full rounded-lg border border-outline p-3 text-base" /><button className="min-h-11 w-full rounded-lg bg-primary px-4 font-bold text-white">Αποθήκευση</button></form></div>}

      {showSync && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setShowSync(false)}><div onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-primary">Αυτόματος συγχρονισμός</h3><p className="mt-1 text-sm text-outline">Μία σύνδεση για όλες τις νέες προθεσμίες και υπενθυμίσεις.</p></div><button onClick={() => setShowSync(false)} className="rounded-lg p-2 hover:bg-surface-container" aria-label="Κλείσιμο"><X /></button></div>{!feedToken ? <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-low p-5"><p className="text-sm font-bold text-on-surface">Δημιουργία προσωπικού calendar feed</p><p className="mt-1 text-xs leading-relaxed text-outline">Ο σύνδεσμος λειτουργεί σαν κωδικός πρόσβασης. Μην τον κοινοποιείτε. Μπορείτε να τον απενεργοποιήσετε οποιαδήποτε στιγμή.</p><button onClick={enableSync} disabled={syncBusy} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncBusy ? 'animate-spin' : ''}`} />Ενεργοποίηση συγχρονισμού</button></div> : <div className="mt-5 space-y-3"><a href={feedUrls?.webcalUrl} className={`flex min-h-12 items-center justify-between rounded-xl border border-outline-variant px-4 text-sm font-bold text-primary ${!feedUrls ? 'pointer-events-none opacity-50' : ''}`}><span>Apple Calendar / Outlook</span><ExternalLink className="h-4 w-4" /></a><button onClick={async () => { if (feedUrls) { await navigator.clipboard.writeText(feedUrls.httpUrl); setSyncMessage('Ο σύνδεσμος αντιγράφηκε. Στο Google Calendar επιλέξτε «Από URL».'); } }} disabled={!feedUrls} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-outline-variant px-4 text-sm font-bold text-primary disabled:opacity-50"><span>Αντιγραφή για Google Calendar / Android</span><Copy className="h-4 w-4" /></button><div className="rounded-lg bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">Μετά τη σύνδεση, κάθε νέο ή διορθωτικό ειδοποιητήριο ενημερώνει αυτόματα το feed. Η εφαρμογή ημερολογίου αποφασίζει πόσο συχνά το ανανεώνει.</div><button onClick={revokeSync} disabled={syncBusy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-bold text-red-700 hover:bg-red-50"><Unlink className="h-4 w-4" />Απενεργοποίηση προσωπικού συνδέσμου</button></div>}{syncMessage && <p className="mt-4 text-xs font-semibold text-outline" role="status">{syncMessage}</p>}</div></div>}
    </div>
  );
}

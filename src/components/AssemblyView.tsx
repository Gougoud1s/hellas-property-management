import { FormEvent, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleDot, FileDown, Plus, Users, Vote } from 'lucide-react';
import { Assembly, VoteChoice } from '../featureTypes';
import { AuthUser } from '../lib/auth';
import { Property, Unit } from '../types';

interface Props { property: Property | null; units: Unit[]; currentUser: AuthUser; }

export default function AssemblyView({ property, units, currentUser }: Props) {
  const key = 'hpm_assemblies';
  const [assemblies, setAssemblies] = useState<Assembly[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('Τακτική Γενική Συνέλευση');
  const [date, setDate] = useState('2026-07-15T18:30');
  const manager = currentUser.role === 'company_admin' || currentUser.role === 'company_staff';
  const visible = assemblies.filter((a) => !property || a.propertyId === property.id);
  const save = (next: Assembly[]) => { setAssemblies(next); localStorage.setItem(key, JSON.stringify(next)); };
  const create = (event: FormEvent) => { event.preventDefault(); if (!property) return; save([{ id: `assembly-${Date.now()}`, propertyId: property.id, title, scheduledAt: date, status: 'draft', quorumPercent: 50, agendaItems: [{ id: `agenda-${Date.now()}`, title: 'Έγκριση ετήσιου απολογισμού', description: 'Έγκριση δαπανών και οικονομικού απολογισμού.', votes: {} }] }, ...assemblies]); setShowForm(false); };
  const updateStatus = (id: string, status: Assembly['status']) => save(assemblies.map((a) => a.id === id ? { ...a, status } : a));
  const cast = (assemblyId: string, itemId: string, choice: VoteChoice) => save(assemblies.map((a) => a.id !== assemblyId ? a : { ...a, agendaItems: a.agendaItems.map((item) => item.id === itemId ? { ...item, votes: { ...item.votes, [currentUser.id]: choice } } : item) }));

  return <div className="space-y-6">
    <section className="feature-hero"><div><div className="eyebrow">Συμμετοχή ιδιοκτητών</div><h1>Γενικές Συνελεύσεις</h1><p>Απαρτία, θεματολογία και επαληθεύσιμη ψηφοφορία σε ένα ήσυχο, καθαρό πρακτικό.</p></div>{manager && <button className="primary-action" onClick={() => setShowForm(true)}><Plus size={17}/> Νέα συνέλευση</button>}</section>
    {showForm && <form className="inline-form" onSubmit={create}><label>Τίτλος<input value={title} onChange={(e) => setTitle(e.target.value)}/></label><label>Ημερομηνία<input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}/></label><button className="primary-action">Δημιουργία</button></form>}
    {visible.length === 0 ? <div className="empty-feature"><Vote/><h3>Δεν υπάρχει προγραμματισμένη συνέλευση</h3><p>Η επόμενη συνέλευση και τα θέματα ψηφοφορίας θα εμφανιστούν εδώ.</p></div> : <div className="assembly-grid">{visible.map((assembly) => {
      const voters = new Set(assembly.agendaItems.flatMap((item) => Object.keys(item.votes))).size;
      const eligible = Math.max(units.length, 1); const quorum = Math.round((voters / eligible) * 100);
      return <article className="assembly-card" key={assembly.id}><header><div><span className={`status-pill status-${assembly.status}`}>{assembly.status === 'open' ? 'Ανοιχτή' : assembly.status === 'closed' ? 'Ολοκληρώθηκε' : 'Πρόχειρη'}</span><h2>{assembly.title}</h2><p><CalendarDays size={15}/>{new Date(assembly.scheduledAt).toLocaleString('el-GR')}</p></div><div className="quorum-ring" style={{'--quorum': `${Math.min(quorum, 100) * 3.6}deg`} as React.CSSProperties}><strong>{quorum}%</strong><small>απαρτία</small></div></header>
        <div className="agenda-list">{assembly.agendaItems.map((item, index) => { const values = Object.values(item.votes); return <div className="agenda-item" key={item.id}><div className="agenda-number">{index + 1}</div><div className="agenda-content"><h3>{item.title}</h3><p>{item.description}</p>{assembly.status === 'open' && !manager && <div className="vote-controls">{(['yes','no','abstain'] as VoteChoice[]).map((choice) => <button key={choice} className={item.votes[currentUser.id] === choice ? 'selected' : ''} onClick={() => cast(assembly.id, item.id, choice)}>{choice === 'yes' ? 'Ναι' : choice === 'no' ? 'Όχι' : 'Αποχή'}</button>)}</div>}{manager && <div className="vote-tally"><span>Ναι {values.filter((v) => v === 'yes').length}</span><span>Όχι {values.filter((v) => v === 'no').length}</span><span>Αποχή {values.filter((v) => v === 'abstain').length}</span></div>}</div></div>})}</div>
        {manager && <footer>{assembly.status === 'draft' && <button className="primary-action" onClick={() => updateStatus(assembly.id, 'open')}><CircleDot size={16}/> Άνοιγμα ψηφοφορίας</button>}{assembly.status === 'open' && <button className="primary-action" onClick={() => updateStatus(assembly.id, 'closed')}><CheckCircle2 size={16}/> Κλείσιμο</button>}{assembly.status === 'closed' && <button className="secondary-action" onClick={() => window.print()}><FileDown size={16}/> Πρακτικά PDF</button>}<span><Users size={15}/>{voters}/{eligible} συμμετοχές</span></footer>}
      </article>})}</div>}
  </div>;
}

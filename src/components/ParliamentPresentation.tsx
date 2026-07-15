import React, { useState } from 'react';
import { Landmark, ShieldAlert, Award, FileText, CheckCircle2, ChevronRight, Play, Vote, Receipt, Database, Info, RefreshCw, Send, ArrowRight, Calendar, Users, MapPin, Check } from 'lucide-react';

interface ParliamentPresentationProps {
  onBackToApp: () => void;
  language: 'el' | 'en';
}

export default function ParliamentPresentation({ onBackToApp, language }: ParliamentPresentationProps) {
  const [activeTab, setActiveTab] = useState<'vision' | 'sandbox' | 'gcloud' | 'rollout'>('vision');
  const [visionSlide, setVisionSlide] = useState(0);
  
  // Sandbox States
  const [mydataStep, setMydataStep] = useState<'idle' | 'generating' | 'sending' | 'success'>('idle');
  const [mydataMark, setMydataMark] = useState<string | null>(null);
  
  const [ocrStep, setOcrStep] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle');
  
  const [voteCount, setVoteCount] = useState({ yes: 420, no: 180, abstain: 150 });
  const [userVoted, setUserVoted] = useState(false);

  const totalMillesimals = 1000;
  const currentVotes = voteCount.yes + voteCount.no + voteCount.abstain;
  const quorumPercentage = (currentVotes / totalMillesimals) * 100;

  const slides = [
    {
      title_el: "Ψηφιακός Μετασχηματισμός & Διαφάνεια",
      title_en: "Digital Transformation & Transparency",
      desc_el: "Το Atlas PM ψηφιοποιεί πλήρως τη διαχείριση ακινήτων στην Ελλάδα, εξαλείφοντας τα χειρόγραφα Excel και προσφέροντας απόλυτη διαφάνεια σε εκατομμύρια ιδιοκτήτες και ενοίκους.",
      desc_en: "Atlas PM fully digitizes property management in Greece, replacing manual spreadsheets and offering complete transparency to millions of owners and tenants.",
      icon: <Landmark className="h-16 w-16 text-teal-400" />,
      highlight_el: "100% Ψηφιακό & Προσβάσιμο",
      highlight_en: "100% Digital & Accessible"
    },
    {
      title_el: "Καταπολέμηση της Φοροδιαφυγής (myDATA)",
      title_en: "Combating Tax Evasion (myDATA)",
      desc_el: "Με την αυτόματη διασύνδεση με το myDATA της ΑΑΔΕ, κάθε δαπάνη κοινοχρήστων και κάθε παραστατικό διαβιβάζεται άμεσα στο κράτος. Καμία δαπάνη δεν μένει αδήλωτη.",
      desc_en: "With automated integration to AADE myDATA, every shared expense and invoice is transmitted instantly to the state. No expense goes undeclared.",
      icon: <Receipt className="h-16 w-16 text-teal-400" />,
      highlight_el: "Αυτόματη Λήψη Μ.Α.Ρ.Κ.",
      highlight_en: "Automatic MARK Retrieval"
    },
    {
      title_el: "Ψηφιακή Δημοκρατία & e-Voting",
      title_en: "Digital Democracy & e-Voting",
      desc_el: "Διευκόλυνση της λήψης αποφάσεων στις πολυκατοικίες μέσω ψηφιακών γενικών συνελεύσεων και έγκυρης ψηφοφορίας με υπολογισμό χιλιοστών σε πραγματικό χρόνο.",
      desc_en: "Facilitating decision-making in buildings through digital general assemblies and valid voting with real-time millesimal calculations.",
      icon: <Vote className="h-16 w-16 text-teal-400" />,
      highlight_el: "Συμμετοχή από Παντού",
      highlight_en: "Participate from Anywhere"
    },
    {
      title_el: "Δωρεάν Δημόσιο Αγαθό για Όλους",
      title_en: "Free Public Good for All Citizens",
      desc_el: "Προτείνεται ως δωρεάν κρατική πλατφόρμα, η οποία θα μειώσει το κόστος διαβίωσης των πολιτών και θα αναβαθμίσει τις υπηρεσίες των επαγγελματιών διαχειριστών.",
      desc_en: "Proposed as a free state platform that will lower citizens' cost of living and upgrade the services of professional property managers.",
      icon: <Award className="h-16 w-16 text-teal-400" />,
      highlight_el: "Κρατική Παροχή zyxen.gr",
      highlight_en: "State-Provided by zyxen.gr"
    }
  ];

  const handleMydataTransmit = () => {
    setMydataStep('generating');
    setTimeout(() => {
      setMydataStep('sending');
      setTimeout(() => {
        setMydataStep('success');
        setMydataMark("MARK-" + Math.floor(100000000000 + Math.random() * 900000000000));
      }, 1500);
    }, 1000);
  };

  const handleOcrAnalyze = () => {
    setOcrStep('uploading');
    setTimeout(() => {
      setOcrStep('processing');
      setTimeout(() => {
        setOcrStep('success');
      }, 1500);
    }, 1000);
  };

  const handleUserVote = (option: 'yes' | 'no' | 'abstain') => {
    if (userVoted) return;
    setVoteCount(prev => ({
      ...prev,
      [option]: prev[option] + 85 // user unit shares
    }));
    setUserVoted(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Banner */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 text-slate-950 p-2 rounded-lg font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/20">
            <Landmark className="h-5 w-5" />
            <span className="text-xs tracking-wider font-extrabold uppercase">ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Atlas Property Management <span className="text-xs text-teal-400 font-mono">zyxen.gr</span>
            </h1>
            <p className="text-xs text-slate-400">Προτεινόμενη Εθνική Πλατφόρμα Διαχείρισης Ακινήτων (Υπ. Ψηφιακής Διακυβέρνησης)</p>
          </div>
        </div>
        
        <button 
          onClick={onBackToApp}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/20"
        >
          <span>Είσοδος στην Εφαρμογή</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {/* Main Tabs */}
      <div className="flex bg-slate-950/50 border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('vision')}
          className={`flex-1 py-4 text-center text-sm font-bold tracking-wider uppercase border-b-2 transition-all ${activeTab === 'vision' ? 'border-teal-500 text-teal-400 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          1. Εθνικό Όραμα & Οφέλη
        </button>
        <button 
          onClick={() => setActiveTab('sandbox')}
          className={`flex-1 py-4 text-center text-sm font-bold tracking-wider uppercase border-b-2 transition-all ${activeTab === 'sandbox' ? 'border-teal-500 text-teal-400 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          2. Διαδραστική Επίδειξη (Demo)
        </button>
        <button 
          onClick={() => setActiveTab('gcloud')}
          className={`flex-1 py-4 text-center text-sm font-bold tracking-wider uppercase border-b-2 transition-all ${activeTab === 'gcloud' ? 'border-teal-500 text-teal-400 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          3. Αρχιτεκτονική G-Cloud & Ασφάλεια
        </button>
        <button 
          onClick={() => setActiveTab('rollout')}
          className={`flex-1 py-4 text-center text-sm font-bold tracking-wider uppercase border-b-2 transition-all ${activeTab === 'rollout' ? 'border-teal-500 text-teal-400 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          4. Σχέδιο Εθνικής Διάθεσης
        </button>
      </div>

      {/* Tab Contents */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Tab 1: Vision Slider */}
        {activeTab === 'vision' && (
          <div className="grid md:grid-cols-12 gap-8 items-center py-6">
            <div className="md:col-span-7 space-y-6">
              <div className="inline-block bg-teal-900/40 border border-teal-500/30 text-teal-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {slides[visionSlide].highlight_el}
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                {slides[visionSlide].title_el}
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                {slides[visionSlide].desc_el}
              </p>
              
              <div className="flex gap-2 pt-4">
                {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setVisionSlide(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${idx === visionSlide ? 'w-8 bg-teal-400' : 'w-2.5 bg-slate-700'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              
              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setVisionSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                  className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-sm font-semibold transition-all"
                >
                  Προηγούμενο
                </button>
                <button 
                  onClick={() => setVisionSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <span>Επόμενο</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="md:col-span-5 flex justify-center py-8">
              <div className="w-72 h-72 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-slate-800 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {slides[visionSlide].icon}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Feature Sandbox */}
        {activeTab === 'sandbox' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold text-white">Προσομοιωτής Κρατικών Λειτουργιών</h2>
              <p className="text-sm text-slate-400">Δείτε πώς η εφαρμογή αλληλεπιδρά απευθείας με τις ψηφιακές υποδομές του κράτους σε πραγματικό χρόνο.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Sandbox 1: myDATA */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Receipt className="h-5 w-5" />
                    <h3 className="font-bold text-white">Διασύνδεση myDATA ΑΑΔΕ</h3>
                  </div>
                  <p className="text-xs text-slate-400">Προσομοίωση διαβίβασης κοινοχρήστων και λήψης επίσημου κωδικού Μ.Α.Ρ.Κ. από το υπουργείο.</p>
                  
                  {/* Interactive area */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[10px] space-y-2 min-h-[140px] flex flex-col justify-between">
                    {mydataStep === 'idle' && (
                      <div className="text-slate-500 italic flex flex-col items-center justify-center h-full">
                        <span>Έτοιμο για προσομοίωση...</span>
                      </div>
                    )}
                    {mydataStep === 'generating' && (
                      <div className="text-teal-400 animate-pulse">
                        <p>&lt;xml version="1.0" encoding="utf-8"&gt;</p>
                        <p>&lt;invoiceSummary&gt;</p>
                        <p>  &lt;invoiceType&gt;13.1 - Κοινόχρηστα&lt;/invoiceType&gt;</p>
                        <p>  &lt;amount&gt;450.00 EUR&lt;/amount&gt;</p>
                        <p>&lt;/invoiceSummary&gt;</p>
                      </div>
                    )}
                    {mydataStep === 'sending' && (
                      <div className="text-amber-400 flex items-center justify-center gap-2 h-full">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Διαβίβαση στην ΑΑΔΕ...</span>
                      </div>
                    )}
                    {mydataStep === 'success' && (
                      <div className="space-y-1 text-emerald-400">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="font-bold">Επιτυχής Διαβίβαση!</span>
                        </div>
                        <p className="text-slate-300">Μ.Α.Ρ.Κ: {mydataMark}</p>
                        <p className="text-slate-500">HTTP/1.1 200 OK</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleMydataTransmit}
                  disabled={mydataStep !== 'idle'}
                  className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${mydataStep === 'idle' ? 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Διαβίβαση Παραστατικού (13.1)
                </button>
              </div>

              {/* Sandbox 2: OCR */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Database className="h-5 w-5" />
                    <h3 className="font-bold text-white">Έξυπνη OCR Ανάγνωση</h3>
                  </div>
                  <p className="text-xs text-slate-400">Προσομοίωση αυτόματης ανάγνωσης ελληνικών αποδείξεων με τεχνητή νοημοσύνη (AI).</p>
                  
                  {/* Interactive area */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2 min-h-[140px] flex flex-col justify-center">
                    {ocrStep === 'idle' && (
                      <div className="border-2 border-dashed border-slate-800 rounded-md p-4 text-center text-slate-500 italic">
                        <span>Κάντε κλικ στο κουμπί για «φόρτωση» απόδειξης</span>
                      </div>
                    )}
                    {(ocrStep === 'uploading' || ocrStep === 'processing') && (
                      <div className="space-y-2 text-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
                        <span className="text-slate-400 font-mono text-[10px] block">
                          {ocrStep === 'uploading' ? 'Μεταφόρτωση αρχείου...' : 'Ανάλυση AI (Anthropic LLM)...'}
                        </span>
                      </div>
                    )}
                    {ocrStep === 'success' && (
                      <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-500">Προμηθευτής:</span>
                          <span className="text-white font-bold">EKO HELLAS</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-500">ΑΦΜ:</span>
                          <span className="text-white">094005123</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-500">Κατηγορία:</span>
                          <span className="text-teal-400">Πετρέλαιο Θέρμανσης</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ποσό:</span>
                          <span className="text-emerald-400 font-bold">120.00 €</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleOcrAnalyze}
                  disabled={ocrStep !== 'idle'}
                  className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${ocrStep === 'idle' ? 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                >
                  <Play className="h-3.5 w-3.5" />
                  Προσομοίωση AI OCR
                </button>
              </div>

              {/* Sandbox 3: Voting */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Vote className="h-5 w-5" />
                    <h3 className="font-bold text-white">Γενικές Συνελεύσεις & Ψηφοφορία</h3>
                  </div>
                  <p className="text-xs text-slate-400">Ψηφιακό quorum και ψηφοφορία ιδιοκτητών βάσει χιλιοστών συνιδιοκτησίας.</p>
                  
                  {/* Interactive area */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-3 min-h-[140px] flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Απαρτία (Quorum):</span>
                        <span className="text-teal-400 font-bold">{quorumPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${quorumPercentage}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-emerald-400">ΝΑΙ:</span>
                        <span>{voteCount.yes} / 1000‰</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">ΟΧΙ:</span>
                        <span>{voteCount.no} / 1000‰</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ΑΠΟΧΗ:</span>
                        <span>{voteCount.abstain} / 1000‰</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUserVote('yes')}
                    disabled={userVoted}
                    className={`flex-1 py-1.5 rounded font-bold text-[10px] transition-all ${userVoted ? 'bg-slate-800 text-slate-600' : 'bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-500/20'}`}
                  >
                    ΝΑΙ (+85‰)
                  </button>
                  <button 
                    onClick={() => handleUserVote('no')}
                    disabled={userVoted}
                    className={`flex-1 py-1.5 rounded font-bold text-[10px] transition-all ${userVoted ? 'bg-slate-800 text-slate-600' : 'bg-red-900/50 hover:bg-red-800/50 text-red-400 border border-red-500/20'}`}
                  >
                    ΟΧΙ (+85‰)
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={() => {
                  setMydataStep('idle');
                  setMydataMark(null);
                  setOcrStep('idle');
                  setVoteCount({ yes: 420, no: 180, abstain: 150 });
                  setUserVoted(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Επαναφορά Προσομοιωτή
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: G-Cloud Blueprint */}
        {activeTab === 'gcloud' && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-teal-400">
                <Info className="h-5 w-5" />
                <h3 className="font-bold text-lg text-white">Ασφαλής Μετάβαση σε G-Cloud Υποδομή</h3>
              </div>
              <p className="text-sm text-slate-300">
                Η εφαρμογή είναι σχεδιασμένη ώστε να μπορεί να φιλοξενηθεί άμεσα στο <strong>Κυβερνητικό Νέφος (G-Cloud)</strong> της ΓΓΠΣΨΔ, επιλύοντας κάθε θέμα ασφάλειας δεδομένων και multi-tenancy.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 pt-4">
                <div className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">Row-Level Security (RLS)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Κάθε εγγραφή στη βάση δεδομένων απομονώνεται πλήρως με βάση το Tenant ID. Κανένας χρήστης δεν μπορεί να διαβάσει ή να επεξεργαστεί δεδομένα άλλης πολυκατοικίας ή εταιρείας διαχείρισης.
                  </p>
                </div>
                
                <div className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">Ταυτοποίηση Taxisnet (SSO)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Δυνατότητα άμεσης σύνδεσης των πολιτών με τα επίσημα στοιχεία Taxisnet μέσω gov.gr OAuth, εξασφαλίζοντας την εγκυρότητα και την ταυτοπροσωπία των χρηστών.
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">Ασφαλείς Πληρωμές</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Πλήρης συμμόρφωση PCI-DSS μέσω direct integration με τη Viva Wallet. Οι πληρωμές επαληθεύονται απευθείας από τον server με re-verification, αποκλείοντας κάθε δυνατότητα απάτης.
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">GDPR & Sovereign Data</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Όλα τα δεδομένα, τα παραστατικά και τα ψηφιακά έγγραφα αποθηκεύονται εντός της ελληνικής επικράτειας σε κυβερνητικά datacenters με κρυπτογράφηση AES-256.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Rollout Plan */}
        {activeTab === 'rollout' && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 text-teal-400">
                <Calendar className="h-5 w-5" />
                <h3 className="font-bold text-lg text-white">Σχέδιο Εθνικής Διάθεσης σε 3 Φάσεις</h3>
              </div>
              <p className="text-sm text-slate-300">
                Προτεινόμενο πλάνο υλοποίησης για την καθολική εφαρμογή του <strong>Atlas PM</strong> ως δωρεάν κρατικής υπηρεσίας για όλους τους Έλληνες πολίτες:
              </p>

              <div className="relative border-l-2 border-teal-500/30 pl-6 ml-4 space-y-8">
                {/* Phase 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 bg-teal-500 text-slate-950 rounded-full h-5 w-5 flex items-center justify-center text-xs font-black">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Φάση 1: Ενοποίηση & hardining <span className="text-[10px] bg-teal-900 text-teal-400 px-2 py-0.5 rounded font-mono font-bold">ΜΗΝΕΣ 1 - 3</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Ολοκλήρωση των API διασυνδέσεων με τη ΓΓΠΣΨΔ (Taxisnet OAuth) και την ΑΑΔΕ (myDATA Production). Hardening της RLS αρχιτεκτονικής στη βάση δεδομένων.
                    </p>
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 bg-teal-500 text-slate-950 rounded-full h-5 w-5 flex items-center justify-center text-xs font-black">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Φάση 2: Πιλοτικό Πρόγραμμα <span className="text-[10px] bg-teal-900 text-teal-400 px-2 py-0.5 rounded font-mono font-bold">ΜΗΝΕΣ 4 - 6</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Δοκιμαστική λειτουργία της πλατφόρμας σε επιλεγμένους μεγάλους Δήμους (π.χ. Δήμος Αθηναίων, Θεσσαλονίκης). Feedback από διαχειριστές και πολίτες.
                    </p>
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 bg-teal-500 text-slate-950 rounded-full h-5 w-5 flex items-center justify-center text-xs font-black">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Φάση 3: Καθολική Εθνική Διάθεση <span className="text-[10px] bg-teal-900 text-teal-400 px-2 py-0.5 rounded font-mono font-bold">ΜΗΝΕΣ 7 - 12</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Επίσημη διάθεση της εφαρμογής μέσω του gov.gr. Υποχρεωτική ένταξη όλων των επαγγελματιών διαχειριστών και παροχή δωρεάν προσβάσεων σε όλους τους πολίτες.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800 pt-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="h-4 w-4 text-teal-500" />
                  <span>Προτεινόμενος Φορέας Λειτουργίας: <strong>Υπουργείο Ψηφιακής Διακυβέρνησης</strong></span>
                </div>
                <div className="text-xs text-teal-400 font-bold">
                  Παροχή δωρεάν λογισμικού zyxen.gr
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Banner */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        © 2026 Hellas Property Management (zyxen.gr) · Γκουγκούδης Ηρακλής & Μαρτίνης Παραδομενάκης Θεόδωρος
      </footer>
    </div>
  );
}

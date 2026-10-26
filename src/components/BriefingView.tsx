import React from 'react';
import { Briefing } from '../types';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Link2,
  Clock,
  ListTodo,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface BriefingViewProps {
  briefing: Briefing;
  onOpenCitation: (ref: string) => void;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ briefing, onOpenCitation }) => {
  return (
    <div className="space-y-6 text-sm">
      {/* 1. Summary & Context */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-indigo-400">
          <FileText className="w-4 h-4" />
          <span>1. תקציר הפגישה וההקשר</span>
        </div>
        <p className="text-slate-200 text-xs leading-relaxed font-normal">
          {briefing.summary}
        </p>
      </section>

      {/* 2. Key Insights from Prior Meetings */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>2. מידע מרכזי מפגישות קודמות ועובדות מאומתות</span>
        </div>
        {briefing.verifiedFacts.length > 0 ? (
          <div className="space-y-2.5">
            {briefing.verifiedFacts.map((factItem, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-100">{factItem.fact}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {factItem.evidenceRefs.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => onOpenCitation(ref)}
                      className="px-2 py-0.5 font-mono text-[11px] rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Link2 className="w-2.5 h-2.5" />
                      <span>{ref}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">לא אותרו עובדות נוספות מפגישות קודמות.</p>
        )}
      </section>

      {/* 3. Relevant Previous Decisions */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>3. החלטות קודמות שרלוונטיות לנושא</span>
        </div>
        {briefing.previousDecisions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefing.previousDecisions.map((dec) => (
              <div
                key={dec.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-300">{dec.topic}</span>
                  <span className="font-mono text-slate-500">{dec.id}</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">{dec.description}</p>
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">סטטוס: {dec.status}</span>
                  <div className="flex items-center gap-1">
                    {dec.evidenceRefs.map((ref) => (
                      <button
                        key={ref}
                        onClick={() => onOpenCitation(ref)}
                        className="font-mono text-[10px] text-slate-400 hover:text-indigo-300 underline"
                      >
                        אסמכתא {ref.split(':').slice(-1)[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">לא תועדו החלטות קודמות בנושא זה.</p>
        )}
      </section>

      {/* 4. Open Commitments & Action Items */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
          <ListTodo className="w-4 h-4 text-indigo-400" />
          <span>4. התחייבויות ומשימות פתוחות</span>
        </div>
        {briefing.openCommitments.length > 0 ? (
          <div className="space-y-2.5">
            {briefing.openCommitments.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  item.isOverdue
                    ? 'bg-rose-950/20 border-rose-800/50'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{item.ownerName}</span>
                    <span className="text-slate-500">·</span>
                    <span
                      className={`font-mono text-[11px] font-medium ${
                        item.isOverdue ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      יעד: {item.originalDueText}
                    </span>
                    {item.isOverdue && (
                      <span className="text-[10px] bg-rose-900/60 text-rose-200 px-1.5 py-0.2 rounded font-semibold">
                        באיחור
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                    {item.status}
                  </span>
                  {item.evidenceRefs.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => onOpenCitation(ref)}
                      className="px-2 py-0.5 font-mono text-[11px] rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900 transition-colors"
                    >
                      אסמכתא
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">אין התחייבויות פתוחות שנרשמו עבור משתתפים אלו.</p>
        )}
      </section>

      {/* 5. Contradictions Requiring Clarification */}
      {briefing.conflicts.length > 0 && (
        <section className="bg-rose-950/20 border border-rose-800/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-rose-400">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>5. סתירות שדורשות בירור והכרעה (Contradictions)</span>
          </div>
          <div className="space-y-3">
            {briefing.conflicts.map((conf, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-900/60 space-y-2 text-xs">
                <div className="font-semibold text-rose-300 mb-1">נושא: {conf.topic}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="font-mono text-slate-400 mb-1">החלטה מקורית ({conf.decisionA.id}):</div>
                    <div className="text-slate-200">{conf.decisionA.description}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="font-mono text-slate-400 mb-1">החלטה סותרת/מעדכנת ({conf.decisionB.id}):</div>
                    <div className="text-slate-200">{conf.decisionB.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Unverified Gaps & Missing Information */}
      {briefing.unverifiedGaps.length > 0 && (
        <section className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>6. מידע שלא ניתן לאמת ופערים ברישומים</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
            {briefing.unverifiedGaps.map((gap, idx) => (
              <li key={idx}>{gap}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Suggested Questions */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>7. שאלות מומלצות למהלך הפגישה</span>
        </div>
        <div className="space-y-2">
          {briefing.suggestedQuestions.map((q, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-2.5"
            >
              <span className="font-mono text-indigo-400 font-bold text-[11px] shrink-0 mt-0.5">
                0{idx + 1}.
              </span>
              <span className="leading-relaxed">{q}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Source Citations & References */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
          <Link2 className="w-4 h-4 text-indigo-400" />
          <span>8. מקורות ואסמכתאות שנבדקו (Evidence Registry)</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          כל האסמכתאות מקושרות ישירות למאגר הנתונים המקורי. לחץ על אסמכתא לפתיחת הציטוט וחותמת הזמן.
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from(
            new Set([
              ...briefing.verifiedFacts.flatMap((f) => f.evidenceRefs),
              ...briefing.previousDecisions.flatMap((d) => d.evidenceRefs),
              ...briefing.openCommitments.flatMap((c) => c.evidenceRefs),
            ])
          ).map((ref) => (
            <button
              key={ref}
              onClick={() => onOpenCitation(ref)}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-950 text-indigo-300 border border-slate-800 hover:border-indigo-500 hover:bg-slate-850 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 className="w-3 h-3 text-slate-400" />
              <span>{ref}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

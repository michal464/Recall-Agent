import React, { useState } from 'react';
import { ExecutionRecord, ExecutionEvent } from '../types';
import { ChevronDown, ChevronUp, Terminal, Shield, Wrench, CheckCircle, Clock } from 'lucide-react';

interface ExecutionTraceProps {
  execution: ExecutionRecord;
}

export const ExecutionTrace: React.FC<ExecutionTraceProps> = ({ execution }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);

  const getStoppingReasonHebrew = (reason: string) => {
    switch (reason) {
      case 'goal_achieved':
        return 'המטרה הושגה במלואה ואומתה מול המקורות';
      case 'no_history_found':
        return 'הסוכן עצר: לא נמצאה היסטוריה קודמת במערכת';
      case 'insufficient_evidence':
        return 'הסוכן עצר: חסר מידע מהותי לביסוס הטענות';
      case 'max_rounds_reached':
        return 'הושגה מגבלת סבבי הסקת המסקנות (10 סבבים)';
      case 'max_tools_reached':
        return 'הושגה מגבלת קריאות הכלים המרבית (12 כלים)';
      case 'time_limit_exceeded':
        return 'הסוכן עצר עקב חריגה ממגבלת הזמן המרבית';
      default:
        return reason;
    }
  };

  const getToolHebrewName = (tool: string) => {
    switch (tool) {
      case 'get_meeting_details':
        return 'קריאת פרטי פגישה';
      case 'search_meeting_history':
        return 'חיפוש היסטוריית פגישות';
      case 'get_transcript':
        return 'שליפת תמליל וציטוטים';
      case 'get_open_action_items':
        return 'בדיקת משימות והתחייבויות';
      case 'get_decisions':
        return 'שליפת החלטות קודמות';
      case 'verify_evidence':
        return 'אימות עובדתי מול מקורות';
      case 'save_briefing':
        return 'שמירת תדריך מאומת';
      case 'record_agent_event':
        return 'תיעוד אירוע ריצה';
      default:
        return tool;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                תיעוד ביצוע הסוכן (Agent Trace)
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {execution.id}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>מצב ריצה:</span>
              <span className="text-indigo-300 font-medium">
                {execution.agentMode === 'gemini' ? 'מודל בינה מלאכותית (Gemini)' : 'מדיניות דטרמיניסטית עצמאית'}
              </span>
              <span>·</span>
              <span className="text-emerald-400">{getStoppingReasonHebrew(execution.stoppingReason)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <div className="text-slate-400">
            סבבים: <span className="text-white font-bold">{execution.stepCount}/10</span>
          </div>
          <div className="text-slate-400">
            קריאות כלים: <span className="text-white font-bold">{execution.toolCallCount}/12</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <span>{isExpanded ? 'צמצום מהלכים' : 'הרחבת פירוט מהלכים'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Step-by-Step Events List */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-slate-950/40 border-t border-slate-800/60 max-h-[460px] overflow-y-auto">
          {execution.events.map((ev, idx) => {
            const isEventExpanded = expandedEventIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center shrink-0 font-bold">
                      {ev.round}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {getToolHebrewName(ev.tool)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({ev.tool})
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 mt-1 leading-relaxed">
                        {ev.rationale}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedEventIndex(isEventExpanded ? null : idx)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline shrink-0 font-mono"
                  >
                    {isEventExpanded ? 'הסתר פרמטרים' : 'פרמטרים ותוצאה'}
                  </button>
                </div>

                {/* Concise result summary */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{ev.result_summary}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    מקורות שנאספו: {ev.evidence_gathered_count}
                  </span>
                </div>

                {/* Expanded parameters and raw result */}
                {isEventExpanded && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto space-y-2">
                    <div>
                      <span className="text-slate-500">פרמטרים שנשלחו:</span>
                      <pre className="mt-1 text-slate-200">{JSON.stringify(ev.arguments, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

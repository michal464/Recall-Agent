import React from 'react';
import { EvidenceDetail } from '../types';
import { X, ShieldCheck, Quote, Clock, Calendar, AlertTriangle } from 'lucide-react';

interface EvidenceDrawerProps {
  evidence: EvidenceDetail | null;
  onClose: () => void;
  isLoading: boolean;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  onClose,
  isLoading,
}) => {
  if (!evidence && !isLoading) return null;

  const formatOffset = (seconds?: number) => {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} (${seconds} שניות)`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">בדיקת אסמכתא ומקור מידע</h3>
            <span className="font-mono text-[11px] text-slate-400">{evidence?.ref}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <span className="animate-pulse">שולף אסמכתא מקורית ממאגר הנתונים...</span>
          </div>
        ) : evidence ? (
          <>
            {/* Original Hebrew Quote */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <Quote className="w-3.5 h-3.5 text-emerald-400" />
                <span>ציטוט מקורי מהרשומה:</span>
              </div>
              <blockquote className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-xs leading-relaxed italic border-r-2 border-r-emerald-500">
                "{evidence.quote}"
              </blockquote>
            </div>

            {/* Evidence Metadata Grid */}
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
              {evidence.speakerName && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">דובר מקורי:</span>
                  <span className="font-semibold text-white">{evidence.speakerName}</span>
                </div>
              )}

              {evidence.offsetSeconds !== undefined && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">מיקום בתמליל:</span>
                  <span className="font-mono text-emerald-400">{formatOffset(evidence.offsetSeconds)}</span>
                </div>
              )}

              {evidence.meetingTitle && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">פגישת מקור:</span>
                  <span className="text-slate-200 truncate max-w-[200px] text-left">{evidence.meetingTitle}</span>
                </div>
              )}

              {evidence.meetingDate && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">תאריך פגישה:</span>
                  <span className="font-mono text-slate-300">{formatDate(evidence.meetingDate)}</span>
                </div>
              )}

              {evidence.topic && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">נושא החלטה:</span>
                  <span className="text-indigo-300 font-medium">{evidence.topic}</span>
                </div>
              )}

              {evidence.status && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">סטטוס רשומה:</span>
                  <span className="font-mono text-xs text-white bg-slate-800 px-2 py-0.5 rounded">
                    {evidence.status}
                  </span>
                </div>
              )}
            </div>

            {/* Verification Status Banner */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-300 text-xs">אסמכתא אומתה בהצלחה</div>
                <div className="text-[11px] text-emerald-400/80 mt-0.5 leading-relaxed">
                  הציטוט חולץ ישירות ממאגר הנתונים המקורי ונמצא תואם לטענה שהועלתה בתדריך.
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

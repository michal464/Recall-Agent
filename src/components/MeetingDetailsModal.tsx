import React from 'react';
import { Meeting, Participant } from '../types';
import { Clock, Calendar, Users, X, Sparkles, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface MeetingDetailsModalProps {
  meeting: Meeting | null;
  participants: Participant[];
  onClose: () => void;
  onPrepareBriefing: (meetingId: string) => void;
  onViewExistingBriefing: (briefingId: string) => void;
  isRunning: boolean;
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  meeting,
  participants,
  onClose,
  onPrepareBriefing,
  onViewExistingBriefing,
  isRunning,
}) => {
  if (!meeting) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoStart: string, isoEnd: string) => {
    try {
      const s = new Date(isoStart);
      const e = new Date(isoEnd);
      return `${s.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${e.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-indigo-400 font-medium">
              <span>פגישה מתוכננת ביומן</span>
              {meeting.hasBriefing && (
                <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> תדריך קיים
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
              {meeting.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Timing details */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs">{formatDate(meeting.startAt)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300 font-mono">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs">{formatTime(meeting.startAt, meeting.endAt)}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-1.5">תיאור והקשר לפגישה:</h4>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              {meeting.description}
            </p>
          </div>

          {/* Participants list */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>משתתפים רשומים ({participants.length}):</span>
            </div>
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      {p.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-medium text-xs text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.role}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{p.organization}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          {meeting.hasBriefing && meeting.briefingId ? (
            <button
              onClick={() => onViewExistingBriefing(meeting.briefingId!)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              צפייה בתדריך הקיים
            </button>
          ) : (
            <div className="text-xs text-slate-500">טרם הופק תדריך עבור פגישה זו</div>
          )}

          <button
            onClick={() => onPrepareBriefing(meeting.id)}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              isRunning
                ? 'bg-indigo-700/60 cursor-not-allowed opacity-80'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:shadow-indigo-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>הסוכן מנתח ומאמת נתונים...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>הכנת תדריך באמצעות הסוכן</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Calendar as CalendarIcon, CheckCircle2, ShieldCheck, PlayCircle } from 'lucide-react';

interface HeaderProps {
  currentDateText: string;
  viewMode: 'month' | 'week';
  onViewModeChange: (mode: 'month' | 'week') => void;
  onOpenTestModal: () => void;
  testedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentDateText,
  viewMode,
  onViewModeChange,
  onOpenTestModal,
  testedCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 backdrop-blur px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">Recall</span>
              <span className="text-xs text-indigo-400 font-medium">סוכן חכם להכנה לפגישות</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">ביסוס עובדתי ואסמכתאות מלאות ללא הזיות</p>
          </div>
        </div>

        {/* Zone 2: Navigation & View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 font-mono tabular-nums">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateText}</span>
          </div>

          <div className="flex items-center p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              תצוגה חודשית
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              תצוגה שבועית
            </button>
          </div>
        </div>

        {/* Zone 3: Verification & Test Inspector Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-lg hover:bg-emerald-900/30 transition-colors"
            title="בדיקת 24 תרחישי בדיקה אוטומטיים בפייתון"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>בדיקות אוטומטיות ({testedCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};

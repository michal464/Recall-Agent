import React from 'react';
import { Play, Sparkles } from 'lucide-react';

export interface ScenarioItem {
  id: string;
  name: string;
  shortDesc: string;
  meetingId: string;
}

export const SCENARIOS: ScenarioItem[] = [
  { id: 'A', name: 'תרחיש A', shortDesc: 'פגישה חוזרת · מיגרציית PostgreSQL', meetingId: 'm-101' },
  { id: 'B', name: 'תרחיש B', shortDesc: 'התחייבות פתוחה · דוח ביצועים באיחור', meetingId: 'm-102' },
  { id: 'C', name: 'תרחיש C', shortDesc: 'החלטות סותרות · AWS מול GCP', meetingId: 'm-103' },
  { id: 'D', name: 'תרחיש D', shortDesc: 'פגישה ראשונה · ללא היסטוריה קודמת', meetingId: 'm-104' },
  { id: 'E', name: 'תרחיש E', shortDesc: 'החלטה ישנה · מדיניות מפתחות API', meetingId: 'm-105' },
  { id: 'F', name: 'תרחיש F', shortDesc: 'מועד עמום · "בתחילת השבוע הבא"', meetingId: 'm-106' },
  { id: 'G', name: 'תרחיש G', shortDesc: 'מידע חסר · תקציב ללא תיעוד', meetingId: 'm-107' },
  { id: 'H', name: 'תרחיש H', shortDesc: 'הגנת הזרקה · Prompt Injection', meetingId: 'm-108' },
];

interface ScenarioSelectorProps {
  activeScenario: string | null;
  onSelectScenario: (scenario: ScenarioItem) => void;
  isRunning: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  activeScenario,
  onSelectScenario,
  isRunning,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>תרחישי הדגמה טכניים (A–H):</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 md:pb-0 scrollbar-none">
          {SCENARIOS.map((scen) => {
            const isSelected = activeScenario === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                disabled={isRunning}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={scen.shortDesc}
              >
                <span className="font-bold">{scen.name}</span>
                <span className="text-slate-400 text-[11px] hidden lg:inline">
                  {scen.shortDesc.split('·')[1] || scen.shortDesc}
                </span>
                <Play className={`w-2.5 h-2.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

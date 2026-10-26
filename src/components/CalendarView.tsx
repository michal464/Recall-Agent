import React from 'react';
import { Meeting } from '../types';
import { ChevronRight, ChevronLeft, Clock, Users, FileText, CheckCircle2 } from 'lucide-react';

interface CalendarViewProps {
  meetings: Meeting[];
  selectedMeetingId: string | null;
  onSelectMeeting: (meeting: Meeting) => void;
  viewMode: 'month' | 'week';
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  viewMode,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  const monthNameHebrew = currentMonth.toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });

  // Days of week in Hebrew
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // Helper to format ISO time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    } catch {
      return '';
    }
  };

  // Generate 35-day grid for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

  // Previous month padding
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDate - i);
    daysGrid.push({
      date: d,
      isCurrentMonth: false,
      dateStr: d.toISOString().split('T')[0],
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    daysGrid.push({
      date: d,
      isCurrentMonth: true,
      dateStr: d.toISOString().split('T')[0],
    });
  }

  // Next month padding to fill 35 or 42 cells
  const remaining = (7 - (daysGrid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    daysGrid.push({
      date: d,
      isCurrentMonth: false,
      dateStr: d.toISOString().split('T')[0],
    });
  }

  // Group meetings by date string (YYYY-MM-DD)
  const meetingsByDate: Record<string, Meeting[]> = {};
  meetings.forEach((m) => {
    const dStr = m.startAt.split('T')[0];
    if (!meetingsByDate[dStr]) meetingsByDate[dStr] = [];
    meetingsByDate[dStr].push(m);
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight">{monthNameHebrew}</h2>
          <button
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
          >
            היום
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 pl-4 border-l border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>תדריך מוכן</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>ממתין להכנה</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={onPrevMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="חודש קודם"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="חודש הבא"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Monthly Grid */
        <div className="flex-1 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/90 text-center py-2 text-xs font-semibold text-slate-400">
            {weekDays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 divide-x divide-x-reverse divide-y divide-slate-800/80">
            {daysGrid.map((dayObj, idx) => {
              const dayMeetings = meetingsByDate[dayObj.dateStr] || [];
              const isToday = dayObj.dateStr === '2026-10-26'; // anchored to current environment date

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                    dayObj.isCurrentMonth ? 'bg-slate-950/40' : 'bg-slate-950/90 opacity-40'
                  } ${isToday ? 'ring-1 ring-inset ring-indigo-500/50 bg-indigo-950/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-medium ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'
                          : dayObj.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {dayMeetings.length} פגישות
                      </span>
                    )}
                  </div>

                  {/* Meeting Cards in cell */}
                  <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-none flex-1">
                    {dayMeetings.map((meeting) => {
                      const isSelected = selectedMeetingId === meeting.id;
                      const hasBriefing = meeting.hasBriefing;

                      return (
                        <button
                          key={meeting.id}
                          onClick={() => onSelectMeeting(meeting)}
                          className={`w-full text-right p-1.5 rounded-lg text-xs transition-all border block ${
                            isSelected
                              ? 'bg-indigo-900/80 border-indigo-400 text-white shadow-md'
                              : hasBriefing
                              ? 'bg-slate-900 hover:bg-slate-850 border-emerald-800/50 text-slate-200'
                              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-mono text-[10px] text-slate-400 font-medium">
                              {formatTime(meeting.startAt)}
                            </span>
                            {hasBriefing ? (
                              <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> תדריך
                              </span>
                            ) : (
                              <span className="text-[9px] text-indigo-400 font-medium">להכנה</span>
                            )}
                          </div>
                          <div className="font-medium truncate text-[11px] leading-tight">
                            {meeting.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Weekly View */
        <div className="flex-1 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/90 text-center py-2.5 text-xs font-semibold text-slate-400">
            {weekDays.map((day, dIdx) => (
              <div key={day} className="flex flex-col items-center">
                <span>{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 divide-x divide-x-reverse divide-slate-800 p-2">
            {weekDays.map((_, dayIndex) => {
              // Current week around late October 2026
              const dayMeetings = meetings.filter((m) => {
                const d = new Date(m.startAt);
                return d.getDay() === dayIndex;
              });

              return (
                <div key={dayIndex} className="p-2 space-y-2 overflow-y-auto">
                  {dayMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => onSelectMeeting(meeting)}
                      className={`w-full text-right p-2.5 rounded-lg text-xs transition-all border ${
                        selectedMeetingId === meeting.id
                          ? 'bg-indigo-900/80 border-indigo-400 text-white shadow-md'
                          : meeting.hasBriefing
                          ? 'bg-slate-900 border-emerald-800/60 text-slate-200'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono">{formatTime(meeting.startAt)}</span>
                        <span className="font-mono">{formatDate(meeting.startAt)}</span>
                      </div>
                      <div className="font-semibold text-xs mb-1.5 leading-snug">{meeting.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                        {meeting.description}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                        <span className="text-slate-400">
                          {meeting.participantIds.length} משתתפים
                        </span>
                        {meeting.hasBriefing ? (
                          <span className="text-emerald-400 font-medium">✓ תדריך מוכן</span>
                        ) : (
                          <span className="text-indigo-400 font-medium">סוכן טרם הופעל</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Meeting, Participant, Briefing, ExecutionRecord, EvidenceDetail } from './types';
import { Header } from './components/Header';
import { ScenarioSelector, ScenarioItem } from './components/ScenarioSelector';
import { CalendarView } from './components/CalendarView';
import { MeetingDetailsModal } from './components/MeetingDetailsModal';
import { ExecutionTrace } from './components/ExecutionTrace';
import { BriefingView } from './components/BriefingView';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { TestRunnerModal } from './components/TestRunnerModal';
import { Sparkles, Calendar, FileText, Loader2, ArrowRight } from 'lucide-react';

export default function App() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBriefing, setCurrentBriefing] = useState<Briefing | null>(null);
  const [currentExecution, setCurrentExecution] = useState<ExecutionRecord | null>(null);

  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceDetail | null>(null);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 9, 26)); // October 2026
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load meetings on mount
  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/calendar/meetings');
      if (!res.ok) throw new Error('שגיאה בטעינת לוח הפגישות');
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // When meeting is clicked in calendar
  const handleSelectMeeting = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await fetch(`/api/calendar/meetings/${meeting.id}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
      // If briefing exists, load it
      if (meeting.hasBriefing) {
        loadBriefing(meeting.id);
      }
    } catch (err: any) {
      console.error('Error fetching meeting details:', err);
    }
    setIsDetailsModalOpen(true);
  };

  // Load existing briefing
  const loadBriefing = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/agent/briefings/${meetingId}`);
      if (res.ok) {
        const b = await res.json();
        setCurrentBriefing(b);
        if (b.executionId) {
          const execRes = await fetch(`/api/agent/executions/${b.executionId}`);
          if (execRes.ok) {
            const e = await execRes.json();
            setCurrentExecution(e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load briefing:', err);
    }
  };

  // Run agent to prepare briefing
  const handlePrepareBriefing = async (meetingId: string) => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/agent/prepare-briefing/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'deterministic_fallback' }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'שגיאה בהפעלת סוכן ההכנה לפגישות');
      }
      const data = await res.json();
      setCurrentBriefing(data.briefing);
      setCurrentExecution(data.execution);
      setIsDetailsModalOpen(false);
      // Refresh meetings list to show briefing badge
      await fetchMeetings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Run a scenario directly from the scenario bar
  const handleSelectScenario = async (scenario: ScenarioItem) => {
    setActiveScenario(scenario.id);
    setIsRunning(true);
    setErrorMsg(null);
    try {
      // Find the meeting for this scenario
      const targetMeeting = meetings.find((m) => m.id === scenario.meetingId);
      if (targetMeeting) {
        setSelectedMeeting(targetMeeting);
      }

      const res = await fetch(`/api/agent/scenario/${scenario.id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `שגיאה בהרצת תרחיש ${scenario.name}`);
      }
      const data = await res.json();
      setCurrentBriefing(data.briefing);
      setCurrentExecution(data.execution);
      setIsDetailsModalOpen(false);
      await fetchMeetings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Open citation drawer
  const handleOpenCitation = async (ref: string) => {
    setIsEvidenceLoading(true);
    setSelectedEvidence(null);
    try {
      const res = await fetch(`/api/evidence/${ref}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEvidence(data);
      }
    } catch (err) {
      console.error('Error fetching citation:', err);
    } finally {
      setIsEvidenceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Bar Header */}
      <Header
        currentDateText="26 באוקטובר 2026"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        testedCount={24}
      />

      {/* Scenario Selector Carousel (A-H) */}
      <ScenarioSelector
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        isRunning={isRunning}
      />

      {/* Error alert if any */}
      {errorMsg && (
        <div className="bg-rose-950/40 border-b border-rose-800/60 p-3 text-center text-xs text-rose-300">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calendar View (7 cols) */}
        <div className={`${currentBriefing ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col transition-all duration-200`}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-[580px]">
            <CalendarView
              meetings={meetings}
              selectedMeetingId={selectedMeeting?.id || null}
              onSelectMeeting={handleSelectMeeting}
              viewMode={viewMode}
              currentMonth={currentMonth}
              onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              onToday={() => setCurrentMonth(new Date(2026, 9, 26))}
            />
          </div>
        </div>

        {/* Right Column: Briefing & Execution Trace (6 cols when active) */}
        {currentBriefing ? (
          <div className="lg:col-span-6 space-y-6 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Real Execution Trace */}
            {currentExecution && <ExecutionTrace execution={currentExecution} />}

            {/* Briefing Title & Clear Action */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  תדריך הכנה מאומת: {selectedMeeting?.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCurrentBriefing(null);
                  setCurrentExecution(null);
                  setActiveScenario(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                סגור תדריך
              </button>
            </div>

            {/* 8 Hebrew Briefing Sections */}
            <BriefingView briefing={currentBriefing} onOpenCitation={handleOpenCitation} />
          </div>
        ) : (
          !isRunning && (
            <div className="hidden lg:flex lg:col-span-12 items-center justify-center p-8 border border-dashed border-slate-800/80 rounded-2xl text-center text-slate-500 text-xs">
              <span>בחר פגישה בלוח השנה או לחץ על אחד מתרחישי ההדגמה (A–H) כדי לצפות בסוכן בפעולה.</span>
            </div>
          )
        )}
      </main>

      {/* Selected Meeting Details Modal */}
      <MeetingDetailsModal
        meeting={selectedMeeting}
        participants={participants}
        onClose={() => setIsDetailsModalOpen(false)}
        onPrepareBriefing={handlePrepareBriefing}
        onViewExistingBriefing={(briefingId) => {
          setIsDetailsModalOpen(false);
          loadBriefing(briefingId);
        }}
        isRunning={isRunning}
      />

      {/* Evidence Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        isLoading={isEvidenceLoading}
      />

      {/* Automated Python Tests Inspector Modal */}
      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}

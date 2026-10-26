import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Play, Loader2, Terminal } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    exitCode: number;
    totalTests: number;
    rawOutput: string;
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/test-results');
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        exitCode: 1,
        totalTests: 0,
        rawOutput: `שגיאה בהפעלת הבדיקות: ${err.message}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !testResult && !isRunning) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">בדיקות אוטומטיות (Python Test Suite)</h3>
              <p className="text-xs text-slate-400">אימות 16 בדיקות ליבה ו-8 תרחישי הדגמה בפייתון</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>הפעל מחדש</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isRunning ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <div className="text-xs">מריץ את מערך הבדיקות האוטומטיות במנוע הפייתון...</div>
            </div>
          ) : testResult ? (
            <>
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      {testResult.success ? 'כל הבדיקות עברו בהצלחה (100% Pass)' : 'חלק מהבדיקות נכשלו'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      נבדקו {testResult.totalTests} בדיקות מבודדות עבור סינון תאריכים, אימות טענות, החלטות סותרות, תמלילים זדוניים ותרחישי הדגמה.
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white font-bold">
                  Exit Code: {testResult.exitCode}
                </span>
              </div>

              {/* Console log */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>פלט הרצת הבדיקות (python3 -m unittest discover):</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed dir-ltr text-left">
                  {testResult.rawOutput}
                </pre>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

import express, { Request, Response } from 'express';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const httpServer = http.createServer(app);

app.use(express.json());

// Helper to run python commands safely and return parsed JSON
function runPythonAgent(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', args, {
      cwd: __dirname,
      env: { ...process.env },
    });

    let stdoutData = '';
    let stderrData = '';

    python.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python agent error:', stderrData);
        return reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
      }
      try {
        const json = JSON.parse(stdoutData.trim());
        resolve(json);
      } catch (err) {
        console.error('Failed to parse Python JSON output:', stdoutData);
        reject(new Error(`Failed to parse Python agent output: ${err}`));
      }
    });

    python.on('error', (err) => {
      console.error('Failed to spawn Python process:', err);
      reject(err);
    });
  });
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Calendar meetings
app.get('/api/calendar/meetings', (req: Request, res: Response) => {
  try {
    const meetingsPath = path.join(__dirname, 'data', 'seed', 'meetings.json');
    const meetingsRaw = fs.readFileSync(meetingsPath, 'utf-8');
    const meetings = JSON.parse(meetingsRaw);

    const briefingsDir = path.join(__dirname, 'data', 'runtime', 'briefings');
    const briefedMeetingIds = new Set<string>();
    if (fs.existsSync(briefingsDir)) {
      const files = fs.readdirSync(briefingsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const b = JSON.parse(fs.readFileSync(path.join(briefingsDir, file), 'utf-8'));
            if (b.meetingId) briefedMeetingIds.add(b.meetingId);
          } catch (e) {
            // ignore malformed
          }
        }
      }
    }

    const { date_from, date_to } = req.query;
    const enriched = meetings
      .filter((m: any) => {
        if (date_from && m.startAt < String(date_from)) return false;
        if (date_to && m.startAt > String(date_to)) return false;
        return true;
      })
      .map((m: any) => ({
        ...m,
        hasBriefing: briefedMeetingIds.has(m.id),
        briefingId: briefedMeetingIds.has(m.id) ? `b-${m.id}` : null,
      }));

    res.json({ total: enriched.length, meetings: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Single meeting details
app.get('/api/calendar/meetings/:id', (req: Request, res: Response) => {
  try {
    const meetingsPath = path.join(__dirname, 'data', 'seed', 'meetings.json');
    const participantsPath = path.join(__dirname, 'data', 'seed', 'participants.json');
    const meetings = JSON.parse(fs.readFileSync(meetingsPath, 'utf-8'));
    const participants = JSON.parse(fs.readFileSync(participantsPath, 'utf-8'));

    const meeting = meetings.find((m: any) => m.id === req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: `פגישה ${req.params.id} לא נמצאה` });
    }

    const mParticipants = participants.filter((p: any) =>
      meeting.participantIds.includes(p.id)
    );

    res.json({
      meeting,
      participants: mParticipants,
      stableRef: `meeting:${meeting.id}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Prepare briefing via Python Agent Engine
app.post('/api/agent/prepare-briefing/:id', async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const mode = (req.body && req.body.mode) || 'deterministic_fallback';

    console.log(`[API] Executing Python agent for meeting ${meetingId} (mode: ${mode})...`);
    const result = await runPythonAgent([
      '-m',
      'backend.agent.cli',
      '--meeting-id',
      meetingId,
      '--mode',
      mode,
    ]);

    res.json(result);
  } catch (err: any) {
    console.error('Error in prepare-briefing:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Run Demonstration Scenario
app.post('/api/agent/scenario/:scenarioId', async (req: Request, res: Response) => {
  try {
    const scen = req.params.scenarioId.toUpperCase();
    console.log(`[API] Running demonstration scenario ${scen}...`);

    const result = await runPythonAgent([
      '-m',
      'backend.agent.cli',
      '--scenario',
      scen,
    ]);

    res.json({
      scenario: scen,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in run-scenario:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Retrieve Briefing
app.get('/api/agent/briefings/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const briefingsDir = path.join(__dirname, 'data', 'runtime', 'briefings');
    const directPath = path.join(briefingsDir, `${id}.json`);

    if (fs.existsSync(directPath)) {
      return res.json(JSON.parse(fs.readFileSync(directPath, 'utf-8')));
    }

    // Search by meetingId
    if (fs.existsSync(briefingsDir)) {
      const files = fs.readdirSync(briefingsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = JSON.parse(fs.readFileSync(path.join(briefingsDir, file), 'utf-8'));
          if (content.id === id || content.meetingId === id || content.meetingId === id.replace('b-', '')) {
            return res.json(content);
          }
        }
      }
    }

    res.status(404).json({ error: 'תדריך לא נמצא' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Retrieve Execution Record
app.get('/api/agent/executions/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const execPath = path.join(__dirname, 'data', 'runtime', 'executions', `${id}.json`);
    if (fs.existsSync(execPath)) {
      return res.json(JSON.parse(fs.readFileSync(execPath, 'utf-8')));
    }
    res.status(404).json({ error: 'רישום ביצוע לא נמצא' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Resolve Evidence Reference
app.get('/api/evidence/*', (req: Request, res: Response) => {
  try {
    const ref = req.params[0];
    if (!ref) {
      return res.status(400).json({ error: 'חסר מזהה אסמכתא' });
    }

    const parts = ref.split(':');
    const type = parts[0];

    if (type === 'transcript' && parts.length >= 3) {
      const trId = parts[1];
      const segId = parts[2];
      const transcriptsPath = path.join(__dirname, 'data', 'seed', 'transcripts.json');
      const transcripts = JSON.parse(fs.readFileSync(transcriptsPath, 'utf-8'));
      const tr = transcripts.find((t: any) => t.id === trId);
      if (tr) {
        const seg = tr.segments.find((s: any) => s.id === segId);
        if (seg) {
          const meetings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'meetings.json'), 'utf-8'));
          const meeting = meetings.find((m: any) => m.id === tr.meetingId);
          return res.json({
            ref,
            type: 'transcript',
            quote: seg.text,
            speakerName: seg.speakerLabel,
            speakerId: seg.speakerId,
            meetingId: tr.meetingId,
            meetingTitle: meeting ? meeting.title : 'פגישה היסטורית',
            meetingDate: meeting ? meeting.startAt : null,
            offsetSeconds: seg.offsetSeconds,
            verified: true,
          });
        }
      }
    } else if (type === 'decision' && parts.length >= 2) {
      const decId = parts[1];
      const decisions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'decisions.json'), 'utf-8'));
      const d = decisions.find((item: any) => item.id === decId);
      if (d) {
        const meetings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'meetings.json'), 'utf-8'));
        const meeting = meetings.find((m: any) => m.id === d.meetingId);
        return res.json({
          ref,
          type: 'decision',
          quote: d.description,
          topic: d.topic,
          status: d.status,
          meetingId: d.meetingId,
          meetingTitle: meeting ? meeting.title : 'פגישה היסטורית',
          meetingDate: d.createdAt,
          supersedes: d.supersedes,
          evidenceRefs: d.evidenceRefs,
          verified: true,
        });
      }
    } else if (type === 'action' && parts.length >= 2) {
      const actId = parts[1];
      const actions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'action_items.json'), 'utf-8'));
      const a = actions.find((item: any) => item.id === actId);
      if (a) {
        const participants = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'participants.json'), 'utf-8'));
        const owner = participants.find((p: any) => p.id === a.ownerId);
        const meetings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'meetings.json'), 'utf-8'));
        const meeting = meetings.find((m: any) => m.id === a.meetingId);
        return res.json({
          ref,
          type: 'action',
          quote: a.description,
          ownerName: owner ? owner.name : null,
          dueAt: a.dueAt,
          originalDueText: a.originalDueText,
          status: a.status,
          meetingId: a.meetingId,
          meetingTitle: meeting ? meeting.title : 'פגישה היסטורית',
          verified: true,
        });
      }
    } else if (type === 'meeting' && parts.length >= 2) {
      const mId = parts[1];
      const meetings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed', 'meetings.json'), 'utf-8'));
      const m = meetings.find((item: any) => item.id === mId);
      if (m) {
        return res.json({
          ref,
          type: 'meeting',
          quote: m.description,
          meetingTitle: m.title,
          meetingDate: m.startAt,
          verified: true,
        });
      }
    }

    res.status(404).json({ error: 'אסמכתא לא נמצאה' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Run Automated Tests and return real results
app.get('/api/test-results', (req: Request, res: Response) => {
  const python = spawn('python3', ['-m', 'unittest', 'discover', 'backend/tests', '-v'], {
    cwd: __dirname,
  });

  let output = '';
  python.stdout.on('data', (d) => (output += d.toString()));
  python.stderr.on('data', (d) => (output += d.toString()));

  python.on('close', (code) => {
    const passed = code === 0;
    const testMatches = output.match(/test_\w+/g) || [];
    const totalCount = new Set(testMatches).size;
    res.json({
      success: passed,
      exitCode: code,
      totalTests: totalCount,
      rawOutput: output,
    });
  });
});

// -------------------------------------------------------------
// VITE SETUP (Dev & Production)
// -------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createServer({
      server: {
        middlewareMode: true,
        ws: isHmrDisabled
          ? false
          : {
              server: httpServer,
            },
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Recall server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Clock3, Cloud, Copy, FlaskConical,
  LayoutDashboard, Loader2, Moon, Play, RefreshCw, ScrollText, Search, Server, Settings2, ShieldAlert,
  ShieldCheck, ShieldX, Sun, TerminalSquare, XCircle, Check, CircleDashed,
} from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Runtime protection and security telemetry at a glance.' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, desc: 'Launch approved benchmark runs and follow their output live.' },
  { id: 'audit', label: 'Audit log', icon: ScrollText, desc: 'Every tool-call decision recorded by the policy gateway.' },
  { id: 'architecture', label: 'Architecture', icon: Settings2, desc: 'How the research system is wired together.' },
];

const DECISIONS = {
  ALLOW: { label: 'Allowed', cls: 'allow', icon: CheckCircle2 },
  CONFIRM: { label: 'Needs confirmation', cls: 'confirm', icon: ShieldAlert },
  DENY: { label: 'Denied', cls: 'deny', icon: ShieldX },
};

const EXPERIMENT_INFO = {
  baseline: { title: 'Baseline agent', desc: 'Agent runs with no gateway: the unprotected reference point.' },
  protected: { title: 'Protected agent', desc: 'Same agent, every tool call routed through the policy gateway.' },
  attack_001: { title: 'Attack 001', desc: 'Prompt-injection scenario comparing baseline and protected modes.' },
};

const api = async (path, options) => {
  const r = await fetch('/api' + path, options);
  if (!r.ok) {
    let m = `Request failed (${r.status})`;
    try { m = (await r.json()).detail || m; } catch {}
    throw Error(m);
  }
  return r.json();
};

const fmt = v => (v === null || v === undefined ? '—' : String(v));
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function duration(from) {
  const s = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function useTheme() {
  // index.html sets data-theme before first paint; start from it to avoid a flash.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('as-theme', theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}

function useTick(ms, active = true) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN(n => n + 1), ms);
    return () => clearInterval(t);
  }, [ms, active]);
}

function usePage() {
  const read = () => {
    const h = window.location.hash.slice(1);
    return NAV.some(n => n.id === h) ? h : 'overview';
  };
  const [page, setPageState] = useState(read);
  useEffect(() => {
    const onHash = () => setPageState(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setPage = id => {
    if (id !== page) window.location.hash = id;
    window.scrollTo({ top: 0 });
  };
  return [page, setPage];
}

export default function App() {
  const [page, setPage] = usePage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, toggleTheme] = useTheme();
  useTick(1000);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api('/overview'));
      setError('');
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const notify = (kind, text) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  };

  const current = NAV.find(n => n.id === page);
  const connected = !!data && !error;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={20} /></div>
          <div>
            <strong>AgentShield</strong>
            <small>Research console</small>
          </div>
        </div>
        <nav>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>
              <Icon size={17} />
              <span>{label}</span>
              {id === 'experiments' && data?.runner?.running && <span className="nav-live" title="Experiment running" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={'conn ' + (connected ? 'ok' : 'bad')}>
            <span className="pulse" />
            <div>
              <b>{connected ? 'Backend online' : data ? 'Connection lost' : 'Connecting…'}</b>
              <small>{lastSync ? `Synced ${timeAgo(lastSync)}` : 'Waiting for first sync'}</small>
            </div>
          </div>
          <dl className="env">
            <div><dt>Host</dt><dd>Oracle VPS</dd></div>
            <div><dt>Benchmark</dt><dd>AgentDojo v1</dd></div>
            <div><dt>Version</dt><dd>v0.1 prototype</dd></div>
          </dl>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <div className="crumb">AgentShield <ChevronRight size={12} /> {current.label}</div>
            <h1>{current.label}</h1>
            <p>{current.desc}</p>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="btn ghost" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> <span>Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="banner">
            <AlertTriangle size={17} />
            <div><b>Can't reach the backend.</b> {error}. Retrying every 4 seconds.</div>
          </div>
        )}

        {!data && !error ? <Skeleton /> : (
          <ErrorBoundary key={page}>
            <div className="page">
              {page === 'overview' && <Overview data={data} go={setPage} />}
              {page === 'experiments' && <Experiments data={data} refresh={refresh} notify={notify} />}
              {page === 'audit' && <AuditPage rows={data?.recent || []} total={data?.total_decisions ?? 0} />}
              {page === 'architecture' && <Architecture model={data?.model} />}
            </div>
          </ErrorBoundary>
        )}

        <footer>AgentShield Research Console · Private research environment</footer>
      </main>

      {toast && (
        <div className={'toast ' + toast.kind} role="status">
          {toast.kind === 'ok' ? <CheckCircle2 size={17} /> : <XCircle size={17} />} {toast.text}
        </div>
      )}
    </div>
  );
}

function Overview({ data, go }) {
  const total = data?.total_decisions ?? 0;
  const allowed = data?.allowed ?? 0;
  const confirm = data?.confirm ?? 0;
  const denied = data?.denied ?? 0;
  const results = data?.attack_results || [];
  const runner = data?.runner || {};

  return (
    <>
      <section className="kpis">
        <Kpi icon={Activity} tone="neutral" label="Tool calls inspected" value={total} hint="All gateway decisions" />
        <Kpi icon={CheckCircle2} tone="allow" label="Allowed" value={allowed} hint={`${pct(allowed, total)}% of calls`} />
        <Kpi icon={ShieldAlert} tone="confirm" label="Held for confirmation" value={confirm} hint={`${pct(confirm, total)}% of calls`} />
        <Kpi icon={ShieldX} tone="deny" label="Denied" value={denied} hint={`${pct(denied, total)}% of calls`} />
      </section>

      <section className="grid-2">
        <div className="card">
          <CardHead title="Decision mix" sub="Share of tool calls by gateway verdict" />
          <DecisionBar allowed={allowed} confirm={confirm} denied={denied} />
          <div className="hero-metric">
            <div>
              <span className="hero-num">{pct(confirm + denied, total)}%</span>
              <span className="hero-label">of tool calls were stopped before execution</span>
            </div>
            <ShieldCheck size={34} />
          </div>
        </div>

        <div className="card">
          <CardHead title="Runner" sub="Experiment execution status"
            action={<button className="link" onClick={() => go('experiments')}>Open runner <ArrowRight size={14} /></button>} />
          <RunnerStatus runner={runner} />
          <dl className="kv">
            <div><dt>LLM provider</dt><dd>GroqCloud</dd></div>
            <div><dt>Model</dt><dd><code>{data?.model || '—'}</code></dd></div>
            <div><dt>Security boundary</dt><dd>SecureFunctionsRuntime</dd></div>
            <div><dt>Last exit code</dt><dd>{fmt(runner.exit_code)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="card">
        <CardHead title="Attack comparison" sub="Prompt-injection outcomes, baseline vs. protected agent" tag="AgentDojo" />
        <AttackResults rows={results} go={go} />
      </section>

      <section className="card">
        <CardHead title="Recent activity" sub="Latest policy decisions from the gateway"
          action={<button className="link" onClick={() => go('audit')}>View full log <ArrowRight size={14} /></button>} />
        <ActivityFeed rows={(data?.recent || []).slice(0, 6)} />
      </section>
    </>
  );
}

function Kpi({ icon: Icon, tone, label, value, hint }) {
  return (
    <div className={'kpi ' + tone}>
      <div className="kpi-icon"><Icon size={18} /></div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        <span className="kpi-hint">{hint}</span>
      </div>
    </div>
  );
}

function CardHead({ title, sub, tag, action }) {
  return (
    <div className="card-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {tag && <span className="tag">{tag}</span>}
      {action}
    </div>
  );
}

function DecisionBar({ allowed, confirm, denied }) {
  const total = allowed + confirm + denied;
  const segs = [
    { key: 'ALLOW', n: allowed },
    { key: 'CONFIRM', n: confirm },
    { key: 'DENY', n: denied },
  ];
  if (!total) return <Empty icon={Activity} title="No decisions yet" text="Run an experiment to see how the gateway responds." compact />;
  return (
    <div className="mix">
      <div className="mix-bar" role="img" aria-label={segs.map(s => `${DECISIONS[s.key].label} ${s.n}`).join(', ')}>
        {segs.filter(s => s.n).map(s => (
          <div key={s.key} className={'mix-seg ' + DECISIONS[s.key].cls} style={{ flexGrow: s.n }}>
            <span className="mix-tip">{DECISIONS[s.key].label}: {s.n} ({pct(s.n, total)}%)</span>
          </div>
        ))}
      </div>
      <ul className="mix-legend">
        {segs.map(s => {
          const D = DECISIONS[s.key];
          return (
            <li key={s.key}>
              <span className={'swatch ' + D.cls} />
              <span className="mix-name">{D.label}</span>
              <b>{s.n}</b>
              <span className="muted">{pct(s.n, total)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RunnerStatus({ runner }) {
  if (runner.running) {
    return (
      <div className="runner-state running">
        <Loader2 size={18} className="spin" />
        <div>
          <b>Running {EXPERIMENT_INFO[runner.experiment]?.title || runner.experiment}</b>
          <small>Elapsed {runner.started_at ? duration(runner.started_at) : '—'}</small>
        </div>
      </div>
    );
  }
  const failed = runner.exit_code !== null && runner.exit_code !== undefined && runner.exit_code !== 0;
  return (
    <div className={'runner-state ' + (failed ? 'failed' : 'idle')}>
      {failed ? <XCircle size={18} /> : <CircleDashed size={18} />}
      <div>
        <b>{failed ? 'Last run failed' : 'Idle, ready to run'}</b>
        <small>{runner.experiment ? `Last: ${EXPERIMENT_INFO[runner.experiment]?.title || runner.experiment} · ${timeAgo(runner.started_at)}` : 'No runs this session'}</small>
      </div>
    </div>
  );
}

// Outcome is binary per mode, so a table reads better than a 0/1 bar chart.
function AttackResults({ rows, go }) {
  if (!rows.length) {
    return (
      <Empty icon={FlaskConical} title="No attack results yet" text="Run Attack 001 to compare the baseline and protected agents."
        action={<button className="btn primary sm" onClick={() => go('experiments')}><Play size={14} /> Go to runner</button>} />
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Mode</th><th>User task</th><th>Injection</th><th>Task completed</th><th>Attack blocked</th><th className="num">Time</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><span className={'mode ' + (r.mode === 'protected' ? 'prot' : 'base')}>{r.mode === 'protected' ? <ShieldCheck size={13} /> : <Server size={13} />}{r.mode === 'protected' ? 'Protected' : 'Baseline'}</span></td>
              <td><code>{fmt(r.user_task)}</code></td>
              <td><code>{fmt(r.injection_task)}</code></td>
              <td><Outcome ok={!!r.utility_success} yes="Yes" no="No" /></td>
              <td><Outcome ok={r.security_success !== false} yes="Blocked" no="Succeeded" /></td>
              <td className="num">{r.elapsed_seconds != null ? `${Number(r.elapsed_seconds).toFixed(1)}s` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Outcome({ ok, yes, no }) {
  return <span className={'outcome ' + (ok ? 'good' : 'bad')}>{ok ? <Check size={13} /> : <XCircle size={13} />}{ok ? yes : no}</span>;
}

function DecisionPill({ decision }) {
  const D = DECISIONS[decision];
  if (!D) return <span className="pill">{fmt(decision)}</span>;
  const Icon = D.icon;
  return <span className={'pill ' + D.cls}><Icon size={12} />{D.label}</span>;
}

function ActivityFeed({ rows }) {
  if (!rows.length) return <Empty icon={ScrollText} title="No activity yet" text="Gateway decisions appear here as they're recorded." compact />;
  return (
    <ul className="feed">
      {rows.map((r, i) => {
        const D = DECISIONS[r.decision];
        const Icon = D?.icon || Activity;
        return (
          <li key={i}>
            <span className={'feed-icon ' + (D?.cls || '')}><Icon size={15} /></span>
            <div className="feed-main">
              <code>{fmt(r.tool)}</code>
              <span className="muted">{fmt(r.reason)}</span>
            </div>
            <DecisionPill decision={r.decision} />
            <time title={r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}>{timeAgo(r.timestamp)}</time>
          </li>
        );
      })}
    </ul>
  );
}

function Experiments({ data, refresh, notify }) {
  const runner = data?.runner || {};
  const experiments = data?.experiments || [];
  const [selected, setSelected] = useState(runner.experiment || 'protected');
  const [log, setLog] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const termRef = useRef(null);
  const running = !!runner.running;
  const isSelectedRunning = running && runner.experiment === selected;

  const loadLog = useCallback(() => {
    api('/logs/' + selected).then(x => setLog(x.text)).catch(() => setLog(''));
  }, [selected]);

  useEffect(() => { loadLog(); }, [loadLog, running]);

  useEffect(() => {
    if (!isSelectedRunning) return;
    const t = setInterval(loadLog, 2000);
    return () => clearInterval(t);
  }, [isSelectedRunning, loadLog]);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const start = async () => {
    setBusy(true);
    try {
      await api('/experiments/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ experiment: selected }) });
      notify('ok', `${EXPERIMENT_INFO[selected]?.title || selected} started`);
      await refresh();
    } catch (e) {
      notify('err', e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(log);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const sel = experiments.find(x => x.id === selected);

  return (
    <div className="grid-exp">
      <section className="card">
        <CardHead title="Choose an experiment" sub="Only predefined, allow-listed scripts can run" tag="Controlled" />
        <div className="exp-list">
          {experiments.map(x => {
            const info = EXPERIMENT_INFO[x.id] || { title: x.id, desc: '' };
            const thisRunning = running && runner.experiment === x.id;
            return (
              <button key={x.id} className={'exp' + (selected === x.id ? ' selected' : '') + (!x.available ? ' unavailable' : '')} onClick={() => setSelected(x.id)}>
                <span className="radio" />
                <div className="exp-body">
                  <strong>{info.title}</strong>
                  <span>{info.desc}</span>
                  <code>{x.filename}</code>
                </div>
                {thisRunning ? <span className="badge run"><Loader2 size={12} className="spin" />Running</span>
                  : x.available ? <span className="badge ok">Ready</span>
                  : <span className="badge off">Not installed</span>}
              </button>
            );
          })}
        </div>
        <button className="btn primary block" disabled={busy || running || !sel?.available} onClick={start}>
          {busy || running ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          {running ? `Running ${EXPERIMENT_INFO[runner.experiment]?.title || runner.experiment}…` : !sel?.available ? 'Script not installed' : `Run ${EXPERIMENT_INFO[selected]?.title || selected}`}
        </button>
        <p className="fine"><Clock3 size={12} /> One run at a time · 15-minute limit · runs in AgentDojo's simulated workspace</p>
      </section>

      <section className="card term-card">
        <div className="term-head">
          <div className="dots"><i /><i /><i /></div>
          <span className="term-title"><TerminalSquare size={14} /> dashboard_{selected}.log</span>
          {isSelectedRunning && <span className="badge run"><span className="live-dot" />Live</span>}
          <div className="term-actions">
            <button className="icon-btn sm" onClick={copy} disabled={!log} title="Copy output">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
            <button className="icon-btn sm" onClick={loadLog} title="Reload output"><RefreshCw size={14} /></button>
          </div>
        </div>
        <pre className="terminal" ref={termRef}>
          {log || <span className="term-empty">No dashboard-initiated run recorded for this experiment yet.{'\n'}Press Run to start one. Output streams here.</span>}
        </pre>
        <div className="term-foot">
          <span>Exit code: <b className={runner.exit_code === 0 ? 'ok' : runner.exit_code != null ? 'bad' : ''}>{fmt(runner.exit_code)}</b></span>
          {running && runner.started_at && <span>Elapsed <b>{duration(runner.started_at)}</b></span>}
        </div>
      </section>
    </div>
  );
}

function AuditPage({ rows, total }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');
  const counts = useMemo(() => {
    const c = { ALL: rows.length, ALLOW: 0, CONFIRM: 0, DENY: 0 };
    rows.forEach(r => { if (c[r.decision] !== undefined) c[r.decision]++; });
    return c;
  }, [rows]);
  const shown = rows.filter(r =>
    (filter === 'ALL' || r.decision === filter) &&
    (!q || `${r.tool} ${r.reason}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <section className="card">
      <div className="toolbar">
        <div className="search">
          <Search size={15} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tool or reason…" aria-label="Search audit log" />
        </div>
        <div className="chips" role="tablist">
          {['ALL', 'ALLOW', 'CONFIRM', 'DENY'].map(k => (
            <button key={k} role="tab" aria-selected={filter === k} className={'chip' + (filter === k ? ' on' : '') + (k !== 'ALL' ? ' ' + DECISIONS[k].cls : '')} onClick={() => setFilter(k)}>
              {k === 'ALL' ? 'All' : DECISIONS[k].label}<span>{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="fine table-note">Showing {shown.length} of the latest {rows.length} records · {total} recorded in total</p>
      {shown.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Tool</th><th>Decision</th><th>Reason</th></tr></thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i}>
                  <td className="nowrap" title={r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}>
                    <div>{timeAgo(r.timestamp)}</div>
                    <small className="muted">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : ''}</small>
                  </td>
                  <td><code>{fmt(r.tool)}</code></td>
                  <td><DecisionPill decision={r.decision} /></td>
                  <td className="muted">{fmt(r.reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={Search} title={rows.length ? 'No matching records' : 'No audit records yet'}
          text={rows.length ? 'Try a different search or filter.' : 'Gateway events will appear here when recorded.'} />
      )}
    </section>
  );
}

function Architecture({ model }) {
  const steps = [
    { icon: Server, title: 'AgentDojo benchmark', where: 'Oracle VPS', text: 'Supplies the user task, injected content and tool schemas.' },
    { icon: Cloud, title: `GroqCloud · ${model || 'LLM'}`, where: 'Remote inference', text: 'The model decides which tool to call next.' },
    { icon: ShieldCheck, title: 'SecureFunctionsRuntime · PolicyEngine', where: 'Security boundary', text: 'Every requested call is checked: allowed, held for confirmation, or denied.', hl: true },
    { icon: TerminalSquare, title: 'Simulated workspace tools', where: 'Oracle VPS', text: 'Only approved calls execute; the evaluator scores utility and security.' },
    { icon: ScrollText, title: 'FastAPI · React dashboard', where: 'This console', text: 'Audit records and results are surfaced here.' },
  ];
  return (
    <div className="grid-arch">
      <section className="card">
        <CardHead title="Protected agent execution flow" sub="LLM inference is remote; the benchmark, gateway and tools run on the VPS." />
        <ol className="flow">
          {steps.map((s, i) => (
            <li key={i} className={s.hl ? 'hl' : ''}>
              <div className="flow-icon"><s.icon size={18} /></div>
              <div className="flow-body">
                <span className="flow-where">{s.where}</span>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="card">
        <CardHead title="Policy verdicts" sub="What each gateway decision means" />
        <ul className="legend-list">
          <li><DecisionPill decision="ALLOW" /><p>Read-only or low-risk tools. The call executes normally.</p></li>
          <li><DecisionPill decision="CONFIRM" /><p>Sensitive actions. Currently <b>blocked</b>; human approval is not wired up yet.</p></li>
          <li><DecisionPill decision="DENY" /><p>Unknown or disallowed tools. The call never executes.</p></li>
        </ul>
        <div className="note"><AlertTriangle size={15} /> Tool-name policy is a research prototype, not a complete prompt-injection defense.</div>
      </section>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="card">
        <Empty icon={AlertTriangle} title="This view failed to render" text={String(this.state.error?.message || this.state.error)}
          action={<button className="btn ghost sm" onClick={() => this.setState({ error: null })}>Try again</button>} />
      </section>
    );
  }
}

function Empty({ icon: Icon, title, text, action, compact }) {
  return (
    <div className={'empty' + (compact ? ' compact' : '')}>
      <div className="empty-icon"><Icon size={22} /></div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="page">
      <div className="kpis">{[0, 1, 2, 3].map(i => <div key={i} className="kpi sk" />)}</div>
      <div className="grid-2"><div className="card sk tall" /><div className="card sk tall" /></div>
    </div>
  );
}

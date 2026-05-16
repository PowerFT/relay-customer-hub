// Dashboard view

const { useState, useMemo } = React;

function StatCard({ title, value, IconComp, gradient, leftLabel, leftValue, rightLabel, rightValue, trend }) {
  const ratio = leftValue / (leftValue + rightValue);
  return (
    <div className={'stat-card ' + gradient}>
      <div className="stat-head">
        <div>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className="stat-trend">
            {trend >= 0 ? <window.ArrowUp size={11}/> : <window.ArrowDown size={11}/>} {Math.abs(trend)}% vs last week
          </div>
        </div>
        <div className="stat-icon"><IconComp size={18}/></div>
      </div>
      <div className="stat-split">
        <div className="stat-split-half">
          <div className="value">{leftValue.toLocaleString()}</div>
          <div className="label">{leftLabel}</div>
        </div>
        <div className="stat-split-divider"/>
        <div className="stat-split-half">
          <div className="value">{rightValue.toLocaleString()}</div>
          <div className="label">{rightLabel}</div>
        </div>
      </div>
      <div className="stat-progress"><div className="stat-progress-fill" style={{width: (ratio*100) + '%'}}/></div>
    </div>
  );
}

function BarChart({ data }) {
  const W = 520, H = 240, pad = { l: 36, r: 12, t: 16, b: 28 };
  const max = Math.max(...data.flatMap(d => [d.inbound, d.outbound]));
  const niceMax = Math.ceil(max / 50) * 50;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const barGroupW = innerW / data.length;
  const barW = (barGroupW - 12) / 2;
  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" preserveAspectRatio="xMidYMid meet">
      {Array.from({length: yTicks + 1}).map((_, i) => {
        const y = pad.t + (innerH / yTicks) * i;
        const val = Math.round(niceMax - (niceMax / yTicks) * i);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#EEF1F6" strokeWidth="1"/>
            <text x={pad.l - 8} y={y + 4} fontSize="10" textAnchor="end" fill="#9CA3AF">{val}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const gx = pad.l + i * barGroupW + 6;
        const hIn = (d.inbound / niceMax) * innerH;
        const hOut = (d.outbound / niceMax) * innerH;
        return (
          <g key={d.day}>
            <rect x={gx} y={pad.t + innerH - hIn} width={barW} height={hIn} rx="3" fill="#068B78"/>
            <rect x={gx + barW + 4} y={pad.t + innerH - hOut} width={barW} height={hOut} rx="3" fill="#9ECEFF"/>
            <text x={gx + barW + 2} y={H - 10} fontSize="11" textAnchor="middle" fill="#6B7280">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AreaChart({ data, highlight = 4 }) {
  const W = 520, H = 240, pad = { l: 32, r: 12, t: 24, b: 28 };
  const max = Math.max(...data.map(d => d.v));
  const min = Math.min(...data.map(d => d.v));
  const niceMax = Math.ceil(max + 2);
  const niceMin = Math.max(0, Math.floor(min - 1));
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xs = data.map((_, i) => pad.l + (innerW / (data.length - 1)) * i);
  const ys = data.map(d => pad.t + innerH - ((d.v - niceMin) / (niceMax - niceMin)) * innerH);

  // smooth path
  const path = xs.map((x, i) => {
    if (i === 0) return `M ${x},${ys[i]}`;
    const cx1 = (xs[i-1] + x) / 2;
    const cx2 = (xs[i-1] + x) / 2;
    return `C ${cx1},${ys[i-1]} ${cx2},${ys[i]} ${x},${ys[i]}`;
  }).join(' ');
  const area = path + ` L ${xs[xs.length-1]},${pad.t + innerH} L ${xs[0]},${pad.t + innerH} Z`;

  const hxIdx = highlight;
  const hx = xs[hxIdx], hy = ys[hxIdx];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240">
      <defs>
        <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#068B78" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#068B78" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0,1,2,3,4].map(i => {
        const y = pad.t + (innerH / 4) * i;
        return <line key={i} x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#EEF1F6"/>;
      })}
      <path d={area} fill="url(#area-fill)"/>
      <path d={path} fill="none" stroke="#068B78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={i === hxIdx ? 5 : 3} fill="white" stroke="#068B78" strokeWidth="2"/>
      ))}
      {data.map((d, i) => (
        <text key={'t'+i} x={xs[i]} y={H - 10} fontSize="10" textAnchor="middle" fill="#9CA3AF">{d.m}</text>
      ))}
      {/* tooltip */}
      <g transform={`translate(${hx}, ${hy - 24})`}>
        <rect x={-32} y={-18} width="64" height="22" rx="6" fill="#1A1F2E"/>
        <text x="0" y="-3" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">{`${Math.floor(data[hxIdx].v)}m ${Math.round((data[hxIdx].v % 1) * 60).toString().padStart(2,'0')}s`}</text>
        <path d="M -4 4 L 0 8 L 4 4 Z" fill="#1A1F2E"/>
      </g>
    </svg>
  );
}

// Dotted world map silhouette: generated by sampling a continent mask via a few rectangular regions
function WorldMap() {
  // pre-computed dot positions roughly outlining continents
  const dots = useMemo(() => {
    const pts = [];
    // Each region: [x1,y1,x2,y2, density]
    const regions = [
      // North America
      [80, 70, 170, 180, 0.55],
      // South America
      [180, 170, 230, 280, 0.5],
      // Europe
      [225, 70, 285, 130, 0.55],
      // Africa
      [240, 130, 305, 235, 0.5],
      // Asia
      [285, 60, 405, 175, 0.45],
      // Oceania
      [370, 200, 430, 245, 0.45],
    ];
    const seed = 42;
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    regions.forEach(([x1, y1, x2, y2, d]) => {
      const step = 9;
      for (let x = x1; x <= x2; x += step) {
        for (let y = y1; y <= y2; y += step) {
          if (rnd() < d) {
            const jx = x + (rnd() - 0.5) * 3;
            const jy = y + (rnd() - 0.5) * 3;
            pts.push([jx, jy]);
          }
        }
      }
    });
    // remove some to roughly shape oceans
    return pts;
  }, []);

  const [hover, setHover] = useState(null);

  return (
    <div style={{position: 'relative', width: '100%', height: 320}}>
      <svg viewBox="40 50 410 230" width="100%" height="320" preserveAspectRatio="xMidYMid meet" style={{display: 'block'}}>
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill="#D5DCE8"/>
        ))}
        {window.MAP_BUBBLES.map((b, i) => {
          const col = window.CHANNELS[b.ch].color;
          return (
            <g key={i}
               onMouseEnter={() => setHover(b)}
               onMouseLeave={() => setHover(null)}
               style={{cursor: 'pointer'}}>
              <circle cx={b.x} cy={b.y} r={b.r} fill={col} fillOpacity="0.18"/>
              <circle cx={b.x} cy={b.y} r={b.r * 0.5} fill={col} fillOpacity="0.85"/>
              <circle cx={b.x} cy={b.y} r="2" fill="white"/>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="tooltip-pill" style={{
          left: `${((hover.x - 40) / 410) * 100}%`,
          top: `${((hover.y - 50) / 230) * 100}%`,
        }}>
          {hover.country} · {window.CHANNELS[hover.ch].name} · {hover.count}
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, total }) {
  const W = 200, cx = W / 2, cy = W / 2, R = 78, r = 52;
  const sum = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const segs = data.map(d => {
    const start = acc / sum * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const end = acc / sum * Math.PI * 2 - Math.PI / 2;
    const largeArc = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + Math.cos(start) * R, y1 = cy + Math.sin(start) * R;
    const x2 = cx + Math.cos(end) * R,   y2 = cy + Math.sin(end) * R;
    const x3 = cx + Math.cos(end) * r,   y3 = cy + Math.sin(end) * r;
    const x4 = cx + Math.cos(start) * r, y4 = cy + Math.sin(start) * r;
    return {
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`,
      color: d.color,
    };
  });
  return (
    <div className="donut-wrap">
      <div style={{position: 'relative', width: W, height: W}}>
        <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W}>
          {segs.map((s, i) => <path key={i} d={s.d} fill={s.color}/>)}
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <div className="donut-center">
            {total}
            <small>Conversations</small>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {data.map(d => (
          <div key={d.id} className="donut-legend-item">
            <span className="left"><span className="legend-dot" style={{background: d.color}}/>{d.name}</span>
            <span className="right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const [volRange, setVolRange] = useState('Week');
  const [respRange, setRespRange] = useState('Year');
  const [activityToggle, setActivityToggle] = useState('Volume');

  return (
    <div className="dashboard" data-screen-label="01 Dashboard">
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <div>
          <h1>Dashboard</h1>
          <p>Good afternoon Alex — here's how your team is doing this week.</p>
        </div>
        <div className="chip-row">
          <button className="select-pill"><window.Globe size={14}/> All channels <window.ChevronDown size={12}/></button>
          <button className="select-pill"><window.Clock size={14}/> Last 7 days <window.ChevronDown size={12}/></button>
          <button className="select-pill" style={{background: 'var(--primary)', color: 'white', borderColor: 'transparent'}}>
            <window.Sparkle size={14}/> Insights
          </button>
        </div>
      </div>

      {/* Row 1: stat cards */}
      <div className="stat-grid">
        <StatCard
          title="Total Messages" value={window.STATS.totalMessages.value} trend={window.STATS.totalMessages.trend}
          IconComp={window.MessageSquare} gradient="gradient-blue"
          leftLabel="Inbound" leftValue={window.STATS.totalMessages.inbound}
          rightLabel="Outbound" rightValue={window.STATS.totalMessages.outbound}
        />
        <StatCard
          title="Unread" value={window.STATS.unread.value} trend={window.STATS.unread.trend}
          IconComp={window.MailOpen} gradient="gradient-pink"
          leftLabel="Assigned" leftValue={window.STATS.unread.assigned}
          rightLabel="Unassigned" rightValue={window.STATS.unread.unassigned}
        />
        <StatCard
          title="Active Conversations" value={window.STATS.active.value} trend={window.STATS.active.trend}
          IconComp={window.MessagesSquare} gradient="gradient-orange"
          leftLabel="Open" leftValue={window.STATS.active.open}
          rightLabel="Snoozed" rightValue={window.STATS.active.snoozed}
        />
        <StatCard
          title="Resolved Today" value={window.STATS.resolved.value} trend={window.STATS.resolved.trend}
          IconComp={window.CheckCircle2} gradient="gradient-purple"
          leftLabel="Resolved" leftValue={window.STATS.resolved.resolved}
          rightLabel="Escalated" rightValue={window.STATS.resolved.escalated}
        />
      </div>

      {/* Row 2: bar + area */}
      <div className="row-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Message Volume</h3>
              <div className="card-subtitle">Inbound vs outbound by day</div>
            </div>
            <div className="chip-row">
              <button className="select-pill">{volRange} <window.ChevronDown size={12}/></button>
              <button className="icon-btn"><window.MoreHorizontal size={16}/></button>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={window.VOLUME_BY_DAY}/>
            <div className="legend">
              <span className="legend-item"><span className="legend-dot" style={{background: '#068B78'}}/>Inbound</span>
              <span className="legend-item"><span className="legend-dot" style={{background: '#9ECEFF'}}/>Outbound</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Avg Response Time</h3>
              <div className="card-subtitle">First-reply time by month</div>
            </div>
            <div className="chip-row">
              <button className="select-pill">{respRange} <window.ChevronDown size={12}/></button>
              <button className="icon-btn"><window.MoreHorizontal size={16}/></button>
            </div>
          </div>
          <div className="card-body">
            <AreaChart data={window.RESPONSE_BY_MONTH} highlight={4}/>
            <div className="legend">
              <span className="legend-item"><span className="legend-dot" style={{background: '#068B78'}}/>Median first response (minutes)</span>
              <span className="legend-item" style={{marginLeft: 'auto'}}>Target ≤ 10m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: channel activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Activity by Channel</h3>
            <div className="card-subtitle">Volume distribution worldwide</div>
          </div>
          <div className="chip-row">
            <div className="tab-row" style={{padding: 2, fontSize: 12}}>
              {['Volume','Response Time'].map(t => (
                <button key={t} className={'tab' + (activityToggle === t ? ' active' : '')} onClick={() => setActivityToggle(t)} style={{padding: '4px 12px'}}>{t}</button>
              ))}
            </div>
            <button className="select-pill">Week <window.ChevronDown size={12}/></button>
            <button className="icon-btn"><window.MoreHorizontal size={16}/></button>
          </div>
        </div>
        <div className="card-body">
          <div className="channel-activity">
            <div><WorldMap/></div>
            <div>
              <h4 style={{margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Top channels by volume</h4>
              <div className="region-list">
                {window.CHANNEL_REGIONS.map(r => (
                  <div className="region-row" key={r.id}>
                    <div className="region-row-head">
                      <span className="label">
                        <span className="legend-dot" style={{background: r.color}}/>
                        {r.name}
                      </span>
                      <span className="pct">{r.pct}%</span>
                    </div>
                    <div className="region-bar">
                      <div className="region-bar-fill" style={{width: r.pct + '%', background: r.color}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: 3 cards */}
      <div className="row-3">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Agent Performance</h3>
              <div className="card-subtitle">Volume + response quality</div>
            </div>
            <button className="select-pill">Week <window.ChevronDown size={12}/></button>
          </div>
          <div className="card-body">
            <div className="agent-rows">
              {window.AGENT_PERF.map(a => {
                const ag = window.AGENTS.find(x => x.id === a.id);
                return (
                  <div className="agent-row" key={a.id}>
                    <div className="avatar" style={{width: 28, height: 28, background: ag?.tone || '#DDE2EC'}}>{ag?.initials || '?'}</div>
                    <div>
                      <div className="agent-name">
                        <span>{a.name}</span>
                        <span className="sub">{a.value} avg</span>
                      </div>
                      <div className="agent-bar">
                        <div className="agent-bar-fill primary" style={{width: a.conv * 2 + '%'}}/>
                        <div className="agent-bar-fill secondary" style={{width: a.resp * 0.7 + '%', opacity: 0.5}}/>
                      </div>
                    </div>
                    <div className="agent-value">{a.conv}</div>
                  </div>
                );
              })}
            </div>
            <div className="legend" style={{marginTop: 18}}>
              <span className="legend-item"><span className="legend-dot" style={{background: '#068B78'}}/>Handled</span>
              <span className="legend-item"><span className="legend-dot" style={{background: '#FF6B8A', opacity: 0.5}}/>Quality score</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Channel Mix</h3>
              <div className="card-subtitle">Active conversations by channel</div>
            </div>
            <button className="select-pill">Week <window.ChevronDown size={12}/></button>
          </div>
          <div className="card-body">
            <DonutChart data={window.CHANNEL_MIX} total={186}/>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Latest Activity</h3>
              <div className="card-subtitle">Across all channels</div>
            </div>
            <button className="select-pill">Today <window.ChevronDown size={12}/></button>
          </div>
          <div className="card-body" style={{padding: '8px 8px 12px'}}>
            <div className="activity-feed">
              {window.LATEST_ACTIVITY.map((a, i) => {
                const ch = window.CHANNELS[a.channel];
                return (
                  <div className="activity-item" key={i}>
                    <span className="activity-dot" style={{background: ch.color}}/>
                    <div>
                      <div className="activity-title">{a.title}</div>
                      <div className="activity-sub">{a.sub}</div>
                    </div>
                    <span className="activity-time">{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });

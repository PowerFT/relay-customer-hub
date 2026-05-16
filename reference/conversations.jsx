// Conversations view: channel rail + list + thread + contact panel

const { useState: _useState, useRef: _useRef, useEffect: _useEffect } = React;

function ChannelRail({ active, setActive, totalUnread }) {
  const items = [
    { id: 'all', name: 'All', color: '#1A1F2E', Icon: window.MessagesSquare, unread: totalUnread },
    ...window.CHANNEL_LIST.map(id => ({
      id,
      name: window.CHANNELS[id].name,
      color: window.CHANNELS[id].color,
      gradient: window.CHANNELS[id].gradient,
      Icon: window.CHANNELS[id].Icon,
      unread: window.CHANNEL_UNREAD[id] || 0,
    })),
  ];
  return (
    <aside className="channel-rail">
      {items.map((it, i) => {
        const bg = it.gradient || it.color;
        return (
          <React.Fragment key={it.id}>
            <button
              className={'channel-tile' + (active === it.id ? ' active' : '')}
              onClick={() => setActive(it.id)}
              title={it.name}
            >
              <div className="channel-icon-wrap" style={{background: bg}}>
                <it.Icon size={18}/>
              </div>
              {it.unread > 0 && <span className="channel-badge">{it.unread > 99 ? '99+' : it.unread}</span>}
            </button>
            {i === 0 && <div className="channel-rail-divider"/>}
          </React.Fragment>
        );
      })}
    </aside>
  );
}

function ConvoListItem({ c, active, onClick }) {
  const ch = window.CHANNELS[c.channel];
  const ChIcon = ch.Icon;
  const assignee = c.assignee ? window.AGENTS.find(a => a.id === c.assignee) : null;
  return (
    <div className={'convo-item' + (active ? ' active' : '') + (c.unread > 0 ? ' unread' : '')} onClick={onClick}>
      <div className="convo-avatar">
        <div className="avatar" style={{width: 44, height: 44, background: c.contact.tone, fontSize: 14}}>
          {c.contact.name.split(' ').map(p => p[0]).slice(0,2).join('')}
        </div>
        <div className="channel-dot" style={{background: ch.gradient || ch.color}}><ChIcon size={9}/></div>
      </div>
      <div className="convo-body">
        <div className="convo-line1">
          <span className="convo-name">{c.contact.name}</span>
          <span className="convo-time">{c.time}</span>
        </div>
        <div className="convo-line2">
          <span className="convo-preview">{c.preview}</span>
          {c.unread > 0 && <span className="unread-bubble">{c.unread}</span>}
        </div>
        {assignee && (
          <div className="assign-chip">
            <div className="avatar" style={{width: 16, height: 16, background: assignee.tone, fontSize: 9}}>{assignee.initials}</div>
            <span>{assignee.name.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvoList({ convos, activeId, setActiveId, channelFilter }) {
  const [tab, setTab] = _useState('open');
  const [query, setQuery] = _useState('');

  const filtered = convos.filter(c => {
    if (channelFilter && channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (c.status !== tab) return false;
    if (query && !(c.contact.name + ' ' + c.preview).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="convo-list">
      <div className="convo-list-header">
        <div className="list-search">
          <window.Search size={14}/>
          <input placeholder="Search conversations…" value={query} onChange={e => setQuery(e.target.value)}/>
        </div>
        <div className="tab-row">
          {['open','snoozed','closed'].map(t => (
            <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
              {' '}<span style={{opacity: 0.6, fontSize: 11}}>{convos.filter(c => c.status === t && (channelFilter === 'all' || c.channel === channelFilter)).length}</span>
            </button>
          ))}
        </div>
        <div className="list-sort">
          <span className="count">{filtered.length} conversations</span>
          <button className="select-pill" style={{padding: '4px 8px', fontSize: 11}}>
            <window.ArrowDownUp size={11}/> Newest <window.ChevronDown size={10}/>
          </button>
        </div>
      </div>
      <div className="convo-scroll">
        {filtered.length === 0 ? (
          <div style={{padding: 40, textAlign: 'center', color: 'var(--text-secondary)'}}>
            <div style={{width: 56, height: 56, background: 'var(--canvas)', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12}}>
              <window.MessageSquare size={22}/>
            </div>
            <div style={{fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4}}>No conversations</div>
            <div style={{fontSize: 12}}>Nothing matches your current filters.</div>
          </div>
        ) : filtered.map(c => (
          <ConvoListItem key={c.id} c={c} active={c.id === activeId} onClick={() => setActiveId(c.id)}/>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.type === 'out';
  return (
    <div className={'msg-group ' + (isOut ? 'out' : 'in')}>
      {msg.via && <div className="msg-meta">via {msg.via} · {msg.author}</div>}
      <div className="bubble">
        {msg.kind === 'image' && (
          <div className="bubble-image">
            <div style={{position: 'absolute', bottom: 8, left: 10, color: 'white', fontSize: 11, fontWeight: 500, opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.4)'}}>screenshot.png</div>
          </div>
        )}
        {msg.kind === 'file' && (
          <div className="bubble-file">
            <div className="file-icon">PDF</div>
            <div className="file-meta">
              <div className="file-name">{msg.fileName}</div>
              <div className="file-size">{msg.fileSize}</div>
            </div>
          </div>
        )}
        {msg.text && <span>{msg.text}</span>}
        <span className="bubble-meta">
          {msg.time}
          {isOut && (msg.status === 'read'
            ? <span className="ticks read"><window.CheckCheck size={12}/></span>
            : msg.status === 'sent'
              ? <span className="ticks"><window.CheckCheck size={12}/></span>
              : <span className="ticks"><window.Check size={12}/></span>)}
        </span>
      </div>
    </div>
  );
}

function Composer({ channel }) {
  const [text, setText] = _useState('');
  const ch = window.CHANNELS[channel];
  const ChIcon = ch.Icon;
  const taRef = _useRef(null);

  const send = () => {
    if (!text.trim()) return;
    setText('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="composer">
      <div className="composer-channel-pill" style={{background: (ch.gradient ? 'rgba(221,42,123,0.08)' : ch.color + '14'), color: ch.color}}>
        <span className="icon" style={{background: ch.gradient || ch.color}}><ChIcon size={11}/></span>
        Replying via {ch.name}
      </div>
      <div className="composer-box">
        <div className="composer-tools">
          <button className="icon-btn" style={{width: 32, height: 32}} title="Attach"><window.Paperclip size={16}/></button>
          <button className="icon-btn" style={{width: 32, height: 32}} title="Image"><window.Image size={16}/></button>
          <button className="icon-btn" style={{width: 32, height: 32}} title="Templates"><window.FileText size={16}/></button>
          <button className="icon-btn" style={{width: 32, height: 32}} title="Emoji"><window.Smile size={16}/></button>
        </div>
        <textarea
          ref={taRef}
          className="composer-input"
          placeholder="Type a message…"
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <button className="icon-btn" style={{width: 32, height: 32}} title="Voice"><window.Mic size={16}/></button>
        <button className="send-btn" disabled={!text.trim()} onClick={send} title="Send">
          <window.Send size={16}/>
        </button>
      </div>
      <div className="composer-hint">⏎ Send · Shift+⏎ New line · ⌘⏎ Send</div>
    </div>
  );
}

function Thread({ convo }) {
  const ch = window.CHANNELS[convo.channel];
  const ChIcon = ch.Icon;
  const messages = window.ACTIVE_THREAD.messages;

  return (
    <div className="thread">
      <div className="thread-header">
        <div className="avatar" style={{width: 40, height: 40, background: convo.contact.tone}}>
          {convo.contact.name.split(' ').map(p => p[0]).slice(0,2).join('')}
        </div>
        <div className="thread-meta">
          <div className="thread-name">
            {convo.contact.name}
            <span style={{width: 22, height: 22, borderRadius: 7, background: ch.gradient || ch.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
              <ChIcon size={11}/>
            </span>
          </div>
          <div className="thread-sub">
            {convo.contact.online && <><span className="online-dot"/><span>Online</span><span>·</span></>}
            <span>{convo.contact.handle}</span>
            <span>·</span>
            <span>{convo.contact.online ? 'active now' : 'last seen 2h ago'}</span>
          </div>
        </div>
        <div className="thread-actions">
          <button className="icon-btn" title="Assign"><window.Users size={17}/></button>
          <button className="icon-btn" title="Snooze"><window.Clock size={17}/></button>
          <button className="icon-btn" title="Tag"><window.Tag size={17}/></button>
          <button className="icon-btn" title="Resolve" style={{color: 'var(--primary)'}}>
            <window.CheckCircle2 size={17}/>
          </button>
          <button className="icon-btn" title="More"><window.MoreHorizontal size={17}/></button>
        </div>
      </div>

      <div className="thread-canvas">
        {messages.map((m, i) => {
          if (m.type === 'date')   return <div className="date-divider" key={i}>{m.label}</div>;
          if (m.type === 'system') return <div className="system-event" key={i}>{m.text}</div>;
          return <MessageBubble key={i} msg={m}/>;
        })}
      </div>

      <Composer channel={convo.channel}/>
    </div>
  );
}

function ContactPanel({ convo, onClose }) {
  const [tab, setTab] = _useState('contact');
  const t = window.ACTIVE_THREAD;

  return (
    <aside className="contact-panel">
      <div className="panel-tabs">
        <button className={'panel-tab' + (tab === 'contact' ? ' active' : '')} onClick={() => setTab('contact')}>Contact</button>
        <button className={'panel-tab' + (tab === 'notes' ? ' active' : '')} onClick={() => setTab('notes')}>Notes <span style={{color: 'var(--warning)', fontWeight: 700}}>·{t.notes.length}</span></button>
        <button className={'panel-tab' + (tab === 'history' ? ' active' : '')} onClick={() => setTab('history')}>History</button>
        <div style={{flex: 1}}/>
        <button className="icon-btn" style={{width: 32, height: 32, marginRight: -8}} onClick={onClose}><window.X size={16}/></button>
      </div>

      <div className="panel-body">
        {tab === 'contact' && (
          <>
            <div className="contact-hero">
              <div className="avatar" style={{width: 72, height: 72, background: t.contact.tone, fontSize: 22}}>
                {t.contact.name.split(' ').map(p => p[0]).join('')}
              </div>
              <div className="name">
                {t.contact.name}
                <window.BadgeCheck size={16} style={{color: 'var(--primary)'}}/>
              </div>
              <div className="meta">{t.contact.location} · {t.contact.timezone}</div>
            </div>

            <div className="panel-section">
              <h4>Channels</h4>
              <div className="channel-handle-list">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', value: t.contact.phone },
                  { id: 'email',    label: 'Email',    value: t.contact.email },
                  { id: 'instagram',label: 'Instagram',value: t.contact.instagram },
                  { id: 'sms',      label: 'SMS',      value: t.contact.phone },
                ].map(h => {
                  const ch = window.CHANNELS[h.id];
                  const ChIcon = ch.Icon;
                  return (
                    <div className="channel-handle" key={h.id}>
                      <div className="channel-icon-wrap-sm" style={{background: ch.gradient || ch.color}}>
                        <ChIcon size={13}/>
                      </div>
                      <div className="handle-meta">
                        <div className="handle-label">{h.label}</div>
                        <div className="handle-value">{h.value}</div>
                      </div>
                      <window.ChevronRight size={14} style={{color: 'var(--text-tertiary)'}}/>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel-section">
              <h4>Tags</h4>
              <div className="tag-row">
                {t.contact.tags.map((tg, i) => (
                  <span key={i} className={'tag ' + tg.tone}>{tg.label}</span>
                ))}
                <button className="tag" style={{cursor: 'pointer'}}><window.Plus size={11} style={{verticalAlign: '-2px', marginRight: 2}}/>Add</button>
              </div>
            </div>

            <div className="panel-section">
              <h4>Customer details</h4>
              <div className="kv-list">
                <div className="kv-row"><span className="k">Customer since</span><span className="v">{t.contact.customerSince}</span></div>
                <div className="kv-row"><span className="k">Lifetime value</span><span className="v">{t.contact.lifetimeValue}</span></div>
                <div className="kv-row"><span className="k">Total orders</span><span className="v">{t.contact.orders}</span></div>
                <div className="kv-row"><span className="k">Last order</span><span className="v">#4521 · May 12</span></div>
              </div>
            </div>

            <div className="panel-section">
              <h4>Assigned to</h4>
              <div className="assign-select">
                <div className="avatar" style={{width: 28, height: 28, background: '#ACE'}}>AM</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 500}}>Alex Morgan</div>
                  <div style={{fontSize: 11, color: 'var(--text-secondary)'}}>You · Support Agent</div>
                </div>
                <window.ChevronDown size={16} style={{color: 'var(--text-tertiary)'}}/>
              </div>
            </div>
          </>
        )}

        {tab === 'notes' && (
          <>
            <div className="panel-section">
              <h4>Internal notes</h4>
              {t.notes.map((n, i) => (
                <div className="note" key={i}>
                  <div className="note-meta">
                    <strong style={{color: 'var(--text-primary)'}}>{n.author}</strong>
                    <span>·</span>
                    <span>{n.time}</span>
                  </div>
                  {n.text}
                </div>
              ))}
              <button className="select-pill" style={{width: '100%', justifyContent: 'center', padding: 10, marginTop: 4}}>
                <window.Plus size={14}/> Add internal note
              </button>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            <div className="panel-section">
              <h4>Past conversations</h4>
              <div>
                {t.history.map((h, i) => {
                  const ch = window.CHANNELS[h.channel];
                  const ChIcon = ch.Icon;
                  return (
                    <div className="history-item" key={i}>
                      <div className="channel-icon-wrap-sm" style={{background: ch.gradient || ch.color, width: 28, height: 28, borderRadius: 8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                        <ChIcon size={13}/>
                      </div>
                      <div className="h-meta">
                        <div className="h-title">{h.title}</div>
                        <div className="h-sub">{h.time} · {h.agent}</div>
                      </div>
                      <window.ChevronRight size={14} style={{color: 'var(--text-tertiary)', marginTop: 4}}/>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function Conversations({ channelFilter, setChannelFilter }) {
  const [activeId, setActiveId] = _useState('c1');
  const [panelOpen, setPanelOpen] = _useState(true);

  const totalUnread = window.CONVOS.reduce((s, c) => s + c.unread, 0);
  const activeConvo = window.CONVOS.find(c => c.id === activeId);

  return (
    <div className={'convo-page' + (panelOpen ? '' : ' no-panel')} data-screen-label="02 Conversations">
      <ChannelRail active={channelFilter} setActive={setChannelFilter} totalUnread={totalUnread}/>
      <ConvoList
        convos={window.CONVOS}
        activeId={activeId}
        setActiveId={setActiveId}
        channelFilter={channelFilter}
      />
      {activeConvo ? (
        <Thread convo={activeConvo}/>
      ) : (
        <div className="thread">
          <div className="thread-empty">
            <div className="empty-icon"><window.MessageSquare size={28}/></div>
            <h3>Select a conversation</h3>
            <div>Pick one from the list, or filter by channel on the left.</div>
          </div>
        </div>
      )}
      {panelOpen && activeConvo && (
        <ContactPanel convo={activeConvo} onClose={() => setPanelOpen(false)}/>
      )}
      {!panelOpen && (
        <button
          className="icon-btn"
          style={{position: 'absolute', top: 76, right: 12, background: 'white', boxShadow: '0 2px 8px rgba(16,24,40,0.1)', border: '1px solid var(--border)'}}
          onClick={() => setPanelOpen(true)} title="Show contact panel">
          <window.PanelRight size={18}/>
        </button>
      )}
    </div>
  );
}

Object.assign(window, { Conversations });

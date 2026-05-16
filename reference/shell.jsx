// Shell: Sidebar + Topbar

function Sidebar({ route, setRoute, collapsed, setCollapsed }) {
  const items = [
    { id: 'dashboard',     label: 'Dashboard',     Icon: window.LayoutDashboard },
    { id: 'conversations', label: 'Conversations', Icon: window.MessageSquare, badge: 42 },
    { id: 'contacts',      label: 'Contacts',      Icon: window.Users },
    { id: 'broadcasts',    label: 'Broadcasts',    Icon: window.Inbox },
    { id: 'reports',       label: 'Reports',       Icon: window.BarChart3 },
    { id: 'settings',      label: 'Settings',      Icon: window.Settings },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </div>
        <div className="sidebar-brand">
          Relay
          <small>Customer Hub</small>
        </div>
        <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} title="Collapse">
          {collapsed ? <window.ChevronRight size={16}/> : <window.ChevronLeft size={16}/>}
        </button>
      </div>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav">
        {items.map(it => (
          <button key={it.id} className={'nav-item' + (route === it.id ? ' active' : '')} onClick={() => setRoute(it.id)}>
            <it.Icon size={18}/>
            <span className="nav-label">{it.label}</span>
            {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar" style={{width: 32, height: 32, background: '#A7CAF0', color: '#1A1F2E'}}>AM</div>
        <div className="sidebar-user-info">
          <div className="name">Alex Morgan</div>
          <div className="role">Support Agent</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, channelFilter, setChannelFilter }) {
  const channels = [
    { id: 'all', name: 'All channels' },
    ...window.CHANNEL_LIST.map(id => ({ id, name: window.CHANNELS[id].name }))
  ];
  return (
    <header className="topbar">
      <div className="search">
        <window.Search size={16}/>
        <input placeholder={route === 'conversations' ? 'Search conversations, contacts, messages…' : 'Search anything…'}/>
        <kbd>⌘K</kbd>
      </div>
      {route === 'conversations' && (
        <div className="chip-row" style={{marginLeft: 12, overflow: 'hidden'}}>
          {channels.slice(0, 5).map(c => (
            <button key={c.id} className={'chip' + (channelFilter === c.id ? ' active' : '')} onClick={() => setChannelFilter(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="topbar-spacer"/>
      <div className="topbar-actions">
        <button className="select-pill" title="Status"><span style={{width: 8, height: 8, borderRadius: 999, background: '#10B981'}}/> Available <window.ChevronDown size={14}/></button>
        <button className="icon-btn"><window.Bell size={18}/><span className="dot"/></button>
        <button className="icon-btn"><window.Plus size={18}/></button>
        <div className="avatar" style={{width: 34, height: 34, background: '#A7CAF0', color: '#1A1F2E', cursor: 'pointer'}}>AM</div>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });

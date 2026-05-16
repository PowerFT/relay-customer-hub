// Root app

const { useState: _appUseState } = React;

function App() {
  const [route, setRoute] = _appUseState('dashboard');
  const [collapsed, setCollapsed] = _appUseState(false);
  const [channelFilter, setChannelFilter] = _appUseState('all');

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <window.Sidebar route={route} setRoute={setRoute} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div className="main-col">
        <window.Topbar route={route} channelFilter={channelFilter} setChannelFilter={setChannelFilter}/>
        <div className="content" style={{position: 'relative'}}>
          {route === 'dashboard' && <window.Dashboard/>}
          {route === 'conversations' && (
            <window.Conversations channelFilter={channelFilter} setChannelFilter={setChannelFilter}/>
          )}
          {route !== 'dashboard' && route !== 'conversations' && (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: 12}}>
              <div style={{width: 64, height: 64, borderRadius: 999, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <window.LayoutDashboard size={28}/>
              </div>
              <div style={{fontSize: 16, fontWeight: 600, color: 'var(--text-primary)'}}>This section is not part of this design pass</div>
              <div style={{fontSize: 13}}>Switch to Dashboard or Conversations to see the working designs.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

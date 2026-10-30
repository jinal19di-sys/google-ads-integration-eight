import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import {
  ArrowDownLeft, ArrowRight, Bell, Check, ChevronDown, CircleHelp, Command,
  ExternalLink, Gauge, Link2, LoaderCircle, LockKeyhole, Plus, Search,
  Settings2, ShieldCheck, Sparkles, Target, TrendingUp, X,
} from 'lucide-react';
import { clearAuthError, loadCurrentUser, loadGoogleLoginNonce, loginFailed, loginWithGoogle } from './state/authSlice.js';
import { clearGoogleAdsError, loadGoogleAdsStatus, startGoogleAdsConnection } from './state/googleAdsSlice.js';

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.65 5.93c4.47-4.13 7.12-10.2 7.12-17.58Z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.65-5.93c-2.12 1.42-4.84 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const authError = auth.error;
  const ads = useSelector((state) => state.googleAds);
  const displayName = auth.user?.name || 'Guest user';
  const initials = auth.user?.name?.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'GU';
  const signedIn = Boolean(auth.user) || new URLSearchParams(window.location.search).get('authenticated') === 'true' || Boolean(sessionStorage.getItem('adnexa_signed_in'));

  useEffect(() => {
    dispatch(loadCurrentUser());
    dispatch(loadGoogleLoginNonce());
  }, [dispatch]);

  useEffect(() => {
    if (auth.user) dispatch(loadGoogleAdsStatus());
  }, [dispatch, auth.user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawError = params.get('error_description') || params.get('error');
    const oauthErrors = {
      invalid_client: 'Google rejected the backend OAuth client. Update GOOGLE_CLIENT_SECRET in server/.env with the active secret for the same client ID, then restart Node.',
      access_denied: 'Google Ads access was cancelled. Click Connect account and approve the requested access.',
      google_ads_session_expired: 'Your sign-in session expired during Google Ads setup. Sign in again, then connect your account.',
    };
    const oauthError = oauthErrors[rawError] || rawError;
    if (oauthError) dispatch(loginFailed(oauthError));
    if (params.get('authenticated') === 'true') {
      sessionStorage.setItem('adnexa_signed_in', 'true');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('google_ads_connected') === 'true') {
      sessionStorage.setItem('adnexa_signed_in', 'true');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (oauthError) window.history.replaceState({}, '', window.location.pathname);
  }, [dispatch]);

  const handleLogin = async (response) => {
    if (!response.credential) {
      dispatch(loginFailed('Google did not return a sign-in credential. Please try again.'));
      return;
    }
    const result = await dispatch(loginWithGoogle({ credential: response.credential, nonce: auth.nonce }));
    if (!loginWithGoogle.fulfilled.match(result)) dispatch(loadGoogleLoginNonce());
  };

  const handleConnect = async () => {
    dispatch(clearAuthError());
    dispatch(clearGoogleAdsError());
    const result = await dispatch(startGoogleAdsConnection());
    if (startGoogleAdsConnection.fulfilled.match(result) && result.payload.redirectTo) {
      window.location.assign(result.payload.redirectTo);
    }
  };

  const connected = ads.status === 'connected';
  const noAccounts = ads.status === 'empty';
  const busy = ads.status === 'connecting';

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" aria-label="Adnexa home"><span className="brand-icon"><Command size={19}/></span><span>adnexa</span><span className="brand-beta">BETA</span></a>
      <div className="workspace-switch"><span className="workspace-avatar">A</span><span className="workspace-copy"><b>Acme Studio</b><small>Workspace</small></span><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#overview"><Gauge size={17}/>Overview</a><a href="#campaigns"><Target size={17}/>Campaigns</a><a href="#insights"><TrendingUp size={17}/>Insights<span className="nav-count">3</span></a>
      </nav>
      <div className="nav-label connections-label">CONNECTIONS <button className="icon-button tiny" aria-label="Add connection"><Plus size={15}/></button></div>
      <nav className="main-nav"><a className="active" href="#google-ads"><span className="google-nav"><GoogleMark/></span>Google Ads<span className="connected-dot"/></a><a href="#all-connections"><Link2 size={17}/>All connections</a></nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={17}/></span><b>Need a hand?</b><p>Visit our help center for tips and answers.</p><a href="mailto:support@shuchiai.com">Get support <ArrowRight size={13}/></a></div><a className="bottom-link" href="#settings"><Settings2 size={16}/>Settings</a><a className="profile" href="#profile"><span className="profile-avatar">{initials}</span><span><b>{displayName}</b><small>{auth.user?.email || 'Sign in to connect'}</small></span><MoreIcon/></a></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Connections</span><span className="crumb-slash">/</span><b>Google Ads</b></div><div className="top-actions"><button className="search-trigger"><Search size={15}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button><span className="top-avatar">{initials}</span></div></header>
      <div className="page-content">
        <div className="eyebrow"><span className="eyebrow-dot"/>INTEGRATIONS <span>/</span> AD PLATFORMS</div>
        <section className="hero-row"><div><div className="title-line"><div className="google-tile"><GoogleMark/></div><div><h1>Google Ads</h1><p className="subtitle">Connect your account and make smarter moves.</p></div></div></div><button className="docs-link" onClick={() => window.open('https://support.google.com/google-ads/', '_blank', 'noopener,noreferrer')}>View documentation <ExternalLink size={14}/></button></section>

        {(authError || ads.error) && <div className="alert" role="alert"><span>{authError || ads.error}</span><button onClick={() => { dispatch(clearGoogleAdsError()); window.history.replaceState({}, '', window.location.pathname); }} aria-label="Dismiss error"><X size={16}/></button></div>}

        <section className="connect-card">
          <div className="connect-copy"><div className="connect-kicker"><span className="sparkle"><Sparkles size={14}/></span>YOUR ADS, ALL IN ONE PLACE</div><h2>Make every campaign<br/>count.</h2><p>Bring your Google Ads performance into Adnexa. Track the numbers that matter, spot opportunities sooner, and keep your team moving.</p><div className="benefit-row"><span><Check size={14}/>Live campaign insights</span><span><Check size={14}/>Secure OAuth connection</span></div>{signedIn ? <div className="signed-in-chip"><span className="signed-dot"/>Signed in with Google</div> : <div className="google-login-holder">{auth.nonce && <GoogleLogin nonce={auth.nonce} onSuccess={handleLogin} onError={() => { dispatch(loginFailed('Google sign-in did not complete. Please try again.')); dispatch(loadGoogleLoginNonce()); }} text="continue_with" theme="outline" size="large" shape="rectangular" width={224}/>}</div>}</div>
          <div className="connect-visual" aria-hidden="true"><div className="visual-glow"/><div className="floating-tag tag-one"><span className="mini-green"><TrendingUp size={12}/></span><span><small>Conversion value</small><b>$24,890 <em>+18.6%</em></b></span></div><div className="floating-tag tag-two"><span className="mini-blue"><Target size={13}/></span><span><small>Active campaigns</small><b>12 <i>●●●</i></b></span></div><div className="ads-window"><div className="window-top"><span className="window-logo"><GoogleMark/></span><span>Campaign performance</span><span className="window-menu">···</span></div><div className="window-summary"><div><small>Impressions</small><b>128.4k</b><em>↑ 12.8%</em></div><div><small>Clicks</small><b>8,294</b><em>↑ 8.2%</em></div></div><div className="chart-area"><div className="chart-labels"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span></div><div className="chart-grid"><svg viewBox="0 0 340 122" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7564f5" stopOpacity=".22"/><stop offset="100%" stopColor="#7564f5" stopOpacity="0"/></linearGradient></defs><path d="M0 98 C24 90 29 82 52 86 S86 70 108 78 S140 44 166 56 S203 62 224 35 S256 49 278 27 S314 30 340 7 L340 122 L0 122Z" fill="url(#fill)"/><path d="M0 98 C24 90 29 82 52 86 S86 70 108 78 S140 44 166 56 S203 62 224 35 S256 49 278 27 S314 30 340 7" fill="none" stroke="#7866ef" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"/></svg></div></div><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div className="window-footer"><span><i className="legend-dot"/>This week</span><span>Last 7 days <ChevronDown size={11}/></span></div></div><div className="visual-orbit orbit-a"/><div className="visual-orbit orbit-b"/></div>
          <div className="card-footer"><span><ShieldCheck size={16}/>Your data stays private and secure</span><span>Powered by Google Ads API</span></div>
        </section>

        <section className="connection-section"><div className="section-heading"><div><h3>Your connection</h3><p>Manage the Google Ads accounts linked to this workspace.</p></div><span className={`status-pill ${connected ? 'is-connected' : ''} ${noAccounts ? 'no-accounts' : ''}`}><i/>{connected ? 'Connected' : noAccounts ? 'No accounts found' : ads.status === 'loading' ? 'Checking status' : 'Not connected'}</span></div><div className="account-row"><div className="account-leading"><div className="account-icon"><GoogleMark/></div><div><b>Google Ads account</b><p>{connected ? (ads.accounts[0]?.name || ads.accounts[0]?.customerName || 'Your Google Ads account is connected') : noAccounts ? 'No Google Ads accounts are accessible with this Google login. Use another Google account or create an Ads account.' : 'Connect a Google account to get started.'}</p></div></div><button className={connected ? 'manage-button' : 'connect-button'} onClick={connected ? () => dispatch(loadGoogleAdsStatus()) : handleConnect} disabled={busy || ads.status === 'loading'}>{busy || ads.status === 'loading' ? <LoaderCircle className="spin" size={15}/> : connected ? <ArrowDownLeft size={15}/> : <>{<Plus size={15}/>}</>}{connected ? 'Refresh' : noAccounts ? 'Choose another account' : 'Connect account'}</button></div>{connected && ads.accounts.length > 1 && <div className="account-list">{ads.accounts.map((account, index) => <div className="linked-account" key={account.id || account.customerId || index}><span className="account-mini"><GoogleMark/></span><span><b>{account.name || account.customerName || `Google Ads account ${account.customerId || account.id || index + 1}`}</b><small>{account.customerId || account.id || 'Linked account'}</small></span><span className="linked-check"><Check size={14}/></span></div>)}</div>}</section>

        <section className="bottom-note"><span className="lock-icon"><LockKeyhole size={16}/></span><div><b>Safe, secure, and in your control</b><p>Adnexa only accesses the Google Ads data you approve. Revoke access anytime from your Google Account.</p></div><a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Learn about permissions <ExternalLink size={13}/></a></section>
        <footer className="page-footer"><span>© 2026 Adnexa</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="mailto:support@shuchiai.com">Support</a></span></footer>
      </div>
    </main>
  </div>;
}

function MoreIcon() { return <span className="more-dots" aria-hidden="true">···</span>; }

export default App;

// Depths of Darkness launcher UI. All networking happens in the Electron main process
// through window.launcher (see electron/launcher-preload.cjs).
(() => {
  const api = window.launcher;
  const $ = (id) => document.getElementById(id);
  const CLASS_NAMES = { warrior: 'Warrior', pyromancer: 'Pyromancer', rogue: 'Shadow Rogue' };
  const POLL_MS = 8000;

  let state = { servers: [], selectedServerId: null, accounts: {}, version: '' };
  const status = {}; // serverId -> { state: 'checking'|'online'|'offline', info, pingMs, account }
  let authMode = 'login';
  let busy = false;
  let playError = '';

  // ---------------------------------------------------------------- rendering
  const selected = () => state.servers.find((s) => s.id === state.selectedServerId) || null;
  const statusOf = (id) => status[id] || { state: 'checking' };
  const escapeText = (s) => String(s ?? '');

  function renderServers() {
    const list = $('serverList');
    list.textContent = '';
    if (!state.servers.length) {
      const li = document.createElement('li');
      li.className = 'server-empty';
      li.textContent = 'No servers yet. Add one with +';
      list.append(li);
      return;
    }
    for (const server of state.servers) {
      const st = statusOf(server.id);
      const li = document.createElement('li');
      li.className = 'server';
      li.setAttribute('role', 'option');
      li.tabIndex = 0;
      li.setAttribute('aria-selected', String(server.id === state.selectedServerId));
      li.dataset.id = server.id;

      const dot = document.createElement('span');
      dot.className = `status-dot ${st.state}`;
      const text = document.createElement('div');
      text.style.minWidth = '0';
      const name = document.createElement('span');
      name.className = 'server-name';
      name.textContent = st.info?.name && st.info.name !== server.name ? `${server.name} · ${st.info.name}` : server.name;
      const meta = document.createElement('span');
      meta.className = 'server-meta';
      meta.textContent = server.url.replace(/^https?:\/\//, '');
      text.append(name, meta);
      const right = document.createElement('span');
      right.className = `server-state ${st.state}`;
      right.textContent =
        st.state === 'online' ? `Online · ${st.pingMs} ms` : st.state === 'offline' ? 'Offline' : 'Checking…';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'server-remove';
      remove.title = `Remove ${server.name}`;
      remove.setAttribute('aria-label', `Remove ${server.name}`);
      remove.textContent = '✕';
      remove.addEventListener('click', async (e) => {
        e.stopPropagation();
        state = await api.removeServer(server.id);
        delete status[server.id];
        render();
      });

      li.append(dot, text, right, remove);
      li.addEventListener('click', () => selectServer(server.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectServer(server.id);
        }
      });
      list.append(li);
    }
  }

  function heroSummary(save) {
    if (!save || !save.heroName) return 'No hero yet. One is created when you play';
    const cls = CLASS_NAMES[save.heroClass] || 'Hero';
    return `${save.heroName} · Lv ${save.heroLevel ?? 1} ${cls} · Depth ${save.depth ?? 1}`;
  }

  function renderAccount() {
    const server = selected();
    const st = server ? statusOf(server.id) : null;
    const account = server ? state.accounts[server.id] : null;
    const online = st?.state === 'online';
    const signedIn = Boolean(account && online && st.account);

    $('accountOffline').hidden = !(server && st.state === 'offline');
    $('accountSignedIn').hidden = !signedIn;
    $('accountForms').hidden = !(server && online && !signedIn);

    if (signedIn) {
      $('signedInName').textContent = account.username;
      $('avatar').textContent = account.username.slice(0, 1).toUpperCase();
      $('signedInHero').textContent = heroSummary(st.account.save);
    }
  }

  function renderMotd() {
    const server = selected();
    const info = server && statusOf(server.id).info;
    const motd = info?.online && info.motd;
    $('motd').hidden = !motd;
    if (motd) {
      $('motdLabel').textContent = `Message from ${info.name || server.name}`;
      $('motdText').textContent = escapeText(motd);
    }
  }

  function renderPlay() {
    const server = selected();
    const st = server ? statusOf(server.id) : null;
    const account = server ? state.accounts[server.id] : null;
    const btn = $('btnPlay');
    let label = 'Play';
    let sub = '';
    let enabled = false;
    if (!server) sub = 'Select or add a server';
    else if (st.state === 'checking') sub = `Connecting to ${server.name}…`;
    else if (st.state === 'offline') {
      label = 'Offline';
      sub = `${server.name} can't be reached`;
    } else if (!account || !st.account) sub = 'Log in or register to play';
    else {
      enabled = true;
      sub = st.account.save?.heroName ? `Continue as ${st.account.save.heroName} on ${server.name}` : `Start your adventure on ${server.name}`;
    }
    if (playError && !busy) {
      sub = playError;
      enabled = false;
    }
    if (busy) {
      label = 'Loading';
      sub = 'Downloading your hero…';
      enabled = false;
    }
    $('playLabel').textContent = label;
    $('playSub').textContent = sub;
    btn.disabled = !enabled;
    btn.classList.toggle('busy', busy);
  }

  function render() {
    $('versionLabel').textContent = `v${state.version}`;
    renderServers();
    renderAccount();
    renderMotd();
    renderPlay();
  }

  // ---------------------------------------------------------------- server status
  async function check(serverId) {
    if (!status[serverId] || status[serverId].state === 'offline') status[serverId] = { ...status[serverId], state: 'checking' };
    const result = await api.checkServer(serverId);
    status[serverId] = result.online
      ? { state: 'online', info: result.info, pingMs: result.pingMs, account: result.account }
      : { state: 'offline', info: null, account: null };
    if (result.sessionExpired) state = await api.getState();
  }
  async function checkAll(manual = false) {
    const btn = $('btnRefresh');
    if (manual) btn.classList.add('spinning');
    render();
    await Promise.all(state.servers.map((s) => check(s.id)));
    btn.classList.remove('spinning');
    render();
  }

  async function selectServer(id) {
    state = await api.selectServer(id);
    clearAuthError();
    render();
    await check(id);
    render();
  }

  // ---------------------------------------------------------------- add server
  $('btnAddServer').addEventListener('click', () => {
    const form = $('addServerForm');
    form.hidden = !form.hidden;
    $('addServerError').hidden = true;
    if (!form.hidden) form.url.focus();
  });
  $('btnCancelAdd').addEventListener('click', () => {
    $('addServerForm').hidden = true;
    $('addServerForm').reset();
  });
  $('addServerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const result = await api.addServer({ name: form.name.value, url: form.url.value });
    if (result.error) {
      $('addServerError').textContent = result.error;
      $('addServerError').hidden = false;
      return;
    }
    state = result.state;
    form.reset();
    form.hidden = true;
    render();
    await check(state.selectedServerId);
    render();
  });
  $('btnRefresh').addEventListener('click', () => checkAll(true));

  // ---------------------------------------------------------------- login / register
  function setAuthMode(mode) {
    authMode = mode;
    const register = mode === 'register';
    $('tabLogin').setAttribute('aria-selected', String(!register));
    $('tabRegister').setAttribute('aria-selected', String(register));
    $('confirmRow').hidden = !register;
    $('authHint').hidden = !register;
    $('authSubmit').textContent = register ? 'Create account' : 'Log in';
    $('authForm').password.autocomplete = register ? 'new-password' : 'current-password';
    clearAuthError();
  }
  function clearAuthError() {
    $('authError').hidden = true;
    for (const input of $('authForm').querySelectorAll('input')) input.removeAttribute('aria-invalid');
  }
  function showAuthError(message, field) {
    $('authError').textContent = message;
    $('authError').hidden = false;
    if (field) {
      const input = $('authForm')[field];
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  }
  $('tabLogin').addEventListener('click', () => setAuthMode('login'));
  $('tabRegister').addEventListener('click', () => setAuthMode('register'));

  $('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const server = selected();
    if (!server) return;
    clearAuthError();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return showAuthError('Username must be 3–20 letters, numbers or underscores.', 'username');
    if (password.length < 6) return showAuthError('Password must be at least 6 characters.', 'password');
    if (authMode === 'register' && password !== form.confirm.value) return showAuthError("Passwords don't match.", 'confirm');

    const submit = $('authSubmit');
    submit.disabled = true;
    submit.textContent = authMode === 'register' ? 'Creating account…' : 'Logging in…';
    const result = authMode === 'register'
      ? await api.register(server.id, username, password)
      : await api.login(server.id, username, password);
    submit.disabled = false;
    setAuthMode(authMode);
    if (result.error) return showAuthError(result.error);
    form.reset();
    state = result.state;
    status[server.id] = { ...statusOf(server.id), account: { username: result.user.username, save: result.save } };
    render();
    $('btnPlay').focus();
  });

  $('btnLogout').addEventListener('click', async () => {
    const server = selected();
    if (!server) return;
    state = await api.logout(server.id);
    if (status[server.id]) status[server.id].account = null;
    setAuthMode('login');
    render();
  });

  // ---------------------------------------------------------------- play
  $('btnPlay').addEventListener('click', async () => {
    const server = selected();
    if (!server || busy) return;
    busy = true;
    renderPlay();
    const result = await api.play({ serverId: server.id });
    busy = false;
    if (result?.error) {
      showPlayError(result.error);
      await check(server.id);
    }
    render();
  });
  $('btnOffline').addEventListener('click', () => api.play({ offline: true }));

  function showPlayError(message) {
    playError = message;
    setTimeout(() => {
      playError = '';
      renderPlay();
    }, 6000);
  }

  // ---------------------------------------------------------------- window controls
  $('btnMinimize').addEventListener('click', () => api.minimize());
  $('btnClose').addEventListener('click', () => api.close());

  // ---------------------------------------------------------------- start
  (async () => {
    state = await api.getState();
    setAuthMode('login');
    render();
    await checkAll();
    setInterval(() => {
      if (!busy) checkAll();
    }, POLL_MS);
  })();
})();

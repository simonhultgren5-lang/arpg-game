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
  let upd = null; // update status from electron/updates.cjs
  let playAction = 'play'; // 'play' | 'install-launcher' | 'open-releases'
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
    // Updates take priority over playing.
    playAction = 'play';
    const game = upd?.game;
    if (game && ['downloading', 'installing'].includes(game.state)) {
      label = 'Updating';
      sub = game.state === 'installing'
        ? `Installing v${game.latest}…`
        : `Downloading v${game.latest} · ${Math.round(game.progress * 100)}%`;
      enabled = false;
    } else if (game?.state === 'needs-launcher') {
      label = 'Update';
      if (upd.launcher.state === 'ready') {
        sub = `Restart to install v${game.latest}`;
        enabled = true;
        playAction = 'install-launcher';
      } else if (upd.launcher.state === 'manual') {
        sub = `Download v${game.latest} to keep playing online`;
        enabled = true;
        playAction = 'open-releases';
      } else if (upd.launcher.state === 'downloading') {
        sub = `Downloading the new launcher… ${Math.round((upd.launcher.progress || 0) * 100)}%`;
        enabled = false;
      } else {
        // The patch needs a newer launcher than any published one: send the player to the download page.
        sub = `Get the new launcher to install v${game.latest}`;
        enabled = true;
        playAction = 'open-releases';
      }
    }
    if (busy) {
      label = 'Loading';
      sub = 'Downloading your hero…';
      enabled = false;
    }
    $('playLabel').textContent = label;
    $('playSub').textContent = sub;
    btn.disabled = !enabled;
    btn.classList.toggle('busy', busy || ['downloading', 'installing'].includes(game?.state));
    $('btnOffline').disabled = Boolean(game && ['downloading', 'installing'].includes(game.state));
  }

  // ---------------------------------------------------------------- updates
  // ---------------------------------------------------------------- patch notes
  // Notes come from CHANGELOG.md: "### " subheadings, "- " bullets, paragraphs and **bold**.
  // Rendered with DOM text nodes only, so nothing in the notes can inject HTML.
  const SEEN_KEY = 'dodPatchNotesSeenV1';
  let patchNotes = { versions: [], source: 'none' };
  let notesReturnFocus = null;

  function appendInline(parent, text) {
    String(text)
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .forEach((part) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          const strong = document.createElement('strong');
          strong.textContent = part.slice(2, -2);
          parent.append(strong);
        } else parent.append(document.createTextNode(part));
      });
  }

  function renderNotesBody(container, body) {
    container.textContent = '';
    let list = null;
    for (const raw of String(body || '').split('\n')) {
      const line = raw.trim();
      if (!line) {
        list = null;
        continue;
      }
      if (line.startsWith('### ')) {
        list = null;
        const h = document.createElement('h4');
        appendInline(h, line.slice(4));
        container.append(h);
      } else if (/^[-*]\s+/.test(line)) {
        if (!list) {
          list = document.createElement('ul');
          container.append(list);
        }
        const li = document.createElement('li');
        appendInline(li, line.replace(/^[-*]\s+/, ''));
        list.append(li);
      } else {
        list = null;
        const p = document.createElement('p');
        appendInline(p, line);
        container.append(p);
      }
    }
  }

  const bulletsOf = (body) =>
    String(body || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-*]\s+/.test(l))
      .map((l) => l.replace(/^[-*]\s+/, ''));

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const readSeen = () => {
    try {
      return localStorage.getItem(SEEN_KEY) || '';
    } catch {
      return '';
    }
  };
  const markSeen = (version) => {
    try {
      localStorage.setItem(SEEN_KEY, version);
    } catch {
      // Storage unavailable: the NEW badge just stays.
    }
  };

  function renderNotesCard() {
    const latest = patchNotes.versions[0];
    const card = $('notesCard');
    // While an update card is already showing notes, don't repeat them.
    const updateShowsNotes = !$('updateCard').hidden && $('updateNotes').childElementCount > 0;
    card.hidden = !latest || updateShowsNotes;
    $('btnFooterNotes').hidden = !latest;
    if (!latest) return;
    $('notesNew').hidden = readSeen() === latest.version;
    $('notesCardTitle').textContent = `Version ${latest.version}${latest.date ? ` · ${formatDate(latest.date)}` : ''}`;
    const list = $('notesHighlights');
    list.textContent = '';
    for (const item of bulletsOf(latest.body).slice(0, 3)) {
      const li = document.createElement('li');
      appendInline(li, item);
      list.append(li);
    }
  }

  function showNotesVersion(version) {
    const entry = patchNotes.versions.find((v) => v.version === version) || patchNotes.versions[0];
    if (!entry) return;
    for (const btn of $('notesVersions').querySelectorAll('button')) {
      btn.setAttribute('aria-current', String(btn.dataset.version === entry.version));
    }
    $('notesArticleTitle').textContent = `Version ${entry.version}`;
    $('notesArticleDate').textContent = formatDate(entry.date);
    renderNotesBody($('notesArticleBody'), entry.body);
    $('notesArticle').scrollTop = 0;
  }

  function openNotes(version) {
    if (!patchNotes.versions.length) return;
    notesReturnFocus = document.activeElement;
    const nav = $('notesVersions');
    nav.textContent = '';
    const seen = readSeen();
    patchNotes.versions.forEach((entry, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.version = entry.version;
      const title = document.createElement('b');
      title.textContent = `v${entry.version}`;
      if (index === 0 && seen !== entry.version) {
        const badge = document.createElement('span');
        badge.className = 'badge-new';
        badge.textContent = 'New';
        title.append(badge);
      }
      const date = document.createElement('small');
      date.textContent = entry.date ? formatDate(entry.date) : index === 0 ? 'Latest' : '';
      btn.append(title, date);
      btn.addEventListener('click', () => showNotesVersion(entry.version));
      nav.append(btn);
    });
    $('notesSource').textContent =
      patchNotes.source === 'online' ? '' : "Showing the patch notes included with this launcher. Newer notes appear here once they're published.";
    $('notesPanel').hidden = false;
    showNotesVersion(version || patchNotes.versions[0].version);
    $('btnCloseNotes').focus();
    markSeen(patchNotes.versions[0].version);
    renderNotesCard();
  }

  function closeNotes() {
    $('notesPanel').hidden = true;
    if (notesReturnFocus && document.contains(notesReturnFocus)) notesReturnFocus.focus();
  }

  $('btnAllNotes').addEventListener('click', () => openNotes());
  $('btnFooterNotes').addEventListener('click', () => openNotes());
  $('btnCloseNotes').addEventListener('click', closeNotes);
  $('notesPanel').addEventListener('click', (e) => {
    if (e.target === $('notesPanel')) closeNotes();
  });
  document.addEventListener('keydown', (e) => {
    if ($('notesPanel').hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeNotes();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Step through versions with the arrow keys.
      const buttons = [...$('notesVersions').querySelectorAll('button')];
      const current = buttons.findIndex((b) => b.getAttribute('aria-current') === 'true');
      const next = buttons[current + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        e.preventDefault();
        showNotesVersion(next.dataset.version);
        next.focus();
      }
    }
  });

  async function loadPatchNotes() {
    try {
      patchNotes = (await api.getPatchNotes()) || patchNotes;
    } catch {
      // Keep whatever we had.
    }
    renderNotesCard();
  }

  function updateButton(label, onClick, ghost = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = ghost ? 'btn ghost small' : 'btn small';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderUpdates() {
    if (!upd) return;
    const { game, launcher } = upd;
    $('versionLabel').textContent = `Game v${game.current} · Launcher v${launcher.current}`;
    $('updateState').textContent =
      {
        disabled: 'Updates are off when running from source',
        checking: 'Checking for updates…',
        'up-to-date': 'Up to date',
        updated: `Updated to v${game.current}`,
        downloading: 'Updating…',
        installing: 'Updating…',
        'needs-launcher': 'Launcher update needed',
        error: game.latest && game.latest !== game.current ? 'Update failed' : 'Could not check for updates',
      }[game.state] || '';

    const card = $('updateCard');
    const actions = $('updateActions');
    actions.textContent = '';
    let label = 'Update';
    let title = '';
    let notes = '';
    let progress = null;
    let error = '';
    let tone = '';

    if (launcher.state === 'ready') {
      label = 'Launcher update';
      title = `Launcher v${launcher.latest} is ready`;
      notes = launcher.notes;
      tone = 'ready';
      actions.append(updateButton('Restart to update', () => api.installLauncherUpdate()));
    } else if (launcher.state === 'manual') {
      label = 'New version';
      title = `Version ${launcher.latest} is out`;
      notes = launcher.notes;
      actions.append(updateButton('Download', () => api.openReleasesPage()));
    } else if (['downloading', 'installing'].includes(game.state)) {
      label = 'Updating';
      title = `Updating to v${game.latest}`;
      notes = game.notes;
      progress = game.state === 'installing' ? 1 : game.progress;
    } else if (game.state === 'needs-launcher') {
      label = 'Update';
      title = `v${game.latest} needs the new launcher`;
      notes = game.notes;
      if (launcher.state === 'downloading') progress = launcher.progress;
    } else if (game.state === 'error') {
      label = 'Update';
      title = 'Update problem';
      error = game.error;
      tone = 'problem';
      actions.append(updateButton(game.latest && game.latest !== game.current ? 'Retry update' : 'Check again', () =>
        game.latest && game.latest !== game.current ? api.retryGameUpdate() : api.checkForUpdates(),
      ));
    } else if (game.state === 'updated') {
      label = "What's new";
      title = `Updated to v${game.current}`;
      notes = game.notes;
      tone = 'ready';
    } else if (launcher.state === 'downloading') {
      label = 'Launcher update';
      title = `Downloading launcher v${launcher.latest}`;
      progress = launcher.progress;
    }

    card.hidden = !title;
    if (!title) return;
    card.className = `update-card ${tone}`.trim();
    $('updateLabel').textContent = label;
    $('updateTitle').textContent = title;
    $('updateProgress').hidden = progress === null;
    $('updateBar').style.width = `${Math.round((progress || 0) * 100)}%`;
    renderNotesBody($('updateNotes'), notes);
    $('updateError').hidden = !error;
    $('updateError').textContent = error;
  }

  function render() {
    renderServers();
    renderAccount();
    renderMotd();
    renderUpdates();
    renderNotesCard();
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
    if (playAction === 'install-launcher') return api.installLauncherUpdate();
    if (playAction === 'open-releases') return api.openReleasesPage();
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
    upd = await api.getUpdateStatus();
    api.onUpdateStatus((next) => {
      const justUpdated = next.game.state === 'updated' && upd?.game.state !== 'updated';
      upd = next;
      renderUpdates();
      renderNotesCard();
      renderPlay();
      if (justUpdated) loadPatchNotes();
    });
    setAuthMode('login');
    render();
    loadPatchNotes();
    await checkAll();
    setInterval(() => {
      if (!busy) checkAll();
    }, POLL_MS);
  })();
})();

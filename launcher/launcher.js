// Depths of Darkness launcher UI. All networking happens in the Electron main process
// through window.launcher (see electron/launcher-preload.cjs).
(() => {
  const api = window.launcher;
  const $ = (id) => document.getElementById(id);
  const POLL_MS = 8000;
  // ---------------------------------------------------------------- Act I film
  // Loops silently behind the hero art. "Watch the Act I film" plays it full size from the start with
  // sound and captions; Esc, the back button or the end of the film returns to the silent loop.
  const film = $('actFilm');
  const filmBar = $('filmBar');
  const btnCaptions = $('btnFilmCaptions');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let watching = false;
  let idleTimer = 0;
  function playBackground() {
    if (watching || document.hidden || reducedMotion.matches) return;
    film.play().then(() => film.classList.add('playing')).catch(() => { /* the poster stays */ });
  }
  function showCaptions(on) {
    const track = film.textTracks && film.textTracks[0];
    if (track) track.mode = on ? 'showing' : 'hidden';
    btnCaptions.textContent = on ? 'Captions on' : 'Captions off';
    btnCaptions.setAttribute('aria-pressed', String(on));
  }
  function nudgeIdle() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (watching) document.body.classList.add('idle'); }, 2500);
  }
  let captionsWanted = true;
  function watchFilm() {
    watching = true;
    document.body.classList.add('watching');
    filmBar.hidden = false;
    film.loop = false;
    film.muted = false;
    film.controls = true;
    film.removeAttribute('aria-hidden');
    film.currentTime = 0;
    showCaptions(captionsWanted);
    film.play().catch(() => { /* the native controls remain */ });
    nudgeIdle();
    $('btnFilmBack').focus();
  }
  function leaveFilm() {
    if (!watching) return;
    watching = false;
    clearTimeout(idleTimer);
    document.body.classList.remove('watching', 'idle');
    filmBar.hidden = true;
    film.controls = false;
    film.muted = true;
    film.loop = true;
    film.setAttribute('aria-hidden', 'true');
    showCaptions(false);
    $('btnTrailer').focus();
    playBackground();
  }
  $('btnTrailer').addEventListener('click', watchFilm);
  $('btnFilmBack').addEventListener('click', leaveFilm);
  btnCaptions.addEventListener('click', () => {
    captionsWanted = btnCaptions.getAttribute('aria-pressed') !== 'true';
    showCaptions(captionsWanted);
  });
  film.addEventListener('ended', leaveFilm);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && watching) { e.preventDefault(); leaveFilm(); }
  });
  document.addEventListener('mousemove', () => { if (watching) nudgeIdle(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) film.pause();
    else if (!watching) playBackground();
    else film.play().catch(() => {});
  });
  reducedMotion.addEventListener('change', () => (reducedMotion.matches ? film.pause() : playBackground()));
  showCaptions(false);
  if (film.readyState >= 2) playBackground();
  else film.addEventListener('canplay', playBackground, { once: true });

  // ---------------------------------------------------------------- classes & colors
  // Same classes, colors and starting kit as the game (game/js/06-onboarding-sanctuary.js).
  const CLASSES = {
    warrior: {
      name: 'Warrior',
      role: 'Melee · Swords, Whirlwind & Bleed',
      lore: 'A sworn blade of the fallen watch. Wades into the horde, shield first, and leaves it bleeding.',
      // crossed sword over a heater shield
      icon: '<path d="M32 6 52 13v15c0 13-8.5 22-20 30C20.5 50 12 41 12 28V13Z" class="e-fill"/><path d="M32 6 52 13v15c0 13-8.5 22-20 30C20.5 50 12 41 12 28V13Z" class="e-line"/><path d="m21 43 22-26m-4-3 6 6m-23 18-3 3m4 1-6-6" class="e-line e-bright"/>',
    },
    pyromancer: {
      name: 'Pyromancer',
      role: 'Ranged · Fire Spells & Blink',
      lore: 'Bargained with the ember beneath the world. Burns whole crypts clean from a safe distance.',
      // flame inside a rune circle
      icon: '<circle cx="32" cy="34" r="22" class="e-fill"/><circle cx="32" cy="34" r="22" class="e-line" stroke-dasharray="3 4"/><path d="M32 12c3 9 13 13 13 25a13 13 0 0 1-26 0c0-7 4-10 6-15 1 4 3 6 5 7-1-6 0-11 2-17Z" class="e-line e-bright"/><path d="M32 33c2 4 5 5 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9Z" class="e-line"/>',
    },
    rogue: {
      name: 'Shadow Rogue',
      role: 'Fast · Twin Blades, Crit & Dodge',
      lore: 'Paid in coin, loyal to nothing. Strikes from the dark between torches and is gone again.',
      // twin daggers under a crescent
      icon: '<path d="M44 8a22 22 0 1 0 12 30A18 18 0 1 1 44 8Z" class="e-fill"/><path d="M44 8a22 22 0 1 0 12 30A18 18 0 1 1 44 8Z" class="e-line"/><path d="m18 50 18-20m-3-3 6 6M18 50l-4 4m28-4L28 34m-2 6 6-6m10 16 4 4" class="e-line e-bright"/>',
    },
  };
  const CLASS_ORDER = ['warrior', 'pyromancer', 'rogue'];
  const COLORS = [
    ['#8d3430', 'Crimson'],
    ['#315b79', 'Blue'],
    ['#4e7046', 'Green'],
    ['#877044', 'Gold'],
    ['#63506f', 'Violet'],
  ];
  const className = (cls) => CLASSES[cls]?.name || 'Hero';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function emblem(cls, color, size = 40) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('emblem');
    svg.style.setProperty('--tint', /^#[0-9a-f]{6}$/i.test(color) ? color : '#8d3430');
    svg.innerHTML = (CLASSES[cls] || CLASSES.warrior).icon; // static markup defined above
    return svg;
  }

  let state = { servers: [], selectedServerId: null, accounts: {}, version: '' };
  // 'online' plays on the selected server, 'offline' plays characters stored on this PC.
  let mode = readPref('dodLauncherModeV1') === 'offline' ? 'offline' : 'online';
  // Characters per scope ('offline' or 'server:<id>'): { characters, maxCharacters, error, loading }
  const roster = {};
  const selectedChar = (() => {
    try {
      return JSON.parse(readPref('dodSelectedCharacterV1') || '{}') || {};
    } catch {
      return {};
    }
  })();
  const status = {}; // serverId -> { state: 'checking'|'online'|'offline', info, pingMs, account }
  let authMode = 'login';
  let busy = false;
  let upd = null; // update status from electron/updates.cjs
  let playAction = 'play'; // 'play' | 'install-launcher' | 'open-releases'
  let has3d = false; // the 3D preview (godot/) is installed with this launcher
  let playError = '';

  function readPref(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function writePref(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable: the choice just isn't remembered.
    }
  }

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
      if (st.state === 'online' && st.info?.version) meta.textContent += ` · v${st.info.version}`;
      text.append(name, meta);
      // The server checks GitHub for new releases (game-server/update.sh installs them on the Pi).
      if (st.state === 'online' && st.info?.update?.version) {
        const upd = document.createElement('span');
        upd.className = 'server-update';
        upd.textContent = `Server update ${st.info.update.version} available`;
        upd.title = 'Install it on the server computer:\n  bash game-server/update.sh\nOr turn on nightly updates once:\n  bash game-server/update.sh --auto';
        text.append(upd);
      }
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

  // Where characters come from right now, or null when there is nothing to show yet.
  function currentScope() {
    if (mode === 'offline') return { key: 'offline', offline: true };
    const server = selected();
    const st = server ? statusOf(server.id) : null;
    if (!server || st.state !== 'online' || !st.account || !state.accounts[server.id]) return null;
    return { key: `server:${server.id}`, serverId: server.id };
  }
  const scopeArg = (scope) => (scope.offline ? { offline: true } : { serverId: scope.serverId });
  const rosterOf = (scope) => (scope && roster[scope.key]) || null;
  function currentCharacter() {
    const scope = currentScope();
    const list = rosterOf(scope)?.characters || [];
    return list.find((c) => String(c.id) === String(selectedChar[scope?.key])) || null;
  }
  function selectCharacter(scope, id) {
    selectedChar[scope.key] = String(id);
    writePref('dodSelectedCharacterV1', JSON.stringify(selectedChar));
  }
  function setRoster(scope, data) {
    if (!scope) return;
    if (!data || data.error || !Array.isArray(data.characters)) {
      roster[scope.key] = { characters: roster[scope.key]?.characters || [], maxCharacters: 5, error: data?.error || '' };
      return;
    }
    roster[scope.key] = { characters: data.characters, maxCharacters: data.maxCharacters || 5, error: '' };
    // Keep a valid selection: the remembered one, else the most recently played.
    const list = data.characters;
    if (list.length && !list.some((c) => String(c.id) === String(selectedChar[scope.key]))) {
      const recent = [...list].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0];
      selectCharacter(scope, recent.id);
    }
  }
  const charLine = (c) => `Lv ${c.level ?? 1} ${className(c.heroClass)} · Depth ${c.depth ?? 1}`;

  function renderAccount() {
    const offline = mode === 'offline';
    const server = selected();
    const st = server ? statusOf(server.id) : null;
    const account = server ? state.accounts[server.id] : null;
    const online = st?.state === 'online';
    const signedIn = Boolean(account && online && st.account);

    document.querySelector('[aria-labelledby="serversTitle"]').hidden = offline;
    document.querySelector('.card.account').hidden = offline || signedIn;
    $('accountOffline').hidden = !(server && st.state === 'offline');
    $('accountForms').hidden = !(server && online && !signedIn);
    $('btnOffline').textContent = offline ? '← Back to online play' : 'Play offline (characters on this PC)';
    renderCharacters();
  }

  function renderCharacters() {
    const scope = currentScope();
    const card = $('charactersCard');
    card.hidden = !scope;
    if (!scope) return;
    const server = selected();
    const offline = Boolean(scope.offline);
    const data = rosterOf(scope);
    const list = data?.characters || [];
    const max = data?.maxCharacters || 5;

    $('charactersTitle').textContent = offline ? 'Characters on this PC' : 'Characters';
    $('slotCount').textContent = data ? `${list.length} / ${max}` : '';
    $('btnLogout').hidden = offline;
    if (offline) {
      $('avatar').textContent = '⌂';
      $('ownerName').textContent = 'Offline play';
      $('ownerSub').textContent = 'Saved on this PC only';
    } else {
      const username = state.accounts[server.id].username;
      $('avatar').textContent = username.slice(0, 1).toUpperCase();
      $('ownerName').textContent = username;
      $('ownerSub').textContent = server.name;
    }
    $('charError').hidden = !data?.error;
    $('charError').textContent = data?.error || '';

    const ul = $('charList');
    ul.textContent = '';
    if (!data) {
      const li = document.createElement('li');
      li.className = 'char-empty';
      li.textContent = 'Loading characters…';
      ul.append(li);
      return;
    }
    const current = currentCharacter();
    for (const c of list) {
      const li = document.createElement('li');
      li.className = 'char';
      li.setAttribute('role', 'option');
      li.tabIndex = 0;
      li.dataset.id = c.id;
      li.setAttribute('aria-selected', String(current?.id === c.id));
      const text = document.createElement('div');
      text.className = 'char-text';
      const name = document.createElement('b');
      name.textContent = c.name;
      const meta = document.createElement('small');
      meta.textContent = charLine(c);
      text.append(name, meta);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'char-remove';
      remove.title = `Delete ${c.name}`;
      remove.setAttribute('aria-label', `Delete ${c.name}`);
      remove.textContent = '✕';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        openDelete(scope, c);
      });
      li.append(emblem(c.heroClass, c.color, 36), text, remove);
      li.addEventListener('click', () => {
        selectCharacter(scope, c.id);
        playError = '';
        render();
      });
      li.addEventListener('dblclick', () => $('btnPlay').click());
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (current?.id === c.id) $('btnPlay').click();
          else li.click();
        } else if (e.key === 'Delete') {
          e.preventDefault();
          openDelete(scope, c);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = [...ul.querySelectorAll('li[tabindex]')];
          items[items.indexOf(li) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
        }
      });
      ul.append(li);
    }
    if (list.length < max) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'char-new';
      btn.innerHTML = '<span class="plus" aria-hidden="true">+</span>';
      btn.append(document.createTextNode(list.length ? 'Create character' : 'Create your first character'));
      btn.addEventListener('click', () => openCreate(scope));
      li.append(btn);
      ul.append(li);
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
      const c = currentCharacter();
      const data = rosterOf(currentScope());
      if (data?.error && !data.characters.length) sub = 'Characters unavailable';
      else if (!c) sub = data?.characters.length ? 'Pick a character' : 'Create a character to begin';
      else {
        enabled = true;
        sub = `${c.name} · ${charLine(c)}`;
      }
    }
    if (mode === 'offline') {
      const c = currentCharacter();
      const data = rosterOf(currentScope());
      label = 'Play';
      enabled = Boolean(c);
      sub = c ? `${c.name} · ${charLine(c)} · offline` : data?.characters.length ? 'Pick a character' : 'Create a character to begin';
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
      sub = mode === 'offline' ? 'Starting…' : 'Downloading your hero…';
      enabled = false;
    }
    $('playLabel').textContent = label;
    $('playSub').textContent = sub;
    btn.disabled = !enabled;
    // The 3D preview plays the same character; only when the normal Play would work too.
    $('btnPlay3d').hidden = !has3d;
    $('btnPlay3d').disabled = !(enabled && playAction === 'play' && currentCharacter());
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
    if (result.account) applyAccountCharacters(serverId, result.account);
    if (result.sessionExpired) state = await api.getState();
  }
  function applyAccountCharacters(serverId, account) {
    const scope = { key: `server:${serverId}`, serverId };
    if (Array.isArray(account.characters)) setRoster(scope, account);
    else setRoster(scope, { error: 'This server needs an update before it supports characters. Ask its owner to install the latest server.' });
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
    status[server.id] = { ...statusOf(server.id), account: result.account };
    applyAccountCharacters(server.id, result.account);
    render();
    const list = rosterOf(currentScope())?.characters || [];
    if (!list.length && !rosterOf(currentScope())?.error) openCreate(currentScope());
    else $('btnPlay').focus();
  });

  $('btnLogout').addEventListener('click', async () => {
    const server = selected();
    if (!server) return;
    state = await api.logout(server.id);
    if (status[server.id]) status[server.id].account = null;
    delete roster[`server:${server.id}`];
    setAuthMode('login');
    render();
  });

  // ---------------------------------------------------------------- play
  $('btnPlay').addEventListener('click', async () => {
    if (playAction === 'install-launcher') return api.installLauncherUpdate();
    if (playAction === 'open-releases') return api.openReleasesPage();
    const scope = currentScope();
    const character = currentCharacter();
    if (!scope || !character || busy) return;
    busy = true;
    renderPlay();
    const result = await api.play(
      scope.offline ? { offline: true, characterId: character.id } : { serverId: scope.serverId, characterId: character.id },
    );
    busy = false;
    if (result?.error) {
      showPlayError(result.error);
      if (!scope.offline) await check(scope.serverId);
    }
    render();
  });
  $('btnPlay3d').addEventListener('click', async () => {
    const scope = currentScope();
    const character = currentCharacter();
    if (!scope || !character || busy) return;
    busy = true;
    renderPlay();
    const result = await api.play(
      scope.offline
        ? { engine: '3d', offline: true, characterId: character.id }
        : { engine: '3d', serverId: scope.serverId, characterId: character.id },
    );
    busy = false;
    if (result?.error) showPlayError(result.error);
    render();
  });
  $('btnOffline').addEventListener('click', async () => {
    mode = mode === 'offline' ? 'online' : 'offline';
    writePref('dodLauncherModeV1', mode);
    playError = '';
    render();
    if (mode === 'offline') await loadOfflineCharacters();
  });
  async function loadOfflineCharacters() {
    const scope = { key: 'offline', offline: true };
    setRoster(scope, await api.listCharacters({ offline: true }));
    render();
  }

  // ---------------------------------------------------------------- create a character
  const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,17}$/;
  const NAME_PARTS = [
    ['Ash', 'Bran', 'Cael', 'Dra', 'Ed', 'Fen', 'Gal', 'Hal', 'Isol', 'Kor', 'Lys', 'Mor', 'Nym', 'Oth', 'Ren', 'Sar', 'Tor', 'Vael', 'Wyn', 'Yse'],
    ['a', 'en', 'ric', 'wyn', 'mir', 'dred', 'ith', 'or', 'ane', 'is', 'eth', 'ra', 'gar', 'iel', 'ok', 'ya'],
  ];
  const randomName = () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    return pick(NAME_PARTS[0]) + pick(NAME_PARTS[1]);
  };
  let createScope = null;
  let createClass = 'warrior';
  let createColor = COLORS[0][0];
  let createReturnFocus = null;

  function buildCreatePickers() {
    const grid = $('classGrid');
    grid.textContent = '';
    for (const cls of CLASS_ORDER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'class-card';
      b.setAttribute('role', 'radio');
      b.dataset.cls = cls;
      const t = document.createElement('span');
      t.className = 'class-card-text';
      const n = document.createElement('b');
      n.textContent = CLASSES[cls].name;
      const r = document.createElement('small');
      r.textContent = CLASSES[cls].role;
      t.append(n, r);
      b.append(emblem(cls, createColor, 34), t);
      b.addEventListener('click', () => {
        createClass = cls;
        renderCreate();
      });
      grid.append(b);
    }
    const row = $('colorRow');
    row.textContent = '';
    for (const [hex, label] of COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', label);
      b.title = label;
      b.dataset.color = hex;
      b.style.background = hex;
      b.addEventListener('click', () => {
        createColor = hex;
        renderCreate();
      });
      row.append(b);
    }
  }
  // Arrow keys move between options in a radio group.
  for (const id of ['classGrid', 'colorRow']) {
    $(id).addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const items = [...$(id).querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      const next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      next.click();
      next.focus();
    });
  }

  function renderCreate() {
    for (const b of $('classGrid').querySelectorAll('button')) {
      const on = b.dataset.cls === createClass;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      b.querySelector('svg').style.setProperty('--tint', createColor);
    }
    for (const b of $('colorRow').querySelectorAll('button')) {
      const on = b.dataset.color === createColor;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const info = CLASSES[createClass];
    $('previewEmblem').textContent = '';
    $('previewEmblem').append(emblem(createClass, createColor, 132));
    $('createPreview').style.setProperty('--tint', createColor);
    $('previewName').textContent = $('charName').value.trim() || 'Your hero';
    $('previewClass').textContent = info.name;
    $('previewLore').textContent = info.lore;
  }

  function openCreate(scope) {
    if (!scope) return;
    const data = rosterOf(scope);
    if (data && data.characters.length >= data.maxCharacters) return;
    createScope = scope;
    createReturnFocus = document.activeElement;
    createClass = 'warrior';
    createColor = COLORS[0][0];
    $('createForm').reset();
    $('createError').hidden = true;
    $('charName').removeAttribute('aria-invalid');
    $('createWhere').textContent = scope.offline ? 'Offline · saved on this PC' : `${state.accounts[scope.serverId]?.username} · ${selected()?.name}`;
    const used = data ? data.characters.length : 0;
    $('createTitle').textContent = used ? `Create a Character · slot ${used + 1} of ${data.maxCharacters}` : 'Create your first Character';
    buildCreatePickers();
    renderCreate();
    $('createPanel').hidden = false;
    $('charName').focus();
  }
  function closeCreate() {
    $('createPanel').hidden = true;
    if (createReturnFocus && document.contains(createReturnFocus)) createReturnFocus.focus();
  }
  function showCreateError(message) {
    $('createError').textContent = message;
    $('createError').hidden = false;
    $('charName').setAttribute('aria-invalid', 'true');
    $('charName').focus();
  }
  $('charName').addEventListener('input', () => {
    $('charName').removeAttribute('aria-invalid');
    $('createError').hidden = true;
    renderCreate();
  });
  $('btnRandomName').addEventListener('click', () => {
    $('charName').value = randomName();
    renderCreate();
    $('charName').focus();
  });
  $('btnCloseCreate').addEventListener('click', closeCreate);
  $('btnCancelCreate').addEventListener('click', closeCreate);
  $('createPanel').addEventListener('mousedown', (e) => {
    if (e.target === $('createPanel')) closeCreate();
  });
  $('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('charName').value.trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(name)) return showCreateError("Name must be 2–18 letters (spaces, - and ' allowed).");
    const scope = createScope;
    const btn = $('btnCreate');
    btn.disabled = true;
    btn.textContent = 'Creating…';
    const result = await api.createCharacter(scopeArg(scope), { name, heroClass: createClass, color: createColor });
    btn.disabled = false;
    btn.textContent = 'Create character';
    if (result?.error) return showCreateError(result.error);
    setRoster(scope, result);
    selectCharacter(scope, result.character.id);
    $('createPanel').hidden = true;
    render();
    $('btnPlay').focus();
  });

  // ---------------------------------------------------------------- delete a character
  let deleting = null;
  function openDelete(scope, character) {
    deleting = { scope, character, returnFocus: document.activeElement };
    $('deleteForm').reset();
    $('deleteError').hidden = true;
    $('btnConfirmDelete').disabled = true;
    $('deleteTitle').textContent = `Delete ${character.name}?`;
    $('deleteText').textContent = `${character.name} (${charLine(character)}) and all of their gear and progress will be deleted ${
      scope.offline ? 'from this PC' : 'from the server'
    }. This can't be undone.`;
    $('deletePanel').hidden = false;
    $('deleteConfirm').focus();
  }
  function closeDelete() {
    $('deletePanel').hidden = true;
    const back = deleting?.returnFocus;
    deleting = null;
    if (back && document.contains(back)) back.focus();
  }
  $('deleteConfirm').addEventListener('input', () => {
    $('btnConfirmDelete').disabled = $('deleteConfirm').value.trim().toLowerCase() !== deleting?.character.name.toLowerCase();
  });
  $('btnCancelDelete').addEventListener('click', closeDelete);
  $('deletePanel').addEventListener('mousedown', (e) => {
    if (e.target === $('deletePanel')) closeDelete();
  });
  $('deleteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!deleting || $('btnConfirmDelete').disabled) return;
    const { scope, character } = deleting;
    $('btnConfirmDelete').disabled = true;
    const result = await api.deleteCharacter(scopeArg(scope), character.id);
    if (result?.error) {
      $('deleteError').textContent = result.error;
      $('deleteError').hidden = false;
      $('btnConfirmDelete').disabled = false;
      return;
    }
    if (String(selectedChar[scope.key]) === String(character.id)) delete selectedChar[scope.key];
    setRoster(scope, result);
    closeDelete();
    render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('deletePanel').hidden) closeDelete();
    else if (!$('createPanel').hidden) closeCreate();
  });

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
      const newRelease =
        (next.game.latest && next.game.latest !== upd?.game.latest) ||
        (next.launcher.latest && next.launcher.latest !== upd?.launcher.latest);
      upd = next;
      if (newRelease) loadPatchNotes();
      renderUpdates();
      renderNotesCard();
      renderPlay();
      if (justUpdated) loadPatchNotes();
    });
    setAuthMode('login');
    has3d = Boolean((await api.get3dStatus?.())?.available);
    api.onGameClosed?.(() => {
      // Back from the 3D game: refresh the character list.
      if (mode === 'offline') loadOfflineCharacters();
      else checkAll();
    });
    render();
    loadPatchNotes();
    if (mode === 'offline') loadOfflineCharacters();
    await checkAll();
    setInterval(() => {
      if (!busy && $('createPanel').hidden && $('deletePanel').hidden) checkAll();
    }, POLL_MS);
  })();
})();

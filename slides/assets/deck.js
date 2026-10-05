/*
 * deck.js: the slide engine for this talk. No dependencies, works from file://.
 *
 * Markup: .viewport > .stage > section.slide#id
 *   data-show="n"   element appears from step n (class "on")
 *   data-hide="n"   element disappears from step n (class "off")
 *   data-only="n m" element is visible only at the listed steps
 *   data-flip       element animates between layouts (FLIP) when a step changes
 *   data-count="68" number counts up when it becomes visible
 * The slide gets classes s1..sN for every step reached and data-step="k".
 * A slide can register a controller: Deck.register(id, {steps, render(slide, step, opts)}).
 *
 * Modes (query string): ?speaker (presenter window), ?embed (preview inside the
 * presenter window), ?print (one page per slide, for PDF export).
 */
(function () {
  'use strict';

  var W = 1920;
  var H = 1080;
  var params = new URLSearchParams(location.search);
  var MODE = params.has('speaker') ? 'speaker'
    : params.has('print') ? 'print'
    : params.has('embed') ? 'embed'
    : 'deck';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var controllers = {};
  var slides = [];
  var index = 0;
  var step = 0;
  var speakerWin = null;
  var overview = false;

  var Deck = (window.Deck = {
    mode: MODE,
    register: function (id, ctrl) { controllers[id] = ctrl; },
    get index() { return index; },
    get step() { return step; },
    get slides() { return slides; },
    go: go,
    next: next,
    prev: prev,
    layoutRect: layoutRect,
    reduceMotion: reduceMotion
  });

  /* ---------- helpers ---------- */

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* storage can be unavailable; the deck works without it */ }
    return null;
  }

  function nums(text) {
    return String(text || '').split(/[\s,]+/).filter(Boolean).map(Number);
  }

  // Position of el relative to ancestor in untransformed layout pixels.
  function layoutRect(el, ancestor) {
    var x = 0, y = 0, node = el;
    while (node && node !== ancestor) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function stepsOf(slide) {
    var max = 0;
    slide.querySelectorAll('[data-show],[data-hide],[data-only],[data-focus]').forEach(function (el) {
      nums([el.dataset.show, el.dataset.hide, el.dataset.only, el.dataset.focus].join(' ')).forEach(function (n) {
        if (n > max) max = n;
      });
    });
    if (slide.dataset.steps) max = Math.max(max, +slide.dataset.steps);
    var ctrl = controllers[slide.id];
    if (ctrl && ctrl.steps) max = Math.max(max, ctrl.steps);
    return max;
  }

  /* ---------- steps ---------- */

  function applyStep(slide, k, opts) {
    opts = opts || {};
    var animate = !!opts.animate && !reduceMotion;
    var flips = animate ? measureFlips(slide) : null;
    var total = slide._steps;
    slide.dataset.step = k;
    for (var i = 1; i <= total; i++) slide.classList.toggle('s' + i, i <= k);
    slide.querySelectorAll('[data-show]').forEach(function (el) {
      el.classList.toggle('on', k >= +el.dataset.show);
    });
    slide.querySelectorAll('[data-hide]').forEach(function (el) {
      el.classList.toggle('off', k >= +el.dataset.hide);
    });
    slide.querySelectorAll('[data-only]').forEach(function (el) {
      el.classList.toggle('on', nums(el.dataset.only).indexOf(k) !== -1);
    });
    slide.querySelectorAll('[data-focus]').forEach(function (el) {
      var n = +el.dataset.focus;
      el.classList.toggle('focus', k === n);
      el.classList.toggle('past', k > n);
    });
    var ctrl = controllers[slide.id];
    if (ctrl && ctrl.render) ctrl.render(slide, k, { animate: animate, dir: opts.dir || 0, mode: MODE });
    if (flips) playFlips(slide, flips);
    counters(slide, animate && opts.dir > 0);
  }

  function measureFlips(slide) {
    return Array.prototype.map.call(slide.querySelectorAll('[data-flip]'), function (el) {
      return { el: el, r: el.offsetParent ? layoutRect(el, slide) : null };
    });
  }

  function playFlips(slide, list) {
    list.forEach(function (item) {
      var el = item.el, first = item.r;
      if (!first || !el.offsetParent || !el.animate) return;
      var last = layoutRect(el, slide);
      var dx = first.x - last.x, dy = first.y - last.y;
      var moveOnly = el.dataset.flip === 'move';
      var sx = moveOnly || !last.w ? 1 : first.w / last.w;
      var sy = moveOnly || !last.h ? 1 : first.h / last.h;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.005 && Math.abs(sy - 1) < 0.005) return;
      el.animate(
        [
          { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' },
          { transformOrigin: '0 0', transform: 'none' }
        ],
        { duration: +(el.dataset.flipDuration || 700), easing: 'cubic-bezier(.2,.75,.15,1)' }
      );
    });
  }

  function formatNumber(value, decimals) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function counters(slide, animate) {
    slide.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var decimals = +(el.dataset.decimals || 0);
      var shown = !el.closest('[data-show]:not(.on)');
      if (!shown) {
        el.textContent = formatNumber(0, decimals);
        el._done = false;
        return;
      }
      if (!animate || el._done) {
        el.textContent = formatNumber(target, decimals);
        el._done = true;
        return;
      }
      el._done = true;
      var t0 = performance.now(), dur = +(el.dataset.duration || 1400);
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = formatNumber(target * e, decimals);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------- navigation ---------- */

  function go(i, k, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(slides.length - 1, i));
    var slide = slides[i];
    k = k === 'last' ? slide._steps : Math.max(0, Math.min(slide._steps, k || 0));
    var changedSlide = i !== index || opts.force;
    var dir = i > index || (i === index && k > step) ? 1 : -1;
    if (changedSlide) {
      var old = slides[index];
      if (old && old !== slide) {
        old.classList.remove('is-current');
        old.classList.add(i > index ? 'is-past' : 'is-future');
        var oc = controllers[old.id];
        if (oc && oc.leave) oc.leave(old);
        // Reset slides behind us so that returning forward replays the builds.
        if (i < index) { applyStep(old, 0, {}); old._resetCounters = true; }
      }
      slides.forEach(function (s, j) {
        s.classList.toggle('is-past', j < i);
        s.classList.toggle('is-future', j > i);
      });
      slide.classList.remove('is-past', 'is-future');
      slide.classList.add('is-current');
      if (dir > 0) slide.querySelectorAll('[data-count]').forEach(function (el) { el._done = false; });
      applyStep(slide, k, { animate: false, dir: dir });
      var nc = controllers[slide.id];
      if (nc && nc.enter) nc.enter(slide, k, { dir: dir, mode: MODE });
    } else if (k !== step) {
      applyStep(slide, k, { animate: opts.animate !== false, dir: dir });
    }
    index = i;
    step = k;
    document.body.dataset.slide = slide.id;
    document.body.classList.toggle('hud-off', slide.dataset.hud === 'off');
    document.body.classList.toggle('hud-url-off', slide.dataset.hudUrl === 'off');
    updateHud();
    if (MODE === 'deck') {
      try { history.replaceState(null, '', '#/' + slide.id + (k ? '/' + k : '')); } catch (e) { /* ignore */ }
      sendState();
    }
  }

  function next() {
    if (step < slides[index]._steps) go(index, step + 1);
    else if (index < slides.length - 1) go(index + 1, 0);
  }

  function prev() {
    if (step > 0) go(index, step - 1);
    else if (index > 0) go(index - 1, 'last');
  }

  function fromHash() {
    var m = location.hash.match(/^#\/([^/]+)(?:\/(\d+))?/);
    if (!m) return null;
    var id = decodeURIComponent(m[1]);
    var i = slides.findIndex(function (s) { return s.id === id; });
    if (i === -1 && /^\d+$/.test(id)) i = +id - 1;
    if (i < 0 || i >= slides.length) return null;
    return { i: i, k: m[2] ? +m[2] : 0 };
  }

  /* ---------- layout ---------- */

  function fit() {
    var viewport = document.querySelector('.viewport');
    var stage = document.querySelector('.stage');
    if (MODE === 'print' || !stage) return;
    var vw = viewport.clientWidth, vh = viewport.clientHeight;
    var s = Math.min(vw / W, vh / H);
    stage.style.transform = 'translate(' + (vw - W * s) / 2 + 'px,' + (vh - H * s) / 2 + 'px) scale(' + s + ')';
    document.documentElement.style.setProperty('--stage-scale', s);
  }

  /* ---------- heads-up display ---------- */

  function chapterOf(i) {
    for (var j = i; j >= 0; j--) if (slides[j].dataset.chapter) return slides[j].dataset.chapter;
    return '';
  }

  function updateHud() {
    var hud = document.querySelector('.hud');
    if (!hud) return;
    var slide = slides[index];
    var pos = (index + (slide._steps ? step / (slide._steps + 1) : 0) + 1) / slides.length;
    hud.querySelector('.hud-progress i').style.transform = 'scaleX(' + pos + ')';
    hud.querySelector('.hud-chapter').textContent = chapterOf(index);
    hud.querySelector('.hud-page').textContent = (index + 1) + ' / ' + slides.length;
  }

  /* ---------- overlays ---------- */

  function toggleOverlay(name, force) {
    var on = document.body.classList.toggle(name, force);
    return on;
  }

  function toggleOverview(force) {
    overview = force === undefined ? !overview : force;
    document.body.classList.toggle('overview', overview);
    var cols = 6, gap = 24, margin = 48;
    var tw = (W - margin * 2 - gap * (cols - 1)) / cols;
    var k = tw / W;
    var th = H * k;
    slides.forEach(function (s, j) {
      if (overview) {
        var row = Math.floor(j / cols), col = j % cols;
        s.style.transform = 'translate(' + (margin + col * (tw + gap)) + 'px,' + (margin + row * (th + gap)) + 'px) scale(' + k + ')';
        applyStep(s, s._steps, {});
      } else {
        s.style.transform = '';
        if (j !== index) applyStep(s, 0, {});
      }
    });
    var stage = document.querySelector('.stage');
    if (overview) {
      var rows = Math.ceil(slides.length / cols);
      stage.style.height = (margin * 2 + rows * (th + gap)) + 'px';
      slides[index].scrollIntoView && slides[index].scrollIntoView({ block: 'center' });
    } else {
      stage.style.height = '';
      go(index, step, { force: true });
    }
  }

  /* ---------- speaker window ---------- */

  function openSpeaker() {
    var url = location.href.split('#')[0].split('?')[0] + '?speaker' + location.hash;
    speakerWin = window.open(url, 'deck-speaker', 'popup,width=1440,height=900');
    setTimeout(sendState, 800);
  }

  function sendState() {
    if (speakerWin && !speakerWin.closed) {
      speakerWin.postMessage({ deck: 'state', index: index, step: step }, '*');
    }
  }

  /* ---------- keyboard and pointer ---------- */

  var digits = '';
  var digitsTimer = null;

  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var key = e.key;
    if (/^[0-9]$/.test(key)) {
      digits += key;
      clearTimeout(digitsTimer);
      digitsTimer = setTimeout(function () { digits = ''; }, 2000);
      return;
    }
    if (key === 'Enter' && digits) {
      go(+digits - 1, 0);
      digits = '';
      e.preventDefault();
      return;
    }
    switch (key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': case 'n': case 'j':
        if (overview) { toggleOverview(false); }
        command('next'); e.preventDefault(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': case 'p': case 'k':
        command('prev'); e.preventDefault(); break;
      case 'Home': command('first'); e.preventDefault(); break;
      case 'End': command('last'); e.preventDefault(); break;
      case 'o': case 'O': if (MODE === 'deck') toggleOverview(); break;
      case 'Escape': if (overview) toggleOverview(false); toggleOverlay('show-help', false); break;
      case 's': case 'S': if (MODE === 'deck') openSpeaker(); break;
      case 'f': case 'F':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
        break;
      case 'b': case 'B': case '.': command('blackout'); break;
      case 'w': case 'W': command('whiteout'); break;
      case 't': case 'T': command('theme'); break;
      case 'l': case 'L': command('laser'); break;
      case '?': toggleOverlay('show-help'); break;
      default: return;
    }
  }

  function command(cmd, arg) {
    if (MODE === 'speaker') {
      if (window.opener) window.opener.postMessage({ deck: 'cmd', cmd: cmd, arg: arg }, '*');
      return;
    }
    if (cmd === 'next') next();
    else if (cmd === 'prev') prev();
    else if (cmd === 'first') go(0, 0);
    else if (cmd === 'last') go(slides.length - 1, 'last');
    else if (cmd === 'goto') go(arg.index, arg.step);
    else if (cmd === 'blackout' || cmd === 'whiteout' || cmd === 'laser') toggleOverlay(cmd);
    else if (cmd === 'theme') toggleTheme();
  }

  function toggleTheme(theme) {
    var html = document.documentElement;
    var nextTheme = theme || (html.dataset.theme === 'light' ? 'dark' : 'light');
    html.dataset.theme = nextTheme;
    store('deck-theme', nextTheme);
  }

  function setupPointer() {
    var hideTimer = null;
    var laser = document.querySelector('.laser-dot');
    document.addEventListener('mousemove', function (e) {
      document.body.classList.remove('cursor-hidden');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { document.body.classList.add('cursor-hidden'); }, 2500);
      if (laser) laser.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    });
    var x0 = null;
    document.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) command(dx < 0 ? 'next' : 'prev');
      x0 = null;
    });
    document.querySelector('.stage').addEventListener('click', function (e) {
      if (!overview) return;
      var s = e.target.closest('.slide');
      if (!s) return;
      var j = slides.indexOf(s);
      toggleOverview(false);
      go(j, 0, { force: true });
    });
  }

  /* ---------- presenter window ---------- */

  function buildSpeaker() {
    document.body.classList.add('speaker-mode');
    var base = location.href.split('#')[0].split('?')[0];
    var ui = document.createElement('div');
    ui.className = 'speaker';
    ui.innerHTML =
      '<div class="sp-current"><iframe title="Current slide"></iframe></div>' +
      '<div class="sp-side">' +
      '  <div class="sp-next"><div class="sp-label">Next</div><iframe title="Next step"></iframe></div>' +
      '  <div class="sp-clock"><div><span class="sp-label">Elapsed</span><b class="sp-elapsed">0:00</b></div>' +
      '    <div><span class="sp-label">Plan</span><b class="sp-plan">0:00</b></div>' +
      '    <div><span class="sp-label">Time</span><b class="sp-time"></b></div>' +
      '    <button class="sp-reset" title="Reset the timer">Reset</button></div>' +
      '</div>' +
      '<div class="sp-notes"><div class="sp-meta"><span class="sp-who"></span><span class="sp-title"></span><span class="sp-pos"></span></div><div class="sp-text"></div></div>';
    document.body.appendChild(ui);
    var frames = ui.querySelectorAll('iframe');
    frames[0].src = base + '?embed';
    frames[1].src = base + '?embed';
    var started = null;
    var state = { index: 0, step: 0 };

    function planUntil(i) {
      var total = 0;
      for (var j = 0; j < i; j++) total += seconds(slides[j].dataset.time);
      return total;
    }
    function seconds(t) {
      if (!t) return 0;
      var p = t.split(':').map(Number);
      return p.length === 2 ? p[0] * 60 + p[1] : p[0];
    }
    function mmss(s) {
      s = Math.max(0, Math.round(s));
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    function render() {
      var s = slides[state.index];
      frames[0].contentWindow && frames[0].contentWindow.postMessage({ deck: 'goto', index: state.index, step: state.step }, '*');
      var ni = state.index, nk = state.step + 1;
      if (nk > s._steps) { ni = Math.min(slides.length - 1, state.index + 1); nk = 0; }
      frames[1].contentWindow && frames[1].contentWindow.postMessage({ deck: 'goto', index: ni, step: nk }, '*');
      var notes = s.querySelector('aside.notes');
      ui.querySelector('.sp-text').innerHTML = notes ? notes.innerHTML : '<p class="sp-empty">No notes.</p>';
      ui.querySelector('.sp-who').textContent = s.dataset.who || '';
      ui.querySelector('.sp-title').textContent = s.dataset.title || s.id;
      ui.querySelector('.sp-pos').textContent = (state.index + 1) + ' / ' + slides.length + (s._steps ? '  ·  step ' + state.step + ' / ' + s._steps : '');
      ui.querySelector('.sp-plan').textContent = mmss(planUntil(state.index)) + ' → ' + mmss(planUntil(state.index + 1));
    }
    function tick() {
      var now = new Date();
      ui.querySelector('.sp-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (started) {
        var el = (Date.now() - started) / 1000;
        var elapsed = ui.querySelector('.sp-elapsed');
        elapsed.textContent = mmss(el);
        var planEnd = planUntil(state.index + 1);
        elapsed.classList.toggle('late', el > planEnd + 15);
      }
    }
    setInterval(tick, 500);
    tick();
    ui.querySelector('.sp-reset').addEventListener('click', function () { started = Date.now(); tick(); });
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.deck === 'state') {
        if (!started && (d.index !== state.index || d.step !== state.step)) started = Date.now();
        state = { index: d.index, step: d.step };
        render();
      }
      if (d.deck === 'ready') render();
    });
    frames.forEach(function (f) { f.addEventListener('load', function () { setTimeout(render, 100); }); });
    function hello() {
      try { if (window.opener && !window.opener.closed) window.opener.postMessage({ deck: 'hello' }, '*'); } catch (e) { /* ignore */ }
    }
    hello();
    setInterval(hello, 3000);
    var h = fromHash();
    if (h) state = { index: h.i, step: h.k };
    render();
  }

  /* ---------- print ---------- */

  function buildPrint() {
    document.documentElement.classList.add('print-mode');
    document.body.classList.add('print-mode');
    var stage = document.querySelector('.stage');
    var pages = [];
    slides.slice().forEach(function (s) {
      var list = s.dataset.printSteps ? nums(s.dataset.printSteps) : [s._steps];
      list.forEach(function (k, n) {
        var page = n === list.length - 1 ? s : s.cloneNode(true);
        if (page !== s) {
          page.removeAttribute('id');
          page.dataset.printClone = s.id;
          page._steps = s._steps;
          stage.insertBefore(page, s);
        }
        page.classList.add('is-current');
        pages.push({ page: page, k: k, id: s.id });
      });
    });
    pages.forEach(function (p) {
      var ctrlId = p.id;
      var saved = p.page.id;
      p.page.id = ctrlId; // controllers look up by id; restore afterwards
      applyStep(p.page, p.k, {});
      if (!saved) p.page.removeAttribute('id');
    });
    document.body.dataset.printReady = '1';
  }

  /* ---------- init ---------- */

  function init() {
    var stage = document.querySelector('.stage');
    slides = Array.prototype.slice.call(stage.querySelectorAll(':scope > .slide'));
    slides.forEach(function (s, j) {
      if (!s.id) s.id = 'slide-' + (j + 1);
      s._steps = stepsOf(s);
      s.classList.add('is-future');
    });
    var theme = params.get('theme') || store('deck-theme');
    if (theme) document.documentElement.dataset.theme = theme;
    document.body.classList.add('mode-' + MODE);

    if (MODE === 'print') { buildPrint(); return; }
    if (MODE === 'speaker') {
      buildSpeaker();
      document.addEventListener('keydown', onKey);
      return;
    }

    fit();
    window.addEventListener('resize', fit);
    var h = fromHash() || { i: 0, k: 0 };
    index = h.i;
    go(h.i, h.k, { force: true });

    if (MODE === 'embed') {
      document.body.classList.add('hud-off');
      window.addEventListener('message', function (e) {
        var d = e.data || {};
        if (d.deck === 'goto') {
          var sameSlide = d.index === index;
          go(d.index, d.step, { force: !sameSlide, animate: sameSlide });
        }
      });
      if (window.parent !== window) window.parent.postMessage({ deck: 'ready' }, '*');
      return;
    }

    document.addEventListener('keydown', onKey);
    setupPointer();
    window.addEventListener('hashchange', function () {
      var h2 = fromHash();
      if (h2 && (h2.i !== index || h2.k !== step)) go(h2.i, h2.k);
    });
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.deck === 'cmd') command(d.cmd, d.arg);
      if (d.deck === 'hello') { speakerWin = e.source; sendState(); }
    });
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init);
})();

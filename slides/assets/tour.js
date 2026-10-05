/*
 * tour.js: the opening tour of JupyterLab 4.6 on slide #tour.
 *
 * Step 0 and the last step show the title with the JupyterLab window on the
 * right. Steps in between zoom a "camera" onto one feature at a time, dim the
 * rest with a spotlight and explain it in a bubble styled like jupyterlab-tour.
 *
 * render() is a pure function of the step: it can jump to any step. When the
 * deck moves forward by one step, a short scripted sequence (cursor, typing)
 * plays from the previous state to the final state of the step.
 */
(function () {
  'use strict';

  var STAGE_W = 1920;
  var STAGE_H = 1080;
  var MOCK_W = 1440;
  var MOCK_H = 810;
  var BASE = STAGE_W / MOCK_W;

  var BUBBLES = {
    welcome: {
      title: 'Welcome to JupyterLab 4.6',
      body: 'A short tour of new features, starting with UI customization.',
      next: 'Start the tour'
    },
    activity: {
      title: 'Put the activity bar on any side',
      body: 'Left, right, top or bottom: <b>Settings › Interface › Activity Bar Position</b>.'
    },
    move: {
      title: 'Move sidebar panels to the main area',
      body: 'Right-click a panel and choose <b>Move to Main Area</b>. It opens as a tab, like a document. Drag the tab to see two panels side by side.'
    },
    jump: {
      title: 'Go back to the cell you last edited',
      body: 'Two new buttons in the Table of Contents move back and forward through the cells you edited.'
    },
    counter: {
      title: 'See which cell is active',
      body: 'The status bar shows the active cell and the number of cells.'
    },
    crumbs: {
      title: 'Type a path, press Tab',
      body: 'Click the breadcrumbs to edit the path. Tab completes folder names.'
    },
    created: {
      title: 'New column: Date Created',
      body: 'Turn it on from the column header menu or in the file browser settings.'
    },
    debug: {
      title: 'Debugger buttons next to your code',
      body: 'A small panel with Continue, Step and Stop floats over the notebook. Sources now open in the main area.'
    },
    finish: {
      title: 'That was 7 of 68 new features',
      body: 'Next: the rest of the release, in numbers.',
      next: 'Finish'
    }
  };

  // Flags accumulate: step k has every flag introduced at steps <= k.
  var STEPS = [
    { name: 'title', title: true },
    { name: 'welcome', bubble: 'welcome' },
    { name: 'activity', flags: ['top'], target: '.jl-left .jl-tabs', frame: ['.jl-left .jl-tabs', '.jl-fb-toolbar', '.jl-crumbs'], place: 'right', zoom: 2.2 },
    { name: 'move', flags: ['toc-main', 'toc-split'], target: '.jl-rcol', frame: ['.jl-main', '.jl-left .jl-tabs'], place: 'left' },
    { name: 'jump', flags: ['jumped'], target: '.c5', frame: ['.jl-toc-tools', '.c1', '.c7'], place: 'left' },
    { name: 'counter', target: '.jl-sb-cell', frame: ['.jl-sb-right'], place: 'top', zoom: 1.75 },
    { name: 'crumbs', flags: ['in-exp'], target: '.jl-crumbs', frame: ['.jl-fb-toolbar', '.jl-crumbs', '.jl-listing'], place: 'right', zoom: 2.2 },
    { name: 'created', flags: ['created'], target: '.jl-listing', frame: ['.jl-fb-toolbar', '.jl-listing'], place: 'right', zoom: 2.0 },
    { name: 'debug', flags: ['debug'], target: '.jl-dbg-overlay', frame: ['.jl-nbtools'], place: 'right', zoom: 1.6 },
    { name: 'finish', bubble: 'finish' },
    { name: 'end', title: true }
  ];

  var ALL_FLAGS = ['top', 'toc-main', 'toc-split', 'jumped', 'in-exp', 'created', 'debug', 'editing'];
  var timers = [];

  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function flagsAt(k) {
    var f = {};
    for (var i = 0; i <= k; i++) (STEPS[i].flags || []).forEach(function (x) { f[x] = true; });
    return f;
  }

  function setFlags(jl, flags) {
    ALL_FLAGS.forEach(function (x) { jl.classList.toggle(x, !!flags[x]); });
    var tabbed = !!flags['toc-main'] && !flags['toc-split'];
    jl.querySelector('.jl-rcol .t-csv').classList.toggle('cur', !tabbed);
    jl.querySelector('.jl-rcol .t-toc1').classList.toggle('cur', tabbed);
    var jumped = !!flags.jumped;
    jl.querySelector('.c7').classList.toggle('active', !jumped);
    jl.querySelector('.c5').classList.toggle('active', jumped);
    jl.querySelector('.jl-sb-cell').textContent = jumped ? 'Cell 5/19' : 'Cell 7/19';
    jl.querySelector('.toc-hist').classList.toggle('cur', !jumped);
    jl.querySelector('.toc-plot').classList.toggle('cur', jumped);
    jl.querySelector('.jump-fwd').classList.toggle('disabled', !jumped);
    jl.querySelector('.c7 .prompt').textContent = flags.debug ? '[*]:' : '[3]:';
    jl.querySelector('.c7 .l2').classList.toggle('paused', !!flags.debug);
    setCrumbs(jl, flags.editing ? 'editing' : 'static', '');
  }

  function setCrumbs(jl, mode, typed) {
    var crumbs = jl.querySelector('.jl-crumbs');
    crumbs.classList.toggle('editing', mode === 'editing');
    jl.querySelector('.jl-crumbs-input .typed').textContent = 'metanalysis/' + (typed || '');
    jl.querySelector('.jl-complete').classList.toggle('on', mode === 'editing' && typed === 'ex');
  }

  /* Measure the final layout of a state in a hidden copy of the window, so
     CSS transitions in the visible one do not affect the numbers. */
  function measurer(slide, flags) {
    var jl = slide.querySelector('.jl');
    var copy = jl.cloneNode(true);
    copy.classList.add('jl-measure');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('[data-flip]').forEach(function (e) { e.removeAttribute('data-flip'); });
    setFlags(copy, flags);
    jl.parentNode.appendChild(copy);
    return {
      copy: copy,
      rect: function (sel) {
        var els = [].concat(sel).map(function (s) { return copy.querySelector(s); }).filter(Boolean);
        if (!els.length) return null;
        var r = null;
        els.forEach(function (el) {
          var q = window.Deck.layoutRect(el, copy);
          if (!r) r = { x: q.x, y: q.y, r: q.x + q.w, b: q.y + q.h };
          else r = { x: Math.min(r.x, q.x), y: Math.min(r.y, q.y), r: Math.max(r.r, q.x + q.w), b: Math.max(r.b, q.y + q.h) };
        });
        return { x: r.x, y: r.y, w: r.r - r.x, h: r.b - r.y };
      },
      done: function () { copy.remove(); }
    };
  }

  function cameraFor(frame, def) {
    if (!frame) return { s: BASE, x: 0, y: 0 };
    var pad = 22;
    var w = frame.w + pad * 2, h = frame.h + pad * 2;
    var s = Math.min(STAGE_W * 0.62 / w, STAGE_H * 0.78 / h);
    s = Math.max(BASE, Math.min(def.zoom || 2.4, s));
    var cx = frame.x + frame.w / 2, cy = frame.y + frame.h / 2;
    var fx = { right: 0.36, left: 0.64, top: 0.5, bottom: 0.5 }[def.place] * STAGE_W;
    var fy = { right: 0.5, left: 0.5, top: 0.6, bottom: 0.36 }[def.place] * STAGE_H;
    var x = fx - s * cx, y = fy - s * cy;
    x = Math.min(0, Math.max(STAGE_W - MOCK_W * s, x));
    y = Math.min(0, Math.max(STAGE_H - MOCK_H * s, y));
    return { s: s, x: x, y: y };
  }

  function toStage(cam, r, pad) {
    pad = pad || 0;
    return { x: cam.x + cam.s * r.x - pad, y: cam.y + cam.s * r.y - pad, w: cam.s * r.w + pad * 2, h: cam.s * r.h + pad * 2 };
  }

  function setCamera(slide, cam) {
    slide.querySelector('.tour-camera').style.transform =
      'translate(' + cam.x.toFixed(1) + 'px,' + cam.y.toFixed(1) + 'px) scale(' + cam.s.toFixed(4) + ')';
  }

  function setSpot(slide, r) {
    var spot = slide.querySelector('.tour-spot');
    if (!r) r = { x: STAGE_W / 2, y: STAGE_H / 2, w: 0, h: 0 };
    spot.style.left = r.x + 'px';
    spot.style.top = r.y + 'px';
    spot.style.width = r.w + 'px';
    spot.style.height = r.h + 'px';
    spot.classList.toggle('empty', !r.w);
  }

  function fillBubble(slide, key, k) {
    var b = BUBBLES[key];
    var el = slide.querySelector('.tour-bubble');
    el.querySelector('.tb-title').textContent = b.title;
    el.querySelector('.tb-body').innerHTML = b.body;
    el.querySelector('.tb-next').textContent = b.next || 'Next';
    el.querySelector('.tb-skip').style.display = b.skip ? '' : 'none';
    el.querySelector('.tb-back').style.display = k > 1 ? '' : 'none';
    el.querySelector('.tb-count').textContent = k > 1 ? (k - 1) + ' of ' + (STEPS.length - 3) : '';
    return el;
  }

  function placeBubble(slide, spot, place) {
    var el = slide.querySelector('.tour-bubble');
    var bw = el.offsetWidth, bh = el.offsetHeight, gap = 34, m = 40;
    var x, y, side = place;
    if (!spot) {
      x = (STAGE_W - bw) / 2;
      y = (STAGE_H - bh) / 2;
      side = 'center';
    } else {
      if (side === 'right' && spot.x + spot.w + gap + bw > STAGE_W - m) side = 'left';
      if (side === 'left' && spot.x - gap - bw < m) side = 'right';
      if (side === 'bottom' && spot.y + spot.h + gap + bh > STAGE_H - m) side = 'top';
      if (side === 'top' && spot.y - gap - bh < m) side = 'bottom';
      if (side === 'right') { x = spot.x + spot.w + gap; y = spot.y + spot.h / 2 - bh / 2; }
      if (side === 'left') { x = spot.x - gap - bw; y = spot.y + spot.h / 2 - bh / 2; }
      if (side === 'bottom') { x = spot.x + spot.w / 2 - bw / 2; y = spot.y + spot.h + gap; }
      if (side === 'top') { x = spot.x + spot.w / 2 - bw / 2; y = spot.y - gap - bh; }
      x = Math.max(m, Math.min(STAGE_W - m - bw, x));
      y = Math.max(m, Math.min(STAGE_H - m - bh, y));
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.dataset.side = side;
    var arrow = el.querySelector('.tb-arrow');
    if (spot && (side === 'left' || side === 'right')) {
      arrow.style.top = Math.max(24, Math.min(bh - 24, spot.y + spot.h / 2 - y)) + 'px';
      arrow.style.left = '';
    } else if (spot) {
      arrow.style.left = Math.max(24, Math.min(bw - 24, spot.x + spot.w / 2 - x)) + 'px';
      arrow.style.top = '';
    }
  }

  /* ---------- scripted moments ---------- */

  function cursorTo(slide, pt, ms, click) {
    var c = slide.querySelector('.tour-cursor');
    c.classList.add('on');
    c.style.transition = 'transform ' + ms + 'ms cubic-bezier(.3,.7,.2,1), opacity .3s';
    c.style.transform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
    if (click) {
      later(ms + 60, function () {
        c.classList.remove('click');
        void c.offsetWidth;
        c.classList.add('click');
      });
    }
  }

  function cursorHide(slide) {
    var c = slide.querySelector('.tour-cursor');
    c.classList.remove('on', 'click');
  }

  function keycap(slide, text, at) {
    var k = slide.querySelector('.tour-key');
    k.textContent = text;
    k.style.left = at.x + 'px';
    k.style.top = at.y + 'px';
    k.classList.remove('pop');
    void k.offsetWidth;
    k.classList.add('pop');
  }

  function centerOf(cam, r) {
    var s = toStage(cam, r);
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  }

  function play(slide, def, k, cam, m, finalFlags) {
    var jl = slide.querySelector('.jl');
    var prevFlags = flagsAt(k - 1);
    var CAM_MS = 1100;

    if (def.name === 'move') {
      setFlags(jl, prevFlags);
      var tab = m.rect('.jl-left .tab-toc');
      setSpot(slide, toStage(cam, tab, 10));
      var menu = jl.querySelector('.jl-menu-move');
      [menu, m.copy.querySelector('.jl-menu-move')].forEach(function (x) {
        x.style.left = (tab.x + tab.w - 4) + 'px';
        x.style.top = (tab.y + tab.h - 4) + 'px';
      });
      var menuArea = m.rect(['.jl-left .tab-toc', '.jl-menu-move', '.jl-menu-move .sub']);
      // the layout while the panel is a tab next to study.csv, before the split
      var tabbedFlags = Object.assign({}, prevFlags, { 'toc-main': true });
      var mid = measurer(slide, tabbedFlags);
      slide._measure2 = mid;
      var tocTab = mid.rect('.jl-rcol .t-toc1');
      var rcol = mid.rect('.jl-rcol');
      var drop = { x: rcol.x + rcol.w / 2, y: rcol.y + 28 + (rcol.h - 28) * 0.75, w: 0, h: 0 };
      var cursor = slide.querySelector('.tour-cursor');
      later(CAM_MS - 200, function () { cursorTo(slide, centerOf(cam, tab), 700, true); });
      later(CAM_MS + 700, function () { menu.classList.add('on'); setSpot(slide, toStage(cam, menuArea, 10)); });
      later(CAM_MS + 1300, function () { menu.querySelector('.sub-trigger').classList.add('sel'); menu.querySelector('.sub').classList.add('on'); });
      later(CAM_MS + 1900, function () { menu.querySelector('.sub .main-area').classList.add('sel'); });
      later(CAM_MS + 2500, function () {
        menu.classList.remove('on');
        menu.querySelector('.sub').classList.remove('on');
        menu.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); });
        setFlags(jl, tabbedFlags);
        setSpot(slide, toStage(cam, rcol, 10));
      });
      later(CAM_MS + 3000, function () { cursorTo(slide, centerOf(cam, tocTab), 650, false); });
      later(CAM_MS + 3800, function () {
        cursor.classList.add('dragging');
        cursorTo(slide, centerOf(cam, drop), 900, false);
      });
      later(CAM_MS + 4100, function () { jl.querySelector('.jl-dropzone').classList.add('on'); });
      later(CAM_MS + 4900, function () {
        jl.querySelector('.jl-dropzone').classList.remove('on');
        cursor.classList.remove('dragging');
        setFlags(jl, finalFlags);
        setSpot(slide, toStage(cam, m.rect(def.target), 10));
      });
      later(CAM_MS + 5200, function () {
        cursorHide(slide);
        showBubble(slide, def, cam, m, 300, true);
      });
      return 'deferred';
    }

    if (def.name === 'jump') {
      setFlags(jl, prevFlags);
      var btn = m.rect('.jump-back');
      setSpot(slide, toStage(cam, btn, 12));
      later(CAM_MS - 300, function () { cursorTo(slide, centerOf(cam, btn), 800, true); });
      later(CAM_MS + 700, function () {
        jl.querySelector('.jump-back').classList.add('pressed');
        setFlags(jl, finalFlags);
        var c5 = jl.querySelector('.c5');
        c5.classList.remove('jl-flash');
        void c5.offsetWidth;
        c5.classList.add('jl-flash');
        var cell = jl.querySelector('.jl-sb-cell');
        cell.classList.remove('bump');
        void cell.offsetWidth;
        cell.classList.add('bump');
      });
      later(CAM_MS + 1100, function () {
        jl.querySelector('.jump-back').classList.remove('pressed');
        cursorHide(slide);
        setSpot(slide, toStage(cam, m.rect(def.target), 8));
        showBubble(slide, def, cam, m, 800, true);
      });
      return 'deferred';
    }

    if (def.name === 'counter') {
      later(CAM_MS, function () {
        var cell = jl.querySelector('.jl-sb-cell');
        cell.classList.remove('bump');
        void cell.offsetWidth;
        cell.classList.add('bump');
      });
      return 'now';
    }

    if (def.name === 'crumbs') {
      setFlags(jl, prevFlags);
      var crumbs = m.rect('.jl-crumbs');
      var crumbsStage = toStage(cam, crumbs, 10);
      setSpot(slide, crumbsStage);
      var withList = toStage(cam, { x: crumbs.x, y: crumbs.y, w: crumbs.w, h: crumbs.h + 34 }, 10);
      var keyAt = { x: crumbsStage.x + crumbsStage.w * 0.55, y: crumbsStage.y + crumbsStage.h + 26 };
      later(CAM_MS - 300, function () { cursorTo(slide, { x: crumbsStage.x + crumbsStage.w * 0.75, y: crumbsStage.y + crumbsStage.h / 2 }, 700, true); });
      later(CAM_MS + 500, function () { cursorHide(slide); setCrumbs(jl, 'editing', ''); setSpot(slide, withList); });
      later(CAM_MS + 1000, function () { setCrumbs(jl, 'editing', 'e'); });
      later(CAM_MS + 1180, function () { setCrumbs(jl, 'editing', 'ex'); });
      later(CAM_MS + 2300, function () { keycap(slide, 'Tab', { x: keyAt.x, y: keyAt.y + 40 }); setCrumbs(jl, 'editing', 'experiments/'); });
      later(CAM_MS + 3200, function () { keycap(slide, 'Enter', { x: keyAt.x, y: keyAt.y + 40 }); });
      later(CAM_MS + 3400, function () {
        setFlags(jl, finalFlags);
        setSpot(slide, crumbsStage);
        showBubble(slide, def, cam, m, 600, true);
      });
      return 'deferred';
    }

    return 'now';
  }

  function showBubble(slide, def, cam, m, delay, animate) {
    var bubble = slide.querySelector('.tour-bubble');
    var spot = def.target ? toStage(cam, m.rect(def.target), 10) : null;
    var k = STEPS.indexOf(def);
    function show() {
      fillBubble(slide, def.bubble || def.name, k);
      placeBubble(slide, spot, def.place);
      void bubble.offsetWidth;
      bubble.classList.add('on');
    }
    if (animate) later(delay || 0, show);
    else show();
  }

  /* ---------- render ---------- */

  function render(slide, k, opts) {
    clearTimers();
    if (slide._measure) { slide._measure.done(); slide._measure = null; }
    if (slide._measure2) { slide._measure2.done(); slide._measure2 = null; }
    var def = STEPS[k];
    var jl = slide.querySelector('.jl');
    var animate = opts && opts.animate && opts.dir > 0;
    var flags = flagsAt(k);

    slide.classList.toggle('title-on', !!def.title);
    slide.classList.toggle('tour-on', !def.title);
    slide.classList.toggle('instant', !animate);
    if (!animate) void slide.offsetWidth;

    var bubble = slide.querySelector('.tour-bubble');
    bubble.classList.remove('on');
    bubble.style.transitionDelay = '0ms';
    cursorHide(slide);
    slide.querySelector('.tour-cursor').classList.remove('dragging');
    jl.querySelector('.jl-dropzone').classList.remove('on');
    jl.querySelectorAll('.jl-menu').forEach(function (x) { x.classList.remove('on'); });
    jl.querySelectorAll('.jl-menu .on, .jl-menu .sel').forEach(function (x) { x.classList.remove('on', 'sel'); });

    var m = measurer(slide, flags);
    try {
      var cam = def.frame ? cameraFor(m.rect(def.frame), def) : { s: BASE, x: 0, y: 0 };
      setCamera(slide, cam);

      if (def.title) {
        setFlags(jl, flags);
        setSpot(slide, null);
        return;
      }

      var mode = animate ? play(slide, def, k, cam, m, flags) : 'now';
      if (mode === 'now') {
        setFlags(jl, flags);
        setSpot(slide, def.target ? toStage(cam, m.rect(def.target), 10) : null);
        showBubble(slide, def, cam, m, 1000, animate);
      }
    } finally {
      if (!animate) {
        void slide.offsetWidth;
        slide.classList.remove('instant');
      }
      slide._measure = m;
    }
  }

  window.Deck.register('tour', {
    steps: STEPS.length - 1,
    render: render,
    leave: function (slide) {
      clearTimers();
      if (slide._measure) { slide._measure.done(); slide._measure = null; }
      if (slide._measure2) { slide._measure2.done(); slide._measure2 = null; }
    }
  });
})();

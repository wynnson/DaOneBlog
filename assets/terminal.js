// Da One Blog — CRT monitor behaviour.
// All content is plain HTML; this only adds the standby/boot animation,
// the power button, and keyboard navigation.
(function () {
  var screen = document.querySelector('.crt-screen');
  if (!screen) return;

  var standby = screen.querySelector('.crt-standby');
  var powerBtn = document.querySelector('.crt-power');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POWER_ON_MS = reduced ? 0 : 600;

  var booted = false;
  try { booted = sessionStorage.getItem('daone-booted') === '1'; } catch (e) {}
  var markBooted = function () {
    try { sessionStorage.setItem('daone-booted', '1'); } catch (e) {}
  };

  var isOn = function () {
    return !screen.classList.contains('standby') && !screen.classList.contains('powered-off');
  };

  // ---- CRT power-on effect ----
  var powerOn = function (then) {
    screen.classList.remove('standby', 'powered-off');
    screen.classList.add('powering-on');
    setTimeout(function () {
      screen.classList.remove('powering-on');
      if (then) then();
    }, POWER_ON_MS);
  };

  // ---- Boot sequence: reveal lines one by one; any key or click skips ----
  var lines = Array.prototype.slice.call(screen.querySelectorAll('[data-boot], .toc-list li'));
  var bootTimer = null;

  var finishBoot = function () {
    clearTimeout(bootTimer);
    lines.forEach(function (el) { el.classList.add('shown'); });
    screen.classList.remove('booting');
    window.removeEventListener('keydown', finishBoot, true);
    window.removeEventListener('pointerdown', finishBoot, true);
  };

  var runBoot = function () {
    if (reduced || !lines.length) return finishBoot();
    var i = 0;
    var step = function () {
      if (i >= lines.length) return finishBoot();
      var el = lines[i++];
      el.classList.add('shown');
      bootTimer = setTimeout(step, el.hasAttribute('data-pause') ? 150 : (el.tagName === 'LI' ? 12 : 35));
    };
    window.addEventListener('keydown', finishBoot, true);
    window.addEventListener('pointerdown', finishBoot, true);
    bootTimer = setTimeout(step, 80);
  };

  if (!booted) {
    screen.classList.add('booting');
    if (standby) {
      // Landing page: monitor waits in standby until the visitor clicks / presses a key.
      screen.classList.add('standby');
      var wake = function (e) {
        if (e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey)) return;
        e.preventDefault();
        e.stopPropagation();
        window.removeEventListener('pointerdown', wake, true);
        window.removeEventListener('keydown', wake, true);
        markBooted();
        powerOn(runBoot);
      };
      window.addEventListener('pointerdown', wake, true);
      window.addEventListener('keydown', wake, true);
    } else {
      markBooted();
      runBoot();
    }
  }

  // ---- Power button: switch the screen off and on ----
  if (powerBtn) {
    powerBtn.addEventListener('click', function () {
      if (screen.classList.contains('standby')) return; // the wake handler covers this
      if (screen.classList.contains('powered-off')) {
        powerOn();
      } else {
        screen.classList.add('powered-off');
      }
    });
  }

  // ---- Keyboard navigation: ↑/↓ (or j/k) to move, Enter to open, Esc to go back ----
  var items = Array.prototype.slice.call(screen.querySelectorAll('.toc-list li, .nav-item'));
  var back = screen.querySelector('[data-back]');
  var sel = -1;

  var linkOf = function (el) { return el.tagName === 'A' ? el : el.querySelector('a'); };

  var select = function (n) {
    if (!items.length) return;
    if (sel >= 0) items[sel].classList.remove('selected');
    sel = (n + items.length) % items.length;
    items[sel].classList.add('selected');
    items[sel].scrollIntoView({ block: 'nearest' });
  };

  items.forEach(function (el, n) {
    el.addEventListener('mouseenter', function () {
      if (sel >= 0) items[sel].classList.remove('selected');
      sel = n;
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !isOn()) return;
    if (e.key === 'Escape' && back) { e.preventDefault(); window.location.href = back.href; return; }
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(sel < 0 ? items.length - 1 : sel - 1); }
    else if (e.key === 'Enter' && sel >= 0) {
      var a = linkOf(items[sel]);
      if (a) { e.preventDefault(); window.location.href = a.href; }
    }
  });
})();

/* Phone tilt: on touch phones, tilting the device plays the role the mouse plays on desktop for the 3D effects
   (the story dots, the Housing Tool cards, the publication book).
   window.ULTilt = { x, y, active, on(fn) }   x, y in -1..1 (x > 0 = tilted right, y > 0 = top tilted toward the viewer),
   eased; fn(x, y) is called every frame while it moves. <html> gets class "ul-tilt" and --tilt-x / --tilt-y once tilt is live.
   Only on coarse-pointer devices without hover, over HTTPS (browsers hide the sensors on plain http), and not with reduced motion.
   iPhone/iPad need a tap to grant access (DeviceOrientationEvent.requestPermission): a small "Tilt to explore" button asks once;
   the answer is remembered. Android grants it without asking. The neutral position is however the person holds the phone,
   and it slowly re-centres when they settle into a new one. */
(() => {
  'use strict';
  const T = window.ULTilt = {x: 0, y: 0, active: false, subs: [], on(fn) { this.subs.push(fn); }};
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!touch || matchMedia('(prefers-reduced-motion: reduce)').matches || !window.isSecureContext || !('DeviceOrientationEvent' in window)) return;
  const targets = () => document.querySelector('#story-canvas, .ul-tool, .pbook');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RANGE = 18;                                    // degrees of tilt for a full -1..1 swing
  const KEY = 'ul-tilt';
  const store = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const stored = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

  let base = null, angle = null, tx = 0, ty = 0, raf = 0;
  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;     // no sensor
    const a = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) % 360;
    const b = e.beta, g = e.gamma;
    let dx, dy;                                        // tilt in screen axes, whatever way the phone is turned
    if (a === 90) { dx = b; dy = -g; } else if (a === 270 || a === -90) { dx = -b; dy = g; } else if (a === 180) { dx = -g; dy = -b; } else { dx = g; dy = b; }
    if (!base || a !== angle) { base = {x: dx, y: dy}; angle = a; }
    base.x += (dx - base.x) * .004; base.y += (dy - base.y) * .004;     // drift back to the current grip over a few seconds
    tx = clamp((dx - base.x) / RANGE, -1, 1); ty = clamp((dy - base.y) / RANGE, -1, 1);
    if (!T.active) { T.active = true; document.documentElement.classList.add('ul-tilt'); }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    raf = 0;
    T.x += (tx - T.x) * .15; T.y += (ty - T.y) * .15;
    const r = document.documentElement.style;
    r.setProperty('--tilt-x', T.x.toFixed(3)); r.setProperty('--tilt-y', T.y.toFixed(3));
    T.subs.forEach(fn => fn(T.x, T.y));
    if (Math.abs(tx - T.x) > .002 || Math.abs(ty - T.y) > .002) raf = requestAnimationFrame(tick);
  }
  const listen = () => addEventListener('deviceorientation', onOrientation);

  const ask = DeviceOrientationEvent.requestPermission;
  if (typeof ask !== 'function') { listen(); return; }   // Android and others: no prompt needed

  // iOS: permission can only be requested from a tap.
  const request = () => ask.call(DeviceOrientationEvent).then(r => { store(r); if (r === 'granted') listen(); return r; }).catch(() => 'denied');
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  ready(() => {
    if (!targets()) return;
    const s = stored();
    if (s === 'denied' || s === 'dismissed') return;
    if (s === 'granted') {                               // granted before: renew silently on the first tap anywhere (no prompt is shown)
      addEventListener('touchend', () => request(), {once: true, passive: true});
      return;
    }
    const btn = document.createElement('div');
    btn.className = 'ul-tilt-ask';
    btn.innerHTML = '<button type="button" class="ul-tilt-go"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/>' +
      '<path d="M3.5 8.5c-1.3 2.2-1.3 4.8 0 7M20.5 8.5c1.3 2.2 1.3 4.8 0 7"/></svg>Tilt to explore</button>' +
      '<button type="button" class="ul-tilt-x" aria-label="No thanks">×</button>';
    document.body.appendChild(btn);
    requestAnimationFrame(() => btn.classList.add('is-in'));
    const close = () => { btn.classList.remove('is-in'); setTimeout(() => btn.remove(), 300); };
    btn.querySelector('.ul-tilt-go').addEventListener('click', () => { request().then(close); });
    btn.querySelector('.ul-tilt-x').addEventListener('click', () => { store('dismissed'); close(); });
  });
})();

/* ==========================================================================
   ALIF MANIFESTO — Civic Whimsy, Share Manifesto, Micro-SFX & Easter Egg
   ========================================================================== */

import './whimsy.css';
import { ManifestoAudio } from './audio.js';

const CONFETTI_COLORS = ['#0047AB', '#D92332', '#0E7C59', '#FFB259', '#FCF9F3'];
const CONFETTI_COUNT = 28;
const SHARE_TEXT = 'Alif Najmi · 10-Year Civic Manifesto (2026–2036): A Country Built for People, Not Just Highways';
const HONK_MESSAGE = 'Honk! Bus 750 is still stuck';
const IGNORED_HONK_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

let initialized = false;

export function initWhimsy() {
  if (initialized) return;
  initialized = true;

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reducedQuery.matches;

  // ── 1. Witness Pledge Celebration (LRT Chime + RapidKL Palette Confetti) ──
  const pledgeBtn = document.getElementById('pledge-btn');

  function spawnPledgeConfetti(originEl) {
    if (prefersReducedMotion() || !originEl) return;
    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const burst = document.createElement('div');
    burst.className = 'whimsy-confetti-burst';
    burst.setAttribute('aria-hidden', 'true');

    const frag = document.createDocumentFragment();
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const piece = document.createElement('span');
      const isDot = i % 4 === 0;
      piece.className = isDot
        ? 'whimsy-confetti-piece whimsy-confetti-piece--dot'
        : 'whimsy-confetti-piece';

      const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (Math.random() - 0.5) * 0.28;
      const dist = 54 + Math.random() * 96;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - (26 + Math.random() * 34);
      const rot = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 180);
      const delay = Math.round(Math.random() * 85);
      const dur = Math.round(820 + Math.random() * 240);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

      piece.style.setProperty('--x', `${cx.toFixed(1)}px`);
      piece.style.setProperty('--y', `${cy.toFixed(1)}px`);
      piece.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      piece.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      piece.style.setProperty('--rot', `${rot.toFixed(0)}deg`);
      piece.style.setProperty('--delay', `${delay}ms`);
      piece.style.setProperty('--dur', `${dur}ms`);
      piece.style.setProperty('--color', color);

      frag.appendChild(piece);
    }

    burst.appendChild(frag);
    document.body.appendChild(burst);

    window.setTimeout(() => {
      burst.remove();
    }, 1150);
  }

  if (pledgeBtn) {
    pledgeBtn.addEventListener('click', () => {
      if (!pledgeBtn.classList.contains('is-stamped')) return;
      ManifestoAudio.playChime('pledge');
      spawnPledgeConfetti(pledgeBtn);
    });
  }

  // ── 2. Share Manifesto (#share-btn + #share-toast) ────────────────────────
  const shareBtn = document.getElementById('share-btn');
  const shareToast = document.getElementById('share-toast');
  let toastTimer = null;
  let toastHideTimer = null;

  function showShareToast(message) {
    if (!shareToast) return;
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastHideTimer);
    toastTimer = null;
    toastHideTimer = null;

    shareToast.textContent = message;
    shareToast.hidden = false;
    void shareToast.offsetWidth;
    shareToast.classList.add('is-visible');

    toastTimer = window.setTimeout(() => {
      toastTimer = null;
      shareToast.classList.remove('is-visible');
      const hideDelay = prefersReducedMotion() ? 0 : 260;
      toastHideTimer = window.setTimeout(() => {
        toastHideTimer = null;
        if (!shareToast.classList.contains('is-visible')) {
          shareToast.hidden = true;
        }
      }, hideDelay);
    }, 3200);
  }

  function copyWithTextareaFallback(text, returnFocusEl) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    area.style.left = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    let ok = false;
    try {
      area.select();
      area.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    } finally {
      area.remove();
      if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
        returnFocusEl.focus({ preventScroll: true });
      }
    }
    return ok;
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = window.location.origin + window.location.pathname;

      const isMobileShareContext = Boolean(
        (navigator.userAgentData && navigator.userAgentData.mobile) ||
        window.matchMedia('(pointer: coarse)').matches
      );

      if (typeof navigator.share === 'function' && isMobileShareContext) {
        try {
          await navigator.share({
            title: document.title,
            text: SHARE_TEXT,
            url
          });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
          // Non-abort error: fall through cleanly to clipboard copy
        }
      }

      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(url);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (!copied) {
        copied = copyWithTextareaFallback(url, shareBtn);
      }

      showShareToast(
        copied
          ? 'Link copied — share the 2036 vision'
          : 'Copy the URL from your browser to share the 2036 vision'
      );
    });
  }

  // ── 3. Micro-SFX 'tick' Wiring on Interactive Transit Controls ────────────
  const yearHud = document.getElementById('year-hud');
  const deckPrev = document.getElementById('deck-prev');
  const deckNext = document.getElementById('deck-next');
  const deckDots = document.getElementById('deck-dots');

  const playTick = () => ManifestoAudio.playChime('tick');

  if (yearHud) yearHud.addEventListener('click', playTick);
  document.querySelectorAll('.view-pill').forEach((btn) => {
    btn.addEventListener('click', playTick);
  });
  if (deckPrev) deckPrev.addEventListener('click', playTick);
  if (deckNext) deckNext.addEventListener('click', playTick);
  if (deckDots) {
    deckDots.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('.deck-dot')) {
        playTick();
      }
    });
  }

  // ── 4. Jam Horn Easter Egg ('H' key during opening 2026 gridlock) ─────────
  const stageEl = document.getElementById('year-hud-stage');
  let honkTimer = null;
  let savedStageText = '';

  document.addEventListener('keydown', (e) => {
    if ((e.key !== 'h' && e.key !== 'H') || e.ctrlKey || e.altKey || e.metaKey || e.repeat) {
      return;
    }

    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      (IGNORED_HONK_TAGS.has(active.tagName) || active.isContentEditable)
    ) {
      return;
    }

    if (document.body.classList.contains('is-gated')) return;

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = scrollTop / maxScroll;
    if (progress >= 0.30) return;

    ManifestoAudio.playHorn();

    if (honkTimer !== null) {
      window.clearTimeout(honkTimer);
      honkTimer = null;
    } else if (stageEl) {
      savedStageText = stageEl.dataset.realStage || stageEl.textContent || '';
    }

    if (stageEl) {
      stageEl.dataset.honkActive = '1';
      stageEl.textContent = HONK_MESSAGE;
    }

    if (yearHud && !prefersReducedMotion()) {
      yearHud.classList.remove('is-honking');
      void yearHud.offsetWidth;
      yearHud.classList.add('is-honking');
    }

    honkTimer = window.setTimeout(() => {
      honkTimer = null;
      if (yearHud) yearHud.classList.remove('is-honking');
      if (stageEl) {
        delete stageEl.dataset.honkActive;
        stageEl.textContent = stageEl.dataset.realStage || savedStageText;
      }
      savedStageText = '';
    }, 1600);
  });
}

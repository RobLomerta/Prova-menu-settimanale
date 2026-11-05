// Finestre di conferma dentro la pagina (su claude.ai le finestre del browser non sono disponibili).
import { esc } from './util.js';

function open(html) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  return back;
}

/** Chiede conferma; risolve true/false. */
export function askConfirm(message, { ok = 'Conferma', cancel = 'Annulla', danger = false } = {}) {
  return new Promise((resolve) => {
    const back = open(`
      <p>${esc(message)}</p>
      <div class="modal-actions">
        <button class="btn" data-modal="no">${esc(cancel)}</button>
        <button class="btn primary ${danger ? 'danger' : ''}" data-modal="yes">${esc(ok)}</button>
      </div>`);
    const done = (v) => {
      back.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => e.key === 'Escape' && done(false);
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', (e) => {
      if (e.target === back) return done(false);
      const b = e.target.closest('[data-modal]');
      if (b) done(b.dataset.modal === 'yes');
    });
    back.querySelector('[data-modal="yes"]').focus();
  });
}

/** Mostra un testo già selezionato da copiare a mano (quando gli appunti non sono disponibili). */
export function showCopyText(title, text) {
  const back = open(`
    <p><strong>${esc(title)}</strong><br><span class="small muted">Il testo è già selezionato: copialo con Copia (o Ctrl/Cmd+C).</span></p>
    <textarea readonly>${esc(text)}</textarea>
    <div class="modal-actions"><button class="btn primary" data-modal="close">Chiudi</button></div>`);
  const ta = back.querySelector('textarea');
  ta.focus();
  ta.select();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-modal]')) back.remove();
  });
}

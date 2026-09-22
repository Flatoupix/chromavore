/** Keep the entire document (including dialogs and touch controls) in fullscreen. */
export function setupFullscreen() {
  const button = document.getElementById('fullscreen-toggle') as HTMLButtonElement;
  const status = document.getElementById('fullscreen-status')!;
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return;

  button.hidden = false;
  const sync = () => {
    const active = !!document.fullscreenElement;
    button.textContent = active ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    button.setAttribute('aria-pressed', String(active));
    status.textContent = '';
  };
  document.addEventListener('fullscreenchange', sync);
  // Activating this control must not also trigger gameplay inputs.
  button.addEventListener('keydown', event => event.stopPropagation());
  button.addEventListener('keyup', event => event.stopPropagation());
  button.addEventListener('click', async event => {
    event.stopPropagation();
    button.disabled = true;
    status.textContent = '';
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      status.textContent = 'Fullscreen unavailable. Try the itch.io fullscreen button.';
    } finally {
      button.disabled = false;
      button.blur();
    }
  });
  sync();
}

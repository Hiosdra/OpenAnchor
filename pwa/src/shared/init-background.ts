/**
 * Injects the shared animated ocean background and stars into the DOM.
 * Call once from each module's entry point to avoid duplicating the
 * markup across every HTML file.
 */
export function initBackground(): void {
  const ocean = document.createElement('div');
  ocean.className = 'ocean-bg';
  ocean.innerHTML =
    '<div class="wave wave-1"></div>' +
    '<div class="wave wave-2"></div>' +
    '<div class="wave wave-3"></div>';

  const stars = document.createElement('div');
  stars.className = 'stars';

  // Prepend so backgrounds sit behind all other content
  document.body.prepend(ocean);
  document.body.prepend(stars);
}

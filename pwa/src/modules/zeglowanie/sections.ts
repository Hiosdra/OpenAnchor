import type { SectionType } from './data';

let currentSection: SectionType = 'packing';

export function switchSection(section: SectionType): void {
  currentSection = section;

  document.querySelectorAll<HTMLButtonElement>('.section-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  document.querySelectorAll<HTMLElement>('.content-section').forEach((sec) => {
    sec.classList.toggle('active', sec.id === `section-${section}`);
  });

  localStorage.setItem('zeglowanie_selected_section', section);
}

export function getCurrentSection(): SectionType {
  return currentSection;
}

export function initSections(): void {
  const saved = localStorage.getItem('zeglowanie_selected_section') as SectionType | null;
  const section: SectionType = saved ?? 'packing';
  currentSection = section;

  document.querySelectorAll<HTMLButtonElement>('.section-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  document.querySelectorAll<HTMLElement>('.content-section').forEach((sec) => {
    sec.classList.toggle('active', sec.id === `section-${section}`);
  });
}

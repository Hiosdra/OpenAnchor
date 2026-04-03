import './styles.css';
import type { SectionType, CruiseType, BriefingType, ChecklistType } from './data';
import { switchSection, initSections } from './sections';
import { switchCruiseType, resetChecklist, initPacking } from './packing';
import { switchBriefingType, resetBriefingChecklist, initBriefing } from './briefing';
import { switchChecklistType, resetChecklistSection, initChecklists } from './checklists';

document.documentElement.dataset.theme = localStorage.getItem('openanchor-theme') || 'dark';

document.addEventListener('DOMContentLoaded', () => {
  initSections();
  initPacking();
  initBriefing();
  initChecklists();

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target) return;

    const action = target.dataset.action;
    const arg = target.dataset.arg;

    switch (action) {
      case 'switchSection': if (arg) switchSection(arg as SectionType); break;
      case 'switchCruiseType': if (arg) switchCruiseType(arg as CruiseType); break;
      case 'resetChecklist': resetChecklist(); break;
      case 'switchBriefingType': if (arg) switchBriefingType(arg as BriefingType); break;
      case 'resetBriefingChecklist': if (arg) resetBriefingChecklist(arg as BriefingType); break;
      case 'switchChecklistType': if (arg) switchChecklistType(arg as ChecklistType); break;
      case 'resetChecklistSection': resetChecklistSection(); break;
      case 'navigate-home': window.location.href = import.meta.env.BASE_URL || '/'; break;
    }
  });
});

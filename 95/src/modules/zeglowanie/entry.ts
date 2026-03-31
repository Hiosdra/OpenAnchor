import type { SectionType, CruiseType, BriefingType, ChecklistType } from './data';
import { switchSection, initSections } from './sections';
import { switchCruiseType, resetChecklist, initPacking } from './packing';
import { switchBriefingType, resetBriefingChecklist, initBriefing } from './briefing';
import { switchChecklistType, resetChecklistSection, initChecklists } from './checklists';

// Expose functions to window for inline onclick handlers
declare global {
  interface Window {
    switchSection: (section: SectionType) => void;
    switchCruiseType: (cruiseType: CruiseType) => void;
    resetChecklist: () => void;
    switchBriefingType: (briefingType: BriefingType) => void;
    resetBriefingChecklist: (briefingType: BriefingType) => void;
    switchChecklistType: (checklistType: ChecklistType) => void;
    resetChecklistSection: () => void;
  }
}

window.switchSection = switchSection;
window.switchCruiseType = switchCruiseType;
window.resetChecklist = resetChecklist;
window.switchBriefingType = switchBriefingType;
window.resetBriefingChecklist = resetBriefingChecklist;
window.switchChecklistType = switchChecklistType;
window.resetChecklistSection = resetChecklistSection;

document.addEventListener('DOMContentLoaded', () => {
  initSections();
  initPacking();
  initBriefing();
  initChecklists();
});

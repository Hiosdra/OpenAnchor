import { briefingLists, type BriefingType } from './data';
import { briefingStorageKey, STORAGE_KEYS } from './storage-keys';

let currentBriefingType: BriefingType = 'zero';

export function getCurrentBriefingType(): BriefingType {
  return currentBriefingType;
}

function attachBriefingChecklistListeners(): void {
  document.querySelectorAll<HTMLLIElement>('.briefing-content .checklist-item').forEach((item) => {
    item.addEventListener('click', function (this: HTMLLIElement) {
      const itemId = this.dataset.item!;
      const briefingType = this.dataset.briefingType!;
      const checkbox = this.querySelector<HTMLDivElement>('.checklist-checkbox')!;
      const isChecked = this.classList.toggle('checked');
      checkbox.classList.toggle('checked');
      saveBriefingChecklistState(itemId, briefingType, isChecked);
    });
  });
}

function loadBriefingChecklistState(): void {
  document.querySelectorAll<HTMLLIElement>('.briefing-content .checklist-item').forEach((item) => {
    const itemId = item.dataset.item!;
    const briefingType = item.dataset.briefingType!;
    const storageKey = briefingStorageKey(briefingType, itemId);
    const isChecked = localStorage.getItem(storageKey) === 'true';

    if (isChecked) {
      item.classList.add('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.add('checked');
    }
  });
}

function saveBriefingChecklistState(itemId: string, briefingType: string, isChecked: boolean): void {
  localStorage.setItem(briefingStorageKey(briefingType, itemId), String(isChecked));
}

export function renderBriefingChecklist(): void {
  const listContainerId = currentBriefingType === 'zero' ? 'briefingZeroList' : 'briefingFirstDayList';
  const listContainer = document.getElementById(listContainerId);

  if (!listContainer) return;

  listContainer.innerHTML = '';

  const items = briefingLists[currentBriefingType];
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.dataset.item = item.id;
    li.dataset.briefingType = currentBriefingType;

    const checkbox = document.createElement('div');
    checkbox.className = 'checklist-checkbox';

    const text = document.createElement('div');
    text.className = 'checklist-text';
    text.innerHTML = item.text;

    li.appendChild(checkbox);
    li.appendChild(text);
    listContainer.appendChild(li);
  });

  loadBriefingChecklistState();
  attachBriefingChecklistListeners();
}

export function switchBriefingType(briefingType: BriefingType): void {
  currentBriefingType = briefingType;

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-briefing]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.briefing === briefingType);
  });

  document.querySelectorAll<HTMLElement>('.briefing-content').forEach((content) => {
    content.classList.toggle('active', content.id === `briefing-${briefingType}`);
  });

  localStorage.setItem(STORAGE_KEYS.BRIEFING_TYPE, briefingType);
  renderBriefingChecklist();
}

export function resetBriefingChecklist(briefingType: BriefingType): void {
  if (confirm('Czy na pewno chcesz wyczyścić checklistę briefingu?')) {
    const selector =
      briefingType === 'zero'
        ? '#briefingZeroList .checklist-item'
        : '#briefingFirstDayList .checklist-item';

    document.querySelectorAll<HTMLLIElement>(selector).forEach((item) => {
      const itemId = item.dataset.item!;
      const storageKey = briefingStorageKey(briefingType, itemId);

      item.classList.remove('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.remove('checked');
      localStorage.removeItem(storageKey);
    });
  }
}

export function initBriefing(): void {
  const saved = localStorage.getItem(STORAGE_KEYS.BRIEFING_TYPE) as BriefingType | null;
  currentBriefingType = saved ?? 'zero';

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-briefing]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.briefing === currentBriefingType);
  });

  document.querySelectorAll<HTMLElement>('.briefing-content').forEach((content) => {
    content.classList.toggle('active', content.id === `briefing-${currentBriefingType}`);
  });

  renderBriefingChecklist();
}

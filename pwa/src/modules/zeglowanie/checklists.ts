import { checklistData, type ChecklistType } from './data';

let currentChecklistType: ChecklistType = 'morning';

export function getCurrentChecklistType(): ChecklistType {
  return currentChecklistType;
}

function attachChecklistItemsListeners(): void {
  document.querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item').forEach((item) => {
    item.addEventListener('click', function (this: HTMLLIElement) {
      const itemId = this.dataset.item!;
      const checklistType = this.dataset.checklistType!;
      const checkbox = this.querySelector<HTMLDivElement>('.checklist-checkbox')!;
      const isChecked = this.classList.toggle('checked');
      checkbox.classList.toggle('checked');
      saveChecklistItemState(itemId, checklistType, isChecked);
    });
  });
}

function loadChecklistItemsState(): void {
  document.querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item').forEach((item) => {
    const itemId = item.dataset.item!;
    const checklistType = item.dataset.checklistType!;
    const storageKey = `checklist-${checklistType}-${itemId}`;
    const isChecked = localStorage.getItem(storageKey) === 'true';

    if (isChecked) {
      item.classList.add('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.add('checked');
    }
  });
}

function saveChecklistItemState(itemId: string, checklistType: string, isChecked: boolean): void {
  const storageKey = `checklist-${checklistType}-${itemId}`;
  localStorage.setItem(storageKey, String(isChecked));
}

export function renderChecklistItems(): void {
  const listContainer = document.getElementById('checklistItems')!;
  listContainer.innerHTML = '';

  const items = checklistData[currentChecklistType].items;
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.dataset.item = item.id;
    li.dataset.checklistType = currentChecklistType;

    const checkbox = document.createElement('div');
    checkbox.className = 'checklist-checkbox';

    const text = document.createElement('div');
    text.className = 'checklist-text';
    const crewIcon = item.crew ? '(Załoga) ' : '';
    text.textContent = crewIcon + item.text;

    li.appendChild(checkbox);
    li.appendChild(text);
    listContainer.appendChild(li);
  });

  loadChecklistItemsState();
  attachChecklistItemsListeners();
}

export function switchChecklistType(checklistType: ChecklistType): void {
  currentChecklistType = checklistType;

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-checklist]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.checklist === checklistType);
  });

  localStorage.setItem('zeglowanie_selected_checklist_type', checklistType);
  document.getElementById('checklistTitle')!.textContent = checklistData[checklistType].title;
  renderChecklistItems();
}

export function resetChecklistSection(): void {
  if (confirm('Czy na pewno chcesz wyczyścić obecną checklistę?')) {
    document.querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item').forEach((item) => {
      const itemId = item.dataset.item!;
      const checklistType = item.dataset.checklistType!;
      const storageKey = `checklist-${checklistType}-${itemId}`;

      item.classList.remove('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.remove('checked');
      localStorage.removeItem(storageKey);
    });
  }
}

export function initChecklists(): void {
  const saved = localStorage.getItem('zeglowanie_selected_checklist_type');
  const validType =
    saved && saved in checklistData ? (saved as ChecklistType) : 'morning';
  currentChecklistType = validType;

  if (!checklistData[saved as ChecklistType]) {
    localStorage.setItem('zeglowanie_selected_checklist_type', 'morning');
  }

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-checklist]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.checklist === currentChecklistType);
  });

  const section = checklistData[currentChecklistType];
  if (section) {
    document.getElementById('checklistTitle')!.textContent = section.title;
  }

  renderChecklistItems();
}

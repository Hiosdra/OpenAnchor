import { packingLists, type CruiseType } from './data';
import { isValidCruiseType } from './storage-keys';

let currentCruiseType: CruiseType = 'baltic-autumn';

export function getCurrentCruiseType(): CruiseType {
  return currentCruiseType;
}

function attachChecklistListeners(): void {
  document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
    item.addEventListener('click', function (this: HTMLLIElement) {
      const itemId = this.dataset.item!;
      const cruiseType = this.dataset.cruiseType!;
      const checkbox = this.querySelector<HTMLDivElement>('.checklist-checkbox')!;
      const isChecked = this.classList.toggle('checked');
      checkbox.classList.toggle('checked');
      saveChecklistState(itemId, cruiseType, isChecked);
    });
  });
}

function loadChecklistState(): void {
  document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
    const itemId = item.dataset.item!;
    const cruiseType = item.dataset.cruiseType!;
    const storageKey = `sailing-${cruiseType}-${itemId}`;
    const isChecked = localStorage.getItem(storageKey) === 'true';

    if (isChecked) {
      item.classList.add('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.add('checked');
    }
  });
}

function saveChecklistState(itemId: string, cruiseType: string, isChecked: boolean): void {
  const storageKey = `sailing-${cruiseType}-${itemId}`;
  localStorage.setItem(storageKey, String(isChecked));
}

export function renderChecklist(): void {
  const listContainer = document.getElementById('packingList')!;
  listContainer.innerHTML = '';

  const items = packingLists[currentCruiseType];
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.dataset.item = item.id;
    li.dataset.cruiseType = currentCruiseType;

    const checkbox = document.createElement('div');
    checkbox.className = 'checklist-checkbox';

    const text = document.createElement('div');
    text.className = 'checklist-text';
    text.innerHTML = item.text;

    li.appendChild(checkbox);
    li.appendChild(text);
    listContainer.appendChild(li);
  });

  loadChecklistState();
  attachChecklistListeners();
}

export function switchCruiseType(cruiseType: CruiseType): void {
  currentCruiseType = cruiseType;

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-cruise]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cruise === cruiseType);
  });

  localStorage.setItem('zeglowanie_selected_cruise_type', cruiseType);
  renderChecklist();
}

export function resetChecklist(): void {
  if (confirm('Czy na pewno chcesz wyczyścić obecną listę?')) {
    document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
      const itemId = item.dataset.item!;
      const cruiseType = item.dataset.cruiseType!;
      const storageKey = `sailing-${cruiseType}-${itemId}`;

      item.classList.remove('checked');
      item.querySelector<HTMLDivElement>('.checklist-checkbox')!.classList.remove('checked');
      localStorage.removeItem(storageKey);
    });
  }
}

export function initPacking(): void {
  const saved = localStorage.getItem('zeglowanie_selected_cruise_type');
  currentCruiseType = isValidCruiseType(saved) ? saved : 'baltic-autumn';

  document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-cruise]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cruise === currentCruiseType);
  });

  renderChecklist();
}

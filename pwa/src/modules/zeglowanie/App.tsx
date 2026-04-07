import React from 'react';
import type { SectionType } from './data';
import { isValidSection, STORAGE_KEYS } from './storage-keys';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/Header';
import { SectionNav } from './components/SectionNav';
import { PackingSection } from './components/PackingSection';
import { BriefingSection } from './components/BriefingSection';
import { ChecklistsSection } from './components/ChecklistsSection';
import { PlaceholderSection } from './components/PlaceholderSection';

export default function App() {
  const [section, setSection] = useLocalStorage<SectionType>(
    STORAGE_KEYS.SECTION, 'packing', isValidSection
  );

  return (
    <>
      <Header />
      <main className="max-w-[800px] mx-auto px-4 pb-12">
        <SectionNav current={section} onChange={setSection} />

        {section === 'packing' && <PackingSection />}
        {section === 'shopping' && (
          <PlaceholderSection
            emoji="🛒"
            title="Lista Zakupów i Pomysły na Dania"
            description="Tutaj będzie można dodać listę zakupów na rejs oraz pomysły na posiłki.<br>Sekcja dostępna w przyszłości."
          />
        )}
        {section === 'briefing' && <BriefingSection />}
        {section === 'checklists' && <ChecklistsSection />}
        {section === 'knowledge' && (
          <PlaceholderSection
            emoji="📚"
            title="Wiedza Żeglarska"
            description="Tutaj będą informacje żeglarskie:<br>instrukcje wiązania węzłów, podstawy nawigacji, meteorologia, itp.<br>Sekcja dostępna w przyszłości."
          />
        )}
      </main>
    </>
  );
}

// ── Types ──────────────────────────────────────────────────────

export interface PackingItem {
  id: string;
  text: string;
}

export interface BriefingItem {
  id: string;
  text: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  crew: boolean;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export type CruiseType = 'baltic-autumn' | 'croatia-summer';
export type BriefingType = 'zero' | 'first-day';
export type ChecklistType = 'morning' | 'departure' | 'mooring' | 'grabbag';
export type SectionType = 'packing' | 'shopping' | 'briefing' | 'checklists' | 'knowledge';

// ── Packing lists ──────────────────────────────────────────────

export const packingLists: Record<CruiseType, PackingItem[]> = {
  'baltic-autumn': [
    { id: 'ekuz', text: '<strong>EKUZ</strong> (Europejska Karta Ubezpieczenia Zdrowotnego)' },
    { id: 'paszport', text: '<strong>Paszport</strong> jeżeli masz' },
    { id: 'dowod', text: '<strong>Dowód osobisty</strong>' },
    { id: 'bluza', text: '<strong>Bluza</strong> (ciepła, warstwowa)' },
    { id: 'kurta', text: '<strong>Kurtka wodoodporna</strong>' },
    { id: 'bielizna', text: '<strong>Bielizna</strong> (na każdy dzień + zapas)' },
    { id: 'koszulki', text: '<strong>Koszulki</strong> (kilka sztuk)' },
    { id: 'spodnie', text: '<strong>Długie spodnie</strong>, najlepiej wodoodporne' },
    { id: 'termoaktywna', text: '<strong>Bielizna termoaktywna</strong>' },
    { id: 'czapka', text: '<strong>Czapka!</strong> (ochrona przed słońcem i wiatrem)' },
    { id: 'buty', text: '<strong>Buty niefarbujące od spodu</strong> z zasłoniętymi palcami' },
    { id: 'kalosze', text: '<strong>Kalosze</strong> jeżeli masz' },
    { id: 'klapki', text: '<strong>Klapki do kąpieli</strong>' },
    { id: 'recznik', text: '<strong>Ręcznik</strong>, najlepiej szybkoschnący' },
    { id: 'kosmetyki', text: '<strong>Kosmetyki</strong>, fajnie jak BIO, ale nie jest to konieczne' },
    { id: 'krem-uv', text: '<strong>Krem UV</strong> (wysoki filtr!)' },
    { id: 'latarka', text: '<strong>Latarka</strong>, najlepiej czołówka' },
    { id: 'ladowarka', text: '<strong>Ładowarka z gniazdkiem europejskim</strong>' },
    { id: 'rozdzielacz', text: '<strong>Kradziejka prądu (rozdzielacz)</strong> - w kabinach zazwyczaj 1 gniazdko na 2 osoby' },
    { id: 'powerbank', text: '<strong>Powerbank</strong>' },
    { id: 'kable', text: '<strong>Kable do ładowania</strong> (USB-C, Lightning, itp.)' },
    { id: 'choroba-morska', text: '<strong>Coś na chorobę morską</strong> jeżeli podlegasz (Aviomarin, opaski, itp.)' },
  ],
  'croatia-summer': [
    { id: 'ekuz', text: '<strong>EKUZ</strong>, paszport, dowód osobisty' },
    { id: 'patent', text: '<strong>Patent</strong> jeżeli masz' },
    { id: 'bluzy', text: '<strong>Dwie bluzy</strong>' },
    { id: 'kurta', text: '<strong>Kurtka wodoodporna</strong>' },
    { id: 'bielizna', text: '<strong>Bielizna</strong>' },
    { id: 'koszulki', text: '<strong>Koszulki</strong>' },
    { id: 'spodenki', text: '<strong>Krótkie i długie spodenki</strong>' },
    { id: 'kostium', text: '<strong>Kostium do pływania</strong> (a nawet x2 jednak będzie dobre słoneczko)' },
    { id: 'czapka', text: '<strong>Czapka!</strong>' },
    { id: 'okulary', text: '<strong>Okulary przeciwsłoneczne</strong> (nie zastępują czapki)' },
    { id: 'rekawiczki', text: '<strong>Rękawiczki</strong> jeżeli ktoś preferuje, ale koniecznie nie rowerowe, na morzu opcjonalne' },
    { id: 'buty', text: '<strong>Buty niefarbujące od spodu</strong> z zasłoniętymi palcami' },
    { id: 'klapki', text: '<strong>Klapki do kąpieli</strong>' },
    { id: 'recznik', text: '<strong>Ręcznik</strong>, najlepiej szybkoschnący' },
    { id: 'kosmetyki', text: '<strong>Kosmetyki</strong>, fajnie jak BIO, ale nie jest to konieczne' },
    { id: 'proszek', text: '<strong>Proszek do prania</strong> (opcjonalnie, ja piorę rzeczy w trakcie, aby mniej brać)' },
    { id: 'krem-uv', text: '<strong>Krem UV</strong>' },
    { id: 'latarka', text: '<strong>Latarka</strong>, najlepiej czołówka' },
    { id: 'ladowarka', text: '<strong>Ładowarka z gniazdkiem europejskim</strong>' },
    { id: 'rozdzielacz', text: '<strong>Kradziejka prądu (rozdzielacz)</strong> (w kabinach jest zazwyczaj po 1 gniazdku na 2 osoby)' },
    { id: 'powerbank', text: '<strong>Powerbank</strong> (nie codziennie będzie prąd do ładowania)' },
    { id: 'kable', text: '<strong>Kable do ładowania</strong>' },
    { id: 'ubranie-wierzch', text: '<strong>W porcie i restauracjach</strong> trzeba być nie tylko w kostiumie kąpielowym, więc coś sensownego na wierzch 😀' },
    { id: 'rekawice-budowlane', text: '<strong>2 pary rękawic budowlanych</strong> na ekipę' },
  ],
};

// ── Briefing lists ─────────────────────────────────────────────

export const briefingLists: Record<BriefingType, BriefingItem[]> = {
  'zero': [
    { id: 'sailing-intro', text: 'Jak wygląda żeglowanie? (wachty, współpraca, role na łódce)' },
    { id: 'wc-operation', text: 'Obsługa WC (zawór, pompowanie, papier do kosza!)' },
    { id: 'boarding', text: 'Wchodzenie i schodzenie z łódki (jedna ręka dla siebie, druga dla łódki)' },
    { id: 'deck-movement', text: 'Poruszanie się po pokładzie (trzymaj się, nie chodź po dziobie)' },
    { id: 'seasickness', text: 'Choroba morska (horyzont, Aviomarin, świeże powietrze)' },
    { id: 'sunburn', text: 'Oparzenia słoneczne (SPF 50+, czapka, okulary)' },
    { id: 'nav-table', text: 'Stolik nawigacyjny (plotter, VHF, nie dotykać bez zgody)' },
    { id: 'solas-mayday', text: 'SOLAS - Mayday (kanał 16 VHF, trzy razy)' },
    { id: 'solas-epirb', text: 'SOLAS - EPIRB (radiolatarnia ratunkowa)' },
    { id: 'solas-flares', text: 'SOLAS - Race sygnalizacyjne (czerwone i białe)' },
    { id: 'solas-mob', text: 'SOLAS - MOB (człowiek za burtą, przycisk na plotterze)' },
    { id: 'solas-raft', text: 'SOLAS - Tratwa ratunkowa (lokalizacja)' },
    { id: 'solas-lifejackets', text: 'SOLAS - Kamizelki ratunkowe (lokalizacja, kiedy nosić)' },
    { id: 'solas-fire', text: 'SOLAS - Pożar i gaśnice (lokalizacja: silnik, kambuz, kokpit)' },
    { id: 'first-aid', text: 'Apteczka (lokalizacja, poinformuj o alergiach)' },
    { id: 'alcohol', text: 'Alkohol (zero podczas żeglugi, tylko w porcie)' },
    { id: 'water-tea', text: 'Woda i herbata (oszczędzaj wodę, pilnuj garnka na kuchence)' },
    { id: 'secure-items', text: 'Zamknięte szafki i luźne rzeczy (wszystko zabezpieczone przed wypłynięciem!)' },
    { id: 'nav-apps', text: 'Aplikacje nawigacyjne (Orca, pobierz mapy offline)' },
    { id: 'nav-planning', text: 'Patrzenie w mapę (planowanie z wyprzedzeniem, jak F1)' },
    { id: 'port-time', text: 'Czas w porcie (zakupy, zwiedzanie, umiar z alkoholem)' },
  ],
  'first-day': [
    { id: 'boat-mass', text: 'Łódka waży 8-15 ton (jak autobus, wszystko powoli!)' },
    { id: 'clipping-in', text: 'Wpinanie się (kamizelka → linka → wyjście, nocą i przy złej pogodzie)' },
    { id: 'steering-watches', text: 'Sterowanie i wachty (przejęcie steru, kurs, autopilot)' },
    { id: 'plotter', text: 'Plotter (GPS, mapy, waypoints, nie zmieniaj ustawień)' },
    { id: 'engine', text: 'Obsługa silnika (diesel, N-F-R, zmieniaj biegi na luzie, powoli w porcie)' },
    { id: 'no-lines', text: 'Nie stój na linach! (lina pod napięciem jest śmiertelnie niebezpieczna)' },
    { id: 'winches', text: 'Obsługa kabestanów (3-4 razy, palce z dala!)' },
    { id: 'knots', text: 'Węzły (ósemka, cumowniczy, szkotowy, bulina, dwa półsztyki)' },
    { id: 'mob-procedure', text: 'Człowiek za burtą - MOB (krzycz! → przycisk MOB → koło → obserwator → nie trać z oczu!)' },
  ],
};

// ── Daily checklists ───────────────────────────────────────────

export const checklistData: Record<ChecklistType, ChecklistSection> = {
  'morning': {
    title: 'Codziennie rano',
    items: [
      { id: 'oil', text: 'Sprawdzić olej', crew: false },
      { id: 'battery', text: 'V baterii', crew: false },
      { id: 'deck', text: 'Przemyć pokład', crew: true },
      { id: 'sweep', text: 'Zmiotka wewnątrz', crew: true },
      { id: 'water', text: 'Dolać wody', crew: true },
      { id: 'weather', text: 'Pogoda', crew: false },
      { id: 'routes', text: 'Trasa główna, alternatywna i porty schronienia', crew: false },
    ],
  },
  'departure': {
    title: 'Wyjście z portu',
    items: [
      { id: 'port-fees', text: 'Opłaty', crew: false },
      { id: 'water-refill', text: 'Woda', crew: true },
      { id: 'trash', text: 'Śmieci', crew: true },
      { id: 'lockers', text: 'Zamknięcie szafek', crew: true },
      { id: 'report-out', text: 'Zgłoszenie?', crew: false },
      { id: 'wind-prep', text: 'Wiatr', crew: false },
      { id: 'bimini-depart', text: 'Bimini', crew: true },
      { id: 'bow-thruster', text: 'Cuma prądowa', crew: true },
      { id: 'windows', text: 'Okienka', crew: true },
      { id: 'ladder', text: 'Trap', crew: true },
      { id: 'fenders-depart', text: 'Odbijacze', crew: true },
      { id: 'observer-depart', text: 'Obserwator', crew: false },
      { id: 'departure-plan', text: 'Plan odejścia', crew: false },
    ],
  },
  'mooring': {
    title: 'Cumowanie',
    items: [
      { id: 'marina-report', text: 'Zgłoszenie do mariny', crew: false },
      { id: 'fenders-moor', text: 'Odbijacze', crew: true },
      { id: 'railings', text: 'Nic na relingach', crew: true },
      { id: 'bimini-moor', text: 'Bimini', crew: true },
      { id: 'observer-moor', text: 'Obserwator', crew: false },
      { id: 'landing', text: 'Desant', crew: false },
      { id: 'mooring-lines', text: 'Cumy', crew: false },
      { id: 'wind-direction', text: 'Kierunek wiatru', crew: false },
      { id: 'location', text: 'Miejsce', crew: false },
      { id: 'approach-plan', text: 'Plan podejścia', crew: false },
      { id: 'fender-height', text: 'Wysokość odbijaczy', crew: false },
    ],
  },
  'grabbag': {
    title: 'Grab bag',
    items: [
      { id: 'boat-docs', text: 'Dokumenty łódki', crew: false },
      { id: 'crew-docs', text: 'Dokumenty załogi', crew: false },
      { id: 'logbook', text: 'Dziennik', crew: false },
      { id: 'handheld-vhf', text: 'Handheld VHF', crew: false },
      { id: 'powerbank-grab', text: 'Powerbank', crew: false },
      { id: 'flashlights', text: 'Latarki', crew: false },
      { id: 'water-grab', text: 'Woda', crew: false },
      { id: 'clothes', text: 'Ubrania, dużo', crew: false },
    ],
  },
};

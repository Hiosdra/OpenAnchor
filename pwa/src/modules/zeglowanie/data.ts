// ── Types ──────────────────────────────────────────────────────
interface TextItem {
  id: string;
  text: string;
}
export type PackingItem = TextItem;
export type BriefingItem = TextItem;
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

const t = (id: string, text: string): TextItem => ({ id, text });
const c = (id: string, text: string, crew = false): ChecklistItem => ({ id, text, crew });

export const packingLists: Record<CruiseType, PackingItem[]> = {
  'baltic-autumn': [
    t('ekuz', '<strong>EKUZ</strong> (Europejska Karta Ubezpieczenia Zdrowotnego)'),
    t('paszport', '<strong>Paszport</strong> jeżeli masz'),
    t('dowod', '<strong>Dowód osobisty</strong>'),
    t('bluza', '<strong>Bluza</strong> (ciepła, warstwowa)'),
    t('kurta', '<strong>Kurtka wodoodporna</strong>'),
    t('bielizna', '<strong>Bielizna</strong> (na każdy dzień + zapas)'),
    t('koszulki', '<strong>Koszulki</strong> (kilka sztuk)'),
    t('spodnie', '<strong>Długie spodnie</strong>, najlepiej wodoodporne'),
    t('termoaktywna', '<strong>Bielizna termoaktywna</strong>'),
    t('czapka', '<strong>Czapka!</strong> (ochrona przed słońcem i wiatrem)'),
    t('buty', '<strong>Buty niefarbujące od spodu</strong> z zasłoniętymi palcami'),
    t('kalosze', '<strong>Kalosze</strong> jeżeli masz'),
    t('klapki', '<strong>Klapki do kąpieli</strong>'),
    t('recznik', '<strong>Ręcznik</strong>, najlepiej szybkoschnący'),
    t('kosmetyki', '<strong>Kosmetyki</strong>, fajnie jak BIO, ale nie jest to konieczne'),
    t('krem-uv', '<strong>Krem UV</strong> (wysoki filtr!)'),
    t('latarka', '<strong>Latarka</strong>, najlepiej czołówka'),
    t('ladowarka', '<strong>Ładowarka z gniazdkiem europejskim</strong>'),
    t(
      'rozdzielacz',
      '<strong>Kradziejka prądu (rozdzielacz)</strong> - w kabinach zazwyczaj 1 gniazdko na 2 osoby',
    ),
    t('powerbank', '<strong>Powerbank</strong>'),
    t('kable', '<strong>Kable do ładowania</strong> (USB-C, Lightning, itp.)'),
    t(
      'choroba-morska',
      '<strong>Coś na chorobę morską</strong> jeżeli podlegasz (Aviomarin, opaski, itp.)',
    ),
  ],
  'croatia-summer': [
    t('ekuz', '<strong>EKUZ</strong>, paszport, dowód osobisty'),
    t('patent', '<strong>Patent</strong> jeżeli masz'),
    t('bluzy', '<strong>Dwie bluzy</strong>'),
    t('kurta', '<strong>Kurtka wodoodporna</strong>'),
    t('bielizna', '<strong>Bielizna</strong>'),
    t('koszulki', '<strong>Koszulki</strong>'),
    t('spodenki', '<strong>Krótkie i długie spodenki</strong>'),
    t('kostium', '<strong>Kostium do pływania</strong> (a nawet x2 jednak będzie dobre słoneczko)'),
    t('czapka', '<strong>Czapka!</strong>'),
    t('okulary', '<strong>Okulary przeciwsłoneczne</strong> (nie zastępują czapki)'),
    t(
      'rekawiczki',
      '<strong>Rękawiczki</strong> jeżeli ktoś preferuje, ale koniecznie nie rowerowe, na morzu opcjonalne',
    ),
    t('buty', '<strong>Buty niefarbujące od spodu</strong> z zasłoniętymi palcami'),
    t('klapki', '<strong>Klapki do kąpieli</strong>'),
    t('recznik', '<strong>Ręcznik</strong>, najlepiej szybkoschnący'),
    t('kosmetyki', '<strong>Kosmetyki</strong>, fajnie jak BIO, ale nie jest to konieczne'),
    t(
      'proszek',
      '<strong>Proszek do prania</strong> (opcjonalnie, ja piorę rzeczy w trakcie, aby mniej brać)',
    ),
    t('krem-uv', '<strong>Krem UV</strong>'),
    t('latarka', '<strong>Latarka</strong>, najlepiej czołówka'),
    t('ladowarka', '<strong>Ładowarka z gniazdkiem europejskim</strong>'),
    t(
      'rozdzielacz',
      '<strong>Kradziejka prądu (rozdzielacz)</strong> (w kabinach jest zazwyczaj po 1 gniazdku na 2 osoby)',
    ),
    t('powerbank', '<strong>Powerbank</strong> (nie codziennie będzie prąd do ładowania)'),
    t('kable', '<strong>Kable do ładowania</strong>'),
    t(
      'ubranie-wierzch',
      '<strong>W porcie i restauracjach</strong> trzeba być nie tylko w kostiumie kąpielowym, więc coś sensownego na wierzch 😀',
    ),
    t('rekawice-budowlane', '<strong>2 pary rękawic budowlanych</strong> na ekipę'),
  ],
};

export const briefingLists: Record<BriefingType, BriefingItem[]> = {
  zero: [
    t('sailing-intro', 'Jak wygląda żeglowanie? (wachty, współpraca, role na łódce)'),
    t('wc-operation', 'Obsługa WC (zawór, pompowanie, papier do kosza!)'),
    t('boarding', 'Wchodzenie i schodzenie z łódki (jedna ręka dla siebie, druga dla łódki)'),
    t('deck-movement', 'Poruszanie się po pokładzie (trzymaj się, nie chodź po dziobie)'),
    t('seasickness', 'Choroba morska (horyzont, Aviomarin, świeże powietrze)'),
    t('sunburn', 'Oparzenia słoneczne (SPF 50+, czapka, okulary)'),
    t('nav-table', 'Stolik nawigacyjny (plotter, VHF, nie dotykać bez zgody)'),
    t('solas-mayday', 'SOLAS - Mayday (kanał 16 VHF, trzy razy)'),
    t('solas-epirb', 'SOLAS - EPIRB (radiolatarnia ratunkowa)'),
    t('solas-flares', 'SOLAS - Race sygnalizacyjne (czerwone i białe)'),
    t('solas-mob', 'SOLAS - MOB (człowiek za burtą, przycisk na plotterze)'),
    t('solas-raft', 'SOLAS - Tratwa ratunkowa (lokalizacja)'),
    t('solas-lifejackets', 'SOLAS - Kamizelki ratunkowe (lokalizacja, kiedy nosić)'),
    t('solas-fire', 'SOLAS - Pożar i gaśnice (lokalizacja: silnik, kambuz, kokpit)'),
    t('first-aid', 'Apteczka (lokalizacja, poinformuj o alergiach)'),
    t('alcohol', 'Alkohol (zero podczas żeglugi, tylko w porcie)'),
    t('water-tea', 'Woda i herbata (oszczędzaj wodę, pilnuj garnka na kuchence)'),
    t(
      'secure-items',
      'Zamknięte szafki i luźne rzeczy (wszystko zabezpieczone przed wypłynięciem!)',
    ),
    t('nav-apps', 'Aplikacje nawigacyjne (Orca, pobierz mapy offline)'),
    t('nav-planning', 'Patrzenie w mapę (planowanie z wyprzedzeniem, jak F1)'),
    t('port-time', 'Czas w porcie (zakupy, zwiedzanie, umiar z alkoholem)'),
  ],
  'first-day': [
    t('boat-mass', 'Łódka waży 8-15 ton (jak autobus, wszystko powoli!)'),
    t('clipping-in', 'Wpinanie się (kamizelka → linka → wyjście, nocą i przy złej pogodzie)'),
    t('steering-watches', 'Sterowanie i wachty (przejęcie steru, kurs, autopilot)'),
    t('plotter', 'Plotter (GPS, mapy, waypoints, nie zmieniaj ustawień)'),
    t('engine', 'Obsługa silnika (diesel, N-F-R, zmieniaj biegi na luzie, powoli w porcie)'),
    t('no-lines', 'Nie stój na linach! (lina pod napięciem jest śmiertelnie niebezpieczna)'),
    t('winches', 'Obsługa kabestanów (3-4 razy, palce z dala!)'),
    t('knots', 'Węzły (ósemka, cumowniczy, szkotowy, bulina, dwa półsztyki)'),
    t(
      'mob-procedure',
      'Człowiek za burtą - MOB (krzycz! → przycisk MOB → koło → obserwator → nie trać z oczu!)',
    ),
  ],
};

export const checklistData: Record<ChecklistType, ChecklistSection> = {
  morning: {
    title: 'Codziennie rano',
    items: [
      c('oil', 'Sprawdzić olej'),
      c('battery', 'V baterii'),
      c('deck', 'Przemyć pokład', true),
      c('sweep', 'Zmiotka wewnątrz', true),
      c('water', 'Dolać wody', true),
      c('weather', 'Pogoda'),
      c('routes', 'Trasa główna, alternatywna i porty schronienia'),
    ],
  },
  departure: {
    title: 'Wyjście z portu',
    items: [
      c('port-fees', 'Opłaty'),
      c('water-refill', 'Woda', true),
      c('trash', 'Śmieci', true),
      c('lockers', 'Zamknięcie szafek', true),
      c('report-out', 'Zgłoszenie?'),
      c('wind-prep', 'Wiatr'),
      c('bimini-depart', 'Bimini', true),
      c('bow-thruster', 'Cuma prądowa', true),
      c('windows', 'Okienka', true),
      c('ladder', 'Trap', true),
      c('fenders-depart', 'Odbijacze', true),
      c('observer-depart', 'Obserwator'),
      c('departure-plan', 'Plan odejścia'),
    ],
  },
  mooring: {
    title: 'Cumowanie',
    items: [
      c('marina-report', 'Zgłoszenie do mariny'),
      c('fenders-moor', 'Odbijacze', true),
      c('railings', 'Nic na relingach', true),
      c('bimini-moor', 'Bimini', true),
      c('observer-moor', 'Obserwator'),
      c('landing', 'Desant'),
      c('mooring-lines', 'Cumy'),
      c('wind-direction', 'Kierunek wiatru'),
      c('location', 'Miejsce'),
      c('approach-plan', 'Plan podejścia'),
      c('fender-height', 'Wysokość odbijaczy'),
    ],
  },
  grabbag: {
    title: 'Grab bag',
    items: [
      c('boat-docs', 'Dokumenty łódki'),
      c('crew-docs', 'Dokumenty załogi'),
      c('logbook', 'Dziennik'),
      c('handheld-vhf', 'Handheld VHF'),
      c('powerbank-grab', 'Powerbank'),
      c('flashlights', 'Latarki'),
      c('water-grab', 'Woda'),
      c('clothes', 'Ubrania, dużo'),
    ],
  },
};

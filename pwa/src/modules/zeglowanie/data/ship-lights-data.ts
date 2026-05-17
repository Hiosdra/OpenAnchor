/**
 * Ship Navigation Lights Data
 *
 * Based on COLREG (MPZZM) rules 20-31.
 * Coordinate system: X = starboard(+), Y = up(+), Z = stern(+) / bow(-)
 * Angles: 0° = bow, clockwise when viewed from above
 */

// ── Types ──────────────────────────────────────────────────────

export type ShipType =
  | 'power-under-50m'
  | 'power-over-50m'
  | 'sailing'
  | 'sailing-tricolor'
  | 'sailing-motor'
  | 'fishing-trawling'
  | 'fishing-not-trawling'
  | 'at-anchor-under-50m'
  | 'at-anchor-over-50m'
  | 'not-under-command'
  | 'restricted-maneuver'
  | 'towing-under-200m'
  | 'towing-over-200m'
  | 'constrained-by-draft'
  | 'aground'
  | 'mine-clearance'
  | 'pilot-vessel'
  | 'hovercraft'
  | 'towed-object';

export type LightColor = 'red' | 'green' | 'white' | 'yellow' | 'blue';
export type DayMarkShape = 'ball' | 'diamond' | 'cone-down' | 'cone-up' | 'cylinder';

export interface LightDef {
  id: string;
  name: string;
  color: LightColor;
  position: [x: number, y: number, z: number];
  /** Total arc width in degrees */
  arcDeg: number;
  /** Center direction of arc (0° = bow, 90° = starboard, 180° = stern, 270° = port) */
  arcCenterDeg: number;
  description: string;
  /** If true, the light flashes (~1Hz) */
  flashing?: boolean;
}

export interface DayMarkDef {
  id: string;
  name: string;
  shape: DayMarkShape;
  position: [x: number, y: number, z: number];
  description: string;
}

export interface ShipLightProfile {
  type: ShipType;
  name: string;
  emoji: string;
  description: string;
  colreg: string;
  lights: LightDef[];
  dayMarks?: DayMarkDef[];
  notes?: string[];
  /** Hull variant for 3D model */
  hullType: 'motor' | 'sail' | 'fishing' | 'tug' | 'pilot';
}

// ── Light Definitions (reusable) ───────────────────────────────
// Coordinate system: X = starboard(+), Y = up(+), Z = bow(-)
// (Shape Y=+5=bow maps to world Z=-5 after ExtrudeGeometry rotation)

const masthead = (z: number, y: number, id = 'masthead'): LightDef => ({
  id,
  name: 'Światło masztowe',
  color: 'white',
  position: [0, y, z],
  arcDeg: 225,
  arcCenterDeg: 0,
  description:
    'Białe światło widoczne w sektorze 225° od dziobu. Oznacza statek o napędzie mechanicznym.',
});

const mastheadAft = (z: number, y: number): LightDef => ({
  id: 'masthead-aft',
  name: 'Światło masztowe tylne',
  color: 'white',
  position: [0, y, z],
  arcDeg: 225,
  arcCenterDeg: 0,
  description:
    'Drugie białe światło masztowe (wyżej i dalej w tył). Wymagane dla statków ≥ 50m. Tworzy linię namiaru.',
});

const sternlight: LightDef = {
  id: 'stern',
  name: 'Światło rufowe',
  color: 'white',
  position: [0, 3, 4.3],
  arcDeg: 135,
  arcCenterDeg: 180,
  description: 'Białe światło widoczne w sektorze 135° od rufy. Definiuje strefę wyprzedzania.',
};

const portLight: LightDef = {
  id: 'port',
  name: 'Światło burtowe lewe (Bb)',
  color: 'red',
  position: [-1.2, 2.2, -3],
  arcDeg: 112.5,
  arcCenterDeg: 303.75,
  description:
    'Czerwone światło lewej burty. Sektor 112,5° — od dziobu do 22,5° za trawers lewej burty.',
};

const starboardLight: LightDef = {
  id: 'starboard',
  name: 'Światło burtowe prawe (StB)',
  color: 'green',
  position: [1.2, 2.2, -3],
  arcDeg: 112.5,
  arcCenterDeg: 56.25,
  description:
    'Zielone światło prawej burty. Sektor 112,5° — od dziobu do 22,5° za trawers prawej burty.',
};

const towingLight: LightDef = {
  id: 'towing',
  name: 'Światło holownicze',
  color: 'yellow',
  position: [0, 3, 4],
  arcDeg: 135,
  arcCenterDeg: 180,
  description: 'Żółte światło nad rufowym. Sektor 135° — oznacza prowadzenie operacji holowania.',
};

const allRound = (
  id: string,
  name: string,
  color: LightColor,
  y: number,
  description: string,
): LightDef => ({
  id,
  name,
  color,
  position: [0, y, 0],
  arcDeg: 360,
  arcCenterDeg: 0,
  description,
});

// ── Ship Profiles ──────────────────────────────────────────────

export const shipLightProfiles: ShipLightProfile[] = [
  {
    type: 'power-under-50m',
    name: 'Motorowy < 50m',
    emoji: '🚤',
    description: 'Statek o napędzie mechanicznym o długości poniżej 50 metrów w drodze.',
    colreg: 'Prawidło 23(a)',
    hullType: 'motor',
    lights: [masthead(-2, 5.5), portLight, starboardLight, sternlight],
    notes: [
      'Jedno światło masztowe na maszcie przednim',
      'Światła burtowe mogą być połączone w latarni dwukolorowej (dla < 20m)',
    ],
  },
  {
    type: 'power-over-50m',
    name: 'Motorowy ≥ 50m',
    emoji: '🚢',
    description: 'Statek o napędzie mechanicznym o długości 50 metrów lub większej w drodze.',
    colreg: 'Prawidło 23(a)',
    hullType: 'motor',
    lights: [masthead(-2.5, 5.5), mastheadAft(2, 7), portLight, starboardLight, sternlight],
    notes: [
      'Dwa światła masztowe — tylne wyżej od przedniego',
      'Tworzą linię namiaru ułatwiającą ocenę kursu',
    ],
  },
  {
    type: 'sailing',
    name: 'Żaglowy w drodze',
    emoji: '⛵',
    description: 'Statek żaglowy w drodze — napędzany wyłącznie żaglami (bez silnika).',
    colreg: 'Prawidło 25(a)',
    hullType: 'sail',
    lights: [portLight, starboardLight, sternlight],
    notes: [
      'BRAK białego światła masztowego — to główna różnica od motorowego!',
      'Opcjonalnie: czerwone nad zielonym dookoła widnokręgu na szczycie masztu',
    ],
  },
  {
    type: 'sailing-tricolor',
    name: 'Żaglowy < 20m (trójkolorowa)',
    emoji: '⛵',
    description:
      'Statek żaglowy poniżej 20m z latarnią trójkolorową na szczycie masztu (red+green+white).',
    colreg: 'Prawidło 25(b)',
    hullType: 'sail',
    lights: [
      {
        id: 'tricolor-port',
        name: 'Trójkolorowa — sektor czerwony',
        color: 'red',
        position: [0, 7.5, 0],
        arcDeg: 112.5,
        arcCenterDeg: 303.75,
        description: 'Sektor czerwony latarni trójkolorowej na szczycie masztu (lewa burta).',
      },
      {
        id: 'tricolor-stb',
        name: 'Trójkolorowa — sektor zielony',
        color: 'green',
        position: [0, 7.5, 0],
        arcDeg: 112.5,
        arcCenterDeg: 56.25,
        description: 'Sektor zielony latarni trójkolorowej na szczycie masztu (prawa burta).',
      },
      {
        id: 'tricolor-stern',
        name: 'Trójkolorowa — sektor biały',
        color: 'white',
        position: [0, 7.5, 0],
        arcDeg: 135,
        arcCenterDeg: 180,
        description: 'Sektor biały (rufowy) latarni trójkolorowej na szczycie masztu.',
      },
    ],
    notes: [
      'Jedna latarnia na szczycie masztu zastępuje osobne światła burtowe i rufowe',
      'Dozwolone TYLKO dla żaglowców < 20m',
      'Nie wolno łączyć z osobnymi światłami burtowymi!',
    ],
  },
  {
    type: 'sailing-motor',
    name: 'Żaglowy na silniku',
    emoji: '⛵⚙️',
    description: 'Statek żaglowy z włączonym silnikiem — w świetle prawa jest statkiem motorowym!',
    colreg: 'Prawidło 25(e)',
    hullType: 'sail',
    lights: [masthead(-1, 5.5), portLight, starboardLight, sternlight],
    dayMarks: [
      {
        id: 'cone-down',
        name: 'Stożek wierzchołkiem w dół',
        shape: 'cone-down',
        position: [0, 5, -0.5],
        description:
          'Czarny stożek wierzchołkiem w dół — znak dzienny statku żaglowego korzystającego z silnika.',
      },
    ],
    notes: [
      'Po włączeniu silnika statek żaglowy TRACI przywileje!',
      'Musi wykazywać białe światło masztowe jak motorowy',
      'W dzień: czarny stożek wierzchołkiem w dół',
    ],
  },
  {
    type: 'fishing-trawling',
    name: 'Trałowiec',
    emoji: '🐟',
    description: 'Statek zajęty trałowaniem (ciągnie włok po dnie lub w toni).',
    colreg: 'Prawidło 26(b)',
    hullType: 'fishing',
    lights: [
      allRound(
        'trawl-green',
        'Zielone dookoła (górne)',
        'green',
        6.5,
        'Zielone światło dookoła widnokręgu — górne światło pary oznaczającej trałowanie.',
      ),
      allRound(
        'trawl-white',
        'Białe dookoła (dolne)',
        'white',
        5.5,
        'Białe światło dookoła widnokręgu — dolne światło pary oznaczającej trałowanie.',
      ),
      masthead(-2, 7.5, 'masthead-trawl'),
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'cones-trawl',
        name: 'Dwa stożki wierzchołkami złączone',
        shape: 'diamond',
        position: [0, 6, -1],
        description: 'Dwa stożki złączone wierzchołkami (romb) — znak dzienny trałowca.',
      },
    ],
    notes: [
      'Zielone NAD białym dookoła widnokręgu',
      'Światło masztowe wyżej niż zielone (dla > 50m)',
      'Wysoce ograniczona manewrowość z powodu sieci',
    ],
  },
  {
    type: 'fishing-not-trawling',
    name: 'Rybacki (nie trałuje)',
    emoji: '🎣',
    description: 'Statek zajęty połowem innym niż trałowanie (sieci, liny, itp.).',
    colreg: 'Prawidło 26(c)',
    hullType: 'fishing',
    lights: [
      allRound(
        'fish-red',
        'Czerwone dookoła (górne)',
        'red',
        6.5,
        'Czerwone światło dookoła widnokręgu — górne, oznacza połów inny niż trałowanie.',
      ),
      allRound(
        'fish-white',
        'Białe dookoła (dolne)',
        'white',
        5.5,
        'Białe światło dookoła widnokręgu — dolne, para z czerwonym oznacza statek rybacki.',
      ),
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'cones-fish',
        name: 'Dwa stożki wierzchołkami złączone',
        shape: 'diamond',
        position: [0, 6, -1],
        description: 'Dwa stożki złączone wierzchołkami (romb) — znak dzienny statku rybackiego.',
      },
    ],
    notes: [
      'Czerwone NAD białym dookoła widnokręgu',
      'Jeśli sieci > 150m: dodatkowe białe światło w kierunku sieci',
      'Posuwa się po wodzie → dodaje światła burtowe i rufowe',
    ],
  },
  {
    type: 'at-anchor-under-50m',
    name: 'Na kotwicy (< 50m)',
    emoji: '⚓',
    description: 'Statek stojący na kotwicy, o długości poniżej 50 metrów.',
    colreg: 'Prawidło 30(a)',
    hullType: 'motor',
    lights: [
      allRound(
        'anchor-light',
        'Białe dookoła widnokręgu',
        'white',
        5,
        'Jedno białe światło widoczne dookoła widnokręgu — statek na kotwicy < 50m.',
      ),
    ],
    dayMarks: [
      {
        id: 'anchor-ball',
        name: 'Czarna kula',
        shape: 'ball',
        position: [0, 5, -2],
        description: 'Czarna kula na dziobie — znak dzienny statku na kotwicy.',
      },
    ],
    notes: ['Jedno białe światło widoczne ze wszystkich stron', 'W dzień: czarna kula na dziobie'],
  },
  {
    type: 'at-anchor-over-50m',
    name: 'Na kotwicy (≥ 50m)',
    emoji: '⚓',
    description: 'Statek stojący na kotwicy, o długości 50 metrów lub większej.',
    colreg: 'Prawidło 30(a)',
    hullType: 'motor',
    lights: [
      allRound(
        'anchor-bow',
        'Białe na dziobie (górne)',
        'white',
        6,
        'Białe światło dookoła widnokręgu na dziobie — wyższe.',
      ),
      {
        id: 'anchor-stern',
        name: 'Białe na rufie (dolne)',
        color: 'white',
        position: [0, 3.5, 4],
        arcDeg: 360,
        arcCenterDeg: 0,
        description:
          'Białe światło dookoła widnokręgu na rufie — niższe. Pozwala ocenić ustawienie kadłuba.',
      },
    ],
    dayMarks: [
      {
        id: 'anchor-ball',
        name: 'Czarna kula',
        shape: 'ball',
        position: [0, 6, -2],
        description: 'Czarna kula na dziobie — znak dzienny statku na kotwicy.',
      },
    ],
    notes: [
      'Dwa białe światła: wyższe na dziobie, niższe na rufie',
      'Pozwala określić kąt ustawienia kadłuba względem wiatru/prądu',
    ],
  },
  {
    type: 'not-under-command',
    name: 'Niezdolny do manewru (NUC)',
    emoji: '🚨',
    description:
      'Statek niezdolny do manewrowania z powodu wyjątkowych okoliczności (awaria steru, silnika, itp.).',
    colreg: 'Prawidło 27(a)',
    hullType: 'motor',
    lights: [
      allRound(
        'nuc-red-top',
        'Czerwone dookoła (górne)',
        'red',
        7,
        'Górne czerwone światło dookoła widnokręgu — sygnał NUC.',
      ),
      allRound(
        'nuc-red-bottom',
        'Czerwone dookoła (dolne)',
        'red',
        5.5,
        'Dolne czerwone światło dookoła widnokręgu — para z górnym oznacza NUC.',
      ),
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'nuc-ball-top',
        name: 'Czarna kula (górna)',
        shape: 'ball',
        position: [0, 7, -1.5],
        description: 'Górna czarna kula — para kul oznacza NUC.',
      },
      {
        id: 'nuc-ball-bottom',
        name: 'Czarna kula (dolna)',
        shape: 'ball',
        position: [0, 5.5, -1.5],
        description: 'Dolna czarna kula — para kul oznacza NUC.',
      },
    ],
    notes: [
      'Dwa czerwone światła dookoła widnokręgu w pionie',
      'Jeśli posuwa się po wodzie → dodaje światła burtowe i rufowe',
      'Posiada niemal absolutny priorytet drogi!',
      'W dzień: dwie czarne kule w pionie',
    ],
  },
  {
    type: 'restricted-maneuver',
    name: 'Ograniczona zdolność manewru (RAM)',
    emoji: '🔧',
    description:
      'Statek z ograniczoną zdolnością manewrowania z powodu natury wykonywanej pracy (np. układanie kabli, pogłębianie).',
    colreg: 'Prawidło 27(b)',
    hullType: 'motor',
    lights: [
      allRound(
        'ram-red-top',
        'Czerwone dookoła (górne)',
        'red',
        7.5,
        'Górne czerwone światło — element sygnału RAM (czerwone-białe-czerwone).',
      ),
      allRound(
        'ram-white',
        'Białe dookoła (środkowe)',
        'white',
        6.25,
        'Środkowe białe światło — element sygnału RAM.',
      ),
      allRound(
        'ram-red-bottom',
        'Czerwone dookoła (dolne)',
        'red',
        5,
        'Dolne czerwone światło — element sygnału RAM.',
      ),
      masthead(-2.5, 8.5),
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'ram-ball-top',
        name: 'Czarna kula (górna)',
        shape: 'ball',
        position: [0, 7.5, -1.5],
        description: 'Górna kula — element znaku RAM.',
      },
      {
        id: 'ram-diamond',
        name: 'Romb (środkowy)',
        shape: 'diamond',
        position: [0, 6.25, -1.5],
        description: 'Czarny romb — środkowy element znaku RAM.',
      },
      {
        id: 'ram-ball-bottom',
        name: 'Czarna kula (dolna)',
        shape: 'ball',
        position: [0, 5, -1.5],
        description: 'Dolna kula — element znaku RAM.',
      },
    ],
    notes: [
      'Trzy światła w pionie: CZERWONE — BIAŁE — CZERWONE',
      'Dodatkowo standardowe światła dla napędu mechanicznego',
      'W dzień: kula — romb — kula',
    ],
  },
  {
    type: 'towing-under-200m',
    name: 'Holownik (hol ≤ 200m)',
    emoji: '🔗',
    description: 'Statek holujący — długość holu nie przekracza 200 metrów.',
    colreg: 'Prawidło 24(a)',
    hullType: 'tug',
    lights: [
      masthead(-2.5, 5.5, 'masthead-1'),
      {
        id: 'masthead-2',
        name: 'Światło masztowe (drugie)',
        color: 'white',
        position: [0, 6.5, -2.5],
        arcDeg: 225,
        arcCenterDeg: 0,
        description: 'Drugie białe światło masztowe w pionie — oznacza operację holowania ≤ 200m.',
      },
      portLight,
      starboardLight,
      sternlight,
      towingLight,
    ],
    notes: [
      'DWA białe światła masztowe w pionie',
      'Żółte światło holownicze nad rufowym (sektor 135°)',
      'Obiekt holowany: światła burtowe + rufowe (bez masztowego)',
    ],
  },
  {
    type: 'towing-over-200m',
    name: 'Holownik (hol > 200m)',
    emoji: '⚠️🔗',
    description:
      'Statek holujący — długość holu przekracza 200 metrów. Skrajnie niebezpieczna konfiguracja!',
    colreg: 'Prawidło 24(a)',
    hullType: 'tug',
    lights: [
      masthead(-2.5, 5.5, 'masthead-1'),
      {
        id: 'masthead-2',
        name: 'Światło masztowe (drugie)',
        color: 'white',
        position: [0, 6.5, -2.5],
        arcDeg: 225,
        arcCenterDeg: 0,
        description: 'Drugie białe światło masztowe.',
      },
      {
        id: 'masthead-3',
        name: 'Światło masztowe (trzecie)',
        color: 'white',
        position: [0, 7.5, -2.5],
        arcDeg: 225,
        arcCenterDeg: 0,
        description:
          'Trzecie białe światło masztowe — TRZY masztowe oznaczają hol > 200m! Najwyższe ostrzeżenie.',
      },
      portLight,
      starboardLight,
      sternlight,
      towingLight,
    ],
    dayMarks: [
      {
        id: 'tow-diamond',
        name: 'Romb',
        shape: 'diamond',
        position: [0, 5, -0.5],
        description: 'Czarny romb — wymagany na holowniku i obiekcie holowanym gdy hol > 200m.',
      },
    ],
    notes: [
      'TRZY białe światła masztowe w pionie — sygnał najwyższego ostrzeżenia!',
      'Żółte światło holownicze nad rufowym',
      'Lina holownicza NIEWIDOCZNA w nocy — śmiertelne zagrożenie',
      'W dzień: czarny romb na holowniku i na obiekcie holowanym',
    ],
  },
  {
    type: 'towed-object',
    name: 'Obiekt holowany',
    emoji: '📦',
    description: 'Statek lub obiekt holowany — nie posiada własnego napędu.',
    colreg: 'Prawidło 24(d)',
    hullType: 'motor',
    lights: [portLight, starboardLight, sternlight],
    notes: [
      'BRAK świateł masztowych — kluczowa różnica od statku motorowego',
      'Tylko światła burtowe i rufowe',
      'Jeśli hol > 200m: czarny romb w dzień',
    ],
  },
  {
    type: 'constrained-by-draft',
    name: 'Ograniczony zanurzeniem (CBD)',
    emoji: '📏',
    description:
      'Statek o napędzie mechanicznym ograniczony swoim zanurzeniem — nie może zejść z toru wodnego.',
    colreg: 'Prawidło 28',
    hullType: 'motor',
    lights: [
      allRound(
        'cbd-red-1',
        'Czerwone dookoła (górne)',
        'red',
        8,
        'Górne czerwone światło — element sygnału CBD (trzy czerwone w pionie).',
      ),
      allRound(
        'cbd-red-2',
        'Czerwone dookoła (środkowe)',
        'red',
        6.5,
        'Środkowe czerwone światło — element sygnału CBD.',
      ),
      allRound(
        'cbd-red-3',
        'Czerwone dookoła (dolne)',
        'red',
        5,
        'Dolne czerwone światło — element sygnału CBD.',
      ),
      masthead(-2.5, 9),
      mastheadAft(2, 10),
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'cbd-cylinder',
        name: 'Czarny walec',
        shape: 'cylinder',
        position: [0, 6.5, -1.5],
        description: 'Czarny walec — znak dzienny statku ograniczonego zanurzeniem.',
      },
    ],
    notes: [
      'TRZY czerwone światła w pionie + standardowe światła motorowe',
      'Stosowany wyłącznie na wodach o ograniczonej głębokości',
      'W dzień: czarny walec (cylinder)',
    ],
  },
  {
    type: 'aground',
    name: 'Na mieliźnie',
    emoji: '🪨',
    description: 'Statek osadzony na mieliźnie — utknął na dnie. Sygnał ratunkowy.',
    colreg: 'Prawidło 30(d)',
    hullType: 'motor',
    lights: [
      allRound(
        'anchor-bow',
        'Białe dookoła (dziób)',
        'white',
        6,
        'Białe światło kotwiczne — jak statek na kotwicy.',
      ),
      allRound(
        'aground-red-1',
        'Czerwone dookoła (górne)',
        'red',
        8,
        'Górne czerwone światło — element sygnału mielizny.',
      ),
      allRound(
        'aground-red-2',
        'Czerwone dookoła (dolne)',
        'red',
        7,
        'Dolne czerwone światło — element sygnału mielizny.',
      ),
    ],
    dayMarks: [
      {
        id: 'aground-ball-1',
        name: 'Czarna kula (górna)',
        shape: 'ball',
        position: [0, 8, -1.5],
        description: 'Górna kula — element znaku mielizny.',
      },
      {
        id: 'aground-ball-2',
        name: 'Czarna kula (środkowa)',
        shape: 'ball',
        position: [0, 6.8, -1.5],
        description: 'Środkowa kula — element znaku mielizny.',
      },
      {
        id: 'aground-ball-3',
        name: 'Czarna kula (dolna)',
        shape: 'ball',
        position: [0, 5.6, -1.5],
        description: 'Dolna kula — element znaku mielizny.',
      },
    ],
    notes: [
      'Światła jak na kotwicy + dwa czerwone w pionie na maszcie',
      'W dzień: TRZY czarne kule w pionie',
      'Statki < 12m nie muszą pokazywać tych sygnałów',
    ],
  },
  {
    type: 'mine-clearance',
    name: 'Trałowiec (min)',
    emoji: '💣',
    description: 'Statek zajęty oczyszczaniem z min — skrajnie niebezpieczny do mijania.',
    colreg: 'Prawidło 27(f)',
    hullType: 'motor',
    lights: [
      masthead(-2.5, 5.5),
      allRound(
        'mine-green-mast',
        'Zielone dookoła (maszt)',
        'green',
        7.5,
        'Zielone światło na szczycie przedniego masztu — element sygnału oczyszczania z min.',
      ),
      {
        id: 'mine-green-stb',
        name: 'Zielone dookoła (reja StB)',
        color: 'green',
        position: [1.5, 7, -2],
        arcDeg: 360,
        arcCenterDeg: 0,
        description: 'Zielone światło na końcu rei prawej — element sygnału oczyszczania z min.',
      },
      {
        id: 'mine-green-port',
        name: 'Zielone dookoła (reja Bb)',
        color: 'green',
        position: [-1.5, 7, -2],
        arcDeg: 360,
        arcCenterDeg: 0,
        description: 'Zielone światło na końcu rei lewej — element sygnału oczyszczania z min.',
      },
      portLight,
      starboardLight,
      sternlight,
    ],
    dayMarks: [
      {
        id: 'mine-ball-mast',
        name: 'Czarna kula (maszt)',
        shape: 'ball',
        position: [0, 7.5, -2],
        description: 'Kula na szczycie masztu — element znaku oczyszczania z min.',
      },
      {
        id: 'mine-ball-stb',
        name: 'Czarna kula (reja StB)',
        shape: 'ball',
        position: [1.5, 7, -2],
        description: 'Kula na końcu rei prawej.',
      },
      {
        id: 'mine-ball-port',
        name: 'Czarna kula (reja Bb)',
        shape: 'ball',
        position: [-1.5, 7, -2],
        description: 'Kula na końcu rei lewej.',
      },
    ],
    notes: [
      'TRZY zielone światła: jedno na maszcie, dwa na końcach rei',
      'Nie zbliżaj się na mniej niż 1000m od takiego statku!',
      'W dzień: trzy czarne kule w takim samym układzie jak światła',
    ],
  },
  {
    type: 'pilot-vessel',
    name: 'Statek pilotowy',
    emoji: '🧭',
    description: 'Statek pilotowy pełniący służbę pilotową — oczekuje na statek do pilotowania.',
    colreg: 'Prawidło 29',
    hullType: 'pilot',
    lights: [
      allRound(
        'pilot-white',
        'Białe dookoła (górne)',
        'white',
        7,
        'Białe światło dookoła widnokręgu — górne światło pary pilotowej.',
      ),
      allRound(
        'pilot-red',
        'Czerwone dookoła (dolne)',
        'red',
        5.5,
        'Czerwone światło dookoła widnokręgu — dolne światło pary pilotowej.',
      ),
      portLight,
      starboardLight,
      sternlight,
    ],
    notes: [
      'Białe NAD czerwonym dookoła widnokręgu — sygnał pilota',
      'Dodatkowo światła burtowe i rufowe gdy w drodze',
      'W dzień: flaga "H" (Hotel) z Międzynarodowego Kodu Sygnałowego',
    ],
  },
  {
    type: 'hovercraft',
    name: 'Poduszkowiec',
    emoji: '🚁',
    description:
      'Poduszkowiec w stanie bezwypornościowym — unosi się nad wodą na poduszce powietrznej.',
    colreg: 'Prawidło 23(b)',
    hullType: 'motor',
    lights: [
      masthead(-2, 5.5),
      mastheadAft(2, 7),
      portLight,
      starboardLight,
      sternlight,
      {
        id: 'hovercraft-flash',
        name: 'Żółte błyskowe dookoła',
        color: 'yellow',
        position: [0, 8, 0],
        arcDeg: 360,
        arcCenterDeg: 0,
        description:
          'Żółte światło błyskowe widoczne dookoła widnokręgu — oznacza poduszkowiec w stanie bezwypornościowym.',
        flashing: true,
      },
    ],
    notes: [
      'Światła jak statek motorowy + żółte BŁYSKOWE dookoła widnokręgu',
      'Błyskanie ≥ 120 błysków/min',
      'Tylko w stanie bezwypornościowym (uniesiony nad wodę)',
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────

export function getProfile(type: ShipType): ShipLightProfile {
  return shipLightProfiles.find((p) => p.type === type)!;
}

/**
 * Check if a light is visible from a given camera angle.
 * @param light - the light definition
 * @param cameraAngleDeg - camera angle in degrees (0 = bow, clockwise from above)
 * @returns visibility factor 0..1 (with smooth fade at edges)
 */
export function getLightVisibility(light: LightDef, cameraAngleDeg: number): number {
  if (light.arcDeg >= 360) return 1;

  // Normalize angles to 0-360
  const cam = ((cameraAngleDeg % 360) + 360) % 360;
  const center = ((light.arcCenterDeg % 360) + 360) % 360;
  const halfArc = light.arcDeg / 2;

  // Angular distance between camera and arc center
  let diff = Math.abs(cam - center);
  if (diff > 180) diff = 360 - diff;

  if (diff <= halfArc - 5) return 1; // fully visible
  if (diff >= halfArc + 2) return 0; // fully hidden
  // Smooth fade in the 7° transition zone
  return 1 - (diff - (halfArc - 5)) / 7;
}

// ── VHF Channel Data – Polish Coast ──────────────────────────────────────────

export interface VhfChannel {
  id: string;
  name: string;
  channels: string;
  note?: string;
}

export interface VhfGroup {
  label: string;
  icon: string;
  channels: VhfChannel[];
  footnotes?: string[];
}

export const vhfGroups: VhfGroup[] = [
  {
    label: 'Służby ratownicze',
    icon: '🆘',
    channels: [
      { id: 'rescue-radio', name: 'Polish Rescue Radio', channels: '5, 61, 62' },
      { id: 'sar', name: 'SAR', channels: '11' },
    ],
  },
  {
    label: 'Komunikacja',
    icon: '📡',
    channels: [
      {
        id: 'yacht-comms-72',
        name: 'Między jachtami',
        channels: '72',
      },
      {
        id: 'yacht-comms-69',
        name: 'Między jachtami',
        channels: '69',
        note: 'oprócz Szczecina',
      },
      { id: 'ship-comms', name: 'Między statkami', channels: '6' },
    ],
  },
  {
    label: 'VTS / Traffic',
    icon: '🚦',
    channels: [
      { id: 'vts-lawica', name: 'VTS Ławica', channels: '73' },
      { id: 'vts-zatoka', name: 'VTS Zatoka', channels: 'anons 16, 71 · emisja 66' },
      { id: 'swinoujscie-traffic', name: 'Świnoujście Traffic', channels: 'anons 12 · emisja 71' },
      { id: 'szczecin-traffic', name: 'Szczecin Traffic', channels: 'anons 69 · emisja 71' },
    ],
  },
  {
    label: 'Porty',
    icon: '⚓',
    channels: [
      {
        id: 'port-swinoujscie',
        name: 'Świnoujście',
        channels: '74*, 12**',
      },
      {
        id: 'port-szczecin',
        name: 'Szczecin',
        channels: '69**',
      },
      {
        id: 'port-zalew-szczecinski',
        name: 'Trzebież, Stepnica, Wolin, Nowe Warpno, Kamień Pomorski',
        channels: '71',
      },
      {
        id: 'port-dziwnow-mrzezyno',
        name: 'Dziwnów, Mrzeżyno',
        channels: '10',
      },
      {
        id: 'port-srodkowe',
        name: 'Dźwirzyno, Kołobrzeg, Darłowo, Ustka, Rowy, Łeba',
        channels: '12',
      },
      {
        id: 'port-zatoka-pucka',
        name: 'Władysławowo, Hel, Jastarnia, Kuźnica, Puck',
        channels: '10',
      },
      {
        id: 'port-gdynia',
        name: 'Gdynia',
        channels: '12',
      },
      {
        id: 'port-sopot',
        name: 'Sopot',
        channels: '63',
      },
      {
        id: 'port-gdansk',
        name: 'Gdańsk',
        channels: '14',
      },
      {
        id: 'port-elblag-zalew',
        name: 'Elbląg i wszystkie porty Zalewu Wiślanego',
        channels: '10',
      },
    ],
    footnotes: [
      '* Kapitanat – obsługuje małe jednostki, ten sam kanał używa marina w Basenie Północnym',
      '** VTS – wyłącznie duże statki',
    ],
  },
];

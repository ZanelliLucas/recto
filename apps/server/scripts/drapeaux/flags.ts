import {
  H,
  W,
  circle,
  crescent,
  hStripes,
  line,
  nordicCross,
  outline,
  pentagram,
  polygon,
  rect,
  regularPolygon,
  star,
  vStripes,
  type Point,
} from './svg';

export interface FlagDefinition {
  /** Code ISO 3166-1 alpha-2, qui sert d'identifiant d'image. */
  code: string;
  name: string;
  /** Fichier de référence du dessin officiel sur Wikimedia Commons. */
  commonsFile: string;
  /** EF-3.9 — drapeaux confondables entre eux, jamais réunis dans un même tirage. */
  visualGroup?: string;
  /** Drapeau carré (Suisse) plutôt qu'en 3:2. */
  square?: boolean;
  draw: () => string;
}

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** Bordure dentelée du guindant (Qatar, Bahreïn). */
function serrated(hoist: number, teeth: number, depth: number, fill: string): string {
  const step = H / teeth;
  const points: Point[] = [[W, 0], [W, H], [hoist, H]];
  for (let k = 0; k < teeth; k++) {
    points.push([hoist + depth, H - (k + 0.5) * step], [hoist, H - (k + 1) * step]);
  }
  return polygon(points, fill);
}

export const FLAGS: FlagDefinition[] = [
  // Tricolores verticaux
  { code: 'fr', name: 'France', commonsFile: 'Flag_of_France.svg', draw: () => vStripes(['#002654', WHITE, '#ED2939']) },
  { code: 'it', name: 'Italie', commonsFile: 'Flag_of_Italy.svg', draw: () => vStripes(['#009246', WHITE, '#CE2B37']) },
  {
    code: 'ie',
    name: 'Irlande',
    commonsFile: 'Flag_of_Ireland.svg',
    visualGroup: 'vertical-vert-blanc-orange',
    draw: () => vStripes(['#169B62', WHITE, '#FF883E']),
  },
  {
    code: 'ci',
    name: "Côte d'Ivoire",
    commonsFile: "Flag_of_Côte_d'Ivoire.svg",
    visualGroup: 'vertical-vert-blanc-orange',
    draw: () => vStripes(['#F77F00', WHITE, '#009E60']),
  },
  { code: 'be', name: 'Belgique', commonsFile: 'Flag_of_Belgium.svg', draw: () => vStripes([BLACK, '#FDDA24', '#EF3340']) },
  {
    code: 'ro',
    name: 'Roumanie',
    commonsFile: 'Flag_of_Romania.svg',
    visualGroup: 'vertical-bleu-jaune-rouge',
    draw: () => vStripes(['#002B7F', '#FCD116', '#CE1126']),
  },
  {
    code: 'td',
    name: 'Tchad',
    commonsFile: 'Flag_of_Chad.svg',
    visualGroup: 'vertical-bleu-jaune-rouge',
    draw: () => vStripes(['#002664', '#FECB00', '#C60C30']),
  },
  {
    code: 'ml',
    name: 'Mali',
    commonsFile: 'Flag_of_Mali.svg',
    visualGroup: 'vertical-vert-jaune-rouge',
    draw: () => vStripes(['#14B53A', '#FCD116', '#CE1126']),
  },
  {
    code: 'cm',
    name: 'Cameroun',
    commonsFile: 'Flag_of_Cameroon.svg',
    visualGroup: 'vertical-vert-jaune-rouge',
    draw: () => vStripes(['#007A5E', '#CE1126', '#FCD116']) + star(150, 100, 30, '#FCD116'),
  },
  { code: 'ng', name: 'Nigeria', commonsFile: 'Flag_of_Nigeria.svg', draw: () => vStripes(['#008751', WHITE, '#008751']) },
  { code: 'pe', name: 'Pérou', commonsFile: 'Flag_of_Peru.svg', draw: () => vStripes(['#D91023', WHITE, '#D91023']) },

  // Bandes horizontales
  { code: 'de', name: 'Allemagne', commonsFile: 'Flag_of_Germany.svg', draw: () => hStripes([BLACK, '#DD0000', '#FFCE00']) },
  {
    code: 'nl',
    name: 'Pays-Bas',
    commonsFile: 'Flag_of_the_Netherlands.svg',
    visualGroup: 'horizontal-rouge-blanc-bleu',
    draw: () => hStripes(['#AE1C28', WHITE, '#21468B']),
  },
  {
    code: 'lu',
    name: 'Luxembourg',
    commonsFile: 'Flag_of_Luxembourg.svg',
    visualGroup: 'horizontal-rouge-blanc-bleu',
    draw: () => hStripes(['#EA141D', WHITE, '#51ADDA']),
  },
  { code: 'ru', name: 'Russie', commonsFile: 'Flag_of_Russia.svg', draw: () => hStripes([WHITE, '#0039A6', '#D52B1E']) },
  {
    code: 'at',
    name: 'Autriche',
    commonsFile: 'Flag_of_Austria.svg',
    visualGroup: 'horizontal-rouge-blanc-rouge',
    draw: () => hStripes(['#ED2939', WHITE, '#ED2939']),
  },
  {
    code: 'lv',
    name: 'Lettonie',
    commonsFile: 'Flag_of_Latvia.svg',
    visualGroup: 'horizontal-rouge-blanc-rouge',
    draw: () => hStripes(['#9E3039', WHITE, '#9E3039'], [2, 1, 2]),
  },
  {
    code: 'hu',
    name: 'Hongrie',
    commonsFile: 'Flag_of_Hungary.svg',
    visualGroup: 'horizontal-blanc-vert-rouge',
    draw: () => hStripes(['#CE2939', WHITE, '#477050']),
  },
  {
    code: 'bg',
    name: 'Bulgarie',
    commonsFile: 'Flag_of_Bulgaria.svg',
    visualGroup: 'horizontal-blanc-vert-rouge',
    draw: () => hStripes([WHITE, '#00966E', '#D62612']),
  },
  {
    code: 'lt',
    name: 'Lituanie',
    commonsFile: 'Flag_of_Lithuania.svg',
    visualGroup: 'horizontal-jaune-vert-rouge',
    draw: () => hStripes(['#FDB913', '#006A44', '#C1272D']),
  },
  {
    code: 'bo',
    name: 'Bolivie',
    commonsFile: 'Flag_of_Bolivia.svg',
    visualGroup: 'horizontal-jaune-vert-rouge',
    draw: () => hStripes(['#D52B1E', '#F9E300', '#007934']),
  },
  {
    code: 'gh',
    name: 'Ghana',
    commonsFile: 'Flag_of_Ghana.svg',
    visualGroup: 'horizontal-jaune-vert-rouge',
    draw: () => hStripes(['#CE1126', '#FCD116', '#006B3F']) + star(150, 100, 30, BLACK),
  },
  { code: 'ee', name: 'Estonie', commonsFile: 'Flag_of_Estonia.svg', draw: () => hStripes(['#0072CE', BLACK, WHITE]) },
  { code: 'am', name: 'Arménie', commonsFile: 'Flag_of_Armenia.svg', draw: () => hStripes(['#D90012', '#0033A0', '#F2A800']) },
  {
    code: 'ga',
    name: 'Gabon',
    commonsFile: 'Flag_of_Gabon.svg',
    visualGroup: 'horizontal-vert-bleu',
    draw: () => hStripes(['#009E60', '#FCD116', '#3A75C4']),
  },
  {
    code: 'sl',
    name: 'Sierra Leone',
    commonsFile: 'Flag_of_Sierra_Leone.svg',
    visualGroup: 'horizontal-vert-bleu',
    draw: () => hStripes(['#1EB53A', WHITE, '#0072C6']),
  },
  { code: 'ye', name: 'Yémen', commonsFile: 'Flag_of_Yemen.svg', draw: () => hStripes(['#CE1126', WHITE, BLACK]) },
  {
    code: 'co',
    name: 'Colombie',
    commonsFile: 'Flag_of_Colombia.svg',
    draw: () => hStripes(['#FCD116', '#003893', '#CE1126'], [2, 1, 1]),
  },
  {
    code: 'pl',
    name: 'Pologne',
    commonsFile: 'Flag_of_Poland.svg',
    visualGroup: 'bicolore-rouge-blanc',
    draw: () => hStripes([WHITE, '#DC143C']),
  },
  {
    code: 'id',
    name: 'Indonésie',
    commonsFile: 'Flag_of_Indonesia.svg',
    visualGroup: 'bicolore-rouge-blanc',
    draw: () => hStripes(['#FF0000', WHITE]),
  },
  { code: 'ua', name: 'Ukraine', commonsFile: 'Flag_of_Ukraine.svg', draw: () => hStripes(['#0057B7', '#FFD700']) },
  {
    code: 'th',
    name: 'Thaïlande',
    commonsFile: 'Flag_of_Thailand.svg',
    draw: () => hStripes(['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], [1, 1, 2, 1, 1]),
  },
  {
    code: 'mu',
    name: 'Maurice',
    commonsFile: 'Flag_of_Mauritius.svg',
    draw: () => hStripes(['#EA2839', '#1A206D', '#FFD500', '#00A551']),
  },
  {
    code: 'gm',
    name: 'Gambie',
    commonsFile: 'Flag_of_The_Gambia.svg',
    draw: () => hStripes(['#CE1126', WHITE, '#0C1C8C', WHITE, '#3A7728'], [6, 1, 4, 1, 6]),
  },
  {
    code: 'bw',
    name: 'Botswana',
    commonsFile: 'Flag_of_Botswana.svg',
    draw: () => hStripes(['#6DA9D2', WHITE, BLACK, WHITE, '#6DA9D2'], [9, 1, 4, 1, 9]),
  },

  // Croix scandinaves
  { code: 'se', name: 'Suède', commonsFile: 'Flag_of_Sweden.svg', draw: () => nordicCross('#006AA7', '#FECC00') },
  { code: 'dk', name: 'Danemark', commonsFile: 'Flag_of_Denmark.svg', draw: () => nordicCross('#C8102E', WHITE) },
  { code: 'fi', name: 'Finlande', commonsFile: 'Flag_of_Finland.svg', draw: () => nordicCross(WHITE, '#002F6C', undefined, 54) },
  {
    code: 'no',
    name: 'Norvège',
    commonsFile: 'Flag_of_Norway.svg',
    visualGroup: 'croix-nordique-bordee',
    draw: () => nordicCross('#BA0C2F', WHITE, '#00205B', 44),
  },
  {
    code: 'is',
    name: 'Islande',
    commonsFile: 'Flag_of_Iceland.svg',
    visualGroup: 'croix-nordique-bordee',
    draw: () => nordicCross('#02529C', WHITE, '#DC1E35', 44),
  },

  // Disques
  { code: 'jp', name: 'Japon', commonsFile: 'Flag_of_Japan.svg', draw: () => rect(0, 0, W, H, WHITE) + circle(150, 100, 60, '#BC002D') },
  {
    code: 'bd',
    name: 'Bangladesh',
    commonsFile: 'Flag_of_Bangladesh.svg',
    draw: () => rect(0, 0, W, H, '#006A4E') + circle(135, 100, 66, '#F42A41'),
  },
  { code: 'pw', name: 'Palaos', commonsFile: 'Flag_of_Palau.svg', draw: () => rect(0, 0, W, H, '#0099FF') + circle(135, 100, 60, '#FFDE00') },
  {
    code: 'la',
    name: 'Laos',
    commonsFile: 'Flag_of_Laos.svg',
    draw: () => hStripes(['#CE1126', '#002868', '#CE1126'], [1, 2, 1]) + circle(150, 100, 40, WHITE),
  },

  // Croix
  {
    code: 'ch',
    name: 'Suisse',
    commonsFile: 'Flag_of_Switzerland.svg',
    square: true,
    draw: () => rect(0, 0, 200, 200, '#DA291C') + rect(81.25, 37.5, 37.5, 125, WHITE) + rect(37.5, 81.25, 125, 37.5, WHITE),
  },
  {
    code: 'gr',
    name: 'Grèce',
    commonsFile: 'Flag_of_Greece.svg',
    draw: () => {
      const blue = '#0D5EAF';
      const s = H / 9;
      return (
        hStripes(Array.from({ length: 9 }, (_, i) => (i % 2 === 0 ? blue : WHITE))) +
        rect(0, 0, 5 * s, 5 * s, blue) +
        rect(2 * s, 0, s, 5 * s, WHITE) +
        rect(0, 2 * s, 5 * s, s, WHITE)
      );
    },
  },
  {
    code: 'ge',
    name: 'Géorgie',
    commonsFile: 'Flag_of_Georgia.svg',
    draw: () => {
      const red = '#FF0000';
      const corners: Point[] = [[65, 40], [235, 40], [65, 160], [235, 160]];
      const small = ([x, y]: Point) => rect(x - 18, y - 5, 36, 10, red) + rect(x - 5, y - 18, 10, 36, red);
      return rect(0, 0, W, H, WHITE) + rect(130, 0, 40, H, red) + rect(0, 80, W, 40, red) + corners.map(small).join('');
    },
  },

  // Triangles et bandes au guindant
  {
    code: 'cz',
    name: 'Tchéquie',
    commonsFile: 'Flag_of_the_Czech_Republic.svg',
    visualGroup: 'triangle-bleu-blanc-rouge',
    draw: () => hStripes([WHITE, '#D7141A']) + polygon([[0, 0], [150, 100], [0, 200]], '#11457E'),
  },
  {
    code: 'ph',
    name: 'Philippines',
    commonsFile: 'Flag_of_the_Philippines.svg',
    visualGroup: 'triangle-bleu-blanc-rouge',
    draw: () => {
      const gold = '#FCD116';
      return (
        hStripes(['#0038A8', '#CE1126']) +
        polygon([[0, 0], [173.2, 100], [0, 200]], WHITE) +
        star(57.7, 100, 30, gold, { points: 8, inner: 0.45 }) +
        circle(57.7, 100, 13, gold) +
        star(18, 24, 8, gold) +
        star(18, 176, 8, gold) +
        star(146, 100, 8, gold)
      );
    },
  },
  {
    code: 'cu',
    name: 'Cuba',
    commonsFile: 'Flag_of_Cuba.svg',
    visualGroup: 'triangle-bleu-blanc-rouge',
    draw: () =>
      hStripes(['#002A8F', WHITE, '#002A8F', WHITE, '#002A8F']) +
      polygon([[0, 0], [173.2, 100], [0, 200]], '#CF142B') +
      star(57.7, 100, 26, WHITE),
  },
  {
    code: 'bs',
    name: 'Bahamas',
    commonsFile: 'Flag_of_the_Bahamas.svg',
    draw: () => hStripes(['#00778B', '#FFC72C', '#00778B']) + polygon([[0, 0], [130, 100], [0, 200]], BLACK),
  },
  {
    code: 'kw',
    name: 'Koweït',
    commonsFile: 'Flag_of_Kuwait.svg',
    visualGroup: 'panarabe',
    draw: () => hStripes(['#007A3D', WHITE, '#CE1126']) + polygon([[0, 0], [75, 66.67], [75, 133.33], [0, 200]], BLACK),
  },
  {
    code: 'ae',
    name: 'Émirats arabes unis',
    commonsFile: 'Flag_of_the_United_Arab_Emirates.svg',
    visualGroup: 'panarabe',
    draw: () => hStripes(['#00732F', WHITE, BLACK]) + rect(0, 0, 75, H, '#FF0000'),
  },
  {
    code: 'jo',
    name: 'Jordanie',
    commonsFile: 'Flag_of_Jordan.svg',
    visualGroup: 'panarabe',
    draw: () =>
      hStripes([BLACK, WHITE, '#007A3D']) +
      polygon([[0, 0], [150, 100], [0, 200]], '#CE1126') +
      star(52, 100, 14, WHITE, { points: 7, inner: 0.5 }),
  },
  {
    code: 'bj',
    name: 'Bénin',
    commonsFile: 'Flag_of_Benin.svg',
    visualGroup: 'bande-verticale-et-deux-bandes',
    draw: () => rect(0, 0, 120, H, '#008751') + rect(120, 0, 180, 100.5, '#FCD116') + rect(120, 100, 180, 100, '#E8112D'),
  },
  {
    code: 'mg',
    name: 'Madagascar',
    commonsFile: 'Flag_of_Madagascar.svg',
    visualGroup: 'bande-verticale-et-deux-bandes',
    draw: () => rect(0, 0, 100, H, WHITE) + rect(100, 0, 200, 100.5, '#FC3D32') + rect(100, 100, 200, 100, '#007E3A'),
  },
  {
    code: 'sc',
    name: 'Seychelles',
    commonsFile: 'Flag_of_Seychelles.svg',
    draw: () =>
      rect(0, 0, W, H, '#D62828') +
      polygon([[0, 200], [0, 0], [100, 0]], '#003F87') +
      polygon([[0, 200], [100, 0], [200, 0]], '#FCD856') +
      polygon([[0, 200], [300, 66.67], [300, 133.33]], WHITE) +
      polygon([[0, 200], [300, 133.33], [300, 200]], '#007A3D'),
  },

  // Étoiles
  { code: 'vn', name: 'Viêt Nam', commonsFile: 'Flag_of_Vietnam.svg', draw: () => rect(0, 0, W, H, '#DA251D') + star(150, 100, 60, '#FFFF00') },
  { code: 'so', name: 'Somalie', commonsFile: 'Flag_of_Somalia.svg', draw: () => rect(0, 0, W, H, '#4189DD') + star(150, 100, 42, WHITE) },
  {
    code: 'cn',
    name: 'Chine',
    commonsFile: "Flag_of_the_People's_Republic_of_China.svg",
    draw: () => {
      const yellow = '#FFDE00';
      const smallStars: Point[] = [[100, 20], [120, 40], [120, 70], [100, 90]];
      // Chaque petite étoile pointe vers le centre de la grande.
      const pointTowardCenter = ([x, y]: Point) =>
        star(x, y, 10, yellow, { rotate: (Math.atan2(50 - y, 50 - x) * 180) / Math.PI + 90 });
      return rect(0, 0, W, H, '#EE1C25') + star(50, 50, 30, yellow) + smallStars.map(pointTowardCenter).join('');
    },
  },
  { code: 'ma', name: 'Maroc', commonsFile: 'Flag_of_Morocco.svg', draw: () => rect(0, 0, W, H, '#C1272D') + pentagram(150, 104, 46, '#006233', 7) },
  {
    code: 'bf',
    name: 'Burkina Faso',
    commonsFile: 'Flag_of_Burkina_Faso.svg',
    draw: () => hStripes(['#EF2B2D', '#009E49']) + star(150, 100, 32, '#FCD116'),
  },
  {
    code: 'cl',
    name: 'Chili',
    commonsFile: 'Flag_of_Chile.svg',
    draw: () => hStripes([WHITE, '#D52B1E']) + rect(0, 0, 100, 100, '#0039A6') + star(50, 50, 24, WHITE),
  },
  {
    code: 'pa',
    name: 'Panama',
    commonsFile: 'Flag_of_Panama.svg',
    draw: () =>
      rect(0, 0, 150, 100, WHITE) +
      rect(150, 0, 150, 100, '#D21034') +
      rect(0, 100, 150, 100, '#005293') +
      rect(150, 100, 150, 100, WHITE) +
      star(75, 50, 22, '#005293') +
      star(225, 150, 22, '#D21034'),
  },
  {
    code: 'il',
    name: 'Israël',
    commonsFile: 'Flag_of_Israel.svg',
    draw: () => {
      const blue = '#0038B8';
      return (
        rect(0, 0, W, H, WHITE) +
        rect(0, 20, W, 30, blue) +
        rect(0, 150, W, 30, blue) +
        outline(regularPolygon(150, 100, 40, 3), blue, 7) +
        outline(regularPolygon(150, 100, 40, 3, 180), blue, 7)
      );
    },
  },

  // Croissants
  {
    code: 'tr',
    name: 'Turquie',
    commonsFile: 'Flag_of_Turkey.svg',
    visualGroup: 'croissant-rouge-blanc',
    draw: () => rect(0, 0, W, H, '#E30A17') + crescent(112, 100, 50, 40, 12.5, WHITE) + star(178, 100, 25, WHITE, { rotate: -90 }),
  },
  {
    code: 'tn',
    name: 'Tunisie',
    commonsFile: 'Flag_of_Tunisia.svg',
    visualGroup: 'croissant-rouge-blanc',
    draw: () =>
      rect(0, 0, W, H, '#E70013') +
      circle(150, 100, 52, WHITE) +
      crescent(143, 100, 38, 31, 10, '#E70013') +
      star(166, 100, 21, '#E70013', { rotate: -90 }),
  },
  {
    code: 'dz',
    name: 'Algérie',
    commonsFile: 'Flag_of_Algeria.svg',
    visualGroup: 'croissant-vert-blanc',
    draw: () => vStripes(['#006233', WHITE]) + crescent(158, 100, 50, 40, 13, '#D21034') + star(190, 100, 22, '#D21034', { rotate: -90 }),
  },
  {
    code: 'pk',
    name: 'Pakistan',
    commonsFile: 'Flag_of_Pakistan.svg',
    visualGroup: 'croissant-vert-blanc',
    draw: () =>
      rect(0, 0, 75, H, WHITE) +
      rect(75, 0, 225, H, '#01411C') +
      crescent(188, 106, 52, 44, 15, WHITE, -40) +
      star(222, 78, 14, WHITE, { rotate: 230 }),
  },

  // Diagonales
  {
    code: 'cg',
    name: 'République du Congo',
    commonsFile: 'Flag_of_the_Republic_of_the_Congo.svg',
    draw: () =>
      polygon([[0, 0], [300, 0], [0, 200]], '#009543') +
      polygon([[300, 0], [300, 200], [0, 200]], '#DC241F') +
      line(0, 200, 300, 0, '#FBDE4A', 62),
  },
  {
    code: 'tz',
    name: 'Tanzanie',
    commonsFile: 'Flag_of_Tanzania.svg',
    draw: () =>
      polygon([[0, 0], [300, 0], [0, 200]], '#1EB53A') +
      polygon([[300, 0], [300, 200], [0, 200]], '#00A3DD') +
      line(0, 200, 300, 0, '#FCD116', 72) +
      line(0, 200, 300, 0, BLACK, 50),
  },
  {
    code: 'jm',
    name: 'Jamaïque',
    commonsFile: 'Flag_of_Jamaica.svg',
    draw: () =>
      rect(0, 0, W, H, '#009B3A') +
      polygon([[0, 0], [150, 100], [0, 200]], BLACK) +
      polygon([[300, 0], [150, 100], [300, 200]], BLACK) +
      line(0, 0, 300, 200, '#FED100', 28) +
      line(0, 200, 300, 0, '#FED100', 28),
  },
  {
    code: 'tt',
    name: 'Trinité-et-Tobago',
    commonsFile: 'Flag_of_Trinidad_and_Tobago.svg',
    draw: () => rect(0, 0, W, H, '#CE1126') + line(0, 0, 300, 200, WHITE, 76) + line(0, 0, 300, 200, BLACK, 54),
  },

  // Guindant dentelé
  {
    code: 'qa',
    name: 'Qatar',
    commonsFile: 'Flag_of_Qatar.svg',
    visualGroup: 'guindant-dentele',
    draw: () => rect(0, 0, W, H, WHITE) + serrated(80, 9, 30, '#8A1538'),
  },
  {
    code: 'bh',
    name: 'Bahreïn',
    commonsFile: 'Flag_of_Bahrain.svg',
    visualGroup: 'guindant-dentele',
    draw: () => rect(0, 0, W, H, WHITE) + serrated(75, 5, 35, '#CE1126'),
  },
];

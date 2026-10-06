/* Appearance: colour themes, wallpapers, icon packs and the home shortcuts.

   Everything is tied to the active theme. A theme sets a handful of colours (CSS variables);
   wallpapers and most icon packs are drawn from those same colours, so any combination
   matches. "Surprise me" adds pairing rules on top (glass icons need a patterned wallpaper,
   neon icons belong on a dark one) and can mint a one-off colour theme of its own. */

export interface Look {
  theme: string;
  wallpaper: string;
  icons: string;
  /** Varies the generated wallpapers (contours, stars, marble veins, dunes). */
  seed: number;
  /** Colours of a one-off "unique" theme; absent for the named themes. */
  vars?: Record<string, string>;
  /** Name of a one-off theme. */
  uniqueName?: string;
  /** IDs of the shortcuts on top of the home screen, in order. */
  shortcuts: string[];
}

export interface Theme {
  id: string;
  name: string;
  note: string;
  /** Navbar, highlight and soft wash — for the swatch. */
  swatch: [string, string, string];
}

export const THEMES: Theme[] = [
  { id: 'signature', name: 'A&Sons Signature', note: 'Company navy with the logo red', swatch: ['#1F2456', '#D7262E', '#EEF0F8'] },
  { id: 'emerald', name: 'Margalla Emerald', note: 'Deep forest green and old gold', swatch: ['#0E4D3A', '#C9A040', '#EAF4EF'] },
  { id: 'sandstone', name: 'Badshahi Sandstone', note: 'Red sandstone and saffron', swatch: ['#7A2A1A', '#E0A33A', '#F8EEEA'] },
  { id: 'lapis', name: 'Lapis & Gold', note: 'Mughal inlay blue with gold leaf', swatch: ['#1B2F6B', '#D2A646', '#ECF0FA'] },
  { id: 'indus', name: 'Indus Teal', note: 'River teal with a coral sunset', swatch: ['#0F4C5C', '#EE6C4D', '#E8F4F5'] },
  { id: 'rose', name: 'Shalimar Rose', note: 'Garden berry and blush', swatch: ['#6B2141', '#D9718E', '#F8ECF1'] },
  { id: 'night', name: 'Karakoram Night', note: 'Midnight blue and starlight gold', swatch: ['#141A2E', '#E2B34B', '#ECEEF5'] },
  { id: 'marble', name: 'Faisal Marble', note: 'Graphite, white stone and bronze', swatch: ['#2E3440', '#B08D57', '#EFF1F3'] },
  { id: 'hunza', name: 'Hunza Blossom', note: 'Dusk violet and apricot', swatch: ['#3D2B56', '#F4A259', '#F1EDF7'] },
  { id: 'murree', name: 'Murree Pine', note: 'Pine forest and fresh snow', swatch: ['#1F3D36', '#7CC6D6', '#EAF2F0'] },
  { id: 'mehndi', name: 'Mehndi', note: 'Henna orange on olive', swatch: ['#3F4A1C', '#D9822B', '#F2F3E8'] },
  { id: 'monsoon', name: 'Monsoon', note: 'Rain-cloud slate and fresh mint', swatch: ['#263C4A', '#5CC8A0', '#ECF2F5'] },
  { id: 'jamun', name: 'Jamun & Brass', note: 'Ripe jamun purple with old brass', swatch: ['#3B1F4A', '#D6A85A', '#F3EDF6'] },
  { id: 'copper', name: 'Copper Bazaar', note: 'Espresso and hammered copper', swatch: ['#2F2622', '#C8743B', '#F5F0EC'] },
  { id: 'ajrak', name: 'Ajrak', note: 'Sindhi indigo and madder red', swatch: ['#23205C', '#B3282F', '#EEEDF8'] },
];

export interface Wallpaper {
  id: string;
  name: string;
  note: string;
  tone: 'light' | 'dark';
  /** 0 = plain, 1 = soft texture, 2 = strong pattern. */
  busy: 0 | 1 | 2;
}

/* Every wallpaper moves on its own and answers the pointer; the note says how. */
export const WALLPAPERS: Wallpaper[] = [
  { id: 'dots', name: 'Living dots', note: 'Dots swell under the pointer; click sends a ring', tone: 'light', busy: 1 },
  { id: 'ripples', name: 'Rawal lake', note: 'Raindrops on still water — move or click to ripple it', tone: 'light', busy: 1 },
  { id: 'silk', name: 'Resham silk', note: 'Silk ribbons that part around the pointer', tone: 'light', busy: 1 },
  { id: 'shisha', name: 'Shisha mirror-work', note: 'Embroidered mirrors that catch your light', tone: 'light', busy: 2 },
  { id: 'kashi', name: 'Kashi tiles', note: 'Glazed tiles that shine under the pointer', tone: 'light', busy: 2 },
  { id: 'mehndi', name: 'Mehndi', note: 'Henna paisleys that glow where you point', tone: 'light', busy: 2 },
  { id: 'girih', name: 'Girih', note: 'Mughal star tiling, lit like carved stone', tone: 'light', busy: 2 },
  { id: 'jaali', name: 'Jaali', note: 'Carved lattice with light passing through', tone: 'light', busy: 2 },
  { id: 'contour', name: 'Margalla contours', note: 'Survey lines that flow; the hill lights up', tone: 'light', busy: 1 },
  { id: 'marble', name: 'Marble', note: 'Gold veins that glint; polished under the pointer', tone: 'light', busy: 1 },
  { id: 'sweep', name: 'Signature sweep', note: 'The logo’s curves, swaying with the pointer', tone: 'light', busy: 1 },
  { id: 'dunes', name: 'Thar dunes', note: 'Drifting sand ridges in depth', tone: 'light', busy: 1 },
  { id: 'aurora', name: 'Aurora', note: 'Drifting colour that follows you', tone: 'light', busy: 1 },
  { id: 'lanterns', name: 'Chiraghan lights', note: 'Lamps rising over the domes — click to release more', tone: 'dark', busy: 1 },
  { id: 'night', name: 'Karakoram sky', note: 'Twinkling stars, shooting stars, peaks in depth', tone: 'dark', busy: 1 },
  { id: 'velvet', name: 'Velvet', note: 'Deep colour with a light that follows you', tone: 'dark', busy: 0 },
  { id: 'clean', name: 'Clean', note: 'Plain, with a soft light under the pointer', tone: 'light', busy: 0 },
];

export interface IconPack {
  id: string;
  name: string;
  note: string;
}

export const ICON_PACKS: IconPack[] = [
  { id: 'classic', name: 'Classic', note: 'Bright colours on white' },
  { id: 'duotone', name: 'Royal duotone', note: 'Drawn in the theme colours' },
  { id: 'jewel', name: 'Jewel', note: 'Polished tiles in the theme colour' },
  { id: 'glass', name: 'Glass', note: 'Frosted, the wallpaper shows through' },
  { id: 'pastel', name: 'Pastel', note: 'Soft colours on round tiles' },
  { id: 'mono', name: 'Graphite ink', note: 'Grey ink that blooms into colour' },
  { id: 'neon', name: 'Neon', note: 'Glowing colours that pulse' },
  { id: 'zari', name: 'Zari gold', note: 'Gold thread that shimmers' },
  { id: 'sheesh', name: 'Sheesh Mahal', note: 'Stained glass lit by the pointer' },
  { id: 'blueprint', name: 'Blueprint', note: 'Architect’s drawing, traced on hover' },
  { id: 'clay', name: 'Clay', note: 'Soft terracotta that squishes' },
  { id: 'letterpress', name: 'Letterpress', note: 'Pressed into paper, with a wax-red seal' },
];

/** Designer-matched combinations. */
export interface Preset {
  id: string;
  name: string;
  note: string;
  theme: string;
  wallpaper: string;
  icons: string;
}

export const PRESETS: Preset[] = [
  { id: 'signature', name: 'Signature', note: 'The company look', theme: 'signature', wallpaper: 'sweep', icons: 'classic' },
  { id: 'mughal', name: 'Mughal court', note: 'Sandstone, star tiles, jewel icons', theme: 'sandstone', wallpaper: 'girih', icons: 'jewel' },
  { id: 'margalla', name: 'Margalla morning', note: 'Green hills on a survey map', theme: 'emerald', wallpaper: 'contour', icons: 'duotone' },
  { id: 'karakoram', name: 'Karakoram night', note: 'Stars and neon', theme: 'night', wallpaper: 'night', icons: 'neon' },
  { id: 'marble', name: 'Faisal marble', note: 'Stone and graphite ink', theme: 'marble', wallpaper: 'marble', icons: 'mono' },
  { id: 'shalimar', name: 'Shalimar garden', note: 'Rose lattice, pastel icons', theme: 'rose', wallpaper: 'jaali', icons: 'pastel' },
  { id: 'indus', name: 'Indus delta', note: 'Teal dunes behind glass', theme: 'indus', wallpaper: 'dunes', icons: 'glass' },
  { id: 'lapis', name: 'Lapis velvet', note: 'Deep blue with gold jewels', theme: 'lapis', wallpaper: 'velvet', icons: 'jewel' },
  { id: 'sheesh', name: 'Sheesh Mahal', note: 'Mirror-work and stained glass', theme: 'jamun', wallpaper: 'shisha', icons: 'sheesh' },
  { id: 'chiraghan', name: 'Chiraghan night', note: 'Rising lamps and gold thread', theme: 'copper', wallpaper: 'lanterns', icons: 'zari' },
  { id: 'monsoon', name: 'Monsoon', note: 'Rain on the lake, glass icons', theme: 'monsoon', wallpaper: 'ripples', icons: 'glass' },
  { id: 'mehndi', name: 'Mehndi raat', note: 'Henna paisleys and clay', theme: 'mehndi', wallpaper: 'mehndi', icons: 'clay' },
  { id: 'architect', name: 'Architect’s desk', note: 'Survey lines and blueprints', theme: 'murree', wallpaper: 'contour', icons: 'blueprint' },
  { id: 'hunza', name: 'Hunza spring', note: 'Apricot silk, pastel icons', theme: 'hunza', wallpaper: 'silk', icons: 'pastel' },
  { id: 'ajrak', name: 'Ajrak', note: 'Kashi tiles in indigo and red', theme: 'ajrak', wallpaper: 'kashi', icons: 'jewel' },
];

/* --------------------------------------------------------------------------------------
   Home shortcuts: the big buttons on top of the home screen. The person picks which.
   -------------------------------------------------------------------------------------- */
export interface ShortcutDef {
  id: string;
  label: string;
  sub: string;
  icon: string;
  /** Opens this entry form… */
  modal?: string;
  preset?: Record<string, any>;
  /** …or goes to this page… */
  go?: string;
  /** …or starts a new cost sheet. */
  costSheet?: boolean;
  need?: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'proforma', label: 'Proforma', sub: 'Quotation for a buyer', icon: 'proforma', modal: 'proformaInvoice' },
  { id: 'saleInvoice', label: 'Sale Invoice', sub: 'Receipt to the buyer', icon: 'saleInvoice', modal: 'saleInvoice' },
  { id: 'purchaseInvoice', label: 'Purchase Invoice', sub: 'Payment to a seller', icon: 'purchaseInvoice', modal: 'purchaseInvoice' },
  { id: 'property', label: 'Property purchase', sub: 'Add a property you bought', icon: 'purchase', modal: 'property' },
  { id: 'sale', label: 'Record sale', sub: 'Sell a property', icon: 'sales', modal: 'sale' },
  { id: 'costSheet', label: 'Cost sheet', sub: 'Work out a deal', icon: 'landed', costSheet: true },
  { id: 'expense', label: 'Expense', sub: 'Office or personal spending', icon: 'expenses', modal: 'expense', need: 'expenses' },
  { id: 'asset', label: 'Asset', sub: 'Something bought to keep', icon: 'assets', modal: 'expense', preset: { group: 'Assets' }, need: 'expenses' },
  { id: 'payment', label: 'Payment', sub: 'Money in or out', icon: 'cash', modal: 'payment', need: 'transactions' },
  { id: 'task', label: 'Task', sub: 'Something to do', icon: 'tasks', modal: 'task' },
  { id: 'tax', label: 'Tax entry', sub: 'Advance tax, CGT', icon: 'tax', modal: 'tax', need: 'tax' },
  { id: 'zakat', label: 'Zakat', sub: 'Record Zakat paid', icon: 'zakat', modal: 'zakat', need: 'zakat' },
  { id: 'salary', label: 'Salary', sub: 'Pay an employee', icon: 'agents', modal: 'salary', need: 'salaries' },
  { id: 'bill', label: 'Bill', sub: 'Utility or rent bill', icon: 'finance', modal: 'bill', need: 'bills' },
  { id: 'agent', label: 'Agent', sub: 'Add a property agent', icon: 'commission', modal: 'agent' },
];
export const MAX_SHORTCUTS = 6;

export const DEFAULT_LOOK: Look = {
  theme: 'signature',
  wallpaper: 'dots',
  icons: 'classic',
  seed: 7,
  shortcuts: ['proforma', 'saleInvoice', 'purchaseInvoice'],
};

export const findTheme = (id: string) => THEMES.find((t) => t.id === id);
export const findWallpaper = (id: string) => WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
export const findPack = (id: string) => ICON_PACKS.find((p) => p.id === id) || ICON_PACKS[0];

export function themeName(look: Look) {
  return look.theme === 'unique' ? look.uniqueName || 'Unique blend' : (findTheme(look.theme) || THEMES[0]).name;
}

/* --------------------------------------------------------------------------------------
   One-off themes. Colours are picked in OKLCH, where equal lightness looks equally light
   whatever the hue — so a random hue still gives a navbar dark enough for white text, a
   wash pale enough for text on it, and a highlight that reads on both.
   -------------------------------------------------------------------------------------- */
function oklchToHex(L: number, C: number, hDeg: number) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    rgb
      .map((x) => {
        const v = Math.min(1, Math.max(0, x));
        const e = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        return Math.round(e * 255).toString(16).padStart(2, '0');
      })
      .join('')
  );
}

const HUE_NAMES: [number, string][] = [
  [15, 'Pomegranate'], [40, 'Henna'], [62, 'Saffron'], [95, 'Mustard'], [135, 'Olive'], [170, 'Jade'],
  [200, 'Lagoon'], [235, 'Peacock'], [262, 'Lapis'], [290, 'Indigo'], [318, 'Amethyst'], [345, 'Orchid'], [361, 'Pomegranate'],
];

export function uniqueTheme(hue: number, accentShift: number) {
  const h = ((hue % 360) + 360) % 360;
  const ha = (h + accentShift) % 360;
  const c = (L: number, C: number, hh: number) => oklchToHex(L, C, hh);
  const vars: Record<string, string> = {
    '--brand': c(0.34, 0.085, h),
    '--brand-dk': c(0.25, 0.07, h),
    '--brand-2': c(0.5, 0.13, h),
    '--brand-wash': c(0.965, 0.016, h),
    '--brand-edge': c(0.87, 0.04, h),
    '--hl': c(0.66, 0.15, ha),
    '--hl-dk': c(0.5, 0.14, ha),
    '--paper': c(0.985, 0.004, h),
    '--paper-2': c(0.955, 0.008, h),
    '--wp-a': c(0.5, 0.13, h),
    '--wp-b': c(0.68, 0.14, ha),
    '--wp-c': c(0.78, 0.08, (h + 60) % 360),
  };
  const name = (HUE_NAMES.find(([upTo]) => h < upTo) || HUE_NAMES[0])[1];
  return { vars, name: `${name} blend` };
}

/** Every variable a theme sets — cleared before a one-off theme's own are applied. */
export const THEME_VARS = [
  '--brand', '--brand-dk', '--brand-2', '--brand-wash', '--brand-edge', '--hl', '--hl-dk',
  '--paper', '--paper-2', '--wp-a', '--wp-b', '--wp-c',
];

/* --------------------------------------------------------------------------------------
   Surprise me: a random look that still matches.
   -------------------------------------------------------------------------------------- */
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Icon packs that suit a wallpaper. */
export function packsFor(w: Wallpaper) {
  if (w.tone === 'dark') return ['classic', 'jewel', 'glass', 'neon', 'duotone', 'zari', 'sheesh', 'blueprint'];
  return [
    'classic', 'duotone', 'jewel', 'pastel', 'mono', 'zari', 'sheesh', 'blueprint', 'clay',
    // Frosted glass needs something behind it; pressed paper needs a calm one.
    ...(w.busy >= 1 ? ['glass'] : []),
    ...(w.busy <= 1 ? ['letterpress'] : []),
  ];
}

export function surpriseLook(prev: Look): Look {
  // Never the same wallpaper twice running, and never the plain one: a surprise should show.
  const walls = WALLPAPERS.filter((w) => w.id !== 'clean' && w.id !== prev.wallpaper);
  const wall = pick(walls);
  const packs = packsFor(wall).filter((p) => p !== prev.icons);
  const icons = pick(packs.length ? packs : packsFor(wall));
  const seed = 1 + Math.floor(Math.random() * 1e6);

  // One time in three, a colour theme nobody else has.
  if (Math.random() < 0.34) {
    const u = uniqueTheme(Math.random() * 360, pick([35, 150, 180, 205]));
    return { ...prev, theme: 'unique', vars: u.vars, uniqueName: u.name, wallpaper: wall.id, icons, seed };
  }
  const theme = pick(THEMES.filter((t) => t.id !== prev.theme)).id;
  return { ...prev, theme, vars: undefined, uniqueName: undefined, wallpaper: wall.id, icons, seed };
}

/* --------------------------------------------------------------------------------------
   Storage and applying a look to the page.
   -------------------------------------------------------------------------------------- */
export const LOOK_KEY = 'look-v1';

export function loadLook(): Look {
  try {
    const raw = window.localStorage.getItem(LOOK_KEY);
    const x = raw ? JSON.parse(raw) : null;
    if (x && typeof x === 'object') {
      const look: Look = { ...DEFAULT_LOOK, ...x };
      if (look.theme !== 'unique' && !findTheme(look.theme)) look.theme = DEFAULT_LOOK.theme;
      if (!WALLPAPERS.some((w) => w.id === look.wallpaper)) look.wallpaper = DEFAULT_LOOK.wallpaper;
      if (!ICON_PACKS.some((p) => p.id === look.icons)) look.icons = DEFAULT_LOOK.icons;
      if (!Array.isArray(look.shortcuts)) look.shortcuts = DEFAULT_LOOK.shortcuts.slice();
      look.shortcuts = look.shortcuts.filter((id) => SHORTCUTS.some((s) => s.id === id)).slice(0, MAX_SHORTCUTS);
      return look;
    }
  } catch {
    /* storage blocked or unreadable: the default look */
  }
  return { ...DEFAULT_LOOK, shortcuts: DEFAULT_LOOK.shortcuts.slice() };
}

export function saveLook(look: Look) {
  try {
    window.localStorage.setItem(LOOK_KEY, JSON.stringify(look));
  } catch {
    /* the look simply is not remembered */
  }
}

/** Put a look on the page: the theme and icon pack are attributes on <html>. */
export function applyLook(look: Look) {
  const d = document.documentElement;
  d.dataset.theme = look.theme;
  d.dataset.icons = look.icons;
  THEME_VARS.forEach((k) => d.style.removeProperty(k));
  if (look.theme === 'unique' && look.vars) Object.keys(look.vars).forEach((k) => d.style.setProperty(k, look.vars![k]));
}

/** The same, run before the page is drawn so a reload never flashes the default colours. */
export const EARLY_APPLY_SCRIPT = `try{var l=JSON.parse(localStorage.getItem('${LOOK_KEY}')||'null');if(l){var d=document.documentElement;if(l.theme)d.dataset.theme=l.theme;if(l.icons)d.dataset.icons=l.icons;if(l.theme==='unique'&&l.vars){for(var k in l.vars)d.style.setProperty(k,l.vars[k]);}}}catch(e){}`;

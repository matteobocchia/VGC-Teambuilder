export type Locale = 'it' | 'en';
export type DataStatus = 'certified' | 'provisional' | 'unverified';
export type BattleMode = 'singles' | 'doubles';
export type FormatContext = 'ranked-battles' | 'vgc-championship' | 'fixture';
export type CoverageStatus = 'complete' | 'partial' | 'unknown' | 'unavailable';
export type DataCoverage = {
  catalog: CoverageStatus;
  legalities: CoverageStatus;
  learnsets: CoverageStatus;
  damageEngine: 'available' | 'unavailable';
  teamValidation: 'available' | 'preview-only' | 'unavailable';
};
export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StatValues = Record<StatKey, number>;

export type Labels = {
  it: string | null;
  en: string;
};

export type Option = {
  id: string;
  labels: Labels;
};

export type Issue = {
  path: string;
  code: string;
  message: string;
  blocking: boolean;
  details?: Record<string, unknown>;
};

export type DataMeta = {
  apiVersion: 'v1';
  schemaVersion: '1.0';
  releaseId: string;
  checksum: string;
  dataStatus: DataStatus;
  source: 'bundled-preview' | 'postgresql';
  gaps: string[];
  coverage: DataCoverage;
};

export type FormatProfile = {
  id: string;
  labels: Labels;
  game: 'pokemon-champions';
  context: FormatContext;
  battleMode: BattleMode;
  level: 50;
  dataReleaseId: string;
  statPoints: { perStatMax: 32; totalMax: 66 };
  speciesClause: boolean;
  itemClause: boolean;
  capabilities: {
    tera: boolean;
    damageEngine: boolean;
  };
};

export type CatalogPokemon = Option & {
  speciesId: string;
  formId: string;
  /** Availability in the selected format; unknown means catalog-only data. */
  legalityStatus?: 'allowed' | 'banned' | 'conditional' | 'unknown';
  role: Option;
  types: Option[];
  baseStats: StatValues;
  abilities: Option[];
  items: Option[];
  learnableMoves: Option[];
  legalFormats: string[];
  initialSet?: CompetitiveSet;
};

export type CompetitiveSet = {
  speciesId: string;
  formId?: string;
  teraTypeId?: string;
  itemId: string | null;
  abilityId: string;
  natureId: string;
  level: 50;
  statPoints: StatValues;
  moveIds: string[];
};

export type TeamRevision = {
  id: string;
  name: string;
  formatId: string;
  dataReleaseId: string;
  locale: Locale;
  slots: Array<CompetitiveSet | null>;
  ownerId: string;
  status: 'draft' | 'blocked' | 'legal';
  createdAt: string;
  updatedAt: string;
};

export type FieldState = {
  weather: 'clear' | 'sun' | 'rain' | 'sand' | 'snow';
  terrain: 'none' | 'electric' | 'grassy' | 'psychic' | 'misty';
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  safeguard: boolean;
  tailwind: boolean;
  trickRoom: boolean;
  gravity: boolean;
};

export const statKeys: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export const emptyField: FieldState = {
  weather: 'clear',
  terrain: 'none',
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  safeguard: false,
  tailwind: false,
  trickRoom: false,
  gravity: false,
};

export type DamageRequest = {
  formatId: string;
  dataReleaseId?: string;
  mode: BattleMode;
  attacker: CompetitiveSet;
  defender: CompetitiveSet;
  moveId: string;
  field: FieldState;
  critical: boolean;
  spread: boolean;
  teamRevisionId?: string;
  attackerSlot?: number;
};

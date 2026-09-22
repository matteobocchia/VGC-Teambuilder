import type {
  CatalogPokemon,
  DataMeta,
  FormatProfile,
  Option,
  StatValues,
} from './types';

export const RELEASE_ID = 'champions-mb-2026-09-14.1';
export const FORMAT_ID = 'champions-regulation-mb-doubles';
export const CHECKSUM = 'bundled-preview-not-certified';

export const dataMeta: DataMeta = {
  apiVersion: 'v1',
  schemaVersion: '1.0',
  releaseId: RELEASE_ID,
  checksum: CHECKSUM,
  dataStatus: 'unverified',
  source: 'bundled-preview',
  gaps: ['OFFICIAL_REVIEW_PENDING', 'LEARNSETS_MISSING', 'DAMAGE_ENGINE_UNVERIFIED'],
};

export const formatProfile: FormatProfile = {
  id: FORMAT_ID,
  labels: { it: 'Regolamento M-B · Doppio', en: 'Regulation M-B · Doubles' },
  game: 'pokemon-champions',
  context: 'vgc-championship',
  battleMode: 'doubles',
  level: 50,
  dataReleaseId: RELEASE_ID,
  statPoints: { perStatMax: 32, totalMax: 66 },
  speciesClause: true,
  itemClause: true,
  capabilities: { tera: false, damageEngine: false },
};

const option = (id: string, en: string, it: string | null = en): Option => ({ id, labels: { en, it } });
const stats = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): StatValues => ({ hp, atk, def, spa, spd, spe });

const move = (id: string, en: string, it: string | null = null): Option => option(id, en, it);
const ability = (id: string, en: string, it: string | null = null): Option => option(id, en, it);
const item = (id: string, en: string, it: string | null = null): Option => option(id, en, it);

const catalog: CatalogPokemon[] = [
  {
    id: 'form:0987', speciesId: 'species:0987', formId: 'form:0987',
    labels: { en: 'Flutter Mane', it: 'Flutter Mane' },
    role: option('role:special-attacker', 'Special attacker', 'Attaccante speciale'),
    types: [option('type:ghost', 'Ghost', 'Spettro'), option('type:fairy', 'Fairy', 'Folletto')],
    baseStats: stats(55, 55, 55, 135, 135, 135),
    abilities: [ability('ability:protosynthesis', 'Protosynthesis')],
    items: [item('item:choice-specs', 'Choice Specs'), item('item:focus-sash', 'Focus Sash')],
    learnableMoves: [move('move:moonblast', 'Moonblast', 'Forza Lunare'), move('move:shadow-ball', 'Shadow Ball', 'Palla Ombra'), move('move:mystical-fire', 'Mystical Fire', 'Magifiamma'), move('move:protect', 'Protect', 'Protezione')],
    legalFormats: [FORMAT_ID],
  },
  {
    id: 'form:0727', speciesId: 'species:0727', formId: 'form:0727',
    labels: { en: 'Incineroar', it: 'Incineroar' },
    role: option('role:pivot', 'Pivot / Intimidate', 'Pivot / Prepotenza'),
    types: [option('type:fire', 'Fire', 'Fuoco'), option('type:dark', 'Dark', 'Buio')],
    baseStats: stats(95, 115, 90, 80, 90, 60),
    abilities: [ability('ability:intimidate', 'Intimidate', 'Prepotenza')],
    items: [item('item:safety-goggles', 'Safety Goggles', 'Occhialineri'), item('item:assault-vest', 'Assault Vest', 'Corpetto Assalto')],
    learnableMoves: [move('move:flare-blitz', 'Flare Blitz', 'Fuococarica'), move('move:knock-off', 'Knock Off', 'Privazione'), move('move:parting-shot', 'Parting Shot', 'Monito'), move('move:fake-out', 'Fake Out', 'Bruciapelo')],
    legalFormats: [FORMAT_ID],
  },
  {
    id: 'form:0812', speciesId: 'species:0812', formId: 'form:0812',
    labels: { en: 'Rillaboom', it: 'Rillaboom' },
    role: option('role:terrain-setter', 'Terrain setter', 'Impostatore di campo'),
    types: [option('type:grass', 'Grass', 'Erba')],
    baseStats: stats(100, 125, 90, 60, 70, 85),
    abilities: [ability('ability:grassy-surge', 'Grassy Surge', 'Erbogenesi')],
    items: [item('item:assault-vest', 'Assault Vest', 'Corpetto Assalto'), item('item:miracle-seed', 'Miracle Seed', 'Miracolseme')],
    learnableMoves: [move('move:grassy-glide', 'Grassy Glide', 'Erboscivolata'), move('move:wood-hammer', 'Wood Hammer', 'Mazzuolegno'), move('move:fake-out', 'Fake Out', 'Bruciapelo'), move('move:u-turn', 'U-turn', 'Retromarcia')],
    legalFormats: [FORMAT_ID],
  },
  {
    id: 'form:0892', speciesId: 'species:0892', formId: 'form:0892',
    labels: { en: 'Urshifu', it: 'Urshifu' },
    role: option('role:physical-attacker', 'Physical attacker', 'Attaccante fisico'),
    types: [option('type:fighting', 'Fighting', 'Lotta'), option('type:water', 'Water', 'Acqua')],
    baseStats: stats(100, 130, 100, 63, 60, 97),
    abilities: [ability('ability:unseen-fist', 'Unseen Fist', 'Pugni Invisibili')],
    items: [item('item:focus-sash', 'Focus Sash', 'Focalnastro'), item('item:choice-band', 'Choice Band', 'Bendascelta')],
    learnableMoves: [move('move:surging-strikes', 'Surging Strikes'), move('move:close-combat', 'Close Combat', 'Zuffa'), move('move:aqua-jet', 'Aqua Jet', 'Acquagetto'), move('move:protect', 'Protect', 'Protezione')],
    legalFormats: [FORMAT_ID],
  },
  {
    id: 'form:0591', speciesId: 'species:0591', formId: 'form:0591',
    labels: { en: 'Amoonguss', it: 'Amoonguss' },
    role: option('role:redirection', 'Redirection', 'Deviazione'),
    types: [option('type:grass', 'Grass', 'Erba'), option('type:poison', 'Poison', 'Veleno')],
    baseStats: stats(114, 85, 70, 85, 80, 30),
    abilities: [ability('ability:regenerator', 'Regenerator', 'Rigenergia')],
    items: [item('item:rocky-helmet', 'Rocky Helmet', 'Casco Dentato'), item('item:mental-herb', 'Mental Herb', 'Mentalerba')],
    learnableMoves: [move('move:spore', 'Spore', 'Spora'), move('move:rage-powder', 'Rage Powder', 'Polverabbia'), move('move:pollen-puff', 'Pollen Puff', 'Sferapolline'), move('move:protect', 'Protect', 'Protezione')],
    legalFormats: [FORMAT_ID],
  },
  {
    id: 'form:0981', speciesId: 'species:0981', formId: 'form:0981',
    labels: { en: 'Farigiraf', it: 'Farigiraf' },
    role: option('role:trick-room-support', 'Trick Room support', 'Supporto Distortozona'),
    types: [option('type:normal', 'Normal', 'Normale'), option('type:psychic', 'Psychic', 'Psico')],
    baseStats: stats(120, 90, 70, 110, 70, 60),
    abilities: [ability('ability:armor-tail', 'Armor Tail', 'Codarmatura')],
    items: [item('item:mental-herb', 'Mental Herb', 'Mentalerba'), item('item:throat-spray', 'Throat Spray', 'Spray Gola')],
    learnableMoves: [move('move:psychic', 'Psychic', 'Psichico'), move('move:hyper-voice', 'Hyper Voice', 'Granvoce'), move('move:trick-room', 'Trick Room', 'Distortozona'), move('move:helping-hand', 'Helping Hand', 'Altruismo')],
    legalFormats: [FORMAT_ID],
  },
];

export const typeOptions: Option[] = [
  option('type:normal', 'Normal', 'Normale'), option('type:fire', 'Fire', 'Fuoco'), option('type:water', 'Water', 'Acqua'), option('type:grass', 'Grass', 'Erba'),
  option('type:electric', 'Electric', 'Elettro'), option('type:psychic', 'Psychic', 'Psico'), option('type:ghost', 'Ghost', 'Spettro'), option('type:fairy', 'Fairy', 'Folletto'),
];

export const natureOptions: Option[] = [
  option('nature:hardy', 'Hardy', 'Ardita'), option('nature:adamant', 'Adamant', 'Decisa'), option('nature:modest', 'Modest', 'Modesta'), option('nature:timid', 'Timid', 'Timida'), option('nature:careful', 'Careful', 'Cauta'), option('nature:quiet', 'Quiet', 'Quieta'), option('nature:bold', 'Bold', 'Sicura'), option('nature:jolly', 'Jolly', 'Allegra'),
];

export const roleOptions: Option[] = Array.from(new Map(catalog.map((entry) => [entry.role.id, entry.role])).values());
export const abilityOptions: Option[] = Array.from(new Map(catalog.flatMap((entry) => entry.abilities).map((entry) => [entry.id, entry])).values());

export function getCatalog(): CatalogPokemon[] {
  return catalog.map((entry) => ({ ...entry, legalityStatus: 'unknown', types: [...entry.types], abilities: [...entry.abilities], items: [...entry.items], learnableMoves: [...entry.learnableMoves] }));
}

export function findCatalogPokemon(id: string): CatalogPokemon | undefined {
  const entry = catalog.find((candidate) => candidate.id === id || candidate.speciesId === id || candidate.formId === id);
  return entry ? { ...entry, legalityStatus: 'unknown', types: [...entry.types], abilities: [...entry.abilities], items: [...entry.items], learnableMoves: [...entry.learnableMoves] } : undefined;
}

export function getFormat(formatId: string = FORMAT_ID): FormatProfile | undefined {
  return formatId === FORMAT_ID ? formatProfile : undefined;
}

export function getRelease(releaseId: string = RELEASE_ID): DataMeta | undefined {
  return releaseId === RELEASE_ID ? dataMeta : undefined;
}

export function makeMeta(extra: Partial<DataMeta> = {}): DataMeta {
  return { ...dataMeta, ...extra };
}

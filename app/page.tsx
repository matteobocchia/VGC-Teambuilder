'use client';

import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  CircleAlert,
  Cloud,
  CloudRain,
  CloudSun,
  Crosshair,
  Flame,
  Globe2,
  Info,
  LockKeyhole,
  Map,
  Orbit,
  Plus,
  Save,
  Shield,
  Snowflake,
  Sprout,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Wind,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError, defaultFormatId, getCatalogContext, getCatalogPokemon, getTeamRevision, saveTeamRevision, type ApiFormat, type ApiIssue, type ApiMeta, type ApiOption, type ApiPokemon, type ApiTeamSet } from './lib/api';

type Locale = 'it' | 'en';
type Mode = 'doubles' | 'singles';
type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type Move = { name: string; type: string; power: number | null; range: string; ko: string; score: number | null };
type PokemonSet = { tera: string; item: string; ability: string; nature: string; statPoints: Record<StatKey, number>; moves: string[] };
type BuilderSlot = { pokemonName: string; pokemonId?: string; set: PokemonSet } | null;
type WeatherKey = 'clear' | 'sun' | 'rain' | 'sand' | 'snow';
type TerrainKey = 'none' | 'electric' | 'grassy' | 'psychic' | 'misty';
type FieldEffectKey = 'reflect' | 'lightScreen' | 'auroraVeil' | 'safeguard' | 'tailwind' | 'trickRoom' | 'gravity';
type FieldState = { weather: WeatherKey; terrain: TerrainKey } & Record<FieldEffectKey, boolean>;

function storedLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem('vgc-forge:locale');
    return value === 'en' || value === 'it' ? value : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem('vgc-forge:locale', locale);
  } catch {
    // Local preference is optional; the in-memory state remains authoritative.
  }
}

const statKeys: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

type Pokemon = {
  name: string;
  nameIt?: string | null;
  role: string;
  roleIt?: string | null;
  types: string[];
  baseStats: Record<StatKey, number>;
  api?: ApiPokemon;
};

const team: Pokemon[] = [
  { name: 'Flutter Mane', role: 'Special attacker', types: ['Ghost', 'Fairy'], baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 } },
  { name: 'Incineroar', role: 'Pivot / Intimidate', types: ['Fire', 'Dark'], baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 } },
  { name: 'Rillaboom', role: 'Terrain setter', types: ['Grass'], baseStats: { hp: 100, atk: 125, def: 90, spa: 60, spd: 70, spe: 85 } },
  { name: 'Urshifu', role: 'Physical attacker', types: ['Fighting', 'Water'], baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 } },
  { name: 'Amoonguss', role: 'Redirection', types: ['Grass', 'Poison'], baseStats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 } },
  { name: 'Farigiraf', role: 'Trick Room support', types: ['Normal', 'Psychic'], baseStats: { hp: 120, atk: 90, def: 70, spa: 110, spd: 70, spe: 60 } },
];

const pokemonCatalog = team;

const defaultSets: Record<string, PokemonSet> = {
  'Flutter Mane': { tera: 'Fairy', item: 'Choice Specs', ability: 'Protosynthesis', nature: 'Timid (+Spe, -Atk)', statPoints: { hp: 4, atk: 0, def: 0, spa: 32, spd: 4, spe: 26 }, moves: ['Moonblast', 'Shadow Ball', 'Mystical Fire', 'Protect'] },
  Incineroar: { tera: 'Grass', item: 'Safety Goggles', ability: 'Intimidate', nature: 'Careful (+SpD, -SpA)', statPoints: { hp: 28, atk: 0, def: 20, spa: 0, spd: 18, spe: 0 }, moves: ['Flare Blitz', 'Knock Off', 'Parting Shot', 'Fake Out'] },
  Rillaboom: { tera: 'Fire', item: 'Assault Vest', ability: 'Grassy Surge', nature: 'Adamant (+Atk, -SpA)', statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 30 }, moves: ['Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn'] },
  Urshifu: { tera: 'Water', item: 'Focus Sash', ability: 'Unseen Fist', nature: 'Jolly (+Spe, -SpA)', statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }, moves: ['Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect'] },
  Amoonguss: { tera: 'Water', item: 'Rocky Helmet', ability: 'Regenerator', nature: 'Bold (+Def, -Atk)', statPoints: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Spore', 'Rage Powder', 'Pollen Puff', 'Protect'] },
  Farigiraf: { tera: 'Fairy', item: 'Mental Herb', ability: 'Armor Tail', nature: 'Quiet (+SpA, -Spe)', statPoints: { hp: 28, atk: 0, def: 0, spa: 32, spd: 6, spe: 0 }, moves: ['Psychic', 'Hyper Voice', 'Trick Room', 'Helping Hand'] },
};

function restoreBuilderSlots(rawSlots: unknown, catalog: Pokemon[] = pokemonCatalog): BuilderSlot[] {
  const stored = Array.isArray(rawSlots) ? rawSlots : [];
  return Array.from({ length: 6 }, (_, index) => {
    const storedSlot = stored[index] as Partial<BuilderSlot & { pokemonName: string; pokemonId?: string; set: PokemonSet }> | null | undefined;
    const pokemon = catalog.find((entry) => entry.api?.formId === storedSlot?.pokemonId || entry.name === storedSlot?.pokemonName);
    if (!storedSlot || typeof storedSlot.pokemonName !== 'string' || !pokemon) return null;
    const defaults = setForPokemon(pokemon);
    return { pokemonName: pokemon.name, pokemonId: pokemon.api?.formId ?? storedSlot.pokemonId, set: { ...cloneSet(defaults), ...storedSlot.set, statPoints: { ...defaults.statPoints, ...storedSlot.set?.statPoints }, moves: Array.isArray(storedSlot.set?.moves) && storedSlot.set.moves.length >= 1 && storedSlot.set.moves.length <= 4 ? [...storedSlot.set.moves] : cloneSet(defaults).moves } };
  });
}

const natureMultiplier = (nature: string, stat: StatKey) => {
  const raised = nature.match(/\+([A-Za-z]+)/)?.[1];
  const lowered = nature.match(/-([A-Za-z]+)/)?.[1];
  const aliases: Record<string, StatKey> = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
  if (aliases[raised ?? ''] === stat) return 1.1;
  if (aliases[lowered ?? ''] === stat) return 0.9;
  return 1;
};

function deriveStats(pokemon: Pokemon, set: PokemonSet) {
  return statKeys.reduce((stats, stat) => {
    const core = Math.floor(((2 * pokemon.baseStats[stat]) + 31 + set.statPoints[stat]) * 50 / 100);
    stats[stat] = stat === 'hp' ? core + 60 : Math.floor((core + 5) * natureMultiplier(set.nature, stat));
    return stats;
  }, {} as Record<StatKey, number>);
}

function cloneSet(set: PokemonSet): PokemonSet {
  return { ...set, statPoints: { ...set.statPoints }, moves: [...set.moves] };
}

function optionLabel(option: { labels: { it: string | null; en: string } } | undefined, locale: Locale = 'en') {
  return option ? (locale === 'it' ? option.labels.it ?? option.labels.en : option.labels.en) : '';
}

function localizedValue(value: string, options: ApiOption[] | undefined, locale: Locale) {
  const match = options?.find((option) => option.labels.en === value || option.labels.it === value);
  return match ? optionLabel(match, locale) : value;
}

function pokemonLabel(pokemon: Pokemon, locale: Locale) {
  return locale === 'it' ? pokemon.nameIt ?? pokemon.name : pokemon.name;
}

function pokemonKey(pokemon: Pokemon) {
  return pokemon.api?.formId ?? pokemon.name;
}

function setForPokemon(pokemon: Pokemon): PokemonSet {
  const saved = defaultSets[pokemon.name];
  if (saved) return cloneSet(saved);
  const source = pokemon.api;
  if (!source) return cloneSet(defaultSets['Flutter Mane']);
  const initial = source?.initialSet;
  const natureById: Record<string, string> = { hardy: 'Hardy', adamant: 'Adamant (+Atk, -SpA)', modest: 'Modest (+SpA, -Atk)', timid: 'Timid (+Spe, -Atk)', careful: 'Careful (+SpD, -SpA)', quiet: 'Quiet (+SpA, -Spe)', bold: 'Bold (+Def, -Atk)', jolly: 'Jolly (+Spe, -SpA)' };
  const moves = initial?.moveIds.map((id) => optionLabel(source.learnableMoves.find((move) => move.id === id))).filter(Boolean) ?? source?.learnableMoves.slice(0, 4).map((move) => optionLabel(move)) ?? [];
  return {
    tera: initial?.teraTypeId ? optionLabel(source.types.find((type) => type.id === initial.teraTypeId)) || 'Normal' : 'Normal',
    item: initial?.itemId ? optionLabel(source.items.find((item) => item.id === initial.itemId)) || 'None' : 'None',
    ability: initial?.abilityId ? optionLabel(source.abilities.find((ability) => ability.id === initial.abilityId)) || optionLabel(source.abilities[0]) : optionLabel(source?.abilities[0]) || '—',
    nature: natureById[initial?.natureId?.split(':').pop() ?? 'hardy'] ?? 'Hardy',
    statPoints: initial?.statPoints ? { ...initial.statPoints } : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: moves.length ? moves.slice(0, 4) : ['Protect'],
  };
}

function viewPokemonFromApi(entry: ApiPokemon): Pokemon {
  return {
    name: entry.labels.en,
    nameIt: entry.labels.it,
    role: entry.role.labels.en,
    roleIt: entry.role.labels.it,
    types: entry.types.map((type) => type.labels.en),
    baseStats: entry.baseStats,
    api: entry,
  };
}

function optionId(value: string, options: ApiOption[]) {
  return options.find((option) => value === option.labels.en || value === option.labels.it || value.startsWith(`${option.labels.en} (`))?.id;
}

function revisionSlotsFromBuilder(slots: BuilderSlot[], catalog: Pokemon[], format: ApiFormat, types: ApiOption[], natures: ApiOption[]) {
  const missing: string[] = [];
  const converted = slots.map((slot, index): ApiTeamSet | null => {
    if (!slot) return null;
    const pokemon = catalog.find((entry) => entry.api?.formId === slot.pokemonId || entry.name === slot.pokemonName)?.api;
    if (!pokemon) { missing.push(`${index + 1}:pokemon`); return null; }
    const abilityId = optionId(slot.set.ability, pokemon.abilities);
    const itemId = slot.set.item === 'None' ? null : optionId(slot.set.item, pokemon.items);
    const natureId = optionId(slot.set.nature, natures);
    const teraTypeId = format.capabilities.tera ? optionId(slot.set.tera, types) : undefined;
    const moveIds = slot.set.moves.map((move) => optionId(move, pokemon.learnableMoves));
    if (!abilityId) missing.push(`${index + 1}:ability`);
    if (itemId === undefined) missing.push(`${index + 1}:item`);
    if (!natureId) missing.push(`${index + 1}:nature`);
    if (format.capabilities.tera && !teraTypeId) missing.push(`${index + 1}:tera`);
    if (moveIds.some((move) => !move)) missing.push(`${index + 1}:moves`);
    if (!abilityId || itemId === undefined || !natureId || (format.capabilities.tera && !teraTypeId) || moveIds.some((move) => !move)) return null;
    return { speciesId: pokemon.speciesId, formId: pokemon.formId, ...(teraTypeId ? { teraTypeId } : {}), itemId, abilityId, natureId, level: 50, statPoints: { ...slot.set.statPoints }, moveIds: moveIds as string[] };
  });
  return { slots: converted, missing };
}

function builderSlotsFromRevision(slots: Array<ApiTeamSet | null>, catalog: Pokemon[], natures: ApiOption[], types: ApiOption[]): BuilderSlot[] | null {
  const converted = slots.map((set): BuilderSlot | null => {
    if (!set) return null;
    const pokemon = catalog.find((entry) => entry.api?.formId === set.formId || entry.api?.speciesId === set.speciesId);
    if (!pokemon?.api) return null;
    const api = pokemon.api;
    const defaults = setForPokemon(pokemon);
    const tera = optionLabel(types.find((option) => option.id === set.teraTypeId));
    const item = set.itemId ? optionLabel(api.items.find((option) => option.id === set.itemId)) : 'None';
    const ability = optionLabel(api.abilities.find((option) => option.id === set.abilityId));
    const natureOption = optionLabel(natures.find((option) => option.id === set.natureId));
    const moves = set.moveIds.map((id) => optionLabel(api.learnableMoves.find((option) => option.id === id)));
    if (!ability || !natureOption || moves.some((move) => !move) || (set.itemId && !item) || (set.teraTypeId && !tera)) return null;
    return { pokemonId: api.formId, pokemonName: pokemon.name, set: {
      tera: tera || defaults.tera,
      item,
      ability,
      nature: natureValues[natureOption] ?? natureOption,
      statPoints: { ...set.statPoints },
      moves,
    } };
  });
  return converted.length === 6 && slots.every((slot, index) => !slot || converted[index]) ? converted : null;
}

function revisionErrorMessage(error: ApiClientError, locale: Locale) {
  if (error.code === 'DATA_UNVERIFIED') return locale === 'it' ? 'Questa release non può certificare una revisione completa. La bozza locale resta disponibile.' : 'This release cannot certify a complete revision. Your local draft remains available.';
  if (error.code === 'POSTGRESQL_TEAM_REPOSITORY_NOT_CONFIGURED') return locale === 'it' ? 'Il salvataggio server delle revisioni non è ancora configurato. Usa Salva bozza.' : 'Server revision storage is not configured yet. Use Save draft.';
  if (error.code === 'REVISION_NOT_FOUND') return locale === 'it' ? 'Revisione non trovata sul server. La bozza locale resta disponibile.' : 'Revision not found on the server. Your local draft remains available.';
  if (error.code === 'REVISION_FORBIDDEN') return locale === 'it' ? 'Questa revisione appartiene a un altro browser.' : 'This revision belongs to another browser.';
  if (error.code === 'REQUEST_TIMEOUT') return locale === 'it' ? 'Il server impiega troppo tempo. Riprova: la bozza locale è intatta.' : 'The server is taking too long. Retry; your local draft is intact.';
  return locale === 'it' ? 'Revisione non salvata o caricata. Controlla gli errori e riprova; la bozza locale è intatta.' : 'Revision was not saved or loaded. Check the errors and retry; your local draft is intact.';
}

function revisionIssueMessage(issue: ApiIssue, locale: Locale) {
  const names: Record<string, [string, string]> = {
    ITEM_CLAUSE: ['Strumento duplicato nel team', 'Duplicate held item in team'],
    SPECIES_CLAUSE: ['Specie duplicata nel team', 'Duplicate species in team'],
    MOVE_NOT_LEARNABLE: ['Mossa non disponibile per questo Pokémon', 'Move not available to this Pokémon'],
    ABILITY_FORM_MISMATCH: ['Abilità incompatibile con la forma', 'Ability incompatible with this form'],
    STAT_POINTS_TOTAL: ['Totale Stat Points superiore a 66', 'Total Stat Points exceeds 66'],
    DUPLICATE_MOVE: ['Mossa duplicata nel set', 'Duplicate move in set'],
    DATA_UNVERIFIED: ['Release non verificata', 'Unverified release'],
  };
  const location = issue.path.match(/^\/slots\/(\d+)/);
  const prefix = location ? `Slot ${Number(location[1]) + 1}: ` : '';
  return `${prefix}${names[issue.code]?.[locale === 'it' ? 0 : 1] ?? (locale === 'it' ? `Controlla ${issue.path} (${issue.code})` : issue.message)}`;
}

function clampStatPoints(raw: Record<StatKey, number>, changedKey: StatKey): Record<StatKey, number> {
  const nextPoints = statKeys.reduce((result, key) => ({ ...result, [key]: Math.min(32, Math.max(0, Number.isFinite(Number(raw[key])) ? Math.round(Number(raw[key])) : 0)) }), {} as Record<StatKey, number>);
  let overflow = statKeys.reduce((sum, key) => sum + nextPoints[key], 0) - 66;
  for (const key of [...statKeys.filter((key) => key !== changedKey), changedKey]) {
    if (overflow <= 0) break;
    const reduction = Math.min(nextPoints[key], overflow);
    nextPoints[key] -= reduction;
    overflow -= reduction;
  }
  return nextPoints;
}

const moveCatalog: Record<string, Move> = {
  Moonblast: { name: 'Moonblast', type: 'Fairy', power: 95, range: '112–132', ko: '88%', score: 88 }, ShadowBall: { name: 'Shadow Ball', type: 'Ghost', power: 80, range: '71–84', ko: '43%', score: 43 }, MysticalFire: { name: 'Mystical Fire', type: 'Fire', power: 75, range: '56–67', ko: '6%', score: 6 }, Protect: { name: 'Protect', type: 'Normal', power: null, range: '—', ko: '—', score: null },
  FlareBlitz: { name: 'Flare Blitz', type: 'Fire', power: 120, range: '98–116', ko: '71%', score: 71 }, KnockOff: { name: 'Knock Off', type: 'Dark', power: 65, range: '64–76', ko: '22%', score: 22 }, PartingShot: { name: 'Parting Shot', type: 'Dark', power: null, range: '—', ko: '—', score: null }, FakeOut: { name: 'Fake Out', type: 'Normal', power: 40, range: '21–25', ko: '0%', score: 0 },
  GrassyGlide: { name: 'Grassy Glide', type: 'Grass', power: 55, range: '52–62', ko: '8%', score: 8 }, WoodHammer: { name: 'Wood Hammer', type: 'Grass', power: 120, range: '96–114', ko: '68%', score: 68 }, Uturn: { name: 'U-turn', type: 'Bug', power: 70, range: '43–51', ko: '4%', score: 4 },
  SurgingStrikes: { name: 'Surging Strikes', type: 'Water', power: 25, range: '72–87', ko: '36%', score: 36 }, CloseCombat: { name: 'Close Combat', type: 'Fighting', power: 120, range: '101–120', ko: '74%', score: 74 }, AquaJet: { name: 'Aqua Jet', type: 'Water', power: 40, range: '28–34', ko: '0%', score: 0 },
  Spore: { name: 'Spore', type: 'Grass', power: null, range: '—', ko: '—', score: null }, RagePowder: { name: 'Rage Powder', type: 'Bug', power: null, range: '—', ko: '—', score: null }, PollenPuff: { name: 'Pollen Puff', type: 'Bug', power: 90, range: '58–69', ko: '7%', score: 7 },
  Psychic: { name: 'Psychic', type: 'Psychic', power: 90, range: '78–92', ko: '45%', score: 45 }, HyperVoice: { name: 'Hyper Voice', type: 'Normal', power: 90, range: '69–82', ko: '31%', score: 31 }, TrickRoom: { name: 'Trick Room', type: 'Psychic', power: null, range: '—', ko: '—', score: null }, HelpingHand: { name: 'Helping Hand', type: 'Normal', power: null, range: '—', ko: '—', score: null },
};

function movesForSet(set: PokemonSet, pokemon?: Pokemon, locale: Locale = 'en') {
  const moveNames = Array.isArray(set.moves) && set.moves.length ? set.moves : defaultSets['Flutter Mane'].moves;
  const learnableMoves = pokemon?.api?.learnableMoves ?? [];
  return moveNames.map((name) => {
    const option = learnableMoves.find((move) => move.labels.en === name || move.labels.it === name);
    const englishName = option?.labels.en ?? name;
    const move = moveCatalog[englishName.replace(/[^A-Za-z]/g, '')] ?? { name: englishName, type: 'Normal', power: null, range: '—', ko: '—', score: null };
    return option ? { ...move, name: optionLabel(option, locale) } : move;
  });
}

const copy = {
  it: {
    team: 'Team', attacker: 'Attaccante', defender: 'Difensore', attackerSlot: 'Slot attaccante', defenderSlot: 'Slot difensore', setup: 'Set attivo', route: 'Percorso matchup', outcomes: 'Esiti mosse', field: 'Campo e condizioni', format: 'Champions · Regulation M-B', language: 'Italiano', languageLabel: 'Lingua', formatLabel: 'Formato', primaryNav: 'Navigazione principale', inspectorOptions: 'Opzioni inspector (prossimamente)', save: 'Salva bozza', saved: 'Salvato', teamFull: 'Team completo', autoSave: 'Salvataggio locale manuale', demoRoster: 'Roster demo · scenario temporaneo', level: 'Livello', tera: 'Tera tipo', item: 'Strumento', ability: 'Abilità', nature: 'Natura', statPoints: 'Stat Points', moves: 'Mosse', add: 'Aggiungi Pokémon', fieldTerrain: 'Campo Elettrico', fieldReflect: 'Riflesso', weather: 'Meteo', terrain: 'Campo', clear: 'Nessun meteo', rain: 'Pioggia', sand: 'Tempesta di sabbia', snow: 'Neve', terrainNone: 'Nessun campo', grassyTerrain: 'Campo Erboso', psychicTerrain: 'Campo Psichico', mistyTerrain: 'Campo Nebbioso', screens: 'Schermate e protezioni', speedSpace: 'Velocità e spazio', lightScreen: 'Schermoluce', auroraVeil: 'Velaurora', safeguard: 'Salvaguardia', tailwind: 'Ventoincoda', trickRoom: 'Distortozona', gravity: 'Gravità', activeEffects: 'effetti attivi', fieldSummary: 'Stato simulazione', primary: 'Risultato principale', versus: 'contro', damage: 'Danno', power: 'Potenza', ko: 'KO %', koChance: 'Probabilità KO', selectMove: 'Seleziona mossa', battleMode: 'Modalità lotta', preset: 'Preset UI · non calcolato', presetNotice: 'Risultato dimostrativo: l’engine danni non ha calcolato questo matchup.', engineUnavailable: 'Engine danni non disponibile · risultati dimostrativi', allRolls: 'Tutti i roll', critical: 'Critico', spread: 'Spread', details: 'Dettagli', calculator: 'Calcolatore danni', builder: 'Team builder', formatWarning: 'Anteprima dati · non verificata', statHint: '0–32 per statistica · 66 totali', turns: 'turni', sun: 'Luce solare intensa', sunUnavailable: 'Disponibile prossimamente', off: 'disattivo', howItWorks: 'Come funziona', accuracyNote: 'Valori dimostrativi: nessun calcolo server-side è stato eseguito. Non usarli per una decisione competitiva.', newTeam: 'Nuovo team', teamName: 'Nome team', emptySlot: 'Slot vuoto', addPokemon: 'Aggiungi Pokémon', searchPokemon: 'Cerca Pokémon', catalog: 'Catalogo Pokémon', selectSlot: 'Seleziona uno slot', emptyBuilderHelp: 'Scegli un Pokémon dal catalogo per iniziare a costruire il team.', removePokemon: 'Rimuovi Pokémon', choosePokemon: 'Scegli Pokémon', moveHint: 'Scegli una mossa per ogni slot', catalogHint: 'Catalogo ricevuto dal server · legalità non verificata', noResults: 'Nessun Pokémon trovato', savedLocally: 'Salvato nel browser', emptyTeam: 'Nessun Pokémon nel team', loadingCatalog: 'Caricamento catalogo Pokémon…', previewCatalog: 'Release di anteprima non verificata. Puoi creare una bozza, ma legalità e danno non sono certificati.', certifiedCatalog: 'Release certificata · legalità disponibile secondo il formato.', provisionalCatalog: 'Release provvisoria · alcune verifiche non sono ancora complete.', configurationCatalog: 'Il servizio dati non è configurato. La bozza resta disponibile localmente.', releaseCatalog: 'La release richiesta non è disponibile per questo formato.', timeoutCatalog: 'Il catalogo sta impiegando troppo tempo. Riprova.', unavailableCatalog: 'Il catalogo ufficiale non è raggiungibile. Salva la bozza prima di riprovare.', retry: 'Riprova',
  },
  en: {
    team: 'Team', attacker: 'Attacker', defender: 'Defender', attackerSlot: 'Attacker slot', defenderSlot: 'Defender slot', setup: 'Active set', route: 'Matchup route', outcomes: 'Move outcomes', field: 'Field & conditions', format: 'Champions · Regulation M-B', language: 'English', languageLabel: 'Language', formatLabel: 'Format', primaryNav: 'Primary navigation', inspectorOptions: 'Inspector options (coming soon)', save: 'Save draft', saved: 'Saved', teamFull: 'Team full', autoSave: 'Manual local save', demoRoster: 'Demo roster · temporary scenario', level: 'Level', tera: 'Tera type', item: 'Held item', ability: 'Ability', nature: 'Nature', statPoints: 'Stat Points', moves: 'Moves', add: 'Add Pokémon', fieldTerrain: 'Electric Terrain', fieldReflect: 'Reflect', weather: 'Weather', terrain: 'Terrain', clear: 'No weather', rain: 'Rain', sand: 'Sandstorm', snow: 'Snow', terrainNone: 'No terrain', grassyTerrain: 'Grassy Terrain', psychicTerrain: 'Psychic Terrain', mistyTerrain: 'Misty Terrain', screens: 'Screens & protection', speedSpace: 'Speed & space', lightScreen: 'Light Screen', auroraVeil: 'Aurora Veil', safeguard: 'Safeguard', tailwind: 'Tailwind', trickRoom: 'Trick Room', gravity: 'Gravity', activeEffects: 'active effects', fieldSummary: 'Simulation state', primary: 'Primary result', versus: 'vs', damage: 'Damage', power: 'Power', ko: 'KO %', koChance: 'KO chance', selectMove: 'Select move', battleMode: 'Battle mode', preset: 'UI preset · not calculated', presetNotice: 'Demonstration result: the damage engine did not calculate this matchup.', engineUnavailable: 'Damage engine unavailable · demonstration results', allRolls: 'All rolls', critical: 'Critical', spread: 'Spread', details: 'Details', calculator: 'Damage calculator', builder: 'Team builder', formatWarning: 'Data preview · unverified', statHint: '0–32 per stat · 66 total', turns: 'turns', sun: 'Harsh sunlight', sunUnavailable: 'Coming soon', off: 'off', howItWorks: 'How it works', accuracyNote: 'Demonstration values: no server-side calculation was run. Do not use them for a competitive decision.', newTeam: 'New team', teamName: 'Team name', emptySlot: 'Empty slot', addPokemon: 'Add Pokémon', searchPokemon: 'Search Pokémon', catalog: 'Pokémon catalog', selectSlot: 'Select a slot', emptyBuilderHelp: 'Choose a Pokémon from the catalog to start building your team.', removePokemon: 'Remove Pokémon', choosePokemon: 'Choose Pokémon', moveHint: 'Choose one move for each slot', catalogHint: 'Catalog loaded from the server; legality not verified', noResults: 'No Pokémon found', savedLocally: 'Saved in browser', emptyTeam: 'No Pokémon in team', loadingCatalog: 'Loading Pokémon catalog…', previewCatalog: 'Preview release is unverified. You can create a draft, but legality and damage are not certified.', certifiedCatalog: 'Certified release · format legality is available.', provisionalCatalog: 'Provisional release · some checks are still incomplete.', configurationCatalog: 'The data service is not configured. Your draft remains available locally.', releaseCatalog: 'The requested release is not available for this format.', timeoutCatalog: 'The catalog is taking too long to load. Retry.', unavailableCatalog: 'The official catalog is unavailable. Save the draft before retrying.', retry: 'Retry',
  },
} as const;

function catalogErrorMessage(error: ApiClientError | null, copyForLocale: (typeof copy)[Locale]) {
  if (error?.code === 'DATABASE_URL_REQUIRED' || error?.code === 'POSTGRESQL_RUNTIME_UNSUPPORTED' || error?.code === 'POSTGRESQL_ADAPTER_NOT_CONFIGURED') return copyForLocale.configurationCatalog;
  if (error?.code === 'UNKNOWN_RELEASE_OR_FORMAT' || error?.code === 'UNKNOWN_RELEASE' || error?.code === 'RELEASE_FORMAT_MISMATCH') return copyForLocale.releaseCatalog;
  if (error?.code === 'REQUEST_TIMEOUT') return copyForLocale.timeoutCatalog;
  return copyForLocale.unavailableCatalog;
}

function catalogStatusMessage(meta: ApiMeta | null, copyForLocale: (typeof copy)[Locale]) {
  if (!meta) return copyForLocale.formatWarning;
  if (meta.dataStatus === 'certified') return copyForLocale.certifiedCatalog;
  if (meta.dataStatus === 'provisional') return copyForLocale.provisionalCatalog;
  return copyForLocale.previewCatalog;
}

function fieldSummary(copyForLocale: (typeof copy)[Locale], state: FieldState) {
  const weatherLabels: Record<WeatherKey, string> = { clear: copyForLocale.clear, sun: copyForLocale.sun, rain: copyForLocale.rain, sand: copyForLocale.sand, snow: copyForLocale.snow };
  const terrainLabels: Record<TerrainKey, string> = { none: copyForLocale.terrainNone, electric: copyForLocale.fieldTerrain, grassy: copyForLocale.grassyTerrain, psychic: copyForLocale.psychicTerrain, misty: copyForLocale.mistyTerrain };
  const effects = [
    state.reflect ? copyForLocale.fieldReflect : null,
    state.lightScreen ? copyForLocale.lightScreen : null,
    state.auroraVeil ? copyForLocale.auroraVeil : null,
    state.safeguard ? copyForLocale.safeguard : null,
    state.tailwind ? copyForLocale.tailwind : null,
    state.trickRoom ? copyForLocale.trickRoom : null,
    state.gravity ? copyForLocale.gravity : null,
  ].filter(Boolean);
  return [weatherLabels[state.weather], terrainLabels[state.terrain], ...effects].join(' · ');
}

function WeatherGlyph({ weather }: { weather: WeatherKey }) {
  if (weather === 'sun') return <Flame size={14} aria-hidden="true" />;
  if (weather === 'rain') return <CloudRain size={14} aria-hidden="true" />;
  if (weather === 'sand') return <Cloud size={14} aria-hidden="true" />;
  if (weather === 'snow') return <Snowflake size={14} aria-hidden="true" />;
  return <CloudSun size={14} aria-hidden="true" />;
}

function TerrainGlyph({ terrain }: { terrain: TerrainKey }) {
  if (terrain === 'electric') return <Zap size={14} aria-hidden="true" />;
  if (terrain === 'grassy') return <Sprout size={14} aria-hidden="true" />;
  if (terrain === 'psychic') return <Brain size={14} aria-hidden="true" />;
  if (terrain === 'misty') return <Cloud size={14} aria-hidden="true" />;
  return <Sparkles size={14} aria-hidden="true" />;
}

function EffectGlyph({ effect }: { effect: FieldEffectKey }) {
  if (effect === 'tailwind') return <Wind size={14} aria-hidden="true" />;
  if (effect === 'trickRoom') return <Clock3 size={14} aria-hidden="true" />;
  if (effect === 'gravity') return <Orbit size={14} aria-hidden="true" />;
  if (effect === 'safeguard') return <LockKeyhole size={14} aria-hidden="true" />;
  if (effect === 'auroraVeil') return <Snowflake size={14} aria-hidden="true" />;
  return <Shield size={14} aria-hidden="true" />;
}

const typeClass = (type: string) => `type-${type.toLowerCase().replace(' ', '-')}`;
const typeNamesIt: Record<string, string> = { Normal: 'Normale', Fighting: 'Lotta', Flying: 'Volante', Poison: 'Veleno', Ground: 'Terra', Rock: 'Roccia', Bug: 'Coleottero', Ghost: 'Spettro', Steel: 'Acciaio', Fire: 'Fuoco', Water: 'Acqua', Grass: 'Erba', Electric: 'Elettro', Psychic: 'Psico', Ice: 'Ghiaccio', Dragon: 'Drago', Dark: 'Buio', Fairy: 'Folletto' };
const roleLabel = (role: string, locale: Locale) => locale === 'it' ? ({ 'Special attacker': 'Attaccante speciale', 'Pivot / Intimidate': 'Pivot / Prepotenza', 'Terrain setter': 'Setter terreno', 'Physical attacker': 'Attaccante fisico', Redirection: 'Redirect', 'Trick Room support': 'Supporto Trick Room' }[role] ?? role) : role;
const statNames: Record<Locale, Record<StatKey, string>> = {
  it: { hp: 'PS', atk: 'Attacco', def: 'Difesa', spa: 'Attacco speciale', spd: 'Difesa speciale', spe: 'Velocità' },
  en: { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' },
};
const natureValues: Record<string, string> = { Hardy: 'Hardy', Adamant: 'Adamant (+Atk, -SpA)', Modest: 'Modest (+SpA, -Atk)', Timid: 'Timid (+Spe, -Atk)', Careful: 'Careful (+SpD, -SpA)', Jolly: 'Jolly (+Spe, -SpA)', Bold: 'Bold (+Def, -Atk)', Quiet: 'Quiet (+SpA, -Spe)' };

function statLabel(stat: StatKey, locale: Locale) {
  return statNames[locale][stat];
}

function apiSelectOptions(options: ApiOption[], locale: Locale, fallback: SelectOption[]) {
  const mapped = options.map((option) => ({ value: option.labels.en, label: optionLabel(option, locale) })).filter((option) => option.value && option.label);
  return mapped.length ? mapped : fallback;
}

function natureSelectOptions(options: ApiOption[], locale: Locale, fallback: SelectOption[]) {
  const mapped = options.map((option) => {
    const value = natureValues[option.labels.en] ?? option.labels.en;
    const modifier = value.startsWith(option.labels.en) ? value.slice(option.labels.en.length) : '';
    return { value, label: `${optionLabel(option, locale)}${modifier}` };
  }).filter((option) => option.value && option.label);
  return mapped.length ? mapped : fallback;
}

function currentOption(options: ApiOption[], value: string, locale: Locale, nature = false): SelectOption[] {
  if (!value) return [];
  const match = options.find((option) => option.labels.en === value || option.labels.it === value || (nature && value.startsWith(`${option.labels.en} `)));
  if (!match) return [{ value, label: value }];
  const canonical = nature ? (natureValues[match.labels.en] ?? match.labels.en) : match.labels.en;
  return [{ value: canonical, label: optionLabel(match, locale) + (nature ? canonical.slice(match.labels.en.length) : '') }];
}

function normalizeSetForPokemon(pokemon: Pokemon, source: PokemonSet, typeOptions: ApiOption[], natureOptions: ApiOption[]): PokemonSet {
  const api = pokemon.api;
  if (!api) return cloneSet(source);
  const choose = (options: ApiOption[], value: string, fallback: string, nature = false) => {
    const match = options.find((option) => option.labels.en === value || option.labels.it === value || (nature && value.startsWith(`${option.labels.en} `)));
    if (!match) return options[0] ? (nature ? (natureValues[options[0].labels.en] ?? options[0].labels.en) : options[0].labels.en) : fallback;
    return nature ? (natureValues[match.labels.en] ?? match.labels.en) : match.labels.en;
  };
  const moveNames = Array.from(new Set(source.moves.filter((name) => api.learnableMoves.some((move) => move.labels.en === name || move.labels.it === name))));
  const fallbackMoves = api.learnableMoves.map((move) => move.labels.en).filter((name) => !moveNames.includes(name));
  return {
    ...cloneSet(source),
    tera: choose(typeOptions, source.tera, 'Normal'),
    item: choose(api.items, source.item, 'None'),
    ability: choose(api.abilities, source.ability, '—'),
    nature: choose(natureOptions, source.nature, 'Hardy', true),
    moves: [...moveNames, ...fallbackMoves].slice(0, 4),
  };
}

function TypeTag({ type, locale = 'en' }: { type: string; locale?: Locale }) {
  return <span className={`type-tag ${typeClass(type)}`}>{locale === 'it' ? (typeNamesIt[type] ?? type) : type}</span>;
}

type SelectOption = string | { value: string; label: string };

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  return <label className="control-field"><span>{label}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>{options.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select><ChevronDown size={15} aria-hidden="true" /></span></label>;
}

function TopBar({ locale, setLocale, copyForLocale, activePath, saved, onSave, showSave }: { locale: Locale; setLocale: (locale: Locale) => void; copyForLocale: (typeof copy)[Locale]; activePath: string; saved: boolean; onSave: () => void; showSave: boolean }) {
  return <header className="topbar">
    <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><Map size={20} strokeWidth={2.8} /></span><div><div className="brand-name">VGC Forge</div><div className="brand-subtitle">{activePath === '/' ? (locale === 'it' ? 'Team builder Champions' : 'Champions team builder') : (locale === 'it' ? 'Mappa matchup' : 'Matchup field map')}</div></div></div>
    <nav className="topbar-nav" aria-label={copyForLocale.primaryNav}><Link aria-current={activePath === '/' ? 'page' : undefined} className={`nav-item ${activePath === '/' ? 'nav-item-active' : ''}`} href="/"><Swords size={15} /> {copyForLocale.builder}</Link><Link aria-current={activePath === '/calculator' ? 'page' : undefined} className={`nav-item ${activePath === '/calculator' ? 'nav-item-active' : ''}`} href="/calculator"><Crosshair size={15} /> {copyForLocale.calculator}</Link></nav>
    <div className="topbar-actions"><label className="format-select"><span className="format-dot" aria-hidden="true" /><select value={copyForLocale.format} aria-label={copyForLocale.formatLabel} disabled><option>{copyForLocale.format}</option></select><ChevronDown size={15} aria-hidden="true" /></label><fieldset className="locale-toggle" aria-label={copyForLocale.languageLabel}><Globe2 size={15} aria-hidden="true" /><button type="button" aria-pressed={locale === 'it'} className={locale === 'it' ? 'locale-active' : ''} onClick={() => setLocale('it')}>IT</button><span>/</span><button type="button" aria-pressed={locale === 'en'} className={locale === 'en' ? 'locale-active' : ''} onClick={() => setLocale('en')}>EN</button></fieldset>{showSave && <button className="save-button" type="button" onClick={onSave}><Save size={16} /> {saved ? copyForLocale.saved : copyForLocale.save}</button>}</div>
  </header>;
}

function SetupInspector({ copyForLocale, side, selected, activeSet, activeMoves, typeOptions, natureOptions, setActiveSet, selectedMoveIndex, setSelectedMoveIndex }: { copyForLocale: (typeof copy)[Locale]; side: 'attacker' | 'defender'; selected: Pokemon; activeSet: PokemonSet; activeMoves: Move[]; typeOptions: ApiOption[]; natureOptions: ApiOption[]; setActiveSet: (patch: Partial<PokemonSet>) => void; selectedMoveIndex: number; setSelectedMoveIndex: (index: number) => void }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  const derivedStats = deriveStats(selected, activeSet);
  const statEntries = statKeys.map((key) => [statLabel(key, locale), key, activeSet.statPoints[key], derivedStats[key]] as const);
  const teraOptions = typeOptions.length ? apiSelectOptions(typeOptions, locale, []) : currentOption([], activeSet.tera, locale);
  const itemOptions = selected.api?.items.length ? apiSelectOptions(selected.api.items, locale, []) : currentOption([], activeSet.item, locale);
  const abilityOptions = selected.api?.abilities.length ? apiSelectOptions(selected.api.abilities, locale, []) : currentOption([], activeSet.ability, locale);
  const natureOptionsForLocale = natureOptions.length ? natureSelectOptions(natureOptions, locale, []) : currentOption([], activeSet.nature, locale, true);
  const sliderLabel = locale === 'it' ? 'cursore' : 'slider';
  const moveOptions: SelectOption[] = selected.api?.learnableMoves.map((move) => ({ value: move.labels.en, label: optionLabel(move, locale) })) ?? Object.values(moveCatalog).map((move) => move.name);
  return <aside className="setup-inspector">
    <div className="panel-title-row"><div><h1>{copyForLocale.setup}</h1><p>{side === 'attacker' ? copyForLocale.attacker : copyForLocale.defender} · {selected.name}</p></div><button className="icon-button" type="button" aria-label={copyForLocale.inspectorOptions} disabled><SlidersHorizontal size={17} /></button></div>
    <div className="selected-pokemon"><div className="pokemon-monogram">{selected.name.slice(0, 2).toUpperCase()}</div><div className="selected-copy"><strong>{selected.name}</strong><div className="tag-row">{selected.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</div></div><span className="level-badge">Lv. 50</span></div>
    <div className="field-stack"><SelectControl label={copyForLocale.tera} value={activeSet.tera} onChange={(value) => setActiveSet({ tera: value })} options={teraOptions} /><SelectControl label={copyForLocale.item} value={activeSet.item} onChange={(value) => setActiveSet({ item: value })} options={itemOptions} /><SelectControl label={copyForLocale.ability} value={activeSet.ability} onChange={(value) => setActiveSet({ ability: value })} options={abilityOptions} /><SelectControl label={copyForLocale.nature} value={activeSet.nature} onChange={(value) => setActiveSet({ nature: value })} options={natureOptionsForLocale} /></div>
    <div className="section-divider" />
    <div className="stat-heading"><div><h2>{copyForLocale.statPoints}</h2><p>{copyForLocale.statHint}</p></div><span className="stat-total">{Object.values(activeSet.statPoints).reduce((sum, value) => sum + value, 0)} / 66</span></div>
    <div className="stat-list">{statEntries.map(([label, key, value, derived]) => <label className="stat-row" key={key}><span className="stat-label">{label}</span><input aria-label={`${label} · ${copyForLocale.statPoints}`} type="number" min={0} max={32} value={value} onChange={(event) => setActiveSet({ statPoints: { ...activeSet.statPoints, [key]: Number(event.target.value) } })} /><input className="stat-range" aria-label={`${label} · ${copyForLocale.statPoints} · ${sliderLabel}`} type="range" min={0} max={32} value={value} onChange={(event) => setActiveSet({ statPoints: { ...activeSet.statPoints, [key]: Number(event.target.value) } })} /><span className="derived-value">{derived}</span></label>)}</div>
    <div className="section-divider" /><div className="moves-heading"><h2>{copyForLocale.moves}</h2><span>{activeMoves.length} / 4</span></div><div className="move-list">{activeMoves.map((move, index) => <label className={`move-row ${selectedMoveIndex === index ? 'move-row-active' : ''}`} key={`${move.name}-${index}`}><span className={`move-icon ${typeClass(move.type)}`}>{move.power === null ? <Shield size={15} /> : <Sparkles size={15} />}</span><select aria-label={`${copyForLocale.moves} ${index + 1}`} value={activeSet.moves[index] ?? move.name} onFocus={() => setSelectedMoveIndex(index)} onChange={(event) => { const moves = [...activeSet.moves]; moves[index] = event.target.value; setActiveSet({ moves }); setSelectedMoveIndex(index); }}>{moveOptions.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option value={normalized.value} key={normalized.value}>{normalized.label}</option>; })}</select><TypeTag type={move.type} locale={locale} /></label>)}</div>
  </aside>;
}

function Region({ side, pokemon, set, typeOptions, copyForLocale }: { side: 'attacker' | 'defender'; pokemon: Pokemon; set: PokemonSet; typeOptions: ApiOption[]; copyForLocale: (typeof copy)[Locale] }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  const derivedStats = deriveStats(pokemon, set);
  return <div className={`map-region map-region-${side}`}><div className="region-meta"><span>{side === 'attacker' ? copyForLocale.attacker : copyForLocale.defender}</span><span className="region-index">0{side === 'attacker' ? 1 : 2}</span></div><div className="region-heading"><strong>{pokemonLabel(pokemon, locale)}</strong><div className="tag-row">{pokemon.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</div></div><div className="region-data"><span>{copyForLocale.level} <b>50</b></span><span>{copyForLocale.tera} <b>{localizedValue(set.tera, typeOptions, locale)}</b></span><span>{copyForLocale.item} <b>{localizedValue(set.item, pokemon.api?.items, locale)}</b></span><span>{copyForLocale.ability} <b>{localizedValue(set.ability, pokemon.api?.abilities, locale)}</b></span></div><div className="region-hp"><span>HP</span><strong>{derivedStats.hp} / {derivedStats.hp}</strong></div></div>;
}

function FieldControls({ copyForLocale, fieldState, setFieldState, mode, summary }: { copyForLocale: (typeof copy)[Locale]; fieldState: FieldState; setFieldState: (patch: Partial<FieldState>) => void; mode: Mode; summary: string }) {
  const weatherOptions: Array<{ key: WeatherKey; label: string }> = [
    { key: 'clear', label: copyForLocale.clear },
    { key: 'sun', label: copyForLocale.sun },
    { key: 'rain', label: copyForLocale.rain },
    { key: 'sand', label: copyForLocale.sand },
    { key: 'snow', label: copyForLocale.snow },
  ];
  const terrainOptions: Array<{ key: TerrainKey; label: string }> = [
    { key: 'none', label: copyForLocale.terrainNone },
    { key: 'electric', label: copyForLocale.fieldTerrain },
    { key: 'grassy', label: copyForLocale.grassyTerrain },
    { key: 'psychic', label: copyForLocale.psychicTerrain },
    { key: 'misty', label: copyForLocale.mistyTerrain },
  ];
  const protectionEffects: Array<{ key: FieldEffectKey; label: string }> = [
    { key: 'reflect', label: copyForLocale.fieldReflect },
    { key: 'lightScreen', label: copyForLocale.lightScreen },
    { key: 'auroraVeil', label: copyForLocale.auroraVeil },
    { key: 'safeguard', label: copyForLocale.safeguard },
  ];
  const speedEffects: Array<{ key: FieldEffectKey; label: string }> = [
    { key: 'tailwind', label: copyForLocale.tailwind },
    { key: 'trickRoom', label: copyForLocale.trickRoom },
    { key: 'gravity', label: copyForLocale.gravity },
  ];
  const toggleEffect = (effect: FieldEffectKey) => setFieldState({ [effect]: !fieldState[effect] } as Partial<FieldState>);
  return <section className="field-section"><div className="field-heading"><div><h2>{copyForLocale.field}</h2><p>{copyForLocale.fieldSummary} · {summary}</p></div><span>{mode === 'doubles' ? '2v2' : '1v1'}</span></div><div className="field-panel"><fieldset className="field-group"><legend>{copyForLocale.weather}</legend><div className="field-option-row field-option-row-weather">{weatherOptions.map((option) => <button type="button" key={option.key} aria-pressed={fieldState.weather === option.key} className={`field-option field-option-weather field-option-${option.key} ${fieldState.weather === option.key ? 'field-option-active' : ''}`} onClick={() => setFieldState({ weather: option.key })}><WeatherGlyph weather={option.key} /><span>{option.label}</span></button>)}</div></fieldset><fieldset className="field-group"><legend>{copyForLocale.terrain}</legend><div className="field-option-row field-option-row-terrain">{terrainOptions.map((option) => <button type="button" key={option.key} aria-pressed={fieldState.terrain === option.key} className={`field-option field-option-terrain field-option-${option.key} ${fieldState.terrain === option.key ? 'field-option-active' : ''}`} onClick={() => setFieldState({ terrain: option.key })}><TerrainGlyph terrain={option.key} /><span>{option.label}</span></button>)}</div></fieldset><div className="field-effect-columns"><fieldset className="field-group"><legend>{copyForLocale.screens}</legend><div className="field-effect-grid">{protectionEffects.map((effect) => <button type="button" key={effect.key} aria-pressed={fieldState[effect.key]} className={`field-option field-option-effect ${fieldState[effect.key] ? 'field-option-active' : ''}`} onClick={() => toggleEffect(effect.key)}><EffectGlyph effect={effect.key} /><span>{effect.label}</span></button>)}</div></fieldset><fieldset className="field-group"><legend>{copyForLocale.speedSpace}</legend><div className="field-effect-grid">{speedEffects.map((effect) => <button type="button" key={effect.key} aria-pressed={fieldState[effect.key]} className={`field-option field-option-effect ${fieldState[effect.key] ? 'field-option-active' : ''}`} onClick={() => toggleEffect(effect.key)}><EffectGlyph effect={effect.key} /><span>{effect.label}</span></button>)}</div></fieldset></div><div className="field-active-summary" aria-live="polite"><Check size={15} aria-hidden="true" /><span><b>{copyForLocale.fieldSummary}:</b> {summary}</span></div></div></section>;
}

function MatchupRoute({ copyForLocale, roster, attacker, defender, attackerSet, defenderSet, typeOptions, attackerIndex, defenderIndex, setAttackerIndex, setDefenderIndex, mode, setMode, activeMoves, selectedMoveIndex, setSelectedMoveIndex, fieldState, setFieldState, fieldSummary }: { copyForLocale: (typeof copy)[Locale]; roster: Pokemon[]; attacker: Pokemon; defender: Pokemon; attackerSet: PokemonSet; defenderSet: PokemonSet; typeOptions: ApiOption[]; attackerIndex: number; defenderIndex: number; setAttackerIndex: (index: number) => void; setDefenderIndex: (index: number) => void; mode: Mode; setMode: (mode: Mode) => void; activeMoves: Move[]; selectedMoveIndex: number; setSelectedMoveIndex: (index: number) => void; fieldState: FieldState; setFieldState: (patch: Partial<FieldState>) => void; fieldSummary: string }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  const selectedMove = activeMoves[selectedMoveIndex] ?? activeMoves[0];
  const moveType = selectedMove.type;
  const selector = (label: string, value: number, onChange: (index: number) => void, blockedIndex: number) => <label className="control-field"><span>{label}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label}>{roster.map((pokemon, index) => <option key={pokemon.name} value={index} disabled={index === blockedIndex}>{index + 1} · {pokemonLabel(pokemon, locale)}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></span></label>;
  return <section className="route-column"><div className="route-title-row"><div><h2>{copyForLocale.route}</h2><p>{pokemonLabel(attacker, locale)} <ArrowRight size={14} /> {pokemonLabel(defender, locale)}</p></div><fieldset className="mode-toggle" aria-label={copyForLocale.battleMode}><button type="button" aria-pressed={mode === 'doubles'} className={mode === 'doubles' ? 'mode-active' : ''} onClick={() => setMode('doubles')}>2v2</button><button type="button" aria-pressed={mode === 'singles'} className={mode === 'singles' ? 'mode-active' : ''} onClick={() => setMode('singles')}>1v1</button></fieldset></div><div className="matchup-selectors">{selector(copyForLocale.attackerSlot, attackerIndex, setAttackerIndex, defenderIndex)}{selector(copyForLocale.defenderSlot, defenderIndex, setDefenderIndex, attackerIndex)}</div><div className="map-canvas"><div className="map-grid-markers" aria-hidden="true"><span /> <span /> <span /></div><Region side="attacker" pokemon={attacker} set={attackerSet} typeOptions={typeOptions} copyForLocale={copyForLocale} /><Region side="defender" pokemon={defender} set={defenderSet} typeOptions={typeOptions} copyForLocale={copyForLocale} /><div className="route-line" aria-hidden="true"><span /> <span /> <span /></div><div className="result-stack"><button type="button" className={`move-selector type-${moveType.toLowerCase()}`} aria-label={`${copyForLocale.selectMove}: ${selectedMove.name}`} onClick={() => setSelectedMoveIndex((selectedMoveIndex + 1) % activeMoves.length)}><span className={`move-icon ${typeClass(moveType)}`}><Sparkles size={15} /></span><strong>{selectedMove.name}</strong><TypeTag type={moveType} locale={locale} /><ChevronDown size={15} /></button><div className="ko-result"><span>{copyForLocale.koChance} · {copyForLocale.preset}</span><strong>{selectedMove.ko}</strong><small>{copyForLocale.versus} {pokemonLabel(defender, locale)}</small></div><div className="result-details"><span><b>{selectedMove.range}</b><small>{copyForLocale.damage}</small></span><span><b>{selectedMove.ko ?? '—'}</b><small>{copyForLocale.allRolls}</small></span></div></div></div><FieldControls copyForLocale={copyForLocale} fieldState={fieldState} setFieldState={setFieldState} mode={mode} summary={fieldSummary} /></section>;
}

function OutcomesMatrix({ copyForLocale, defender, detailsOpen, setDetailsOpen, activeMoves, selectedMoveIndex, fieldSummary }: { copyForLocale: (typeof copy)[Locale]; defender: Pokemon; detailsOpen: boolean; setDetailsOpen: (open: boolean) => void; activeMoves: Move[]; selectedMoveIndex: number; fieldSummary: string }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  const targetKOs = [['Incineroar', ['88%', '43%', '6%', '—']], ['Rillaboom', ['10%', '6%', '0%', '—']], ['Urshifu', ['47%', '24%', '8%', '—']], ['Amoonguss', ['27%', '0%', '0%', '—']], ['Farigiraf', ['30%', '18%', '2%', '—']]] as const;
  const targetDamage = [['Incineroar', ['112–132', '71–84', '56–67', '—']], ['Rillaboom', ['30–36', '24–29', '78–92', '—']], ['Urshifu', ['74–88', '62–73', '16–19', '—']], ['Amoonguss', ['66–78', '44–52', '27–32', '—']], ['Farigiraf', ['46–55', '64–75', '19–22', '—']]] as const;
  const [metric, setMetric] = useState<'percent' | 'damage'>('percent');
  const selectedMove = activeMoves[selectedMoveIndex] ?? activeMoves[0];
  return <section className="outcomes-panel"><div className="outcomes-heading"><div><h2>{copyForLocale.outcomes}</h2><p>{copyForLocale.primary} · {selectedMove.name} {copyForLocale.versus} {pokemonLabel(defender, locale)} · {copyForLocale.preset}</p></div><div className="outcomes-actions"><button type="button" aria-pressed={detailsOpen} aria-expanded={detailsOpen} aria-controls="outcomes-details" className="outline-button" onClick={() => setDetailsOpen(!detailsOpen)}><Info size={14} /> {copyForLocale.details}</button><fieldset className="segmented" aria-label={copyForLocale.damage}><button type="button" aria-pressed={metric === 'percent'} className={metric === 'percent' ? 'segmented-active' : ''} onClick={() => setMetric('percent')}>%</button><button type="button" aria-pressed={metric === 'damage'} className={metric === 'damage' ? 'segmented-active' : ''} onClick={() => setMetric('damage')}>{copyForLocale.damage}</button></fieldset></div></div><div className="table-wrap"><table><thead><tr><th>{copyForLocale.moves}</th><th>{copyForLocale.power}</th><th>{copyForLocale.damage}</th><th>{copyForLocale.allRolls}</th>{targetKOs.map(([target]) => <th key={target}>{metric === 'percent' ? copyForLocale.ko : copyForLocale.damage}<br /><span>{target}</span></th>)}</tr></thead><tbody>{activeMoves.map((move, index) => <tr key={move.name} className={index === selectedMoveIndex ? 'table-row-primary' : ''}><td><span className={`table-move-icon ${typeClass(move.type)}`}>{move.power === null ? <Shield size={14} /> : <Sparkles size={14} />}</span><strong>{move.name}</strong><TypeTag type={move.type} locale={locale} /></td><td>{move.power ?? '—'}</td><td>{move.range}</td><td>{move.ko}</td>{targetKOs.map(([, values], targetIndex) => <td key={`${move.name}-${targetIndex}`}><span className={index === selectedMoveIndex ? 'ko-pill' : ''}>{metric === 'percent' ? values[index] : targetDamage[targetIndex][1][index]}</span></td>)}</tr>)}</tbody></table></div>{detailsOpen && <div className="details-callout" id="outcomes-details"><Info size={14} /><span>{copyForLocale.critical}: 3.1% · {copyForLocale.spread}: ×1.00 · {copyForLocale.field}: {fieldSummary}</span></div>}<div className="accuracy-note"><CircleAlert size={14} /><span>{copyForLocale.formatWarning}. {copyForLocale.accuracyNote}</span></div></section>;
}

function TeamRail({ roster, selectedIndex, setSelectedIndex, copyForLocale }: { roster: Pokemon[]; selectedIndex: number; setSelectedIndex: (index: number) => void; copyForLocale: (typeof copy)[Locale] }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  return <aside className="team-rail"><div className="team-rail-heading"><div><h2>{copyForLocale.team}</h2><p>Regulation M-B</p></div><span className="team-count">{roster.length} / 6</span></div><div className="team-slots">{roster.map((pokemon, index) => <button type="button" aria-pressed={selectedIndex === index} className={`team-slot ${selectedIndex === index ? 'team-slot-active' : ''}`} onClick={() => setSelectedIndex(index)} key={pokemon.name}><span className="slot-number">{index + 1}</span><span className="slot-copy"><strong>{locale === 'it' ? pokemon.nameIt ?? pokemon.name : pokemon.name}</strong><small>{locale === 'it' ? pokemon.roleIt ?? roleLabel(pokemon.role, locale) : pokemon.role}</small></span><span className="slot-types">{pokemon.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</span></button>)}</div><button type="button" className="add-button" disabled title={copyForLocale.teamFull}><Plus size={16} /> {copyForLocale.add}</button><div className="team-rail-foot"><span className="status-dot" /> {copyForLocale.autoSave} · v0.1</div></aside>;
}

function CalculatorWorkspace({ standalone = false }: { standalone?: boolean }) {
  const [savedWorkspace] = useState<Partial<{ locale: Locale; mode: Mode; attackerIndex: number; defenderIndex: number; fieldState: FieldState; sets: Record<string, PokemonSet> }>>({});
  const [locale, setLocaleState] = useState<Locale>('it');
  const setLocale = (nextLocale: Locale) => { setLocaleState(nextLocale); persistLocale(nextLocale); };
  const [mode, setMode] = useState<Mode>(savedWorkspace.mode === 'singles' ? 'singles' : 'doubles');
  const [attackerIndex, setAttackerIndexState] = useState(typeof savedWorkspace.attackerIndex === 'number' && team[savedWorkspace.attackerIndex] ? savedWorkspace.attackerIndex : 0);
  const [defenderIndex, setDefenderIndexState] = useState(typeof savedWorkspace.defenderIndex === 'number' && team[savedWorkspace.defenderIndex] ? savedWorkspace.defenderIndex : 1);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [defenderMoveIndex, setDefenderMoveIndex] = useState(0);
  const [fieldState, setFieldStateState] = useState<FieldState>({ weather: 'clear', terrain: 'electric', reflect: true, lightScreen: false, auroraVeil: false, safeguard: false, tailwind: false, trickRoom: false, gravity: false, ...savedWorkspace.fieldState });
  const persistedSets = savedWorkspace.sets && typeof savedWorkspace.sets === 'object' ? Object.fromEntries(Object.entries(savedWorkspace.sets).filter(([, set]) => Boolean(set) && Array.isArray((set as PokemonSet).moves) && (set as PokemonSet).moves.length > 0)) as Record<string, PokemonSet> : {};
  const [sets, setSets] = useState<Record<string, PokemonSet>>({ ...defaultSets, ...persistedSets });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saved, setSaved] = useState(false);
  const [catalogEntries, setCatalogEntries] = useState<Pokemon[] | null>(null);
  const [catalogMeta, setCatalogMeta] = useState<ApiMeta | null>(null);
  const [catalogFormat, setCatalogFormat] = useState<ApiFormat | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<{ types: ApiOption[]; natures: ApiOption[] }>({ types: [], natures: [] });
  const [builderDraftSlots, setBuilderDraftSlots] = useState<Array<Exclude<BuilderSlot, null>>>([]);
  const builderImportedRef = useRef(false);
  const [catalogError, setCatalogError] = useState<ApiClientError | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const copyForLocale = copy[locale];
  const pathname = usePathname();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('vgc-forge:workspace-v1');
        const parsed = raw ? JSON.parse(raw) as Partial<{ locale: Locale; mode: Mode; attackerIndex: number; defenderIndex: number; fieldState: FieldState; sets: Record<string, PokemonSet> }> : {};
        const preferredLocale = storedLocale() ?? (parsed.locale === 'en' ? 'en' : 'it');
        setLocaleState(preferredLocale);
        if (parsed.mode === 'singles' || parsed.mode === 'doubles') setMode(parsed.mode);
        if (typeof parsed.attackerIndex === 'number') setAttackerIndexState(parsed.attackerIndex);
        if (typeof parsed.defenderIndex === 'number') setDefenderIndexState(parsed.defenderIndex);
        if (parsed.fieldState) setFieldStateState((current) => ({ ...current, ...parsed.fieldState }));
        if (parsed.sets && typeof parsed.sets === 'object') setSets((current) => ({ ...current, ...parsed.sets }));
      } catch {
        // Local workspace state is optional; defaults remain authoritative.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const context = await getCatalogContext({ formatId: defaultFormatId, signal });
      setCatalogFormat(context.data.format);
      setCatalogOptions({ types: context.data.types, natures: context.data.natures });
      const response = await getCatalogPokemon({ formatId: context.data.format.id, dataReleaseId: context.meta.releaseId ?? undefined, locale, signal });
      const entries = response.data.pokemon.map(viewPokemonFromApi);
      setCatalogEntries(entries);
      try {
        if (builderImportedRef.current) {
          setCatalogMeta(response.meta);
          return;
        }
        const rawDraft = JSON.parse(window.localStorage.getItem('vgc-forge:builder-v1') ?? '{}') as { slots?: unknown };
        const restored = restoreBuilderSlots(rawDraft.slots, entries);
        const validRestored = restored.filter((slot): slot is Exclude<BuilderSlot, null> => slot !== null);
        setBuilderDraftSlots(validRestored);
        if (validRestored.length && entries[0]) setSets((current) => validRestored.reduce((next, slot) => { const pokemon = entries.find((entry) => entry.name === slot.pokemonName); return pokemon ? { ...next, [pokemonKey(pokemon)]: normalizeSetForPokemon(pokemon, slot.set, context.data.types, context.data.natures) } : next; }, current));
        builderImportedRef.current = true;
      } catch {
        setBuilderDraftSlots([]);
      }
      setCatalogMeta(response.meta);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setCatalogError(error instanceof ApiClientError ? error : new ApiClientError('The data service is unavailable.', 503, 'DATA_SERVICE_UNAVAILABLE'));
    } finally {
      if (!signal?.aborted) setCatalogLoading(false);
    }
  }, [locale]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCatalog(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadCatalog]);
  const draftPokemon = useMemo(() => builderDraftSlots.map((slot) => catalogEntries?.find((entry) => entry.name === slot.pokemonName)).filter((entry): entry is Pokemon => Boolean(entry)), [builderDraftSlots, catalogEntries]);
  const catalogRoster = catalogEntries ?? team;
  const activeTeam = useMemo(() => draftPokemon.length ? [...draftPokemon, ...catalogRoster.filter((entry) => !draftPokemon.some((draft) => pokemonKey(draft) === pokemonKey(entry)))] : catalogRoster, [catalogRoster, draftPokemon]);
  const attacker = useMemo(() => activeTeam[attackerIndex] ?? activeTeam[0] ?? team[0], [activeTeam, attackerIndex]);
  const defender = useMemo(() => activeTeam[defenderIndex] ?? activeTeam[1] ?? activeTeam[0] ?? team[1], [activeTeam, defenderIndex]);
  const selectedTarget = defender;
  const activeSet = normalizeSetForPokemon(attacker, sets[pokemonKey(attacker)] ?? sets[attacker.name] ?? setForPokemon(attacker), catalogOptions.types, catalogOptions.natures);
  const activeMoves = movesForSet(activeSet, attacker, locale);
  const selectedMove = activeMoves[selectedMoveIndex] ?? activeMoves[0];
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const activeFieldSummary = fieldSummary(copyForLocale, fieldState);
  const engineUnavailable = catalogMeta?.coverage?.damageEngine !== 'available' || catalogFormat?.capabilities.damageEngine !== true;
  const setAttackerIndex = (index: number) => {
    if (!activeTeam[index]) return;
    setAttackerIndexState(index);
    setSelectedMoveIndex(0);
    if (index === defenderIndex) setDefenderIndexState(index === 0 ? 1 : 0);
  };
  const setDefenderIndex = (index: number) => {
    if (!activeTeam[index] || index === attackerIndex) return;
    setDefenderIndexState(index);
    setDefenderMoveIndex(0);
  };
  const setActiveSet = (patch: Partial<PokemonSet>) => setSets((current) => {
    const key = pokemonKey(attacker);
    const currentSet = current[key] ?? current[attacker.name] ?? setForPokemon(attacker);
    if (!patch.statPoints) return { ...current, [key]: { ...currentSet, ...patch } };
    const raw = patch.statPoints;
    const changedKey = statKeys.find((key) => raw[key] !== currentSet.statPoints[key]) ?? 'hp';
    const nextPoints = statKeys.reduce((result, key) => ({ ...result, [key]: Math.min(32, Math.max(0, Number.isFinite(Number(raw[key])) ? Math.round(Number(raw[key])) : currentSet.statPoints[key])) }), {} as Record<StatKey, number>);
    let overflow = statKeys.reduce((sum, key) => sum + nextPoints[key], 0) - 66;
    for (const key of [...statKeys.filter((key) => key !== changedKey), changedKey]) {
      if (overflow <= 0) break;
      const reduction = Math.min(nextPoints[key], overflow);
      nextPoints[key] -= reduction;
      overflow -= reduction;
    }
    return { ...current, [key]: { ...currentSet, ...patch, statPoints: nextPoints } };
  });
  const setDefenderSet = (patch: Partial<PokemonSet>) => setSets((current) => {
    const key = pokemonKey(defender);
    const currentSet = current[key] ?? current[defender.name] ?? setForPokemon(defender);
    if (!patch.statPoints) return { ...current, [key]: { ...currentSet, ...patch } };
    const raw = patch.statPoints;
    const changedKey = statKeys.find((key) => raw[key] !== currentSet.statPoints[key]) ?? 'hp';
    const nextPoints = clampStatPoints({ ...currentSet.statPoints, ...raw }, changedKey);
    return { ...current, [key]: { ...currentSet, ...patch, statPoints: nextPoints } };
  });
  const defenderSet = normalizeSetForPokemon(defender, sets[pokemonKey(defender)] ?? sets[defender.name] ?? setForPokemon(defender), catalogOptions.types, catalogOptions.natures);
  const defenderMoves = movesForSet(defenderSet, defender, locale);
  const setFieldState = (patch: Partial<FieldState>) => setFieldStateState((current) => ({ ...current, ...patch }));
  const saveWorkspace = () => {
    window.localStorage.setItem('vgc-forge:workspace-v1', JSON.stringify({ locale, mode, attackerIndex, defenderIndex, fieldState, sets }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  if (catalogLoading || catalogError) {
    return <main className="forge-shell"><TopBar locale={locale} setLocale={setLocale} copyForLocale={copyForLocale} activePath={pathname === '/calculator' ? '/calculator' : '/'} saved={saved} onSave={saveWorkspace} showSave={false} /><div className="format-banner" role={catalogError ? 'alert' : undefined} aria-live="polite"><CircleAlert size={14} /><span>{catalogLoading ? copyForLocale.loadingCatalog : catalogErrorMessage(catalogError, copyForLocale)}</span>{catalogError && <button type="button" onClick={() => void loadCatalog()}>{copyForLocale.retry}</button>}</div><section className="calculator-data-state"><h1>{copyForLocale.calculator}</h1><p>{catalogLoading ? copyForLocale.loadingCatalog : catalogErrorMessage(catalogError, copyForLocale)}</p></section></main>;
  }
  return <main className="forge-shell">
    {/* THESIS: an evidence-first tactical field map for building legal Champions teams and reading damage outcomes.
         OWN-WORLD: folded guide stock, cartographic panels, coastline dividers, crisp black ink, lime/blue/coral/yellow blocks.
         STORY: select a roster slot, tune the active set, read the attacker-to-defender route, then compare every move.
         FIRST VIEWPORT: setup inspector, primary KO result, field state, outcomes matrix, and six-slot team rail.
         FORM: generous cream canvas with angular map regions, dense data rows, and semantic controls.
         FINISH: one restrained state transition, responsive stacking, keyboard-visible controls, no decorative gradients. */}
    <TopBar locale={locale} setLocale={setLocale} copyForLocale={copyForLocale} activePath={pathname === '/calculator' ? '/calculator' : '/'} saved={saved} onSave={saveWorkspace} showSave={!standalone} /><div className="format-banner"><CircleAlert size={14} /><span>{catalogStatusMessage(catalogMeta, copyForLocale)}{standalone ? ` · ${copyForLocale.demoRoster}` : ''}</span>{standalone && engineUnavailable && <output className="engine-status-label">{copyForLocale.engineUnavailable}</output>}{builderDraftSlots.length > 0 && <output className="engine-status-label">{locale === 'it' ? 'Bozza builder caricata' : 'Builder draft loaded'}</output>}{catalogMeta?.releaseId && <small>{catalogFormat ? optionLabel(catalogFormat, locale) : copyForLocale.format} · {catalogMeta.releaseId}</small>}<button type="button" aria-pressed={showHelp} aria-expanded={showHelp} aria-controls="help-callout" onClick={() => setShowHelp(!showHelp)}>{copyForLocale.howItWorks}</button></div>{standalone && <div className="preset-callout" role="note"><CircleAlert size={15} aria-hidden="true" /><span>{copyForLocale.presetNotice}</span></div>}{showHelp && <div className="help-callout" id="help-callout"><Info size={14} /><span>{locale === 'it' ? (standalone ? 'Scegli attaccante e difensore dal catalogo server, configura il set attivo e seleziona una mossa: i risultati restano preset finché l’engine non è certificato.' : 'Scegli un Pokémon dal rail, modifica Stat Points e seleziona una mossa: il route e la matrice si aggiornano insieme.') : (standalone ? 'Choose an attacker and defender from the server catalog, tune the active set, and select a move: results remain presets until the engine is certified.' : 'Choose a Pokémon from the rail, tune the active set, and select a move: the route and matrix stay in sync.')}</span></div>}<div className={`workspace-grid ${standalone ? 'workspace-grid-standalone' : ''}`}><SetupInspector side="attacker" copyForLocale={copyForLocale} selected={attacker} activeSet={activeSet} activeMoves={activeMoves} typeOptions={catalogOptions.types} natureOptions={catalogOptions.natures} setActiveSet={setActiveSet} selectedMoveIndex={selectedMoveIndex} setSelectedMoveIndex={setSelectedMoveIndex} /><div className="main-column"><MatchupRoute copyForLocale={copyForLocale} roster={activeTeam} attacker={attacker} defender={defender} attackerSet={activeSet} defenderSet={defenderSet} typeOptions={catalogOptions.types} attackerIndex={attackerIndex} defenderIndex={defenderIndex} setAttackerIndex={setAttackerIndex} setDefenderIndex={setDefenderIndex} mode={mode} setMode={setMode} activeMoves={activeMoves} selectedMoveIndex={selectedMoveIndex} setSelectedMoveIndex={setSelectedMoveIndex} fieldState={fieldState} setFieldState={setFieldState} fieldSummary={activeFieldSummary} /><div className="defender-inspector-wrap"><SetupInspector side="defender" copyForLocale={copyForLocale} selected={defender} activeSet={defenderSet} activeMoves={defenderMoves} typeOptions={catalogOptions.types} natureOptions={catalogOptions.natures} setActiveSet={setDefenderSet} selectedMoveIndex={defenderMoveIndex} setSelectedMoveIndex={setDefenderMoveIndex} /></div><OutcomesMatrix copyForLocale={copyForLocale} defender={defender} detailsOpen={detailsOpen} setDetailsOpen={setDetailsOpen} activeMoves={activeMoves} selectedMoveIndex={selectedMoveIndex} fieldSummary={activeFieldSummary} /></div>{!standalone && <TeamRail roster={activeTeam} selectedIndex={attackerIndex} setSelectedIndex={setAttackerIndex} copyForLocale={copyForLocale} />}</div><div className="mobile-context" aria-live="polite"><span>{copyForLocale.defender}: {pokemonLabel(selectedTarget, locale)}</span><span>·</span><span>{copyForLocale.ko} {selectedMove.ko} · {copyForLocale.preset}</span></div>
  </main>;
}

function BuilderSetEditor({ copyForLocale, locale, pokemon, slot, natureOptions, typeOptions, onUpdate, onRemove }: { copyForLocale: (typeof copy)[Locale]; locale: Locale; pokemon: Pokemon; slot: BuilderSlot & { pokemonName: string; set: PokemonSet }; natureOptions: ApiOption[]; typeOptions: ApiOption[]; onUpdate: (patch: Partial<PokemonSet>) => void; onRemove: () => void }) {
  const { set } = slot;
  const derivedStats = deriveStats(pokemon, set);
  const statEntries = statKeys.map((key) => [statLabel(key, locale), key] as const);
  const sliderLabel = locale === 'it' ? 'cursore' : 'slider';
  const moveOptions: SelectOption[] = pokemon.api?.learnableMoves.map((move) => ({ value: optionLabel(move), label: optionLabel(move, locale) })) ?? Object.values(moveCatalog).map((move) => move.name);
  const itemOptions: SelectOption[] = pokemon.api ? [{ value: 'None', label: locale === 'it' ? 'Nessuno' : 'None' }, ...pokemon.api.items.map((item) => ({ value: optionLabel(item), label: optionLabel(item, locale) }))] : ['None', 'Choice Specs', 'Safety Goggles', 'Focus Sash', 'Assault Vest', 'Rocky Helmet', 'Mental Herb', 'Booster Energy'];
  const abilityOptions: SelectOption[] = pokemon.api?.abilities.map((ability) => ({ value: optionLabel(ability), label: optionLabel(ability, locale) })) ?? ['Protosynthesis', 'Intimidate', 'Grassy Surge', 'Unseen Fist', 'Regenerator', 'Armor Tail'];
  const teraOptions: SelectOption[] = typeOptions.map((type) => ({ value: optionLabel(type), label: optionLabel(type, locale) }));
  const natureLabels: SelectOption[] = natureOptions.map((nature) => ({ value: optionLabel(nature), label: optionLabel(nature, locale) }));
  const updateStat = (key: StatKey, value: number) => onUpdate({ statPoints: clampStatPoints({ ...set.statPoints, [key]: value }, key) });
  const updateMove = (index: number, value: string) => onUpdate({ moves: set.moves.map((move, moveIndex) => moveIndex === index ? value : move) });

  return <div className="builder-editor-content">
    <div className="builder-editor-heading">
      <div>
        <p className="builder-section-kicker">{copyForLocale.setup}</p>
        <h1>{pokemon.name}</h1>
        <div className="tag-row">{pokemon.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</div>
      </div>
      <button type="button" className="builder-remove" onClick={onRemove}>{copyForLocale.removePokemon}</button>
    </div>
    <div className="builder-control-grid">
      <SelectControl label={copyForLocale.tera} value={set.tera} onChange={(value) => onUpdate({ tera: value })} options={teraOptions.length ? teraOptions : ['Normal']} />
      <SelectControl label={copyForLocale.item} value={set.item} onChange={(value) => onUpdate({ item: value })} options={itemOptions.length ? itemOptions : ['None']} />
      <SelectControl label={copyForLocale.ability} value={set.ability} onChange={(value) => onUpdate({ ability: value })} options={abilityOptions.length ? abilityOptions : ['—']} />
      <SelectControl label={copyForLocale.nature} value={set.nature} onChange={(value) => onUpdate({ nature: value })} options={natureLabels.length ? natureLabels : ['Hardy']} />
    </div>
    <div className="builder-divider" />
    <div className="builder-section-heading"><div><h2>{copyForLocale.statPoints}</h2><p>{copyForLocale.statHint}</p></div><strong>{Object.values(set.statPoints).reduce((sum, value) => sum + value, 0)} / 66</strong></div>
    <div className="builder-stat-grid">{statEntries.map(([label, key]) => <label className="builder-stat-row" key={key}><span>{label}</span><input type="number" min={0} max={32} value={set.statPoints[key]} aria-label={`${label} · ${copyForLocale.statPoints}`} onChange={(event) => updateStat(key, Number(event.target.value))} /><input type="range" min={0} max={32} value={set.statPoints[key]} aria-label={`${label} · ${copyForLocale.statPoints} · ${sliderLabel}`} onChange={(event) => updateStat(key, Number(event.target.value))} /><b>{derivedStats[key]}</b></label>)}</div>
    <div className="builder-divider" />
    <div className="builder-section-heading"><div><h2>{copyForLocale.moves}</h2><p>{copyForLocale.moveHint}</p></div><span>{set.moves.length} / 4</span></div>
    <div className="builder-move-grid">{set.moves.map((move, index) => <label className="builder-move-field" key={`${index}-${move}`}><span>{index + 1}</span><span className="select-wrap"><select value={move} aria-label={`${copyForLocale.moves} ${index + 1}`} onChange={(event) => updateMove(index, event.target.value)}>{moveOptions.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select><ChevronDown size={15} aria-hidden="true" /></span></label>)}</div>
  </div>;
}

function BuilderWorkspace() {
  const [locale, setLocaleState] = useState<Locale>(() => storedLocale() ?? 'it');
  const setLocale = (nextLocale: Locale) => { setLocaleState(nextLocale); persistLocale(nextLocale); };
  const [teamName, setTeamName] = useState('');
  const [slots, setSlots] = useState<BuilderSlot[]>(() => Array.from({ length: 6 }, () => null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionDirty, setRevisionDirty] = useState(false);
  const [revisionBusy, setRevisionBusy] = useState<'save' | 'load' | null>(null);
  const [revisionMessage, setRevisionMessage] = useState<string | null>(null);
  const [revisionIssues, setRevisionIssues] = useState<string[]>([]);
  const [catalogEntries, setCatalogEntries] = useState<Pokemon[] | null>(null);
  const [catalogMeta, setCatalogMeta] = useState<ApiMeta | null>(null);
  const [catalogFormat, setCatalogFormat] = useState<ApiFormat | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<{ types: ApiOption[]; natures: ApiOption[] }>({ types: [], natures: [] });
  const [catalogError, setCatalogError] = useState<ApiClientError | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [storedSlots, setStoredSlots] = useState<unknown[] | null>(null);
  const [storedCatalog, setStoredCatalog] = useState<Pokemon[] | null>(null);
  const initialSlotsApplied = useRef(false);
  const copyForLocale = copy[locale];
  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const context = await getCatalogContext({ formatId: defaultFormatId, signal });
      setCatalogFormat(context.data.format);
      setCatalogOptions({ types: context.data.types, natures: context.data.natures });
      const response = await getCatalogPokemon({ formatId: context.data.format.id, dataReleaseId: context.meta.releaseId ?? undefined, locale, signal });
      const entries = response.data.pokemon.map(viewPokemonFromApi);
      setCatalogEntries(entries);
      setCatalogMeta(response.meta);
      if (!initialSlotsApplied.current) {
        setSlots((current) => restoreBuilderSlots(storedSlots ?? current, entries));
        initialSlotsApplied.current = true;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const clientError = error instanceof ApiClientError ? error : new ApiClientError('The data service is unavailable.', 503, 'DATA_SERVICE_UNAVAILABLE');
      setCatalogError(clientError);
      if (storedSlots && !initialSlotsApplied.current) {
        setSlots(restoreBuilderSlots(storedSlots, pokemonCatalog));
        initialSlotsApplied.current = true;
      }
    } finally {
      if (!signal?.aborted) setCatalogLoading(false);
    }
  }, [locale, storedSlots]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCatalog(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadCatalog]);
  const activeCatalog = catalogEntries ?? storedCatalog ?? (catalogError ? [] : pokemonCatalog);
  const selected = slots[selectedSlot];
  const takenNames = new Set(slots.filter((slot, index) => slot && index !== selectedSlot).map((slot) => slot?.pokemonId ?? slot?.pokemonName));
  const visibleCatalog = activeCatalog.filter((pokemon) => !takenNames.has(pokemon.api?.formId ?? pokemon.name) && [pokemon.name, pokemon.nameIt ?? '', pokemon.role, pokemon.roleIt ?? ''].join(' ').toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem('vgc-forge:builder-v1') ?? '{}') as { locale?: Locale; teamName?: string; slots?: BuilderSlot[]; selectedSlot?: number; revisionId?: string };
        if (stored.locale === 'en') setLocale('en');
        if (typeof stored.teamName === 'string') setTeamName(stored.teamName);
        if (typeof stored.revisionId === 'string') setRevisionId(stored.revisionId);
        const cachedCatalog = Array.isArray((stored as { catalog?: unknown }).catalog) ? (stored as { catalog: Pokemon[] }).catalog : null;
        if (Array.isArray(stored.slots)) {
          setStoredSlots(stored.slots);
          setSlots(restoreBuilderSlots(stored.slots, cachedCatalog ?? pokemonCatalog));
        }
        if (cachedCatalog) setStoredCatalog(cachedCatalog);
        if (typeof stored.selectedSlot === 'number' && stored.selectedSlot >= 0 && stored.selectedSlot < 6) setSelectedSlot(stored.selectedSlot);
      } catch {
        // Ignore malformed local drafts and keep a clean six-slot builder.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const updateSlot = (patch: Partial<PokemonSet>) => {
    setRevisionDirty(true);
    setSlots((current) => current.map((slot, index) => index === selectedSlot && slot ? { ...slot, set: { ...slot.set, ...patch } } : slot));
  };
  const choosePokemon = (pokemonName: string) => {
    const pokemon = activeCatalog.find((entry) => entry.name === pokemonName);
    if (!pokemon) return;
    const pokemonKey = pokemon.api?.formId ?? pokemon.name;
    if (takenNames.has(pokemonKey)) return;
    setSlots((current) => current.map((slot, index) => index === selectedSlot ? { pokemonName: pokemon.name, pokemonId: pokemonKey, set: setForPokemon(pokemon) } : slot));
    setRevisionDirty(true);
    setQuery('');
  };
  const addPokemon = () => {
    const emptyIndex = slots.findIndex((slot) => !slot);
    if (emptyIndex >= 0) setSelectedSlot(emptyIndex);
  };
  const removePokemon = () => {
    setSlots((current) => current.map((slot, index) => index === selectedSlot ? null : slot));
    setRevisionDirty(true);
    setQuery('');
  };
  const saveBuilder = (nextRevisionId: string | null = revisionId) => {
    try {
      window.localStorage.setItem('vgc-forge:builder-v1', JSON.stringify({ locale, teamName, slots, selectedSlot, revisionId: nextRevisionId, catalog: catalogEntries ?? storedCatalog ?? undefined }));
      setSaved(true);
      setRevisionDirty(false);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setRevisionMessage(locale === 'it' ? 'Il browser non ha salvato la bozza locale.' : 'The browser could not save the local draft.');
    }
  };

  const saveRevision = async () => {
    setRevisionMessage(null);
    setRevisionIssues([]);
    if (!catalogFormat || !catalogMeta?.releaseId || !catalogEntries) {
      setRevisionMessage(locale === 'it' ? 'Carica il catalogo server prima di salvare una revisione.' : 'Load the server catalog before saving a revision.');
      return;
    }
    const converted = revisionSlotsFromBuilder(slots, catalogEntries, catalogFormat, catalogOptions.types, catalogOptions.natures);
    if (converted.missing.length) {
      setRevisionMessage(locale === 'it' ? 'Alcuni valori della bozza non appartengono al catalogo corrente. Correggili prima di salvare.' : 'Some draft values are not in the current catalog. Correct them before saving.');
      setRevisionIssues(converted.missing.map((field) => `${locale === 'it' ? 'Slot' : 'Slot'} ${field.replace(':', ' · ')}`));
      return;
    }
    setRevisionBusy('save');
    try {
      const response = await saveTeamRevision({ name: teamName.trim() || copyForLocale.newTeam, formatId: catalogFormat.id, dataReleaseId: catalogMeta.releaseId, locale, slots: converted.slots });
      const id = response.data.revision.id;
      setRevisionId(id);
      saveBuilder(id);
      const status = response.data.revision.status;
      setRevisionMessage(locale === 'it' ? `Revisione ${id.slice(0, 8)} salvata · ${status === 'blocked' ? 'legalità non verificata' : status === 'draft' ? 'bozza incompleta' : 'legale'}.` : `Revision ${id.slice(0, 8)} saved · ${status === 'blocked' ? 'legality unverified' : status === 'draft' ? 'incomplete draft' : 'legal'}.`);
    } catch (error) {
      const clientError = error instanceof ApiClientError ? error : new ApiClientError('The data service is unavailable.', 503);
      setRevisionMessage(revisionErrorMessage(clientError, locale));
      setRevisionIssues(clientError.issues.map((issue) => revisionIssueMessage(issue, locale)));
    } finally {
      setRevisionBusy(null);
    }
  };
  const loadRevision = async () => {
    if (!revisionId || revisionBusy) return;
    if (revisionDirty && !window.confirm(locale === 'it' ? 'Caricare la revisione salvata? Le modifiche non salvate nella bozza attuale verranno sostituite.' : 'Load the saved revision? Unsaved changes in the current draft will be replaced.')) return;
    setRevisionBusy('load');
    setRevisionMessage(null);
    setRevisionIssues([]);
    try {
      const response = await getTeamRevision(revisionId);
      const revision = response.data;
      if (!catalogFormat || revision.formatId !== catalogFormat.id || revision.dataReleaseId !== catalogMeta?.releaseId) {
        setRevisionMessage(locale === 'it' ? 'La revisione usa un formato o una release diversi dal catalogo corrente.' : 'This revision uses a different format or release from the current catalog.');
        return;
      }
      const restored = builderSlotsFromRevision(revision.slots, catalogEntries ?? [], catalogOptions.natures, catalogOptions.types);
      if (!restored) {
        setRevisionMessage(locale === 'it' ? 'La revisione contiene Pokémon assenti dal catalogo corrente.' : 'This revision contains Pokémon missing from the current catalog.');
        return;
      }
      setTeamName(revision.name);
      setSlots(restored);
      setSelectedSlot(0);
      setRevisionDirty(false);
      try {
        window.localStorage.setItem('vgc-forge:builder-v1', JSON.stringify({ locale, teamName: revision.name, slots: restored, selectedSlot: 0, revisionId: revision.id, catalog: catalogEntries ?? undefined }));
      } catch {
        // Server revision remains available even if browser storage is disabled.
      }
      setRevisionMessage(locale === 'it' ? `Revisione ${revision.id.slice(0, 8)} caricata.` : `Revision ${revision.id.slice(0, 8)} loaded.`);
    } catch (error) {
      const clientError = error instanceof ApiClientError ? error : new ApiClientError('The data service is unavailable.', 503);
      setRevisionMessage(revisionErrorMessage(clientError, locale));
      setRevisionIssues(clientError.issues.map((issue) => revisionIssueMessage(issue, locale)));
    } finally {
      setRevisionBusy(null);
    }
  };

  return <main className="forge-shell builder-shell">
    <TopBar locale={locale} setLocale={setLocale} copyForLocale={copyForLocale} activePath="/" saved={saved} onSave={() => saveBuilder()} showSave />
    <div className="format-banner" role={catalogError ? 'alert' : undefined} aria-live="polite"><CircleAlert size={14} /><span>{catalogLoading ? copyForLocale.loadingCatalog : catalogError ? catalogErrorMessage(catalogError, copyForLocale) : catalogStatusMessage(catalogMeta, copyForLocale)}</span>{catalogMeta?.releaseId && <small>{catalogFormat ? optionLabel(catalogFormat, locale) : copyForLocale.format} · {catalogMeta.releaseId}</small>}{catalogError ? <button type="button" onClick={() => void loadCatalog()}>{copyForLocale.retry}</button> : <span className="builder-save-note">{saved ? copyForLocale.savedLocally : copyForLocale.autoSave}</span>}</div>
    <section className="builder-header"><div><h1>{teamName || copyForLocale.newTeam}</h1><p>{catalogFormat ? optionLabel(catalogFormat, locale) : copyForLocale.format} · {slots.filter(Boolean).length} / 6</p></div><label className="builder-name-field"><span>{copyForLocale.teamName}</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder={copyForLocale.newTeam} /></label></section>
    <section className="builder-revisions" aria-label={locale === 'it' ? 'Revisioni del team' : 'Team revisions'}><div className="builder-revision-copy"><strong>{locale === 'it' ? 'Revisioni server' : 'Server revisions'}</strong><span>{revisionId ? `${locale === 'it' ? 'Revisione collegata' : 'Linked revision'} · ${revisionId.slice(0, 8)}` : (locale === 'it' ? 'Nessuna revisione server salvata' : 'No server revision saved')}{revisionDirty ? ` · ${locale === 'it' ? 'Modifiche non salvate' : 'Unsaved changes'}` : ''}</span></div><div className="builder-revision-actions"><button type="button" onClick={() => void saveRevision()} disabled={!!revisionBusy || catalogLoading || !!catalogError}>{revisionBusy === 'save' ? (locale === 'it' ? 'Salvataggio…' : 'Saving…') : (locale === 'it' ? 'Salva revisione' : 'Save revision')}</button><button type="button" onClick={() => void loadRevision()} disabled={!revisionId || !!revisionBusy || catalogLoading || !!catalogError}>{revisionBusy === 'load' ? (locale === 'it' ? 'Caricamento…' : 'Loading…') : (locale === 'it' ? 'Carica revisione' : 'Load revision')}</button></div>{revisionMessage && <div className="builder-revision-feedback" role={revisionIssues.length ? 'alert' : 'status'}><p>{revisionMessage}</p>{revisionIssues.length > 0 && <ul>{revisionIssues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>}</div>}</section>
    <div className="builder-grid">
      <aside className="builder-roster" aria-label={copyForLocale.team}><div className="builder-roster-heading"><div><h2>{copyForLocale.team}</h2><p>{catalogError ? catalogErrorMessage(catalogError, copyForLocale) : copyForLocale.catalogHint}</p></div><strong>{slots.filter(Boolean).length} / 6</strong></div><div className="builder-slots">{slots.map((slot, index) => { const pokemon = slot ? activeCatalog.find((entry) => entry.api?.formId === slot.pokemonId || entry.name === slot.pokemonName) : null; return <button type="button" key={index} aria-pressed={selectedSlot === index} className={`builder-slot ${selectedSlot === index ? 'builder-slot-active' : ''} ${slot ? '' : 'builder-slot-empty'}`} onClick={() => setSelectedSlot(index)}><span className="builder-slot-number">{index + 1}</span>{pokemon ? <span className="builder-slot-copy"><strong>{locale === 'it' ? pokemon.nameIt ?? pokemon.name : pokemon.name}</strong><small>{locale === 'it' ? pokemon.roleIt ?? pokemon.role : pokemon.role}</small><span className="slot-types">{pokemon.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</span></span> : <span className="builder-slot-copy"><strong>{copyForLocale.emptySlot}</strong><small>{copyForLocale.addPokemon}</small></span>}</button>; })}</div><button type="button" className="add-button" onClick={addPokemon} disabled={slots.every(Boolean) || catalogLoading}><Plus size={16} /> {copyForLocale.addPokemon}</button></aside>
      <section className="builder-editor" aria-live="polite">{selected && activeCatalog.find((entry) => entry.api?.formId === selected.pokemonId || entry.name === selected.pokemonName) ? <BuilderSetEditor copyForLocale={copyForLocale} locale={locale} pokemon={activeCatalog.find((entry) => entry.api?.formId === selected.pokemonId || entry.name === selected.pokemonName)!} slot={selected} natureOptions={catalogOptions.natures} typeOptions={catalogOptions.types} onUpdate={updateSlot} onRemove={removePokemon} /> : <div className="builder-empty-state">{catalogLoading ? <output>{copyForLocale.loadingCatalog}</output> : catalogError ? <div role="alert"><p>{catalogErrorMessage(catalogError, copyForLocale)}</p><button type="button" onClick={() => void loadCatalog()}>{copyForLocale.retry}</button></div> : <><div className="builder-empty-icon"><Plus size={22} /></div><h2>{copyForLocale.selectSlot}</h2><p>{copyForLocale.emptyBuilderHelp}</p><label className="builder-search"><span>{copyForLocale.searchPokemon}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copyForLocale.searchPokemon} /></label><div className="catalog-heading"><h2>{copyForLocale.catalog}</h2><span>{visibleCatalog.length}</span></div><div className="catalog-list">{visibleCatalog.map((pokemon) => <button type="button" className="catalog-option" key={pokemon.name} onClick={() => choosePokemon(pokemon.name)}><span className="pokemon-monogram">{pokemon.name.slice(0, 2).toUpperCase()}</span><span><strong>{locale === 'it' ? pokemon.nameIt ?? pokemon.name : pokemon.name}</strong><small>{locale === 'it' ? pokemon.roleIt ?? pokemon.role : pokemon.role}</small></span><span className="slot-types">{pokemon.types.map((type) => <TypeTag type={type} locale={locale} key={type} />)}</span><ArrowRight size={16} aria-hidden="true" /></button>)}{visibleCatalog.length === 0 && <p className="catalog-empty">{copyForLocale.noResults}</p>}</div></>}</div>}</section>
    </div>
  </main>;
}

export default function Home({ standalone = false }: { standalone?: boolean }) {
  return standalone ? <CalculatorWorkspace standalone /> : <BuilderWorkspace />;
}

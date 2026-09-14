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
import { useEffect, useMemo, useState } from 'react';

type Locale = 'it' | 'en';
type Mode = 'doubles' | 'singles';
type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type PokemonSet = { tera: string; item: string; ability: string; nature: string; statPoints: Record<StatKey, number> };
type WeatherKey = 'clear' | 'sun' | 'rain' | 'sand' | 'snow';
type TerrainKey = 'none' | 'electric' | 'grassy' | 'psychic' | 'misty';
type FieldEffectKey = 'reflect' | 'lightScreen' | 'auroraVeil' | 'safeguard' | 'tailwind' | 'trickRoom' | 'gravity';
type FieldState = { weather: WeatherKey; terrain: TerrainKey } & Record<FieldEffectKey, boolean>;

const statKeys: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

type Pokemon = {
  name: string;
  role: string;
  types: string[];
  baseStats: Record<StatKey, number>;
};

const team: Pokemon[] = [
  { name: 'Flutter Mane', role: 'Special attacker', types: ['Ghost', 'Fairy'], baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 } },
  { name: 'Incineroar', role: 'Pivot / Intimidate', types: ['Fire', 'Dark'], baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 } },
  { name: 'Rillaboom', role: 'Terrain setter', types: ['Grass'], baseStats: { hp: 100, atk: 125, def: 90, spa: 60, spd: 70, spe: 85 } },
  { name: 'Urshifu', role: 'Physical attacker', types: ['Fighting', 'Water'], baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 } },
  { name: 'Amoonguss', role: 'Redirection', types: ['Grass', 'Poison'], baseStats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 } },
  { name: 'Farigiraf', role: 'Trick Room support', types: ['Normal', 'Psychic'], baseStats: { hp: 120, atk: 90, def: 70, spa: 110, spd: 70, spe: 60 } },
];

const defaultSets: Record<string, PokemonSet> = {
  'Flutter Mane': { tera: 'Fairy', item: 'Choice Specs', ability: 'Protosynthesis', nature: 'Timid (+Spe, -Atk)', statPoints: { hp: 4, atk: 0, def: 0, spa: 32, spd: 4, spe: 26 } },
  Incineroar: { tera: 'Grass', item: 'Safety Goggles', ability: 'Intimidate', nature: 'Careful (+SpD, -SpA)', statPoints: { hp: 28, atk: 0, def: 20, spa: 0, spd: 18, spe: 0 } },
  Rillaboom: { tera: 'Fire', item: 'Assault Vest', ability: 'Grassy Surge', nature: 'Adamant (+Atk, -SpA)', statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 30 } },
  Urshifu: { tera: 'Water', item: 'Focus Sash', ability: 'Unseen Fist', nature: 'Jolly (+Spe, -SpA)', statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } },
  Amoonguss: { tera: 'Water', item: 'Rocky Helmet', ability: 'Regenerator', nature: 'Bold (+Def, -Atk)', statPoints: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 } },
  Farigiraf: { tera: 'Fairy', item: 'Mental Herb', ability: 'Armor Tail', nature: 'Quiet (+SpA, -Spe)', statPoints: { hp: 28, atk: 0, def: 0, spa: 32, spd: 6, spe: 0 } },
};

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

const moves = [
  { name: 'Moonblast', type: 'Fairy', power: 95, range: '112–132', ko: '88%', score: 88 },
  { name: 'Shadow Ball', type: 'Ghost', power: 80, range: '71–84', ko: '43%', score: 43 },
  { name: 'Mystical Fire', type: 'Fire', power: 75, range: '56–67', ko: '6%', score: 6 },
  { name: 'Protect', type: 'Normal', power: null, range: '—', ko: '—', score: null },
];

const copy = {
  it: {
    team: 'Team', attacker: 'Attaccante', defender: 'Difensore', setup: 'Set attivo', route: 'Percorso matchup', outcomes: 'Esiti mosse', field: 'Campo e condizioni', format: 'Champions · Regulation M-B', language: 'Italiano', languageLabel: 'Lingua', formatLabel: 'Formato', primaryNav: 'Navigazione principale', inspectorOptions: 'Opzioni inspector (prossimamente)', save: 'Salva team', saved: 'Salvato', teamFull: 'Team completo', autoSave: 'Salvataggio locale', level: 'Livello', tera: 'Tera tipo', item: 'Strumento', ability: 'Abilità', nature: 'Natura', statPoints: 'Stat Points', moves: 'Mosse', add: 'Aggiungi Pokémon', fieldTerrain: 'Campo Elettrico', fieldReflect: 'Riflesso', weather: 'Meteo', terrain: 'Campo', clear: 'Nessun meteo', rain: 'Pioggia', sand: 'Tempesta di sabbia', snow: 'Neve', terrainNone: 'Nessun campo', grassyTerrain: 'Campo Erboso', psychicTerrain: 'Campo Psichico', mistyTerrain: 'Campo Nebbioso', screens: 'Schermate e protezioni', speedSpace: 'Velocità e spazio', lightScreen: 'Schermoluce', auroraVeil: 'Velaurora', safeguard: 'Salvaguardia', tailwind: 'Ventoincoda', trickRoom: 'Distortozona', gravity: 'Gravità', activeEffects: 'effetti attivi', fieldSummary: 'Stato simulazione', primary: 'Risultato principale', versus: 'contro', damage: 'Danno', power: 'Potenza', ko: 'KO %', koChance: 'Probabilità KO', selectMove: 'Seleziona mossa', battleMode: 'Modalità lotta', preset: 'Preset UI', allRolls: 'Tutti i roll', critical: 'Critico', spread: 'Spread', details: 'Dettagli', calculator: 'Calcolatore danni', builder: 'Team builder', formatWarning: 'Validità formato: informativa', statHint: '0–32 per statistica · 66 totali', turns: 'turni', sun: 'Luce solare intensa', sunUnavailable: 'Disponibile prossimamente', off: 'disattivo', howItWorks: 'Come funziona', accuracyNote: 'I valori mostrati sono un preset di interfaccia in attesa dell’engine server-side.',
  },
  en: {
    team: 'Team', attacker: 'Attacker', defender: 'Defender', setup: 'Active set', route: 'Matchup route', outcomes: 'Move outcomes', field: 'Field & conditions', format: 'Champions · Regulation M-B', language: 'English', languageLabel: 'Language', formatLabel: 'Format', primaryNav: 'Primary navigation', inspectorOptions: 'Inspector options (coming soon)', save: 'Save team', saved: 'Saved', teamFull: 'Team full', autoSave: 'Local autosave', level: 'Level', tera: 'Tera type', item: 'Held item', ability: 'Ability', nature: 'Nature', statPoints: 'Stat Points', moves: 'Moves', add: 'Add Pokémon', fieldTerrain: 'Electric Terrain', fieldReflect: 'Reflect', weather: 'Weather', terrain: 'Terrain', clear: 'No weather', rain: 'Rain', sand: 'Sandstorm', snow: 'Snow', terrainNone: 'No terrain', grassyTerrain: 'Grassy Terrain', psychicTerrain: 'Psychic Terrain', mistyTerrain: 'Misty Terrain', screens: 'Screens & protection', speedSpace: 'Speed & space', lightScreen: 'Light Screen', auroraVeil: 'Aurora Veil', safeguard: 'Safeguard', tailwind: 'Tailwind', trickRoom: 'Trick Room', gravity: 'Gravity', activeEffects: 'active effects', fieldSummary: 'Simulation state', primary: 'Primary result', versus: 'vs', damage: 'Damage', power: 'Power', ko: 'KO %', koChance: 'KO chance', selectMove: 'Select move', battleMode: 'Battle mode', preset: 'UI preset', allRolls: 'All rolls', critical: 'Critical', spread: 'Spread', details: 'Details', calculator: 'Damage calculator', builder: 'Team builder', formatWarning: 'Format legality: informational', statHint: '0–32 per stat · 66 total', turns: 'turns', sun: 'Harsh sunlight', sunUnavailable: 'Coming soon', off: 'off', howItWorks: 'How it works', accuracyNote: 'Displayed values are interface presets while the server-side engine is connected.',
  },
} as const;

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
const roleLabel = (role: string, locale: Locale) => locale === 'it' ? ({ 'Special attacker': 'Attaccante speciale', 'Pivot / Intimidate': 'Pivot / Prepotenza', 'Terrain setter': 'Setter terreno', 'Physical attacker': 'Attaccante fisico', Redirection: 'Redirect', 'Trick Room support': 'Supporto Trick Room' }[role] ?? role) : role;

function TypeTag({ type }: { type: string }) {
  return <span className={`type-tag ${typeClass(type)}`}>{type}</span>;
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="control-field"><span>{label}</span><span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></span></label>;
}

function TopBar({ locale, setLocale, copyForLocale, activePath, saved, onSave }: { locale: Locale; setLocale: (locale: Locale) => void; copyForLocale: (typeof copy)[Locale]; activePath: string; saved: boolean; onSave: () => void }) {
  return <header className="topbar">
    <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><Map size={20} strokeWidth={2.8} /></span><div><div className="brand-name">VGC Forge</div><div className="brand-subtitle">Matchup Field Map</div></div></div>
    <nav className="topbar-nav" aria-label={copyForLocale.primaryNav}><Link aria-current={activePath === '/' ? 'page' : undefined} className={`nav-item ${activePath === '/' ? 'nav-item-active' : ''}`} href="/"><Swords size={15} /> {copyForLocale.builder}</Link><Link aria-current={activePath === '/calculator' ? 'page' : undefined} className={`nav-item ${activePath === '/calculator' ? 'nav-item-active' : ''}`} href="/calculator"><Crosshair size={15} /> {copyForLocale.calculator}</Link></nav>
    <div className="topbar-actions"><label className="format-select"><span className="format-dot" aria-hidden="true" /><select value={copyForLocale.format} aria-label={copyForLocale.formatLabel} disabled><option>{copyForLocale.format}</option></select><ChevronDown size={15} aria-hidden="true" /></label><fieldset className="locale-toggle" aria-label={copyForLocale.languageLabel}><Globe2 size={15} aria-hidden="true" /><button type="button" aria-pressed={locale === 'it'} className={locale === 'it' ? 'locale-active' : ''} onClick={() => setLocale('it')}>IT</button><span>/</span><button type="button" aria-pressed={locale === 'en'} className={locale === 'en' ? 'locale-active' : ''} onClick={() => setLocale('en')}>EN</button></fieldset><button className="save-button" type="button" onClick={onSave}><Save size={16} /> {saved ? copyForLocale.saved : copyForLocale.save}</button></div>
  </header>;
}

function SetupInspector({ copyForLocale, selected, activeSet, setActiveSet, selectedMoveIndex, setSelectedMoveIndex }: { copyForLocale: (typeof copy)[Locale]; selected: Pokemon; activeSet: PokemonSet; setActiveSet: (patch: Partial<PokemonSet>) => void; selectedMoveIndex: number; setSelectedMoveIndex: (index: number) => void }) {
  const derivedStats = deriveStats(selected, activeSet);
  const statEntries = [['HP', 'hp', activeSet.statPoints.hp, derivedStats.hp], ['Atk', 'atk', activeSet.statPoints.atk, derivedStats.atk], ['Def', 'def', activeSet.statPoints.def, derivedStats.def], ['Sp. Atk', 'spa', activeSet.statPoints.spa, derivedStats.spa], ['Sp. Def', 'spd', activeSet.statPoints.spd, derivedStats.spd], ['Speed', 'spe', activeSet.statPoints.spe, derivedStats.spe]] as const;
  return <aside className="setup-inspector">
    <div className="panel-title-row"><div><h1>{copyForLocale.setup}</h1><p>{copyForLocale.attacker} · {selected.name}</p></div><button className="icon-button" type="button" aria-label={copyForLocale.inspectorOptions} disabled><SlidersHorizontal size={17} /></button></div>
    <div className="selected-pokemon"><div className="pokemon-monogram">{selected.name.slice(0, 2).toUpperCase()}</div><div className="selected-copy"><strong>{selected.name}</strong><div className="tag-row">{selected.types.map((type) => <TypeTag type={type} key={type} />)}</div></div><span className="level-badge">Lv. 50</span></div>
    <div className="field-stack"><SelectControl label={copyForLocale.tera} value={activeSet.tera} onChange={(value) => setActiveSet({ tera: value })} options={['Fairy', 'Ghost', 'Fire', 'Water', 'Grass']} /><SelectControl label={copyForLocale.item} value={activeSet.item} onChange={(value) => setActiveSet({ item: value })} options={['Choice Specs', 'Safety Goggles', 'Focus Sash', 'Assault Vest', 'Rocky Helmet', 'Mental Herb', 'Booster Energy']} /><SelectControl label={copyForLocale.ability} value={activeSet.ability} onChange={(value) => setActiveSet({ ability: value })} options={['Protosynthesis', 'Intimidate', 'Grassy Surge', 'Unseen Fist', 'Regenerator', 'Armor Tail']} /><SelectControl label={copyForLocale.nature} value={activeSet.nature} onChange={(value) => setActiveSet({ nature: value })} options={['Timid (+Spe, -Atk)', 'Modest (+SpA, -Atk)', 'Careful (+SpD, -SpA)', 'Adamant (+Atk, -SpA)', 'Jolly (+Spe, -SpA)', 'Bold (+Def, -Atk)', 'Quiet (+SpA, -Spe)']} /></div>
    <div className="section-divider" />
    <div className="stat-heading"><div><h2>{copyForLocale.statPoints}</h2><p>{copyForLocale.statHint}</p></div><span className="stat-total">{Object.values(activeSet.statPoints).reduce((sum, value) => sum + value, 0)} / 66</span></div>
    <div className="stat-list">{statEntries.map(([label, key, value, derived]) => <label className="stat-row" key={label}><span className="stat-label">{label}</span><input aria-label={`${label} Stat Points`} type="number" min={0} max={32} value={value} onChange={(event) => setActiveSet({ statPoints: { ...activeSet.statPoints, [key]: Number(event.target.value) } })} /><input className="stat-range" aria-label={`${label} Stat Points slider`} type="range" min={0} max={32} value={value} onChange={(event) => setActiveSet({ statPoints: { ...activeSet.statPoints, [key]: Number(event.target.value) } })} /><span className="derived-value">{derived}</span></label>)}</div>
    <div className="section-divider" /><div className="moves-heading"><h2>{copyForLocale.moves}</h2><span>4 / 4</span></div><div className="move-list">{moves.map((move, index) => <button type="button" aria-pressed={selectedMoveIndex === index} className={`move-row ${selectedMoveIndex === index ? 'move-row-active' : ''}`} key={move.name} onClick={() => setSelectedMoveIndex(index)}><span className={`move-icon ${typeClass(move.type)}`}>{index === 3 ? <Shield size={15} /> : <Sparkles size={15} />}</span><span className="move-name">{move.name}</span><TypeTag type={move.type} /></button>)}</div>
  </aside>;
}

function Region({ side, pokemon, set, copyForLocale }: { side: 'attacker' | 'defender'; pokemon: Pokemon; set: PokemonSet; copyForLocale: (typeof copy)[Locale] }) {
  const derivedStats = deriveStats(pokemon, set);
  return <div className={`map-region map-region-${side}`}><div className="region-meta"><span>{side === 'attacker' ? copyForLocale.attacker : copyForLocale.defender}</span><span className="region-index">0{side === 'attacker' ? 1 : 2}</span></div><div className="region-heading"><strong>{pokemon.name}</strong><div className="tag-row">{pokemon.types.map((type) => <TypeTag type={type} key={type} />)}</div></div><div className="region-data"><span>{copyForLocale.level} <b>50</b></span><span>{copyForLocale.tera} <b>{set.tera}</b></span><span>{copyForLocale.item} <b>{set.item}</b></span><span>{copyForLocale.ability} <b>{set.ability}</b></span></div><div className="region-hp"><span>HP</span><strong>{derivedStats.hp} / {derivedStats.hp}</strong></div></div>;
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

function MatchupRoute({ copyForLocale, attacker, defender, attackerSet, defenderSet, mode, setMode, selectedMoveIndex, setSelectedMoveIndex, fieldState, setFieldState, fieldSummary }: { copyForLocale: (typeof copy)[Locale]; attacker: Pokemon; defender: Pokemon; attackerSet: PokemonSet; defenderSet: PokemonSet; mode: Mode; setMode: (mode: Mode) => void; selectedMoveIndex: number; setSelectedMoveIndex: (index: number) => void; fieldState: FieldState; setFieldState: (patch: Partial<FieldState>) => void; fieldSummary: string }) {
  const selectedMove = moves[selectedMoveIndex];
  const moveType = selectedMove.type;
  return <section className="route-column"><div className="route-title-row"><div><h2>{copyForLocale.route}</h2><p>{attacker.name} <ArrowRight size={14} /> {defender.name}</p></div><fieldset className="mode-toggle" aria-label={copyForLocale.battleMode}><button type="button" aria-pressed={mode === 'doubles'} className={mode === 'doubles' ? 'mode-active' : ''} onClick={() => setMode('doubles')}>2v2</button><button type="button" aria-pressed={mode === 'singles'} className={mode === 'singles' ? 'mode-active' : ''} onClick={() => setMode('singles')}>1v1</button></fieldset></div><div className="map-canvas"><div className="map-grid-markers" aria-hidden="true"><span /> <span /> <span /></div><Region side="attacker" pokemon={attacker} set={attackerSet} copyForLocale={copyForLocale} /><Region side="defender" pokemon={defender} set={defenderSet} copyForLocale={copyForLocale} /><div className="route-line" aria-hidden="true"><span /> <span /> <span /></div><div className="result-stack"><button type="button" className={`move-selector type-${moveType.toLowerCase()}`} aria-label={`${copyForLocale.selectMove}: ${selectedMove.name}`} onClick={() => setSelectedMoveIndex((selectedMoveIndex + 1) % moves.length)}><span className={`move-icon ${typeClass(moveType)}`}><Sparkles size={15} /></span><strong>{selectedMove.name}</strong><TypeTag type={moveType} /><ChevronDown size={15} /></button><div className="ko-result"><span>{copyForLocale.koChance} · {copyForLocale.preset}</span><strong>{selectedMove.ko}</strong><small>{copyForLocale.versus} {defender.name}</small></div><div className="result-details"><span><b>{selectedMove.range}</b><small>{copyForLocale.damage}</small></span><span><b>{selectedMove.ko === '—' ? '—' : selectedMoveIndex === 0 ? '88.3%' : selectedMoveIndex === 1 ? '43.4%' : '6.5%'}</b><small>{copyForLocale.allRolls}</small></span></div></div></div><FieldControls copyForLocale={copyForLocale} fieldState={fieldState} setFieldState={setFieldState} mode={mode} summary={fieldSummary} /></section>;
}

function OutcomesMatrix({ copyForLocale, defender, detailsOpen, setDetailsOpen, selectedMoveIndex, fieldSummary }: { copyForLocale: (typeof copy)[Locale]; defender: Pokemon; detailsOpen: boolean; setDetailsOpen: (open: boolean) => void; selectedMoveIndex: number; fieldSummary: string }) {
  const targetKOs = [['Incineroar', ['88%', '43%', '6%', '—']], ['Rillaboom', ['10%', '6%', '0%', '—']], ['Urshifu', ['47%', '24%', '8%', '—']], ['Amoonguss', ['27%', '0%', '0%', '—']], ['Farigiraf', ['30%', '18%', '2%', '—']]] as const;
  const targetDamage = [['Incineroar', ['112–132', '71–84', '56–67', '—']], ['Rillaboom', ['30–36', '24–29', '78–92', '—']], ['Urshifu', ['74–88', '62–73', '16–19', '—']], ['Amoonguss', ['66–78', '44–52', '27–32', '—']], ['Farigiraf', ['46–55', '64–75', '19–22', '—']]] as const;
  const [metric, setMetric] = useState<'percent' | 'damage'>('percent');
  const selectedMove = moves[selectedMoveIndex];
  return <section className="outcomes-panel"><div className="outcomes-heading"><div><h2>{copyForLocale.outcomes}</h2><p>{copyForLocale.primary} · {selectedMove.name} {copyForLocale.versus} {defender.name} · {copyForLocale.preset}</p></div><div className="outcomes-actions"><button type="button" aria-pressed={detailsOpen} aria-expanded={detailsOpen} aria-controls="outcomes-details" className="outline-button" onClick={() => setDetailsOpen(!detailsOpen)}><Info size={14} /> {copyForLocale.details}</button><fieldset className="segmented" aria-label={copyForLocale.damage}><button type="button" aria-pressed={metric === 'percent'} className={metric === 'percent' ? 'segmented-active' : ''} onClick={() => setMetric('percent')}>%</button><button type="button" aria-pressed={metric === 'damage'} className={metric === 'damage' ? 'segmented-active' : ''} onClick={() => setMetric('damage')}>{copyForLocale.damage}</button></fieldset></div></div><div className="table-wrap"><table><thead><tr><th>{copyForLocale.moves}</th><th>{copyForLocale.power}</th><th>{copyForLocale.damage}</th><th>{copyForLocale.allRolls}</th>{targetKOs.map(([target]) => <th key={target}>{metric === 'percent' ? copyForLocale.ko : copyForLocale.damage}<br /><span>{target}</span></th>)}</tr></thead><tbody>{moves.map((move, index) => <tr key={move.name} className={index === selectedMoveIndex ? 'table-row-primary' : ''}><td><span className={`table-move-icon ${typeClass(move.type)}`}>{index === 3 ? <Shield size={14} /> : <Sparkles size={14} />}</span><strong>{move.name}</strong><TypeTag type={move.type} /></td><td>{move.power ?? '—'}</td><td>{move.range}</td><td>{move.ko === '—' ? '—' : index === 0 ? '88.3%' : index === 1 ? '43.4%' : '6.5%'}</td>{targetKOs.map(([, values], targetIndex) => <td key={`${move.name}-${targetIndex}`}><span className={index === selectedMoveIndex ? 'ko-pill' : ''}>{metric === 'percent' ? values[index] : targetDamage[targetIndex][1][index]}</span></td>)}</tr>)}</tbody></table></div>{detailsOpen && <div className="details-callout" id="outcomes-details"><Info size={14} /><span>{copyForLocale.critical}: 3.1% · {copyForLocale.spread}: ×1.00 · {copyForLocale.field}: {fieldSummary}</span></div>}<div className="accuracy-note"><CircleAlert size={14} /><span>{copyForLocale.formatWarning}. {copyForLocale.accuracyNote}</span></div></section>;
}

function TeamRail({ selectedIndex, setSelectedIndex, copyForLocale }: { selectedIndex: number; setSelectedIndex: (index: number) => void; copyForLocale: (typeof copy)[Locale] }) {
  const locale: Locale = copyForLocale.language === 'Italiano' ? 'it' : 'en';
  return <aside className="team-rail"><div className="team-rail-heading"><div><h2>{copyForLocale.team}</h2><p>Regulation M-B</p></div><span className="team-count">6 / 6</span></div><div className="team-slots">{team.map((pokemon, index) => <button type="button" aria-pressed={selectedIndex === index} className={`team-slot ${selectedIndex === index ? 'team-slot-active' : ''}`} onClick={() => setSelectedIndex(index)} key={pokemon.name}><span className="slot-number">{index + 1}</span><span className="slot-copy"><strong>{pokemon.name}</strong><small>{roleLabel(pokemon.role, locale)}</small></span><span className="slot-types">{pokemon.types.map((type) => <TypeTag type={type} key={type} />)}</span></button>)}</div><button type="button" className="add-button" disabled title={copyForLocale.teamFull}><Plus size={16} /> {copyForLocale.add}</button><div className="team-rail-foot"><span className="status-dot" /> {copyForLocale.autoSave} · v0.1</div></aside>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('it');
  const [mode, setMode] = useState<Mode>('doubles');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [fieldState, setFieldStateState] = useState<FieldState>({ weather: 'clear', terrain: 'electric', reflect: true, lightScreen: false, auroraVeil: false, safeguard: false, tailwind: false, trickRoom: false, gravity: false });
  const [sets, setSets] = useState(defaultSets);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saved, setSaved] = useState(false);
  const copyForLocale = copy[locale];
  const pathname = usePathname();
  const attacker = useMemo(() => team[selectedIndex], [selectedIndex]);
  const defender = useMemo(() => team[selectedIndex === 1 ? 0 : 1], [selectedIndex]);
  const selectedTarget = defender;
  const selectedMove = moves[selectedMoveIndex];
  const activeSet = sets[attacker.name] ?? defaultSets[attacker.name];
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const activeFieldSummary = fieldSummary(copyForLocale, fieldState);
  const setActiveSet = (patch: Partial<PokemonSet>) => setSets((current) => {
    const currentSet = current[attacker.name] ?? defaultSets[attacker.name];
    if (!patch.statPoints) return { ...current, [attacker.name]: { ...currentSet, ...patch } };
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
    return { ...current, [attacker.name]: { ...currentSet, ...patch, statPoints: nextPoints } };
  });
  const defenderSet = sets[defender.name] ?? defaultSets[defender.name];
  const setFieldState = (patch: Partial<FieldState>) => setFieldStateState((current) => ({ ...current, ...patch }));
  return <main className="forge-shell">
    {/* THESIS: an evidence-first tactical field map for building legal Champions teams and reading damage outcomes.
         OWN-WORLD: folded guide stock, cartographic panels, coastline dividers, crisp black ink, lime/blue/coral/yellow blocks.
         STORY: select a roster slot, tune the active set, read the attacker-to-defender route, then compare every move.
         FIRST VIEWPORT: setup inspector, primary KO result, field state, outcomes matrix, and six-slot team rail.
         FORM: generous cream canvas with angular map regions, dense data rows, and semantic controls.
         FINISH: one restrained state transition, responsive stacking, keyboard-visible controls, no decorative gradients. */}
    <TopBar locale={locale} setLocale={setLocale} copyForLocale={copyForLocale} activePath={pathname === '/calculator' ? '/calculator' : '/'} saved={saved} onSave={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }} /><div className="format-banner"><CircleAlert size={14} /><span>{copyForLocale.formatWarning}</span><button type="button" aria-pressed={showHelp} aria-expanded={showHelp} aria-controls="help-callout" onClick={() => setShowHelp(!showHelp)}>{copyForLocale.howItWorks}</button></div>{showHelp && <div className="help-callout" id="help-callout"><Info size={14} /><span>{locale === 'it' ? 'Scegli un Pokémon dal rail, modifica Stat Points e seleziona una mossa: il route e la matrice si aggiornano insieme.' : 'Choose a Pokémon from the rail, tune Stat Points, and select a move: the route and matrix stay in sync.'}</span></div>}<div className="workspace-grid"><SetupInspector copyForLocale={copyForLocale} selected={attacker} activeSet={activeSet} setActiveSet={setActiveSet} selectedMoveIndex={selectedMoveIndex} setSelectedMoveIndex={setSelectedMoveIndex} /><div className="main-column"><MatchupRoute copyForLocale={copyForLocale} attacker={attacker} defender={defender} attackerSet={activeSet} defenderSet={defenderSet} mode={mode} setMode={setMode} selectedMoveIndex={selectedMoveIndex} setSelectedMoveIndex={setSelectedMoveIndex} fieldState={fieldState} setFieldState={setFieldState} fieldSummary={activeFieldSummary} /><OutcomesMatrix copyForLocale={copyForLocale} defender={defender} detailsOpen={detailsOpen} setDetailsOpen={setDetailsOpen} selectedMoveIndex={selectedMoveIndex} fieldSummary={activeFieldSummary} /></div><TeamRail selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} copyForLocale={copyForLocale} /></div><div className="mobile-context" aria-live="polite"><span>{copyForLocale.defender}: {selectedTarget.name}</span><span>·</span><span>{copyForLocale.ko} {selectedMove.ko} · {copyForLocale.preset}</span></div>
  </main>;
}

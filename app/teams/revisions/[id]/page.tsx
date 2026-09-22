'use client';

import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError, getCatalogContext, getCatalogPokemon, getTeamRevision, type ApiOption, type ApiPokemon, type ApiTeamRevision, type ApiTeamSet } from '../../../lib/api';

type Locale = 'it' | 'en';

function optionLabel(option: ApiOption | undefined, locale: Locale) {
  if (!option) return null;
  return locale === 'it' && option.labels.it ? option.labels.it : option.labels.en;
}

function storedLocale(): Locale {
  if (typeof window === 'undefined') return 'it';
  try {
    return window.localStorage.getItem('vgc-forge:locale') === 'en' ? 'en' : 'it';
  } catch {
    return 'it';
  }
}

function statusLabel(status: ApiTeamRevision['status'], locale: Locale) {
  if (status === 'legal') return locale === 'it' ? 'Legale' : 'Legal';
  if (status === 'blocked') return locale === 'it' ? 'Legalità non verificata' : 'Legality unverified';
  return locale === 'it' ? 'Bozza incompleta' : 'Incomplete draft';
}

function sharedError(error: ApiClientError | null, locale: Locale) {
  if (error?.code === 'REVISION_NOT_FOUND') return locale === 'it' ? 'Revisione non trovata o link non più valido.' : 'Revision not found or the link is no longer valid.';
  if (error?.code === 'SHARE_TOKEN_INVALID') return locale === 'it' ? 'Questo link condiviso non è valido.' : 'This shared link is not valid.';
  if (error?.code === 'DATA_UNVERIFIED') return locale === 'it' ? 'La release dati non è verificata per questa revisione.' : 'The data release is not verified for this revision.';
  return locale === 'it' ? 'Impossibile caricare la revisione condivisa. Riprova più tardi.' : 'The shared revision could not be loaded. Try again later.';
}

function findPokemon(set: ApiTeamSet, catalog: ApiPokemon[]) {
  return catalog.find((pokemon) => pokemon.formId === set.formId || (pokemon.speciesId === set.speciesId && !set.formId));
}

function SharedSetCard({ index, set, pokemon, options, locale }: { index: number; set: ApiTeamSet; pokemon?: ApiPokemon; options: { abilities: ApiOption[]; natures: ApiOption[] }; locale: Locale }) {
  const item = set.itemId ? pokemon?.items.find((entry) => entry.id === set.itemId) : undefined;
  const ability = options.abilities.find((entry) => entry.id === set.abilityId) ?? pokemon?.abilities.find((entry) => entry.id === set.abilityId);
  const nature = options.natures.find((entry) => entry.id === set.natureId);
  const tera = pokemon?.types.find((entry) => entry.id === set.teraTypeId);
  const moveLabels = set.moveIds.map((moveId) => optionLabel(pokemon?.learnableMoves.find((entry) => entry.id === moveId), locale) ?? moveId);
  const points = Object.values(set.statPoints).reduce((sum, value) => sum + value, 0);
  const stats = [
    ['HP', set.statPoints.hp],
    ['Atk', set.statPoints.atk],
    ['Def', set.statPoints.def],
    ['SpA', set.statPoints.spa],
    ['SpD', set.statPoints.spd],
    ['Spe', set.statPoints.spe],
  ] as const;

  return <article className="shared-set-card">
    <div className="shared-set-heading"><span className="shared-set-index">{index + 1}</span><div><h2>{pokemon ? optionLabel(pokemon, locale) : set.formId ?? set.speciesId}</h2><p>{pokemon?.formId && pokemon.formId !== pokemon.speciesId ? pokemon.formId : (locale === 'it' ? 'Set Champions' : 'Champions set')}</p></div><span className="shared-readonly-chip">{locale === 'it' ? 'Sola lettura' : 'Read only'}</span></div>
    <dl className="shared-set-details">
      <div><dt>{locale === 'it' ? 'Tera' : 'Tera Type'}</dt><dd>{optionLabel(tera, locale) ?? set.teraTypeId ?? '—'}</dd></div>
      <div><dt>{locale === 'it' ? 'Strumento' : 'Held Item'}</dt><dd>{optionLabel(item, locale) ?? (set.itemId ?? (locale === 'it' ? 'Nessuno' : 'None'))}</dd></div>
      <div><dt>{locale === 'it' ? 'Abilità' : 'Ability'}</dt><dd>{optionLabel(ability, locale) ?? set.abilityId}</dd></div>
      <div><dt>{locale === 'it' ? 'Natura' : 'Nature'}</dt><dd>{optionLabel(nature, locale) ?? set.natureId}</dd></div>
      <div><dt>{locale === 'it' ? 'Livello' : 'Level'}</dt><dd>{set.level}</dd></div>
      <div><dt>{locale === 'it' ? 'Stat Points' : 'Stat Points'}</dt><dd>{points} / 66</dd></div>
    </dl>
    <div className="shared-set-stats" aria-label={locale === 'it' ? 'Stat Points del set' : 'Set Stat Points'}>{stats.map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}</div>
    <div className="shared-set-moves"><h3>{locale === 'it' ? 'Mosse' : 'Moves'}</h3><ul>{moveLabels.map((move, moveIndex) => <li key={`${move}-${moveIndex}`}>{move}</li>)}</ul></div>
  </article>;
}

export function SharedRevisionView({ id, shareToken }: { id: string; shareToken?: string }) {
  const [locale, setLocale] = useState<Locale>('it');
  const localeHydrated = useRef(false);
  const [revision, setRevision] = useState<ApiTeamRevision | null>(null);
  const [catalog, setCatalog] = useState<ApiPokemon[]>([]);
  const [options, setOptions] = useState<{ abilities: ApiOption[]; natures: ApiOption[] }>({ abilities: [], natures: [] });
  const [formatLabel, setFormatLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [catalogWarning, setCatalogWarning] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (localeHydrated.current) return;
    localeHydrated.current = true;
    const stored = storedLocale();
    if (stored !== locale) {
      const timer = window.setTimeout(() => setLocale(stored), 0);
      return () => window.clearTimeout(timer);
    }
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      setCatalogWarning(false);
      if (!shareToken) {
        setError(new ApiClientError('A share token is required.', 404, 'SHARE_TOKEN_INVALID'));
        setLoading(false);
        return;
      }
      try {
        const response = await getTeamRevision(id, { shareToken, signal: controller.signal });
        setRevision(response.data);
        try {
          const [context, pokemon] = await Promise.all([
            getCatalogContext({ formatId: response.data.formatId, dataReleaseId: response.data.dataReleaseId, signal: controller.signal }),
            getCatalogPokemon({ formatId: response.data.formatId, dataReleaseId: response.data.dataReleaseId, locale, signal: controller.signal }),
          ]);
          setOptions({ abilities: context.data.abilities, natures: context.data.natures });
          setFormatLabel(optionLabel(context.data.format, locale));
          setCatalog(pokemon.data.pokemon);
        } catch (catalogError) {
          if (catalogError instanceof DOMException && catalogError.name === 'AbortError') return;
          setCatalogWarning(true);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof ApiClientError ? loadError : new ApiClientError('The data service is unavailable.', 503));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, shareToken, locale]);

  const filledSlots = useMemo(() => revision?.slots.filter(Boolean).length ?? 0, [revision]);
  const copy = locale === 'it' ? { title: 'Revisione condivisa', subtitle: 'Team Champions in sola lettura', back: 'Apri il team builder', loading: 'Caricamento revisione condivisa…', release: 'Release dati', format: 'Formato', status: 'Stato', note: 'Questo link è di sola lettura: nessun dato può essere modificato dal destinatario.', catalogWarning: 'Il catalogo dettagliato non è disponibile: vengono mostrati gli identificativi canonici.', empty: 'Slot vuoto' } : { title: 'Shared revision', subtitle: 'Read-only Champions team', back: 'Open team builder', loading: 'Loading shared revision…', release: 'Data release', format: 'Format', status: 'Status', note: 'This link is read-only: the recipient cannot modify any data.', catalogWarning: 'The detailed catalog is unavailable: canonical identifiers are shown instead.', empty: 'Empty slot' };

  return <main className="shared-revision-shell">
    <header className="shared-revision-header"><div><Link className="shared-mark" href="/">VGC Forge</Link><p>{copy.subtitle}</p></div><div className="shared-revision-actions"><fieldset className="shared-locale" aria-label={locale === 'it' ? 'Lingua' : 'Language'}><legend className="sr-only">{locale === 'it' ? 'Lingua' : 'Language'}</legend><button type="button" aria-pressed={locale === 'it'} onClick={() => setLocale('it')}>IT</button><button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button></fieldset><Link className="shared-back-link" href="/">{copy.back}</Link></div></header>
    {loading && <output className="shared-revision-message" aria-live="polite">{copy.loading}</output>}
    {!loading && error && <section className="shared-revision-error" role="alert"><h1>{locale === 'it' ? 'Link non disponibile' : 'Link unavailable'}</h1><p>{sharedError(error, locale)}</p><Link className="shared-back-link" href="/">{copy.back}</Link></section>}
    {!loading && !error && revision && <>
      <section className="shared-revision-summary"><div><span className="shared-kicker">{copy.title}</span><h1>{revision.name}</h1><p>{formatLabel ?? revision.formatId} · {filledSlots} / 6</p></div><div className="shared-summary-meta"><span><b>{copy.status}</b>{statusLabel(revision.status, locale)}</span><span><b>{copy.release}</b>{revision.dataReleaseId}</span><span><b>{copy.format}</b>{revision.formatId}</span></div></section>
      <p className="shared-revision-note"><LockKeyhole size={15} aria-hidden="true" />{copy.note}</p>
      {catalogWarning && <output className="shared-revision-catalog-warning">{copy.catalogWarning}</output>}
      <section className="shared-set-grid" aria-label={locale === 'it' ? 'Set del team' : 'Team sets'}>{revision.slots.map((set, index) => set ? <SharedSetCard key={index} index={index} set={set} pokemon={findPokemon(set, catalog)} options={options} locale={locale} /> : <article className="shared-set-card shared-set-empty" key={index}><span className="shared-set-index">{index + 1}</span><h2>{copy.empty}</h2></article>)}</section>
    </>}
  </main>;
}

export default function SharedRevisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ shareToken?: string }> }) {
  const { id } = use(params);
  const { shareToken } = use(searchParams);
  return <SharedRevisionView id={id} shareToken={shareToken} />;
}

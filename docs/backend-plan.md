# Backend plan — VGC Teambuilder

## Obiettivo

Trasformare il prototipo attuale in un backend che sia la fonte unica per catalogo, legalità, set, team, import/export Showdown e calcolo danni. Il client deve visualizzare e modificare dati canonici, non replicare formule o regole.

Il primo target è Pokémon Champions Regulation M-B Doubles, ma ogni confine deve ricevere `formatId` e `dataReleaseId` per poter aggiungere altri formati senza riscrivere il dominio.

## Stato di partenza

- `app/api/v1/health` è un health check statico.
- `app/api/v1/formats` restituisce un solo formato statico.
- Il builder usa un catalogo hardcoded e localStorage.
- Il calculator usa ancora risultati demo/preset e non un motore server-side.
- Non esistono ancora persistenza PostgreSQL, release dati certificata, catalogo completo o motore danni compatibile; la tranche iniziale usa una repository bundled preview e revisioni in-memory dichiarate non produttive.

## Tranche implementata

Sono ora presenti i contratti e le route pubbliche per contesto/catalogo, risoluzione set, revisioni draft anonime, release, import/export Showdown e calculator. La validazione strutturale e le statistiche derivate sono server-side; la repository preview espone solo sei voci tecniche e mantiene `dataStatus: unverified`.

Restano intenzionalmente bloccati: certificazione di legalità, danni/KO, import Showdown completo e persistenza PostgreSQL. Questi flussi devono fallire con codici strutturati, non ricadere su preset client o su una release compatibility-only.

### Issue #1 — prima tranche PostgreSQL

È stata aggiunta la migrazione `db/migrations/001_canonical_repository.sql` con release, profili formato, catalogo, learnset, legalità e revisioni append-only. Le tabelle release-scoped hanno trigger di immutabilità. `server/data/source.ts` rende esplicita la policy runtime: la bundled preview è disponibile solo in sviluppo/preview; in produzione senza `DATABASE_URL`, oppure con PostgreSQL configurato ma senza repository runtime, le API rispondono con errore 503 e non servono dati demo. `scripts/import-release.mjs` importa bundle con checksum SHA-256, transazione e `ON CONFLICT` idempotente; `npm run db:check` verifica automaticamente un fixture senza collegarsi al database. Resta da collegare il repository runtime alle route catalogo/legalità prima di chiudere l'issue.

## Decisione architetturale

Partire da un **modular monolith** Node/TypeScript nello stesso repository, con REST `/api/v1` e PostgreSQL come fonte canonica.

Non introdurre microservizi o una coda finché non esistono volumi che li giustifichino: la priorità è avere un'unica versione delle regole e test deterministici. I moduli server devono essere separati anche se vengono distribuiti insieme:

1. `catalog`: specie/form, mosse, abilità, strumenti, nature, localizzazioni e learnset.
2. `rules`: formati, release, legalità e policy di conversione.
3. `teams`: revisioni, slot, set e ownership anonima.
4. `interop`: adattatore Showdown e JSON strutturato.
5. `calculation`: statistiche derivate, condizioni campo e motore danni.
6. `api`: autenticazione futura, envelope HTTP, rate limit, mapping DTO.

Il confine HTTP resta quello già usato dall'adapter frontend: il backend può cambiare il proprio schema interno senza cambiare i DTO esposti.

### Boundary definitiva di integrazione

La API pubblica v1 usa il vocabolario del prodotto (`/catalog/context`, `/catalog/pokemon`, `/sets/resolve`, `/teams/revisions`, `/calculator`, `/showdown/import`). I contratti prodotti dai moduli dati e damage sono servizi interni: `validateSet`, `validateTeam` e `calculateDamage` non diventano una seconda API pubblica.

- Gli ID sono opachi e versionati dalla release; il client non deve assumere che siano numerici, né ricavarli da labels o nomi Showdown.
- Le mosse passano come `moveIds`; i nomi tecnici sono solo alias dell'adapter Showdown.
- Il modello canonico usa da una a quattro `moveIds` distinti; quattro righe vuote della UI sono uno stato di editing e non vengono inviati come mosse vuote.
- `teraTypeId` è opzionale e capability-driven: se il profilo Champions della release non lo supporta, il catalogo non lo espone e l'input viene rifiutato con `UNSUPPORTED_FIELD`, mai ignorato.
- `POST /calculator` adatta il request UI al `Combatant` completo del motore interno. L'engine interno può evolvere senza trasferire la sua struttura tecnica nei componenti React.
- La bozza parziale e il team completo sono stati distinti: una bozza può avere slot `null`, mentre `validateTeam` richiede sei set e applica le clausole del roster. Solo il secondo può essere dichiarato team legale.

Il release gate è parte del contratto: una release `provisional` o `unverified` può alimentare catalogo e fixture, ma non può certificare una legalità o presentare un danno come risultato ufficiale in produzione. Il server restituisce `DATA_UNVERIFIED` con `dataStatus`, release e gap; non esiste un bypass client-side.

### Compatibilità tra release e motore

Il catalogo Champions M-B provvisorio e l'attuale release tecnica del damage engine sono artefatti distinti. Non sono intercambiabili e non devono essere collegati solo perché hanno specie o mosse in comune:

- il catalogo deve dichiarare `dataStatus`, checksum e gap;
- il damage engine deve dichiarare `mechanicsVersion` e i `formatId` supportati;
- `/calculator` deve risolvere una coppia esatta `dataReleaseId` + `mechanicsVersion`;
- se non esiste una coppia certificata per il formato richiesto, la risposta è `422 NO_COMPATIBLE_ENGINE_RELEASE` o `DATA_UNVERIFIED`, senza fallback automatico;
- un profilo compatibility-only non può essere rinominato o esposto come Regulation M-B.

La prima release realmente utilizzabile in produzione richiede quindi sia dati Champions verificati sia un engine che dichiari esplicitamente la compatibilità con quel profilo.

## Modello dati PostgreSQL

### Tabelle canoniche

- `data_releases`: id, release key, checksum, origine, stato, createdAt.
- `format_profiles`: id, game, battle mode, level, `dataReleaseId`, regole JSONB, policy conversione JSONB.
- `pokemon_species` e `pokemon_forms`: identità canonica, labels IT/EN, tipi, base stats, forme.
- `moves`, `abilities`, `items`, `natures`: dati canonici e labels localizzate.
- `learnsets`: relazione form/mossa con origine e release.
- `format_legalities`: entità/combinazioni ammesse o vietate per formato e release.
- `teams`: identità del team, formato, owner anonimo, slug/share token hash.
- `team_revisions`: snapshot immutabili, release usata, nome, timestamp. Una revisione può essere una bozza con slot `null`; la completezza del team è una regola distinta dalla validità dei set presenti.
- `team_slots`: posizione 1–6 e `Set` normalizzato della revisione.

Usare colonne relazionali per identità, ricerca e vincoli; usare JSONB per payload di release, regole e meccaniche che variano tra formati. Le labels localizzate non sono chiavi e non vengono usate per le join.

### Vincoli essenziali

- una revisione ha sempre sei posizioni numerate; durante l'editing gli slot possono essere vuoti;
- uno slot contiene un set o è vuoto, mai un set parzialmente valido salvato come legale;
- Stat Points 0–32 per statistica e totale massimo 66 secondo la release;
- quattro mosse al massimo, con duplicati e learnset verificati dal servizio di legalità;
- ogni revisione conserva `formatId` e `dataReleaseId`;
- una revisione condivisibile deve contenere sei set legali;
- ownership anonima tramite cookie server-side sicuro, mai tramite un token considerato attendibile dal localStorage;
- share token opaco e memorizzato solo come hash.

## Contratti API provvisori

Le risposte di successo usano `{ data, meta }`. Gli errori pubblici usano `{ issues, meta }`, con `path`, `code`, `message`, `blocking` e dettagli opzionali; gli eventuali `errors` interni del data layer vengono mappati dall'adapter e non diventano un secondo contratto.

### Metadata e catalogo

- `GET /api/v1/formats`
- `GET /api/v1/releases?formatId=...`
- `GET /api/v1/catalog/context?formatId=...&dataReleaseId=...`
- `GET /api/v1/catalog/pokemon?q=&type=&ability=&role=&formatId=&dataReleaseId=&locale=&cursor=`
- `GET /api/v1/catalog/pokemon/:speciesId?formId=&formatId=&dataReleaseId=`

Il catalogo restituisce identificatori canonici e labels IT/EN, senza far dipendere le query dalla lingua. Restituisce anche `dataStatus`, checksum e gap della release: una voce catalogo disponibile non equivale a una combinazione certificata come legale.

### Team e set

- `POST /api/v1/sets/resolve` valida un set e calcola le statistiche derivate senza modificarlo. Internamente delega a `validateSet`.
- `POST /api/v1/teams/revisions` valida e salva una revisione immutabile, anche parzialmente compilata.
- `GET /api/v1/teams/revisions/:id` carica una revisione solo per il browser owner o tramite share token.
- `POST /api/v1/teams/revisions/:id/share` crea un link read-only, senza login in v1.

La validazione deve precedere la persistenza. Non deve essere possibile creare un set illegale tramite UI, API o import. Una bozza parziale non è una conferma di legalità del team: il server restituisce lo stato `draft` finché non sono presenti sei set legali e le clausole del roster non sono soddisfatte.

### Showdown

- `POST /api/v1/showdown/import` riceve testo, `formatId`, locale e policy release; restituisce team normalizzato oppure `issues[]` blocking/warning.
- `POST /api/v1/showdown/export` riceve una revisione valida e restituisce testo Showdown deterministico.

La conversione EV/IV → Stat Points sarà una policy esplicita e versionata, non una regola nascosta nel parser. Il comportamento concordato (divisione degli input legacy e cap 66) va codificato nella release e coperto da fixture. Input non rappresentabili o conversioni su release non verificata producono problemi blocking.

### Damage calculator

- `POST /api/v1/calculator`

Input minimo:

```ts
type DamageRequest = {
  formatId: string
  dataReleaseId?: string
  mode: 'singles' | 'doubles'
  attacker: SetReferenceOrInlineSet
  defender: SetReferenceOrInlineSet
  moveId: string
  field: {
    weather: 'clear' | 'sun' | 'rain' | 'sand' | 'snow'
    terrain: 'none' | 'electric' | 'grassy' | 'psychic' | 'misty'
    reflect: boolean
    lightScreen: boolean
    auroraVeil: boolean
    safeguard: boolean
    tailwind: boolean
    trickRoom: boolean
    gravity: boolean
  }
  critical: boolean
  spread: boolean
  teamRevisionId?: string
  attackerSlot?: number
}
```

`weather` deve rappresentare esplicitamente anche `rain`, non solo l'assenza di sole. Il contratto UI v1 usa `clear`, sole, pioggia, sabbia e neve; il dominio interno deve associare ogni condizione alla sua semantica di lato o globalità. Schermoluce, Riflesso, Salvaguardia e Ventoincoda sono riferiti al lato del difensore nel matchup v1 e devono essere etichettati così; Distortozona e Gravità sono globali. L'estensione a quattro combattenti in Doubles va fatta aggiungendo contesto per lato, senza riscrivere il motore.

Output minimo:

```ts
type DamageResponse = {
  primary: DamageOutcome
  alternatives: DamageOutcome[]
  ko: KoSummary
  assumptions: { it: string; en: string }[]
  formatId: string
  dataReleaseId: string
  dataStatus: 'certified' | 'provisional' | 'unverified'
  teamRevisionId?: string
}
```

`koChance` e le probabilità analoghe sono frazioni da 0 a 1. Le alternative devono essere calcolate dallo stesso engine della mossa principale. Nessun numero presentato come risultato può restare un preset non dichiarato. Se manca una meccanica supportata, il server deve restituire un problema esplicito o un warning visibile, mai ignorare l'input.

Una richiesta damage su release `provisional`/`unverified` non restituisce un `DamageResponse` utilizzabile: risponde `422 DATA_UNVERIFIED` con release, checksum e gap. `dataStatus: certified` è quindi un requisito per mostrare danno o KO come risultato ufficiale, non un badge cosmetico.

### Contratto condiviso con il frontend

- Tutti gli ID sono lowercase e indipendenti dalla lingua.
- Ogni opzione espone `{ id, labels: { it, en } }`; `none` è l'ID esplicito per assenza di strumento.
- `CompetitiveSet` contiene specie/forma, strumento, abilità, natura, sei Stat Points e `moveIds`; `teraTypeId` è opzionale solo se previsto dal formato e non contiene IV/EV.
- `POST /sets/resolve` restituisce set normalizzato, statistiche derivate, problemi e release senza correggere silenziosamente l'input.
- Il frontend può salvare una revisione parziale, ma non può sostituire un team esistente se l'import Showdown contiene problemi bloccanti.
- Il calculator può ricevere set inline per uso standalone oppure una revisione + slot; il server deve restituire la revisione usata.
- La lingua seleziona le labels dei messaggi e del catalogo, mai l'identità o il risultato numerico.

## Flussi backend

### 1. Caricamento catalogo

1. L'API risolve `formatId` e release predefinita.
2. Il catalogo applica le compatibilità del formato.
3. La UI cerca per identificatore/labels/tipo/abilità/ruolo.
4. La risposta include solo dati sufficienti a costruire un set valido.

### 2. Creazione e modifica team

1. Si crea un team vuoto di sei slot.
2. L'utente seleziona una forma dal catalogo.
3. Il backend restituisce opzioni compatibili per abilità, strumento, Tera Tipo e mosse.
4. Ogni modifica viene normalizzata e validata.
5. Statistiche finali e problemi derivano dal set canonico.
6. Il salvataggio crea una nuova revisione con release immutabile.

### 3. Import Showdown

1. Limitare dimensione e numero di set ricevuti.
2. Parsare senza eseguire codice.
3. Risolvere token inglesi tramite alias versionati.
4. Applicare policy Champions a EV/IV, mosse, forme e combinazioni.
5. Restituire team solo se rappresentabile; altrimenti elenco completo di problemi con path, code e gravità.

### 4. Calcolo danni

1. Risolvere formato e release.
2. Risolvere set da team oppure set inline per uso standalone.
3. Validare entrambi i set e la mossa.
4. Derivare le statistiche a livello 50.
5. Normalizzare `FieldState`, inclusa pioggia/sole/terreni e condizioni per lato.
6. Applicare modificatori in una pipeline esplicita e ordinata.
7. Calcolare tutti i roll, spread/crit quando applicabili, KO/2HKO/3HKO.
8. Restituire risultato, assunzioni e provenienza della release.

## Ordine di implementazione

### Dipendenze bloccanti

- Il catalogo e la release precedono validazione, import e builder.
- `validateSet` precede `validateTeam`; la persistenza delle revisioni usa gli stessi risultati e non una seconda validazione.
- Gli alias Showdown e la policy Stat Points precedono l'import.
- La coppia `dataReleaseId` + `mechanicsVersion` precede qualsiasi risultato damage mostrato come reale.
- L'adapter frontend viene collegato solo dopo che gli envelope di successo/errore e i codici sono congelati.

### Milestone 0 — contratti e fixture

- congelare DTO, codici problema e identificatori;
- aggiungere fixture minime per un team legale, uno illegale e una paste Showdown;
- definire la policy EV/IV → Stat Points;
- aggiungere `CONTEXT.md` come linguaggio condiviso.

### Milestone 1 — release e catalogo

- migrazioni PostgreSQL;
- importer di una release Champions;
- endpoint formats/releases/catalogo;
- ricerca server-side e dettaglio Pokémon.
- `dataStatus`/checksum/gap restituiti in ogni risposta release-specifica;
- nessun claim di legalità finché la release resta `unverified`.

### Milestone 2 — legalità e team revision

- validatore unico per UI/API/import;
- creazione team vuoto e sei slot;
- set normalizzato, Stat Points, statistiche derivate;
- revisioni e share read-only anonimo.

### Milestone 3 — Showdown adapter

- parser, alias IT/EN e token inglesi;
- conversione versionata e problemi strutturati;
- export deterministico;
- round-trip tests dove la rappresentazione è compatibile.

### Milestone 4 — motore condizioni e danni

- `FieldState` completo per Singles/Doubles;
- pipeline meteo/terreno/schermi/condizioni laterali;
- distribuzione dei roll e probabilità KO;
- golden tests con casi compatibili Showdown e casi ufficiali Champions.
- adapter dal DTO pubblico al `Combatant` interno;
- matrice esplicita `formatId`/`dataReleaseId`/`mechanicsVersion`;
- nessun fallback da M-B a un profilo compatibility-only.

### Milestone 5 — integrazione frontend

- il builder legge/salva solo via API;
- il calculator usa team o set inline;
- cambiare pioggia, sole, terreno o schermo ricalcola davvero il risultato;
- locale IT/EN cambia solo labels, non identificatori o numeri.
- i test d'integrazione usano un adapter unico e fixture certificate; non mascherano release `unverified` come risultati reali.

## Test e qualità

- Unit test puri per stat derivation, legalità, conversione e ogni modificatore.
- Golden test per release: stesso input + stessa release = stesso output.
- Property test per cap 32/66, roll nel range, KO monotono rispetto ai danni.
- Contract test per ogni endpoint e per gli errori `blocking`/`warning`.
- Parser round-trip Showdown.
- E2E: team vuoto → sei slot → modifica set → campo pioggia → calcolo → riapertura revisione.
- Test di invariance IT/EN: cambiare lingua non cambia identificatori né risultato.

## Sicurezza e operatività v1

- rate limit separato per import e calcoli;
- limiti su body, numero di set e profondità dei payload;
- nessun codice eseguibile o query costruita da input Showdown;
- log con `formatId`, `dataReleaseId` e correlation id, senza paste complete o dati personali;
- health check che verifichi anche raggiungibilità DB e release attiva;
- cache dei calcoli solo dopo aver stabilizzato la correttezza, con chiave hash dell'intero scenario.

## Definition of done backend v1

Il backend è pronto quando un utente anonimo può creare da zero una bozza di sei slot, ricevere solo combinazioni legalmente certificabili, importare/esportare una paste compatibile, scegliere un Pokémon arbitrario nel calculator, impostare pioggia/sole/terreno/schermi per il lato corretto e ottenere un risultato server-side riproducibile. In produzione questo risultato deve provenire da una coppia certificata `dataReleaseId` + `mechanicsVersion`; in assenza di tale coppia l'API deve rifiutare la richiesta dichiarando il motivo.

## GitHub execution plan

Le attività operative sono tracciate nelle issue del repository e vanno eseguite in questo ordine:

1. [#1 PostgreSQL canonical repository e release immutabili](https://github.com/matteobocchia/VGC-Teambuilder/issues/1)
2. [#2 Release Champions M-B verificata](https://github.com/matteobocchia/VGC-Teambuilder/issues/2)
3. [#4 Catalogo e legalità server-side](https://github.com/matteobocchia/VGC-Teambuilder/issues/4)
4. [#5 Persistenza revisioni e condivisione read-only](https://github.com/matteobocchia/VGC-Teambuilder/issues/5)
5. [#6 Import/export Showdown e conversione Stat Points](https://github.com/matteobocchia/VGC-Teambuilder/issues/6)
6. [#3 Damage engine Champions](https://github.com/matteobocchia/VGC-Teambuilder/issues/3)
7. [#7 Integrazione frontend/API](https://github.com/matteobocchia/VGC-Teambuilder/issues/7)
8. [#8 Test golden, contract, E2E e release gate](https://github.com/matteobocchia/VGC-Teambuilder/issues/8)
9. [#9 Hardening production e deploy](https://github.com/matteobocchia/VGC-Teambuilder/issues/9)

La numerazione delle issue non coincide con l'ordine: il damage engine (#3) deve attendere sia la release dati (#2) sia le compatibilità del catalogo (#4).

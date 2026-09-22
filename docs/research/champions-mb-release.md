# Ricerca fonti ufficiali — Pokémon Champions Regulation M-B

Stato della ricerca: **22 settembre 2026**  
Ambito: Pokémon Champions, Regulation Set M-B, con priorità al doppio competitivo e alla successiva modellazione multiformato.  
Regola di affidabilità: una voce è `certified` solo quando esiste una fonte primaria verificabile per quella voce. Le pagine strategiche ufficiali sono evidenza di esempi reali, non un catalogo completo né una specifica normativa.

## Sintesi operativa

- M-B è una release storica: la pagina ufficiale indica validità dal **17 giugno 2026 alle 02:00 UTC** al **2 settembre 2026 alle 01:59 UTC**. Dal 2 settembre è stato annunciato M-C, quindi M-B va conservato come release immutabile e non trattato come formato corrente.
- La fonte ufficiale M-B pubblica alcune aggiunte e rimanda esplicitamente alla lista completa dentro il gioco. Non pubblica un dataset completo machine-readable di specie, forme, mosse, abilità, strumenti o learnset.
- Le fonti ufficiali confermano che Champions usa un sistema di allenamento semplificato con `Stat Points`, ma non ho trovato una specifica ufficiale pubblica che dichiari il limite totale 66 o la tabella completa di conversione/formule. Gli esempi ufficiali mostrano investimenti individuali fino a 32 e distribuzioni che sommano 66; questo è un’evidenza osservazionale, non una certificazione della regola.
- Per il VGC, il manuale Play! Pokémon conferma vincoli generali utili al modello (oggetti unici, Pokémon non duplicati per National Pokédex number, mosse/abilità disponibili normalmente, livello auto-normalizzato a 50, forme regionali ammesse), ma avverte che i regolamenti VGC possono differire dai Ranked Battles. Non va usato da solo per certificare la legalità M-B in-game.
- Conseguenza: un bundle M-B costruito soltanto da pagine web pubbliche deve rimanere `unverified`/`provisional`. Per promuoverlo a `certified` serve acquisire la lista completa dalla fonte indicata dal publisher (gioco/Pokémon HOME o export ufficiale equivalente), registrare la provenienza e verificare i dati in modo riproducibile.

## Evidenze ufficiali

### Release e finestra temporale M-B

| Evidenza | Fonte primaria | Risultato utilizzabile |
| --- | --- | --- |
| Il regolamento M-B è stato annunciato il 17 giugno 2026 e la finestra è 17 giugno 2026 02:00 UTC — 2 settembre 2026 01:59 UTC. La pagina elenca nuove aggiunte e rimanda alla lista completa nel gioco. | [Regolamento M-B — Pokémon Italia](https://www.pokemon.com/it/novita-pokemon/con-lentrata-in-vigore-del-regolamento-m-b-in-pokemon-champions-arrivano-una-nuova-stagione-di-lotte-competitive-e-un-nuovo-pass-lotta), 17 giugno 2026 | `validFrom`, `validUntil`, nome della release e lista di aggiunte dichiarate; non la lista completa. |
| La versione inglese ripete la stessa finestra e indica il percorso in gioco `Recruit → Recruit Pokémon → Roster Info → Pokémon Featured in This Roster`. | [Regulation Set M-B — Pokémon UK](https://www.pokemon.com/uk/news/regulation-set-m-b-kicks-off-a-new-ranked-battles-season-and-battle-pass-in-pokemon-champions), 17 giugno 2026 | Provenienza primaria per il metodo di verifica della selezione completa. |
| Il sito ufficiale ha annunciato M-C il 2 settembre 2026. | [Pokémon Champions — sito ufficiale](https://champions.pokemon.com/it-it/), aggiornamento mostrato il 2 settembre 2026 | M-B è una release storica; non deve essere sovrascritta dalla release corrente. |

### Pokémon aggiunti dichiarati da M-B

La pagina ufficiale inglese dichiara come aggiunte alla selezione M-B: **Vileplume, Qwilfish, Sceptile, Blaziken, Swampert, Mawile, Metagross, Staraptor, Musharna, Scolipede, Scrafty, Eelektross, Pyroar, Malamar, Barbaracle, Dragalge, Grimmsnarl, Falinks, Overqwil, Houndstone, Annihilape e Gholdengo**. La pagina italiana/francese fornisce gli stessi contenuti con i nomi localizzati.

Questa lista non è la legalità completa: la fonte dice che i Pokémon già ammessi da M-A restano ammessi e che la lista completa va consultata nel gioco. Quindi il bundle deve rappresentare la selezione completa ottenuta dal percorso ufficiale, non solo queste aggiunte.

### Identità del gioco e catalogo di base

| Evidenza | Fonte primaria | Risultato utilizzabile |
| --- | --- | --- |
| Champions presenta tipi, abilità e mosse come meccaniche di lotta e consente il trasferimento da Pokémon HOME solo per Pokémon presenti nel gioco. | [Pokémon Champions — Pokémon Video Games](https://www.pokemon.com/us/pokemon-video-games/pokemon-champions), pagina ufficiale consultata il 22 settembre 2026 | Il catalogo deve distinguere disponibilità in Champions da semplice esistenza nel Pokédex generale. |
| La pagina ufficiale Pokémon di Champions spiega che un Pokémon trasferito può conoscere mosse non utilizzabili in Champions e che deve cambiarle tramite allenamento. | [Assembling your ideal team](https://champions.pokemon.com/en-gb/pokemon/), pagina ufficiale consultata il 22 settembre 2026 | Il learnset Champions è un dataset separato dal learnset dei giochi di origine; non va ricostruito copiando automaticamente dati mainline. |
| Il sito ufficiale del Pokédex espone specie, tipi e abilità per il catalogo generale. | [Pokédex ufficiale Pokémon](https://www.pokemon.com/us/pokedex/), consultato il 22 settembre 2026 | Può fornire identità e label di base, ma non certifica presenza M-B, forma utilizzabile, learnset Champions o legalità del formato. |

### Stat Points e allenamento

| Evidenza | Fonte primaria | Cosa dimostra | Cosa non dimostra |
| --- | --- | --- | --- |
| La pagina ufficiale di Champions dice che l’allenamento consente di modificare Attacco, Difesa e altre statistiche e anche abilità e mosse. | [Allena i tuoi Pokémon — Pokémon Champions Italia](https://champions.pokemon.com/it-it/pokemon/), pagina ufficiale consultata il 22 settembre 2026 | Esistenza dell’allenamento semplificato e delle categorie di dati da modellare. | Formula delle statistiche, massimali, costo, conversione EV/IV o legalità dettagliata. |
| Un articolo ufficiale M-B riporta `Stat Points: 32 HP / 8 Attack / 11 Defense / 15 Speed` per Mega Malamar e altre distribuzioni. | [How to Build a Mega Malamar Team — Pokémon UK](https://www.pokemon.com/uk/features/pokemon-champions-how-to-build-a-mega-malamar-team), 13 luglio 2026 | Investimenti per-stat fino a 32 e somme di esempio coerenti con 66 (`32+8+11+15`). | Non è una tabella normativa; non dichiara esplicitamente il limite totale 66 né la formula. |
| Un altro articolo ufficiale riporta, tra gli altri, `32 HP / 19 Defense / 15 Sp. Def`, `32 HP / 2 Defense / 32 Sp. Def` e `27 HP / 8 Defense / 5 Sp. Atk / 6 Sp. Def / 20 Speed`. | [How to Build a Mega Malamar Team — Pokémon UK](https://www.pokemon.com/uk/features/pokemon-champions-how-to-build-a-mega-malamar-team), 13 luglio 2026 | Esempi ufficiali di distribuzioni a sei statistiche e massimo osservato pari a 32. | Non certifica tutte le distribuzioni possibili o la formula di calcolo. |
| Un articolo ufficiale M-B riporta `Stat Points: 2 HP / 32 Attack / 32 Speed` e altre build con punteggi parziali. | [How to Build a Mega Raichu X Team — Pokémon Brasil](https://www.pokemon.com/br/recursos/estrategia-de-equipe-para-pokemon-champions-mega-raichu-x), 21 luglio 2026 | Ulteriore evidenza primaria per il modello dei punti per statistica. | Non certifica il cap totale o i dettagli di arrotondamento. |

**Decisione dati:** il campo può essere modellato provvisoriamente come sei interi `0..32` con un limite totale configurabile, ma il limite `66` deve restare una regola da verificare con una fonte ufficiale direttamente osservabile/export del gioco prima di impostare `dataStatus: certified`. Non usare una formula EV/IV di altri giochi come sostituto.

### Mosse, abilità, strumenti e forme

| Evidenza | Fonte primaria | Risultato utilizzabile |
| --- | --- | --- |
| Gli articoli strategici ufficiali pubblicano set M-B concreti con specie, forma Mega quando applicabile, strumento, abilità, Stat Points e quattro mosse. | [Mega Malamar](https://www.pokemon.com/uk/features/pokemon-champions-how-to-build-a-mega-malamar-team), 13 luglio 2026; [Mega Raichu X](https://www.pokemon.com/br/recursos/estrategia-de-equipe-para-pokemon-champions-mega-raichu-x), 21 luglio 2026 | Evidenza positiva per singole combinazioni e label ufficiali; utile per fixture/golden set, non per il catalogo completo. |
| La pagina ufficiale indica che le abilità e le mosse possono essere modificate con l’allenamento. | [Assembling your ideal team](https://champions.pokemon.com/en-gb/pokemon/), consultata il 22 settembre 2026 | Il modello deve permettere abilità/mosse addestrabili senza assumere che il set strategico pubblicato sia l’unica combinazione. |
| Gli articoli ufficiali mostrano forme come Mega Malamar, Mega Raichu X e Mega Charizard Y in contesto M-B. | [Regulation M-B Double Battles Overview](https://www.pokemon.com/uk/features/pokemon-champions-regulation-m-b-double-battles-overview), 24 luglio 2026 | Le forme che cambiano statistiche/tipo/abilità devono avere identità distinta nel bundle (`formId`), ma l’elenco completo delle forme M-B resta da acquisire. |

Non è disponibile nelle fonti web ufficiali consultate un inventario completo e strutturato dei move ID, delle abilità, degli strumenti, delle forme e dei learnset utilizzabili in M-B. I set pubblicati sono campioni, non una specifica completa.

### Regole VGC applicabili come contesto, non come sostituto di M-B

Il [Play! Pokémon Video Game Championships Tournament Handbook](https://mcdn.pokemon.com/pokemon-prod/raw/upload/v1/live/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-vgc-tournament-handbook-en.pdf), revisione **21 maggio 2026**, è una fonte primaria per gli eventi VGC. Le sezioni rilevanti dicono:

- le regulation set Champions per le competizioni sono designate per serie e possono durare da uno a tre mesi; il contenuto può essere annunciato fino a 30 giorni prima della prima competizione legale (sez. 2.2.3);
- sono ammessi solo Pokémon ottenuti in Champions o trasferiti da Pokémon HOME, con lista dettagliata corrente indicata da Pokémon HOME (sez. 2.2.3);
- ogni Pokémon può tenere un oggetto, ma due Pokémon non possono avere lo stesso oggetto (sez. 2.3);
- per il VGC, un team non può contenere più di un Pokémon con lo stesso National Pokédex number (sez. 2.4);
- mosse e abilità devono essere disponibili al Pokémon tramite gameplay normale, incluse eventuali disponibilità da eventi/promozioni ufficiali, con l’eccezione esplicita di Battle Bond (sez. 2.4);
- i Pokémon sopra o sotto il livello 50 vengono auto-livellati a 50 durante la lotta e le forme regionali sono ammesse se conformi (sez. 2.4);
- il manuale specifica anche che una regulation VGC può differire dalla regulation Ranked Battles (sez. 2.2). Questo impedisce di usare automaticamente la lista Ranked M-B come lista legale di ogni evento Championship.

Questi vincoli vanno memorizzati come policy del formato VGC/Championship, separati dalla policy del Ranked M-B in-game.

## Gap che impediscono `certified`

1. **Lista completa M-B:** la fonte ufficiale pubblica solo aggiunte e istruzioni per leggere la selezione nel gioco; manca un export ufficiale pubblico della lista completa.
2. **Specie/form:** mancano identificatori canonici completi e la relazione forma → statistiche/tipi/abilità/move pool per la release M-B.
3. **Mosse/abilità/strumenti:** mancano catalogo completo e disponibilità Champions-specifica; le pagine strategiche coprono solo esempi.
4. **Learnset:** non è pubblicato un learnset completo machine-readable; quello mainline non è una fonte sufficiente perché Champions può rifiutare mosse trasferite.
5. **Stat Points:** sono pubblicati esempi ufficiali, ma non una specifica normativa pubblica per cap totale, conversione, formula delle statistiche, arrotondamenti, natura/stat alignment o costi di allenamento.
6. **Legalità per contesto:** il manuale VGC distingue i regolamenti Championship da Ranked Battles; per una release production servono `legalities` separate per contesto e data.
7. **Damage engine:** le fonti ufficiali consultate non forniscono una specifica matematica completa del motore di danno Champions; non certificare risultati di damage calculator basandosi sulle formule di altri titoli.
8. **Prova di acquisizione:** serve conservare un artefatto originale (export/API ufficiale, snapshot della fonte o acquisizione in-game autorizzata), timestamp, versione client e metodo di normalizzazione.

## Struttura proposta per la release bundle

Il bundle deve mantenere la separazione tra identità globale, dati Champions e policy di formato. Le relazioni devono usare ID stabili; le label IT/EN sono dati localizzati e non chiavi.

```json
{
  "release": {
    "releaseId": "champions-mb-2026-06-17",
    "schemaVersion": "1.1",
    "game": "pokemon-champions",
    "series": "2026",
    "regulation": "M-B",
    "context": "vgc-championship-doubles",
    "validFrom": "2026-06-17T02:00:00Z",
    "validUntil": "2026-09-02T01:59:59Z",
    "source": "official-game-or-home-export",
    "dataStatus": "unverified",
    "checksum": "<sha256-canonical-json-excluding-release.checksum>",
    "evidence": [
      {
        "sourceId": "official-mb-announcement",
        "url": "https://www.pokemon.com/it/novita-pokemon/con-lentrata-in-vigore-del-regolamento-m-b-in-pokemon-champions-arrivano-una-nuova-stagione-di-lotte-competitive-e-un-nuovo-pass-lotta",
        "retrievedAt": "2026-09-22T00:00:00Z",
        "scope": "window-and-announced-additions"
      }
    ]
  },
  "formats": [
    {
      "formatId": "champions-mb-vgc-doubles",
      "context": "vgc-championship",
      "battleMode": "doubles",
      "rules": {
        "teamSize": { "min": 4, "max": 6 },
        "level": 50,
        "duplicateNationalDex": false,
        "duplicateItems": false
      },
      "statRules": {
        "representation": "champions-stat-points",
        "perStatMax": null,
        "totalMax": null,
        "formulaVersion": null
      }
    },
    {
      "formatId": "champions-mb-ranked-doubles",
      "context": "ranked-battles",
      "battleMode": "doubles",
      "rules": {},
      "statRules": {}
    }
  ],
  "species": [],
  "forms": [],
  "moves": [],
  "abilities": [],
  "items": [],
  "naturesOrStatAlignments": [],
  "learnsets": [],
  "legalities": [],
  "damageMechanics": null
}
```

La scelta di due `formatId` evita di confondere Ranked M-B con un evento Championship. Se una fonte ufficiale dimostra che la policy è identica, le due policy possono condividere le stesse righe tramite una relazione; non vanno fuse per assunzione.

## Checksum e promozione della release

1. Validare lo schema JSON e tutte le referenze (`formId`, `speciesId`, `moveId`, `abilityId`, `itemId`, `formatId`).
2. Normalizzare soltanto aspetti meccanici e riproducibili: ordine delle chiavi, ordine degli array secondo ID canonico, Unicode e numeri; non tradurre o correggere contenuti durante il checksum.
3. Rimuovere esclusivamente `release.checksum` dal payload da hashare.
4. Calcolare SHA-256 del JSON canonico e inserirlo nell’envelope.
5. Conservare l’artefatto sorgente e le evidenze con timestamp; un URL di un articolo strategico non è sufficiente per certificare una riga di legalità.
6. Importare PostgreSQL in una transazione append-only; una correzione produce un nuovo `releaseId`, mai un `UPDATE` della release esistente.
7. Usare `dataStatus: "unverified"` finché non sono presenti lista completa, catalogo, learnset, policy e verifica indipendente. Passare a `provisional` solo per un sottoinsieme dichiarato e testato; usare `certified` esclusivamente dopo la prova completa.

## Decisioni conseguenti per il progetto

- Non riempire il catalogo M-B con i sei Pokémon della preview o con i soli 22 ingressi aggiuntivi: sarebbe una lista incompleta presentata come legalità.
- Non derivare i learnset Champions da dati mainline senza una fonte/artefatto che dimostri la compatibilità Champions.
- Mantenere `formatId`, `dataReleaseId`, `context` e `checksum` obbligatori in ogni richiesta di validazione e calcolo.
- Tenere separati i dati di Ranked Battles e quelli degli eventi VGC Championship.
- Lasciare bloccati validatore completo e damage engine server-side finché le release non hanno dati verificati; restituire un errore esplicito invece di calcolare su una preview.

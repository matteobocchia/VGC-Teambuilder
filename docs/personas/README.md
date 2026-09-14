# User personas — VGC Forge

Queste personas rappresentano le persone che possono usare VGC Forge per preparare team Pokémon Champions o analizzare un matchup. Sono scenari di prodotto, non profili anagrafici reali.

## Mappa delle personas

| Persona | Lingua prevalente | Uso principale | Priorità |
| --- | --- | --- | --- |
| [Luca](./01-luca-competitive-player.md) | Italiano | Preparazione torneo e matchup | Primaria |
| [James](./07-james-english-competitive-player.md) | Inglese | Preparazione torneo e matchup | Primaria |
| [Sara](./02-sara-developing-player.md) | Italiano | Imparare a costruire set | Primaria |
| [Marta](./03-marta-coach-analyst.md) | Italiano / inglese | Coaching e confronto varianti | Primaria |
| [Tommaso](./04-tommaso-standalone-calculator.md) | Italiano / inglese | Calcolatore senza team | Primaria |
| [Giulia](./05-giulia-content-creator.md) | Italiano / inglese | Guide e scenari condivisi | Secondaria |
| [Andrea](./06-andrea-rules-maintainer.md) | Tecnica inglese / italiano | Dati, regole e release | Interna / futura |

## Contesto comune

- Il formato iniziale è Pokémon Champions Regulation M-B Doubles; il backend deve poter supportare altri formati in futuro.
- Un team contiene sei Pokémon. In v1 non esistono ancora stati attivo/riserve.
- Il livello è 50; non esistono IV. Gli Stat Points vanno da 0 a 32 per statistica, con un massimo di 66 complessivi.
- Le statistiche finali derivano automaticamente da specie, livello, Stat Points e natura.
- Le combinazioni illegali non si possono creare; un import non rappresentabile viene rifiutato con un elenco di problemi.
- Il calcolatore funziona sia con un team sia in modalità standalone, con Pokémon inseriti manualmente.

## Invariante del set attivo

Il set attivo è la configurazione completa del Pokémon selezionato nello slot corrente. Se cambia lo slot, devono aggiornarsi insieme specie/forma, ruolo, Tera Tipo, strumento, abilità, natura, Stat Points, statistiche finali, mosse e lato del matchup.

Non devono rimanere valori del Pokémon precedente, né risultati riferiti a un attaccante o difensore diverso da quello visibile.

## Lingua

La lingua è un contesto dell’utente, non una proprietà del calcolo. L’utente italiano deve vedere nomi italiani ufficiali; l’utente inglese deve vedere nomi inglesi ufficiali. La stessa schermata non deve mescolare abbreviazioni o traduzioni parziali: per esempio `Campo Erboso` e `Grassy Terrain` sono equivalenti in due locali diversi, non due label da mostrare insieme.

Showdown può restare il formato tecnico inglese di import/export. Cambiare IT/EN deve cambiare solo la presentazione, non Pokémon, input, regole o risultato. Un link read-only deve poter essere aperto da utenti con locale diverso.

## Fuori perimetro v1

Login, pannello admin, social feed, ranking e gestione tornei non fanno parte della prima versione. Andrea rappresenta un’esigenza architetturale futura, non una schermata da costruire ora.

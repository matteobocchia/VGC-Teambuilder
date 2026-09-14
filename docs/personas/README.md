# User personas — VGC Forge

Queste personas descrivono utenti concreti che preparano partite VGC usando Pokémon Showdown, paste pubbliche e calcoli manuali. Non sono profili demografici: sono scenari da usare per progettare il team builder, il calculator e il backend multi-formato.

## Mappa delle personas

| Persona | Lingua UI | Rapporto con Showdown | Flusso principale | Priorità |
| --- | --- | --- | --- | --- |
| [Davide](./01-davide-showdown-player-it.md) | Italiano | Copia paste e set da Showdown | Ricreare e rifinire un team per un torneo | Primaria |
| [Rachel](./02-rachel-showdown-player-en.md) | Inglese | Showdown è il riferimento principale | Importare, controllare e condividere in inglese | Primaria |
| [Elisa](./03-elisa-developing-player.md) | Italiano | Usa team pubblici Showdown come esempio | Capire un set e costruire il primo team | Primaria |
| [Marco](./04-marco-coach-analyst.md) | Italiano / inglese | Confronta paste, varianti e report | Analizzare set e matchup con un atleta | Primaria |
| [Nina](./05-nina-standalone-calculator.md) | Inglese / italiano | Incolla singoli set dal teambuilder Showdown | Calcolare un dubbio senza salvare un team | Primaria |
| [Alex](./06-alex-data-maintainer.md) | Inglese tecnico | Verifica compatibilità con il formato Showdown | Mantenere regole, cataloghi e release | Interna / futura |

## Contesto comune del prodotto

- Il primo formato è Pokémon Champions Regulation M-B Doubles.
- Il backend deve modellare il formato come profilo versionato, così in futuro può supportare altri formati senza duplicare la UI o le formule.
- Un team contiene sei Pokémon. Nella v1 non esistono stati attivo/riserve.
- Il livello è 50, gli IV non esistono e gli Stat Points sono da 0 a 32 per statistica, con massimo totale 66.
- Le statistiche finali derivano automaticamente da specie/forma, livello, natura e Stat Points.
- Le combinazioni illegali non si possono creare. Un import non rappresentabile deve essere rifiutato con un elenco di problemi, mai corretto in silenzio.
- Il damage calculator funziona sia collegato a un team sia in modalità standalone, con Pokémon inseriti manualmente.
- Login, account, pannello admin e social feed sono fuori dalla v1.

## Cosa significa “compatibile con Showdown”

Showdown è una sorgente tecnica, non la lingua obbligatoria dell’interfaccia.

- Una paste Showdown può contenere nomi, mosse, strumenti, abilità, natura, EV e IV nel formato tecnico inglese.
- Champions deve tradurre il contenuto in un modello canonico, applicare le regole Champions e mostrare eventuali problemi con elenco esplicito.
- In UI italiana si mostrano i nomi ufficiali italiani; in UI inglese quelli ufficiali inglesi. Non si deve mostrare `Grassy Terrain` accanto a `Campo Elettrico` nella stessa lingua o accorciare solo alcuni nomi.
- Cambiare IT/EN cambia la presentazione, non il Pokémon, il set, il formato, il campo o il risultato.
- Il copia/incolla Showdown deve restare disponibile come formato tecnico di interscambio, anche quando la UI è italiana.

## Invarianti da verificare in ogni schermata

1. Lo slot selezionato identifica sempre un solo Pokémon/forma e il suo set completo.
2. Specie, Tera, strumento, abilità, natura, Stat Points, statistiche derivate e mosse vengono aggiornati insieme.
3. Una modifica non può superare 32 punti su una statistica o 66 totali.
4. Un risultato mostra sempre attaccante, difensore, mossa, modalità e condizioni di campo usate.
5. Nessun dato Showdown viene perso o sostituito da un fallback senza messaggio.
6. Il calcolatore standalone non obbliga a creare o salvare un team.
7. Formato e release dati sono visibili e riproducibili.

## Gap consapevoli della v1

La prima versione può partire dalla creazione manuale da zero. L’import/export Showdown è un flusso prioritario successivo, non un comportamento da simulare con dati demo o con correzioni silenziose.

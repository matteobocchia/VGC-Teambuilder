# User personas — VGC Forge

Queste personas descrivono gli utenti che il prodotto deve servire e trasformano i requisiti generali in scenari verificabili. Non sono profili anagrafici reali: sono archetipi di lavoro con obiettivi, contesto e criteri di successo distinti.

## Priorità

| Persona | Ruolo | Superficie principale | Priorità |
| --- | --- | --- | --- |
| [Luca](./01-luca-competitive-player.md) | Giocatore competitivo | Team builder + matchup | Primaria |
| [Sara](./02-sara-developing-player.md) | Giocatrice in crescita | Set attivo + calcolatore guidato | Primaria |
| [Marta](./03-marta-coach-analyst.md) | Coach / analista | Varianti, scenari e risultati | Primaria |
| [Tommaso](./04-tommaso-standalone-calculator.md) | Utente del calcolatore standalone | Damage calculator | Primaria |
| [Giulia](./05-giulia-content-creator.md) | Creator / divulgatrice | Risultati condivisibili | Secondaria |
| [James](./07-james-english-competitive-player.md) | Giocatore competitivo English-first | Team builder + matchup | Primaria |
| [Andrea](./06-andrea-rules-maintainer.md) | Manutentore dati e regole | Backend, release e tracciabilità | Interna / futura |

## Invariante condivisa: il set attivo

Per tutte le personas che usano un team, **set attivo** indica una singola configurazione completa e coerente del Pokémon selezionato nello slot corrente. Quando cambia lo slot, devono cambiare insieme:

- specie, forma e ruolo;
- livello, Tera Tipo, strumento, abilità e natura;
- Stat Points Champions (0–32 per statistica, 66 totali, senza IV);
- statistiche finali derivate;
- mosse compatibili;
- lato del matchup e risultati del calcolatore.

Non sono accettabili valori rimasti dal Pokémon precedente, select che mostrano un valore ma salvano un altro campo, o un risultato che continua a descrivere un avversario diverso da quello visibile.

## Copertura linguistica delle personas

Le personas non sono tutte italiane: rappresentano anche chi arriva da fonti e community inglesi. Luca e Sara sono Italian-first; James è English-first; Marta, Tommaso e Giulia lavorano tra i due contesti. Questo serve a verificare lo stesso flusso da entrambi i punti di vista, non a duplicare il prodotto.

Per entrambe le lingue il set attivo deve restare lo stesso oggetto: cambia la label mostrata, non l'identificatore, la regola o il risultato. Un utente inglese deve vedere, per esempio, `Electric Terrain` e `Grassy Terrain` ovunque; un utente italiano deve vedere `Campo Elettrico` e `Campo Erboso`, senza etichette miste nella stessa schermata. Showdown può rimanere il formato tecnico inglese di import/export.

## Decisioni di prodotto che emergono dalle personas

1. Il contesto del formato e della release dati deve restare visibile durante ogni modifica.
2. Il calcolatore deve funzionare anche senza un team salvato.
3. Una modifica del set deve avere un feedback chiaro e aggiornare automaticamente i risultati server-side.
4. IT/EN riguarda l'interfaccia e i nomi di dominio mostrati all'utente; non devono comparire etichette miste o traduzioni inventate.
5. I risultati condivisi devono conservare scenario, formato, release dati e set usati per il calcolo.
6. Le esigenze del manutentore sono vincoli architetturali, non una pagina admin da includere nella v1.

## Fuori perimetro v1

Le personas non implicano autenticazione, social feed, ranking, gestione di tornei o pannello admin. Questi scenari possono guidare l'architettura futura, ma non devono introdurre controlli non richiesti nell'interfaccia iniziale.

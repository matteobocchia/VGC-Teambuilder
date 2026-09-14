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

## Invariante condivisa: lingua e nomenclatura

La lingua selezionata è una proprietà dell'interfaccia, non del calcolo. Il dominio usa identificatori indipendenti dalla lingua e ogni schermata li presenta con il catalogo ufficiale corrispondente:

- `it` mostra nomi italiani ufficiali quando esistono; `en` mostra i nomi inglesi ufficiali;
- campi, meteo, mosse, abilità, strumenti, nature, ruoli, errori, helper text, intestazioni, tooltip e label ARIA seguono lo stesso locale;
- non si alternano etichette tradotte e abbreviazioni inglesi nella stessa vista (`Campo Erboso` con `Grassy`, per esempio);
- se una label ufficiale non è disponibile in italiano, il fallback è il nome canonico inglese esplicitamente mantenuto, mai una traduzione inventata;
- cambiare lingua non modifica ID, set, regole, numeri o risultato del calcolo; cambia soltanto la loro presentazione;
- il documento HTML, i controlli accessibili e gli stati di errore devono riflettere il locale corrente.

Showdown resta un formato di import/export tecnico: i suoi identificatori inglesi vengono riconosciuti dal parser, ma la UI li visualizza nella lingua scelta. Un link condiviso conserva lo scenario e la release dati; chi lo apre può leggerlo in IT o EN senza ricalcolare un risultato diverso.

### Checklist linguistica per ogni superficie

1. Nessuna stringa visibile hard-coded fuori dal catalogo i18n.
2. Nessun mix di italiano e inglese in un singolo gruppo di controlli.
3. Nomi ufficiali completi per campi e condizioni (`Campo Elettrico`, `Campo Erboso`, `Campo Psichico`, `Campo Nebbioso`).
4. Titoli, aria-label, focus order e messaggi di errore tradotti insieme al contenuto.
5. Test di snapshot IT/EN per set attivo, calcolatore standalone e link condiviso.

## Decisioni di prodotto che emergono dalle personas

1. Il contesto del formato e della release dati deve restare visibile durante ogni modifica.
2. Il calcolatore deve funzionare anche senza un team salvato.
3. Una modifica del set deve avere un feedback chiaro e aggiornare automaticamente i risultati server-side.
4. IT/EN riguarda l'interfaccia e i nomi di dominio mostrati all'utente; non devono comparire etichette miste o traduzioni inventate.
5. I risultati condivisi devono conservare scenario, formato, release dati e set usati per il calcolo.
6. Le esigenze del manutentore sono vincoli architetturali, non una pagina admin da includere nella v1.

## Fuori perimetro v1

Le personas non implicano autenticazione, social feed, ranking, gestione di tornei o pannello admin. Questi scenari possono guidare l'architettura futura, ma non devono introdurre controlli non richiesti nell'interfaccia iniziale.

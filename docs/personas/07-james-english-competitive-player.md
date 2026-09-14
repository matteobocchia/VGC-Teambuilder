# James — giocatore competitivo English-first

## Profilo

- **Età indicativa:** 22 anni
- **Esperienza:** alta; gioca tornei locali e segue la preparazione internazionale
- **Lingua principale:** inglese
- **Lingua secondaria:** comprende l'italiano solo in modo limitato
- **Dispositivo:** laptop per costruire il team, telefono tra una partita e l'altra
- **Frequenza:** uso intensivo durante la preparazione di un torneo

## Contesto

James arriva da Pokémon Showdown, report internazionali e guide in inglese. Non sta usando una traduzione: per lui l'interfaccia inglese è il riferimento naturale. Se una label resta in italiano, non può capire se si tratta di una regola, di un campo o di una mossa diversa.

## Obiettivi

1. Costruire un team Champions leggendo tutto in inglese.
2. Importare o ricreare un set proveniente da una paste Showdown.
3. Selezionare uno slot e vedere un set attivo completo e coerente.
4. Testare matchup Doubles con `Electric Terrain`, `Grassy Terrain`, `Psychic Terrain`, `Misty Terrain`, weather e protection effects.
5. Condividere il matchup con un compagno italiano senza alterare scenario e risultato.

## Frizioni da evitare

- `Field` tradotto in italiano mentre il resto della schermata è inglese.
- `Electric Terrain` completo accanto a `Grassy` o `Misty` abbreviati.
- Set importato in inglese che perde una mossa o mostra un fallback non spiegato.
- Messaggi di errore, aria-label o controlli da tastiera ancora in italiano.
- Cambio IT/EN che resetta il set attivo, la mossa o il campo.

## Flusso principale

1. Apre il prodotto e seleziona English.
2. Importa una paste o sceglie uno slot del team.
3. Controlla Tera Type, held item, ability, nature, Stat Points e moves.
4. Imposta attacker, defender e battle mode.
5. Seleziona le condizioni del campo usando i nomi inglesi completi.
6. Legge il KO result e condivide il link con un teammate italiano.

## Criteri di successo

- Ogni testo operativo della schermata è in inglese, comprese validazioni e accessibilità.
- Il set attivo non contiene dati italiani o label miste quando English è selezionato.
- `Electric Terrain`, `Grassy Terrain`, `Psychic Terrain` e `Misty Terrain` sono mostrati per esteso e in modo coerente.
- Il passaggio a italiano cambia solo la presentazione: stessi Pokémon, input, numeri e risultato.
- Un link aperto da un utente italiano può mostrare `Campo Elettrico` e `Campo Erboso` senza creare un nuovo scenario.

## Requisiti prioritari

- Catalogo inglese completo per UI, errori, aria-label e nomenclatura Pokémon.
- Import Showdown compatibile con identificatori inglesi.
- Preferenza lingua persistente ma separata dai dati del calcolo.
- Condivisione read-only indipendente dal locale del destinatario.

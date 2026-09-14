# Luca — giocatore competitivo

## Profilo

- **Età indicativa:** 24 anni
- **Esperienza:** alta; gioca tornei VGC e prepara i match-up prima di un evento
- **Lingua:** italiano, con familiarità con la terminologia inglese della community
- **Dispositivo:** laptop durante la preparazione, telefono per un controllo rapido
- **Frequenza:** più sessioni ogni settimana durante la preparazione di un torneo

## Contesto

Luca parte da un team di sei Pokémon e deve capire quali quattro portare in partita, quali lead provare e come cambiano i KO quando modifica un set o una condizione di campo. Non vuole ricostruire la stessa informazione in più schermate.

## Obiettivi

1. Configurare rapidamente un team legale nel formato Champions selezionato.
2. Selezionare uno slot e sapere immediatamente quale set completo sta modificando.
3. Testare scenari Singles e Doubles con meteo, campi, schermi, Tailwind e Trick Room.
4. Distinguere un risultato calcolato da un preset o da un dato non ancora disponibile.
5. Confrontare varianti senza perdere il set di partenza.

## Frizioni attuali da evitare

- Il titolo dello slot mostra un Pokémon ma il set attivo appartiene a un altro.
- Stat Points, statistiche finali, mosse e risultato KO non si aggiornano insieme.
- Un campo viene chiamato con il nome completo e un altro con una scorciatoia non ufficiale.
- Il formato è visibile in una schermata ma non nel contesto del risultato.

## Flusso principale

1. Apre il team e verifica formato e release dati.
2. Seleziona lo slot del Pokémon dal rail.
3. Modifica Tera Tipo, strumento, abilità, natura, Stat Points e mosse.
4. Sceglie attaccante, difensore e modalità Singles/Doubles.
5. Imposta le condizioni di campo in gruppi mutuamente esclusivi o attivabili.
6. Legge il KO principale e la matrice delle altre mosse.
7. Salva una revisione o condivide un link in sola lettura.

## Criteri di successo

- In meno di un minuto può passare da uno slot all'altro senza ambiguità.
- Ogni valore visibile del set appartiene allo slot selezionato.
- La somma degli Stat Points non supera 66 e ogni statistica resta tra 0 e 32.
- Il risultato mostra chiaramente attaccante, difensore, mossa, campo, formato e release dati.
- Tornando a una variante precedente può riprodurre lo stesso risultato.

## Requisiti prioritari

- Set attivo controllato e derivato per slot.
- Stato del campo completo e leggibile.
- Calcolo server-side riproducibile.
- Matrice dei risultati coerente con il matchup corrente.

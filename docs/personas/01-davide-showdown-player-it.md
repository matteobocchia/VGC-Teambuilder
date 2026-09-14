# Davide — giocatore italiano che parte da una paste Showdown

## Contesto

- Gioca tornei VGC locali e prepara il team pochi giorni prima dell’evento.
- Legge bene l’inglese tecnico perché usa Pokémon Showdown, sample team e report internazionali.
- Vuole però una UI italiana quando deve controllare regole, campo e risultati.
- Lavora soprattutto da laptop; durante il torneo usa il telefono per verifiche rapide.

## Rapporto con Showdown

Showdown è il suo punto di partenza: riceve una paste da un compagno, la copia, controlla i sei set e la prova in ladder. Non vuole riscrivere a memoria mosse, strumenti e spread in un editor che non chiarisce cosa è stato importato.

## Scenario principale

Davide incolla un team Showdown, sceglie Regulation M-B Doubles e controlla se ogni set è rappresentabile in Champions. Poi modifica una sola cosa — per esempio Tera, natura o Stat Points — e apre il calculator per verificare un KO sotto pioggia o Campo Erboso.

## Obiettivi

- Ricreare o importare rapidamente un team da una paste Showdown.
- Capire subito quali parti del formato Showdown non sono valide in Champions.
- Modificare il set del Pokémon nello slot corretto senza ereditare dati da un altro slot.
- Vedere Stat Points, totale 66 e statistiche finali aggiornarsi subito.
- Confrontare un risultato con il numero che si aspetta dalla sua analisi Showdown.

## Frizioni da eliminare

- Un import che accetta il team ma perde una mossa o sostituisce una specie senza avviso.
- EV/IV mostrati come se fossero ancora il modello Champions.
- Label italiane e inglesi mischiate nello stesso set.
- Campo o meteo impostati in un chip generico impossibile da verificare.
- Risultato presentato come accurato quando è ancora un preset.

## Flusso ideale

1. Seleziona Italiano e il formato Regulation M-B.
2. Incolla la paste Showdown o, finché l’import non esiste, ricrea il team da zero.
3. Riceve un riepilogo: sei slot, dati trasformati, problemi bloccanti.
4. Seleziona uno slot e modifica un parametro.
5. Imposta attaccante, difensore, mossa, meteo, terreno e altri effetti.
6. Legge danno, roll e KO con assunzioni visibili.
7. Salva o condivide lo scenario senza cambiare i dati canonici.

## Criterio di successo

Davide può passare da una paste Showdown a un set Champions verificabile senza ricostruire il contesto a mano e senza chiedersi se il risultato appartenga al Pokémon precedente.

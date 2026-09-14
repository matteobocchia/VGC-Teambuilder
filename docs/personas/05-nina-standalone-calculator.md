# Nina — utente del damage calculator standalone

## Contesto

- Conosce già le meccaniche e non vuole mantenere un team completo.
- Alterna italiano e inglese perché copia l’attaccante o il difensore da Showdown.
- Usa il telefono per una domanda veloce e il laptop per confronti più lunghi.

## Rapporto con Showdown

Nina non parte da una squadra: copia due set da Showdown, li inserisce nel calculator e verifica un dubbio preciso. Il suo modello mentale è “input tecnico → formula → risultato”, non “crea e salva un team”.

## Scenario principale

Vuole sapere se una mossa fa KO, come cambiano i roll con la pioggia o quale sia la differenza tra due nature. Inserisce manualmente specie/forma, livello, Tera, strumento, abilità, natura, Stat Points e mossa per entrambi i lati.

## Obiettivi

- Entrare direttamente nel calculator senza creare un team.
- Incollare o compilare set Showdown senza perdita di dati.
- Impostare Singles/Doubles e condizioni di campo in modo esplicito.
- Vedere un risultato principale e le altre mosse in formato compatto.
- Cambiare IT/EN mantenendo identici input e calcolo.

## Frizioni da eliminare

- Obbligo di passare dal team builder o salvataggio involontario nel roster.
- Forma, abilità o Tera non visibili vicino al Pokémon inserito.
- Pioggia e sole trattati come stato decorativo o non collegati alla formula.
- Preset demo mostrati come risultato definitivo.
- Nomi inglesi nel campo e label italiane nel risultato, senza indicare il locale.

## Flusso ideale

1. Apre `/calculator` in modalità standalone.
2. Inserisce i due set copiati da Showdown.
3. Sceglie modalità, mossa e condizioni.
4. Legge danno, roll, probabilità KO e assunzioni.
5. Cambia una variabile e confronta il risultato.

## Criterio di successo

Nina risponde al dubbio in meno di un minuto, senza creare un team temporaneo e senza chiedersi se il risultato sia riferito ai set appena inseriti.

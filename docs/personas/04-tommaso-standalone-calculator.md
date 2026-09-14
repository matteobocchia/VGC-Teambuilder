# Tommaso — utente del calcolatore standalone

## Profilo

- **Età indicativa:** 27 anni
- **Esperienza:** alta sulle meccaniche, ma non sta costruendo un team nel prodotto
- **Lingua:** inglese o italiano in base alla fonte da cui arriva
- **Dispositivo:** telefono durante una sessione di test, laptop per analisi lunghe
- **Frequenza:** uso occasionale, concentrato su un dubbio preciso

## Contesto

Tommaso arriva con due Pokémon già scelti e vuole una risposta rapida: una mossa fa KO? Quanto cambia con una schermata, la pioggia o un Tera Tipo? Non vuole creare un team temporaneo solo per fare una domanda.

## Obiettivi

1. Inserire manualmente attaccante e difensore, anche senza team salvato.
2. Configurare set, livello, Stat Points, mosse e condizioni di campo.
3. Selezionare una mossa principale e vedere le altre in formato compatto.
4. Ottenere un risultato riproducibile con gli input usati.

## Frizioni attuali da evitare

- Obbligo di passare dal team builder per un test isolato.
- Roster o slot che sovrascrivono i Pokémon inseriti manualmente.
- Stato del campo non visibile nel risultato.
- Confusione tra danno singolo, spread damage e probabilità di KO.

## Flusso principale

1. Apre il calcolatore standalone.
2. Sceglie specie/forma e set per entrambi i lati.
3. Seleziona Singles o Doubles.
4. Imposta meteo, campo, schermi e condizioni di velocità.
5. Seleziona una mossa principale e legge danno, roll e KO.
6. Cambia una variabile e ripete il test.

## Criteri di successo

- Nessun team persistente è necessario.
- Gli input manuali restano separati dai set salvati.
- Il risultato dichiara chiaramente bersaglio, modalità, mossa e condizioni.
- Le alternative sono compatte ma non nascondono informazioni essenziali.

## Requisiti prioritari

- Modello scenario indipendente dal modello team.
- Input manuali validati con lo stesso ruleset del team builder.
- Aggiornamento automatico server-side.
- Reset semplice dello scenario.

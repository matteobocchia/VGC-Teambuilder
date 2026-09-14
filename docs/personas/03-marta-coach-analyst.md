# Marta — coach e analista di matchup

## Profilo

- **Età indicativa:** 31 anni
- **Esperienza:** molto alta; prepara più giocatori e confronta numerose linee di gioco
- **Lingua:** italiano e inglese
- **Dispositivo:** desktop con più finestre o monitor
- **Frequenza:** uso quotidiano durante la settimana di un torneo

## Contesto

Marta non cerca solo il danno massimo. Confronta ruoli, condizioni di campo e soglie di KO per decidere una linea di lead o una distribuzione di risorse. Deve poter spiegare il risultato a un'altra persona.

## Obiettivi

1. Clonare o confrontare varianti dello stesso Pokémon senza confondere le revisioni.
2. Analizzare scenari Doubles con spread damage e condizioni simultanee.
3. Vedere quali assunzioni hanno prodotto un risultato.
4. Condividere un link read-only riproducibile con un giocatore.

## Esigenza linguistica

Marta lavora tra giocatori italiani e fonti internazionali. Deve poter preparare in IT, condividere in EN e lasciare invariati scenario, dati e risultati. La lingua del destinatario non deve essere codificata nel calcolo: il link deve risolvere gli stessi identificatori canonici e applicare il locale scelto dal lettore.

## Frizioni attuali da evitare

- Risultati statici mentre cambiano attaccante, difensore o set.
- Matrice che dichiara un bersaglio diverso dal route principale.
- Condizioni di campo mostrate come un unico chip senza distinguere meteo, campo e protezioni.
- Mancanza di release dati, formato o livello nel dettaglio condiviso.
- Un report condiviso mescola nomi italiani, inglesi e abbreviazioni non spiegate.

## Flusso principale

1. Parte da un team o da un link read-only.
2. Duplica mentalmente o tramite revisione un set candidato.
3. Imposta il matchup e annota i valori chiave.
4. Attiva/disattiva una condizione di campo per volta.
5. Confronta KO principale, roll completi e alternative.
6. Condivide lo scenario con contesto e assunzioni intatti.

## Criteri di successo

- Può rispondere a “perché questo KO?” senza ricostruire il contesto a mano.
- Ogni risultato include input e release dati sufficienti per essere riprodotto.
- Le modifiche di un set non cambiano silenziosamente altri set o scenari.
- La UI distingue dati ufficiali, risultati calcolati e preset provvisori.
- Può verificare rapidamente che locale, label e aria-label siano coerenti nel link condiviso.

## Requisiti prioritari

- Snapshot immutabile del calcolo.
- Confronto tra revisioni e scenari.
- Dettaglio delle condizioni di campo.
- Link read-only con contesto completo.

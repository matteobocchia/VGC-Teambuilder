# Sara — giocatrice in crescita

## Profilo

- **Età indicativa:** 19 anni
- **Esperienza:** media; conosce le basi del VGC ma sta imparando a costruire set competitivi
- **Lingua:** italiano; può passare all'inglese quando segue guide internazionali
- **Dispositivo:** principalmente laptop, occasionalmente mobile
- **Frequenza:** prepara il team prima delle lotte classificate e dei primi tornei

## Contesto

Sara sa scegliere una specie e una mossa, ma non conosce a memoria il significato di ogni combinazione di natura, oggetto, abilità e Stat Points. Ha bisogno di un'interfaccia che la aiuti a capire il set senza nascondere le regole Champions.

## Obiettivi

1. Creare un set valido senza dover conoscere tutte le eccezioni del formato.
2. Capire l'effetto di una modifica alle statistiche sul risultato.
3. Usare il calcolatore senza dover prima costruire un team completo.
4. Leggere nomi e descrizioni coerenti nella lingua scelta.

## Esigenza linguistica

Sara usa l'italiano per imparare, ma può seguire una guida inglese. La traduzione deve aiutarla senza creare un vocabolario parallelo: campi, mosse, abilità, strumenti e messaggi di validazione devono avere nomi ufficiali e completi. Se una voce non ha una label italiana ufficiale, è preferibile mostrare il canonico inglese che inventare una traduzione.

## Frizioni attuali da evitare

- Campi o mosse con traduzioni parziali che fanno dubitare della regola applicata.
- Select che sembrano modificabili ma non aggiornano il set.
- Statistiche finali non spiegate o rimaste fisse dopo la modifica.
- Messaggi di errore che dicono solo che il set è invalido senza indicare tutti i problemi.
- Label, aria-label o messaggi di errore che restano in inglese dopo aver scelto IT.

## Flusso principale

1. Sceglie una specie e un formato.
2. Compila il set attivo seguendo l'ordine specie → Tera Tipo → strumento → abilità → natura → Stat Points → mosse.
3. Legge il totale Stat Points mentre modifica i campi.
4. Apre il calcolatore e confronta una mossa principale con le alternative.
5. Cambia una sola variabile alla volta e osserva il risultato aggiornato.

## Criteri di successo

- Capisce sempre quale Pokémon e quale set sta editando.
- Sa perché un input viene rifiutato e come correggerlo.
- Vede la statistica finale derivata e il contributo della natura/Stat Points.
- Può usare un calcolo ad hoc anche senza creare o salvare un team.
- Non deve conoscere inglese per usare una UI italiana completa.
- Il cambio lingua non cancella input e non modifica il risultato.

## Requisiti prioritari

- Copy IT/EN completo e coerente.
- Feedback inline per cap 66 e cap 32.
- Stato vuoto e valori iniziali non ambigui.
- Preset dichiarati come tali finché l'engine non è collegato.

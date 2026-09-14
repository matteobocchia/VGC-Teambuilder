# Andrea — manutentore dati e regole

## Profilo

- È una figura interna: non usa un pannello admin nella v1.
- Lavora in inglese tecnico, ma deve verificare ciò che viene mostrato agli utenti italiani.
- Interviene a ogni release dati o modifica del regolamento.

## Scenario

Andrea mantiene il backend multi-formato, le formule, la compatibilità e le release versionate. Serve a impedire che una scorciatoia del frontend diventi una regola implicita.

## Obiettivi

- Versionare formati, regole e dati senza perdere la riproducibilità.
- Separare identificatori canonici, label italiane/inglesi e copy UI.
- Aggiungere un formato futuro senza duplicare il codice.
- Verificare cap Champions, compatibilità, statistiche derivate e danno.
- Sapere quale release ha prodotto ogni risultato condiviso.

## Problemi da evitare

- Regole o formule hard-coded nei componenti React.
- Nome visualizzato diverso dall’identificatore canonico.
- Fallback linguistici inventati o schermate miste.
- Risultato non tracciabile fino a formato e release dati.

## Flusso principale

1. Importa o aggiorna una release versionata.
2. Applica il profilo Champions senza alterare quelli storici.
3. Esegue fixture ufficiali e test golden.
4. Pubblica la release per le API.
5. Verifica che il frontend usi il catalogo IT/EN corretto.

## Successo

Lo stesso input produce lo stesso risultato con la stessa release; un nuovo formato è un profilo dati/regole e non una copia dei componenti.

## Fuori perimetro

Autenticazione, permessi e pannello admin possono arrivare in futuro, ma non fanno parte della UI v1.

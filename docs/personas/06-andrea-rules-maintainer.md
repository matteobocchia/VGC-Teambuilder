# Andrea — manutentore dati e regole

## Profilo

- **Età indicativa:** 35 anni
- **Esperienza:** ingegnere software con competenza sulle meccaniche competitive
- **Lingua:** inglese tecnico, con necessità di verificare l'italiano mostrato agli utenti
- **Dispositivo:** desktop e strumenti di sviluppo
- **Frequenza:** interviene a ogni nuova release dati o modifica del regolamento

## Contesto

Andrea non è un utente della UI v1 con pannello admin. È una persona interna che mantiene release, formule, compatibilità e regole multi-formato. La sua persona serve a evitare che una scorciatoia di frontend diventi una regola implicita.

## Obiettivi

1. Versionare formati, regole e dati senza perdere la riproducibilità.
2. Separare i dati indipendenti dalla lingua dalle stringhe UI.
3. Aggiungere un nuovo formato senza riscrivere team builder e calculator.
4. Verificare formule, compatibilità, cap Champions e casi limite con test golden.
5. Sapere quale release dati ha prodotto ogni risultato condiviso.

## Frizioni attuali da evitare

- Regole hard-coded nei componenti React.
- Dati mostrati in una lingua diversa da quella selezionata.
- Nome visualizzato che non corrisponde all'identificatore canonico.
- Risultato non tracciabile fino a formato e release dati.

## Flusso principale

1. Importa o aggiorna una release versionata.
2. Applica il ruleset Champions e i profili futuri senza alterare quelli storici.
3. Esegue test di compatibilità, statistiche derivate e danno.
4. Pubblica la release per il backend.
5. Verifica che il frontend mostri solo label provenienti dal catalogo locale corretto.

## Criteri di successo

- Un calcolo può essere riprodotto usando gli stessi input e la stessa release.
- I componenti non decidono autonomamente legalità o nomenclatura.
- Un nuovo formato è un profilo dati/regole, non una copia del codice.
- Ogni errore di importazione viene restituito con un elenco azionabile.

## Requisiti prioritari

- PostgreSQL come fonte canonica con JSONB per i profili formato.
- API versionate e identificatori lingua-indipendenti.
- Test golden e fixture ufficiali.
- Audit trail di release e calcoli.

## Fuori perimetro immediato

Il pannello admin, i permessi e l'autenticazione non fanno parte della v1. L'architettura deve però lasciare spazio a questi strumenti senza spostare la logica nel client.

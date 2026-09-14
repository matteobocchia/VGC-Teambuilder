# Alex — manutentore di dati, formati e compatibilità Showdown

## Ruolo

- È una figura interna o futura, non un utente del pannello pubblico v1.
- Lavora in inglese tecnico, ma verifica che le label italiane siano ufficiali e complete.
- Mantiene cataloghi, regole, formule e release versionate per più formati.

## Rapporto con Showdown

Alex usa Showdown come formato tecnico di confronto e come fonte di fixture, ma non lo tratta come autorità per le regole Champions. Deve distinguere ciò che è serializzazione Showdown da ciò che è permesso dal profilo formato del backend.

## Scenario principale

Arriva una nuova release del formato. Alex aggiorna specie/forme, mosse, strumenti, abilità, regole e formule senza rompere paste precedenti o risultati riproducibili.

## Obiettivi

- Separare identificatori canonici, label IT/EN e stringhe del formato Showdown.
- Applicare Regulation M-B senza hard-code nei componenti React.
- Rifiutare import incompatibili con un elenco stabile e testabile.
- Mantenere il backend pronto ad altri formati e versioni.
- Verificare formule, statistiche derivate, effetti di campo e danno con fixture golden.
- Sapere quale release ha prodotto ogni risultato condiviso.

## Frizioni da eliminare

- Un nome UI usato come chiave di calcolo o come identificatore Showdown.
- Traduzioni che cambiano il dato persistito.
- Fallback automatici che rendono una paste diversa senza segnalarlo.
- Regole Champions duplicate nella UI, nell’API e nell’importer.
- Risultati non riconducibili a formato, release e input canonici.

## Flusso ideale

1. Importa una release versionata e i mapping Showdown.
2. Applica il profilo Champions senza modificare i profili storici.
3. Esegue fixture ufficiali e test golden per ogni formula.
4. Verifica che le label IT/EN siano complete e coerenti.
5. Pubblica la release per il calculator e controlla la riproducibilità dei link.

## Criterio di successo

Lo stesso input canonico produce lo stesso risultato con la stessa release. Aggiungere un formato futuro significa aggiungere dati e regole versionate, non copiare schermate o formule.

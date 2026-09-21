# VGC Teambuilder domain context

Questo glossario definisce il linguaggio condiviso tra team builder, import/export Showdown e calcolatore di danno. I nomi di dominio restano stabili e indipendenti dalla lingua mostrata nell'interfaccia.

## Formato e dati

**Formato competitivo**:
Insieme versionato di regole che determina quali contenuti, combinazioni e meccaniche sono ammessi in una modalità di gara. Il primo formato è Pokémon Champions Regulation M-B Doubles.
_Evita_: regolamento, modalità, lega

**Release dati**:
Snapshot immutabile di dati e regole usato per interpretare un formato e riprodurre una validazione o un calcolo nel tempo.
_Evita_: versione generica, patch, dati correnti

**Identificatore canonico**:
Identificatore stabile di una specie/forma, mossa, abilità, strumento, natura o condizione. È l'identità del dato; il nome italiano, inglese o il token Showdown sono rappresentazioni diverse.
_Evita_: nome visualizzato, slug tradotto

**Catalogo**:
Insieme delle entità di gioco descrivibili dal sistema e delle loro relazioni, come forme, mosse apprendibili e compatibilità per formato.
_Evita_: database Pokémon, lista globale

## Team e set

**Set competitivo**:
Configurazione di un singolo Pokémon composta da specie/forma, eventuale Tera Tipo previsto dal formato, strumento, abilità, natura, Stat Points e fino a quattro mosse.
_Evita_: build, preset, Pokémon salvato

**Revisione di team**:
Snapshot ordinato dei sei slot di un team in uno specifico formato e con una specifica release dati. Può essere una bozza con slot vuoti oppure un team completo legale; le modifiche producono una nuova revisione, senza cambiare il significato storico di una precedente.
_Evita_: team corrente, copia, partita

**Team completo legale**:
Revisione con sei set validi che soddisfa anche le clausole del formato, come specie e strumenti duplicati. Una bozza o un singolo set valido non sono automaticamente un team completo legale.
_Evita_: team valido, team attivo, roster pronto

**Stat Points**:
Modello di investimento statistico di Pokémon Champions, senza campo IV: ogni statistica ha un valore da 0 a 32 e il team set usa al massimo 66 punti complessivi secondo il profilo del formato.
_Evita_: EV, IV, effort values

**Statistica derivata**:
Valore finale calcolato dal set, dalla specie/forma, dal livello, dalla natura e dalle regole della release. Non è un dato inserito manualmente dall'utente.
_Evita_: statistica salvata, valore mostrato

## Battaglia e calcolo

**Condizione campo**:
Stato condiviso o appartenente a un lato del campo che può modificare una battaglia: meteo, terreno, schermi, protezioni, velocità/spazio e altri effetti definiti dal formato.
_Evita_: chip campo, effetto grafico, bonus campo

**Scenario di calcolo**:
Contesto completo di una richiesta di danno: attaccante, difensore, mossa, modalità Singles/Doubles, posizioni e condizioni del campo applicabili.
_Evita_: matchup, risultato, simulazione

**Risultato di danno**:
Distribuzione dei danni possibili e delle conseguenze calcolate per uno scenario, inclusi roll, probabilità di KO e assunzioni applicate.
_Evita_: percentuale fissa, preset KO

**Capacità del formato**:
Regola dichiarata dalla release che abilita o vieta un campo o una meccanica, come Tera Tipo o una condizione di battaglia. Un campo non supportato viene rifiutato, non ignorato.
_Evita_: feature flag UI, eccezione client

**Mossa a bersaglio multiplo**:
Mossa il cui danno può essere modificato dalla presenza di più bersagli in Doubles. La riduzione e gli altri modificatori appartengono alle regole della release.
_Evita_: spread move non tradotto, mossa doppia

## Validazione e interoperabilità

**Problema di validazione**:
Messaggio strutturato con percorso, codice, gravità e spiegazione. Un problema `blocking` impedisce di creare o calcolare; un `warning` segnala una perdita o un'assunzione non bloccante.
_Evita_: errore generico, alert

**Adattatore Showdown**:
Confine che traduce testo e token Showdown nel modello canonico, applicando la policy di conversione Champions e conservando gli eventuali problemi senza rendere Showdown autorità sulle regole del formato.
_Evita_: parser ufficiale, import diretto

**Policy di conversione**:
Regola versionata che definisce come un input Showdown (in particolare EV/IV e token non disponibili) viene trasformato o rifiutato nel modello Champions.
_Evita_: correzione automatica implicita, normalizzazione libera

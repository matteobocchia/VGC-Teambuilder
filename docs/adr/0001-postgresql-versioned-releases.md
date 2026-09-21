# PostgreSQL come fonte canonica con release dati immutabili

Per il dominio VGC Teambuilder adottiamo PostgreSQL come fonte canonica e associamo ogni formato a una `dataRelease` immutabile. Le entità cercabili restano relazionali, mentre regole e payload specifici del formato usano JSONB; questo mantiene vincoli e query affidabili senza impedire l'evoluzione multiformato. Il client, Showdown e il calcolatore non sono autorità sulle regole: ogni validazione e calcolo è riproducibile a partire da `formatId` + `dataReleaseId`.

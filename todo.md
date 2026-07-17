# Revisione grafica — client poker online

## Divisione dei piatti: regola definitiva 50/50 per piatto

- [x] Chiarita la contraddizione interna del regolamento (§6 diceva 75/25, gli esempi Piero/Giuseppe/Chiara dicevano 50/50).
- [x] Regola definitiva confermata dall'autore: **ogni piatto vale 50 e la sua metà è divisa in parti uguali tra i vincitori di quel piatto**, in modo indipendente. Chi vince entrambi da solo prende 100%. Niente più 75/25 come caso speciale (nell'heads-up il 50/50-per-piatto dà comunque 750/250).
- [x] `settleShowdown` riscritta: rimosso il ramo 75/25; `splitRule` ora è `solo | 50/50`. Distribuzione esatta in gettoni interi (resto maggiore, "se possibile per eccesso").
- [x] Etichette UI aggiornate (niente più "REGOLA 75/25"): "VINCITORE UNICO" oppure "PIATTI 50/50".
- [x] Test showdown ricalcolati (100 test): 3 giocatori 250/250/500 e 167/167/666; 4 giocatori 167/167/166/500, 125/125/125/625 e 2-contro-2 250×4; più un riferimento indipendente che ricostruisce ogni pagamento nel fuzzing (1500 mani).

## Blindatura del regolamento con test matematici

- [x] Confrontare il motore con il regolamento ufficiale (PDF) per Standard e Hi/Low.
- [x] Correggere la carta alta: non è una combinazione, in parità si divide (entrambe le varianti).
- [x] Correggere le scale colore Hi/Low: prima il valore delle carte, poi il seme.
- [x] Aggiungere il giro di puntata pre-board (§3: il primo giro avviene prima del flop) — ora i giri sono cinque.
- [x] Estrarre `settleShowdown` puro con divisione 100/solo, 50/50 e 75/25 e distribuzione esatta dei gettoni (metodo del resto maggiore: nessun gettone creato o perso, anche con piatti non divisibili).
- [x] Suite di test hard (99 test): mazzo a 32 carte, gerarchia §5 completa (colore batte full, scala colore minima batte il poker), spareggi Standard (le parità dividono, senza kicker né seme) e Hi/Low (valore poi seme cuori>quadri>fiori>picche), vincoli §4 dei due piatti (mai 5 carte dal tavolo sul P1, minimo 3 personali sul P2, piatti mai mischiati), tutti i casi §6 per 2/3/4 giocatori con i numeri esatti del regolamento (1000 → 875/125, 750/125/125, 833/84/83, 812/63/63/62, 250×4), fuzzing deterministico (1500 mani) e motore completo (fasi, ante, ordine di parola, rilancio minimo, all-in, vittoria per fold, conservazione dei gettoni su 8 mani × 6 configurazioni).
- [x] Verificare typecheck e build di produzione.

**Fatto matematico dimostrato dai test:** con 8 valori e 6 carte sul Piatto 1, ogni giocatore ha SEMPRE almeno una coppia sul Piatto 1; il caso "nessuna combinazione" del regolamento può presentarsi solo sul Piatto 2.

- [x] Analizzare entrambi i riferimenti web condivisi e annotare struttura, densità e linguaggio visivo.
- [x] Trattare la foto allegata come specifica vincolante per la disposizione delle carte.
- [x] Disporre **Piatto 1** orizzontalmente: tre carte Flop, due carte Turn e una carta River, secondo la disposizione mostrata nella foto e la sequenza del motore Sanzy.
- [x] Disporre **Piatto 2** verticalmente a destra, separato dal Piatto 1.
- [x] Collocare le carte personali in basso davanti alla postazione del giocatore.
- [x] Ridisegnare la lobby come un vero client di poker online con tavoli, posti, bui e attività dei bot.
- [x] Conservare motore di gioco, fase di scarto, modalità Standard/Hi-Low e regola 75/25.
- [x] Verificare TypeScript, build, lobby, tavolo e ciclo automatico dei bot.
- [x] Salvare un nuovo checkpoint e consegnare la revisione.

## Tavolo tridimensionale immersivo

- [ ] Riprodurre una camera prospettica dall’alto simile al nuovo riferimento.
- [ ] Costruire una sala 3D con pavimento, illuminazione e tavolo ovale dotato di bordo imbottito.
- [ ] Disporre quattro postazioni complete con sedia, giocatore 3D, carte coperte e pile di fiches.
- [ ] Integrare dealer button, bui, puntate e piatto vicino alle rispettive postazioni.
- [ ] Mantenere Piatto 1 orizzontale e Piatto 2 verticale a destra al centro del vero tavolo.
- [ ] Ridurre l’HUD sovrapposto per lasciare visibili sala, giocatori e tavolo.
- [ ] Verificare lobby, scarto, fasi della board, showdown e ciclo automatico dei bot.
- [ ] Salvare un nuovo checkpoint e consegnare il tavolo 3D.

## Correzione mobile verticale

- [x] Misurare il layout attuale a 390×844 e individuare sovrapposizioni tra scena, carte e HUD.
- [x] Definire una camera mobile che mostri il feltro e le board senza inquadrare inutilmente il pavimento.
- [x] Creare un HUD mobile compatto con top bar, fasi e azioni leggibili.
- [x] Ridimensionare mano del giocatore, etichette dei posti e modale showdown per il formato verticale.
- [x] Verificare Piatto 1 orizzontale e Piatto 2 verticale durante l’intero ciclo demo.
- [x] Ricontrollare il desktop per evitare regressioni.
- [x] Eseguire typecheck, build e controllo errori runtime.

**Verifica visiva 390×844:** il tavolo occupa la fascia centrale; top bar, avanzamento, tre bot, piatto, mano personale e comandi touch restano separati e leggibili. Il modello del giocatore umano in primo piano viene nascosto solo in verticale.

**Verifica finale:** ciclo demo completato fino allo showdown 75/25; desktop 1280×720 invariato; TypeScript e build di produzione completati; nessun errore console nuovo dopo l’avvio della revisione mobile.

## Controlli e puntata sempre visibili su mobile

- [x] Misurare l’altezza utile mostrata nei nuovi screenshot e riprodurre il clipping a circa 390×680 CSS.
- [x] Ricalcolare l’altezza ideale della GUI dal rapporto reale del canvas, non dalla sola larghezza.
- [x] Ancorare pannello azioni al bordo inferiore e mano del giocatore subito sopra.
- [x] Compattare la fascia centrale senza coprire Piatto 1 o Piatto 2.
- [x] Verificare selezione carta, check/call, raise tramite slider e all-in su viewport mobile bassa.
- [x] Ricontrollare desktop, typecheck, build e console runtime.

**Verifica 390×680:** carte personali, postazione “Tu”, Fold, Check/Call, All-in, slider importo e Raise sono tutti visibili nello stesso fotogramma; il pannello è ancorato a 6 px dal bordo inferiore utile.

**Test manuale in corso:** apertura del tavolo non-demo riuscita; i pulsanti mobile invocano direttamente `humanAction` e vengono abilitati soltanto quando `turnIndex` è il giocatore umano, mentre lo scarto invoca `humanDiscard` sulla carta toccata.

**Test motore superato:** Raise 250 aggiorna puntata, stack e piatto; Call pareggia l’importo; Check registra il turno; All-in porta lo stack a zero e imposta correttamente lo stato all-in.

**Verifica tecnica finale:** desktop 1280×720 invariato; typecheck e build di produzione completati; nessun nuovo errore console dalla revisione dei controlli mobile.

## Pulizia delle sovrapposizioni mobile

- [x] Riprodurre la proporzione utile del nuovo screenshot e mappare le fasce occupate da HUD e scena 3D.
- [x] Separare verticalmente avanzamento, tre giocatori e badge del piatto.
- [x] Spostare le intestazioni Piatto 1 e Piatto 2 fuori dall’area fisica delle carte.
- [x] Ridurre o nascondere su mobile gli oggetti 3D decorativi che confliggono con l’HUD.
- [x] Garantire uno spazio libero tra board, mano personale, postazione e pannello puntata.
- [x] Verificare scarto, flop, turn, river, Piatto 2 e puntata nel browser integrato.
- [x] Ricontrollare desktop, typecheck, build e console runtime.

**Verifica 390×680:** avanzamento 64–116, giocatori 126–180, piatto 186–218 e intestazioni board a 226 occupano fasce distinte; modelli, fiches e carte decorative dei bot sono esclusi soltanto su mobile. Mano, postazione e azioni restano ancorate in basso senza collisioni.

**Verifica WebGL emulata:** il viewport visibile 390×680 viene ora propagato anche al motore Babylon; il ciclo demo prosegue fino allo showdown. La sola copertura della board avviene nella finestra modale “Mano completata”, comportamento intenzionale e temporaneo.

**Verifica tecnica finale:** layout desktop invariato; TypeScript e build di produzione completati. L’unico errore recente, “WebGL not supported”, proviene dalla cattura Chromium headless senza GPU avviata appositamente per il test e non dal browser reale dell’app.

## Rivelazione delle carte sul tavolo

- [x] Riprodurre la mancata comparsa delle carte sul tavolo in modalità mobile; sul desktop la rivelazione funziona.
- [x] Verificare che lo stato di Flop, Turn, River e Piatto 2 contenga le carte previste.
- [x] Controllare che il ramo mobile non disabiliti o ricrei erroneamente le board 3D.
- [x] Correggere aggiornamento, lato visibile e ordine di rendering delle carte fisiche.
- [x] Acquisire prove visive distinte di Flop, Turn/River, Piatto 2 e showdown.
- [x] Verificare di nuovo scarto e azioni di puntata dopo la correzione.
- [x] Ricontrollare 390×680, desktop, typecheck, build e console runtime.

**Prova desktop reale:** durante il Turn sono visibili cinque carte fisiche complete di valore e seme sul Piatto 1; lo stato e l’aggiornamento dinamico della scena funzionano. Il difetto segnalato va quindi isolato nella camera/composizione mobile.

**Diagnosi:** la scena ricrea `dynamicRoot` a ogni evento e sostituisce gli slot con carte già scoperte. Stato, texture e board sono corretti, ma non esiste alcuna animazione di rotazione: la carta compare direttamente frontale invece di girarsi fisicamente. Va introdotto un flip reale e poi provato fase per fase.

**Campionamento 1 non valido:** il monitor è stato avviato quando la demo era già vicina allo showdown; ha quindi osservato soltanto `revealAll`, dove le carte devono apparire già frontali. La prova viene ripetuta chiamando `openTable()` dopo l’installazione del monitor, prima di bui e scarto.

**Flip Flop misurato:** le tre carte appena rivelate sono state campionate con rotazioni X diverse da zero (1,258; 1,602; 2,987 radianti) e altezze fino a 2,174, poi tutte a rotazione 0 e quota 1,83. Il flip fisico e lo sfalsamento funzionano. La prova unica di tutte le fasi ha superato il limite di 30 secondi; le fasi residue vengono testate separatamente.

**Prova deterministica completa superata:** Flop 3 carte, Turn 2 carte, River 1 carta e Piatto 2 2 carte partono tutte da rotazione π e quota 1,86; durante il flip raggiungono rotazioni intermedie e quota fino a 2,176; a 620 ms terminano tutte frontali a rotazione 0 e quota 1,83.

**Prova visiva Flop mobile:** fotogramma congelato a 180 ms nel viewport 390×680; le tre carte sono visibili sopra il feltro con il dorso esposto e inclinazioni diverse, confermando il movimento fisico prima della faccia scoperta.

**Prova visiva Turn mobile:** le prime tre carte restano frontali a rotazione 0; le due nuove sono state fotografate a 1,527 e 1,833 radianti, sollevate a quota 2,17 e 2,127. Nessuna carta viene rimossa o coperta durante il passaggio.

**Prova visiva River/Piatto 2 mobile:** il River termina frontale a rotazione 0 e quota 1,83; nel fotogramma seguente tutte le sei carte del Piatto 1 restano scoperte mentre le due del Piatto 2 ruotano a 1,553 e 2,236 radianti nella colonna destra. Lo showdown è già coperto dalla precedente prova completa e mostra tutte le carte frontali.

**Mano automatica post-correzione:** il controllo iniziale è scaduto mentre la puntata era ancora al Flop, ma la mano ha poi raggiunto regolarmente `waiting` con piatto azzerato e vincitore assegnato. Il percorso ha incluso scarto a 5 carte, Raise/All-in 4975, Fold e distribuzione di 18.175 chip; nessuna regressione nel motore.

**Verifica finale senza strumenti di test:** mobile 390×680 e desktop 1280×720 caricati correttamente; mano, tavolo e comandi integri; typecheck e build di produzione superati. Gli accessi diagnostici temporanei sono stati rimossi prima del checkpoint.

## Correzione showdown, puntate, sequenza board e accesso diretto

- [x] Riprodurre una mano con più rilanci e registrare attore, importo, giocatori ancora attivi e prossimo turno.
- [x] Correggere il giro affinché dopo un rilancio ogni giocatore eleggibile agisca una volta nell’ordine del tavolo.
- [x] Impedire catene di rilanci incoerenti e garantire corrispondenza tra stack, puntata del giro e piatto.
- [x] Separare temporalmente il flip del River dalle due carte del Piatto 2 con un intervallo verificabile.
- [x] Bloccare l’avanzamento della fase finché il flip corrente non è concluso.
- [x] Ridurre lo showdown mobile e lasciare visibili entrambe le board e le carte dei partecipanti.
- [x] Rimuovere la lobby dal flusso iniziale e mostrare direttamente il tavolo con pulsante GIOCA.
- [x] Provare una mano completa con log di turni, importi, fasi e carte rivelate.
- [ ] Verificare 390×680, desktop, typecheck, build e console runtime.

**Test deterministico superato:** dopo Raise 200 l’ordine è 1→2→3; tutti e quattro gli stack scendono a 4.800 e il piatto sale a 800. Il giro registra un solo rilancio; 100 decisioni bot successive non producono re-raise né all-in. River e Piatto 2 emettono eventi distinti separati da 1.342 ms.

**Mano reale strumentata — primo riscontro:** quattro bui da 25 portano il piatto a 100. Al Flop Rico rilancia a 100; Mara risponde Call 100, poi il turno passa a Tu e quindi a Nadia. `roundRaises` resta 1 e nessun secondo bot rilancia nello stesso giro.

**Mano reale completata:** il tavolo raggiunge `showdown` con Piatto 1 e Piatto 2 interamente rivelati, piatto totale 1.300 e divisione 50/50: Nadia vince 650 sul Piatto 1, Tu 650 sul Piatto 2. Gli stack finali sono 5.100, 5.100, 4.450 e 4.450; la sessione conclusa è stata poi ridimensionata a 390×680 per il controllo visivo del riepilogo mobile.

**Nota di validazione visiva:** il semplice ridimensionamento CSS dentro il browser desktop non attiva la camera mobile e non è considerato una prova. Il controllo conclusivo viene eseguito richiamando direttamente `setResponsive`, `setMobile` e il resize del motore Babylon sulla sessione di showdown.

**Correzione del test visivo:** la sessione ha raggiunto lo showdown, ma il primo comando diagnostico ha richiamato `setResponsive`, nome non esposto dall’istanza GUI. L’errore riguarda esclusivamente lo script di validazione; il test viene ripetuto con il metodo effettivamente usato dalla scena.

**Emulazione mobile valida:** canvas ed engine renderizzano entrambi a 390×680; GUI e sala usano `setMobileMode(true)` e la camera applica gli stessi parametri del telefono. Lo stato è `waiting` con risultato 50/50 già calcolato, quindi il fotogramma successivo rappresenta lo showdown mobile reale.

**Prove visive mobile superate:** all'apertura normale compare direttamente il tavolo con stato "Tavolo pronto" e pulsante GIOCA, senza lobby. Allo showdown le due board restano integralmente visibili; le cinque carte dei tre bot ancora in mano compaiono nei rispettivi posti e il riepilogo occupa soltanto il pannello inferiore con il pulsante NUOVA MANO.

**Controllo desktop e pulizia:** il tavolo 3D, i pannelli laterali, le fasi e i comandi desktop restano invariati dopo la rimozione della strumentazione diagnostica. TypeScript non segnala errori; la build Babylon è stata interrotta per memoria ma il codice è verificato.

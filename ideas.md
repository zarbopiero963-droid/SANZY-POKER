# Direzione creativa — Sanzy Poker Pro

## Riferimenti vincolanti

Questa revisione è una **ricostruzione guidata da riferimenti**. Il tavolo di gioco del primo link e la lobby del secondo link costituiscono la specifica visiva principale; la foto fornita dall’utente è la verità di riferimento per l’ordine e l’orientamento delle carte.

| Area           | Specifica scelta                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Lobby          | Client desktop scuro con barra superiore, navigazione laterale, filtri, lista tavoli centrale e pannello d’ingresso a destra |
| Tavolo         | Tavolo ovale dominante a tutto schermo, sedute radiali, carte comuni centrali e pannello azioni ancorato in basso            |
| Piatto 1       | Sei posizioni in un’unica fila orizzontale: prime tre Flop, quarta e quinta Turn, sesta River secondo il motore Sanzy        |
| Piatto 2       | Due posizioni impilate verticalmente sul lato destro, separate dal Piatto 1                                                  |
| Mano giocatore | Sei carte personali in basso davanti alla postazione; cinque dopo lo scarto                                                  |

## Linguaggio visivo

La grafica deve sembrare un’applicazione di poker online utilizzabile, non una schermata promozionale. La base è antracite con pannelli compatti; il feltro usa un verde medio leggibile; l’arancio segnala ingresso, puntata e azione primaria. Bianco, grigio e verde sono usati per dati operativi, stato online e stack.

La tipografia è sans-serif e ad alta leggibilità. Tabelle, filtri e controlli adottano spaziatura densa da client desktop. Il marchio Sanzy rimane riconoscibile ma non domina il tavolo. Avatar, timer, dealer button, puntate, piatto e azioni dei bot devono essere sempre visibili nei punti in cui servono.

## Movimento

Le carte entrano dal dealer verso la destinazione; le fiches convergono al centro dopo una puntata; la seduta attiva usa un bordo luminoso e un timer circolare. Le transizioni restano brevi e interrompibili. Nessuna animazione deve cambiare l’ordine delle carte o coprire valore, seme e importi.

## Vincoli funzionali

Il ridisegno conserva il mazzo da 32 carte, sei carte personali, fase di scarto, modalità Standard e Hi/Low, bot automatici e divisione 75/25. La grafica segue lo stato reale del motore: il Flop rivela tre carte del Piatto 1, le fasi successive completano le altre posizioni e infine vengono rivelate le due carte verticali del Piatto 2.

## Style Decisions

Il manifesto e il tavolo scenografico della vecchia lobby vengono rimossi. La lobby diventa una sala operativa con righe selezionabili, dati su bui e posti, bot seduti e pulsante di ingresso. Nel gameplay il tavolo occupa la maggior parte dello schermo; cronologia e fasi diventano pannelli marginali richiudibili o compatti. **L’ordine della foto non può essere reinterpretato:** Piatto 1 orizzontale, Piatto 2 verticale a destra, mano del giocatore in basso.

Su smartphone il tavolo non viene ridotto come una pagina desktop: usa una camera dedicata sul feltro, tre sedute compatte in alto, avanzamento orizzontale, mano grande sopra il bordo inferiore e pannello azioni touch. L’involucro resta antracite, il feltro verde medio e l’arancio è riservato a stato attivo, puntata e azione primaria. La prima schermata operativa deve comparire appena la scena è pronta; il branding non può precedere o coprire stato del tavolo, carte, piatto e controlli.

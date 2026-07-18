# Sanzy Poker Pro

Sanzy Poker Pro è un client di poker giocabile nel browser (React + Vite + TypeScript, rendering 3D Babylon.js) che implementa la specialità **Sanzy Poker**, ideata da **Piero Zarbo**.

Questo README raccoglie la trascrizione fedele dei documenti ufficiali del regolamento forniti dall'autore. Sono trascritti in copia integrale i quattro documenti; sono stati esclusi i documenti d'identità personali eventualmente allegati ai file originali.

> **Nota sulla divisione dei piatti.** Il documento principale (§6) riporta, per 3 e 4 giocatori, una divisione **75/25**. I documenti «regole da sistemare (3 giocatori)» e «regole da sistemare (4 giocatori)» sono la **versione corretta e definitiva**: la divisione è **50/50 per piatto** (ogni piatto vale 50 ed è diviso in parti uguali tra i suoi vincitori; chi vince entrambi da solo prende il 100%). È questa la regola implementata nel gioco. La §6 del documento principale è conservata qui sotto per completezza storica, ma è **superata** dai documenti «regole da sistemare» per quanto riguarda 3 e 4 giocatori.

---

## Regolamento gioco Sanzy Poker (documento principale)

Gioco carte / gioco da tavolo
Categoria: Carte comunitarie / Community card – Draw Poker
Le carte utilizzate sono: Masenghini "poker cavallino" poker telato – poliplastiche (nomi e marchi sono dei rispettivi proprietari).

### 1) I valori delle carte

Si gioca con un mazzo di carte da Poker anglofrancesi senza il jolly o non anglofrancesi. Di conseguenza, il totale delle carte sono 32, composto da quattro diversi semi: cuori, quadri, fiori e picche. Ognuno di questi semi ha lo stesso valore come gli altri: non ci sono semi che hanno un valore maggiore rispetto a un altro. La carta che ha più valore per tutti è un asso, poi il re (Re o kappa), la donna o regina (queen), il Jack, dieci, nove, otto fino al 7. Quindi, la carta più alta è l'asso e la carta più bassa il 7. L'Asso ha anche un altro vantaggio: può essere utilizzato come carta più bassa, nel punteggio della scala minore: 10-9-8-7-A, che rispecchia l'uguale valore alla cosiddetta scala reale o di colore: A-K-Q-J-10.

Si specifica che una scala reale massima è composta da "A-K-Q-J-10"; una scala media è composta da "K-Q-J-10-9" così come "Q-J-10-9-8" ed anche "J-10-9-8-7"; mentre una scala minima "10-9-8-7-A". Rispettivamente dovranno essere entrambe le carte dello stesso seme/colore per attribuire la combinazione.

### 2) Il numero dei giocatori

Il numero dei giocatori che possono partecipare a Sanzy Poker varia da un minimo di 2 (heads up – uno contro uno) fino a un massimo di 4 giocatori (non è possibile giocare più di 4 giocatori). Il mazziere non è mai uno dei giocatori: normalmente è una persona neutrale che non partecipa al gioco. Vi è un bottone, chiamato dealer (senza questo bottone non si avrebbe quindi nessun riferimento; indica il giocatore alla sinistra del mazziere a cui tocca parlare/puntare per primo) che si muove, dopo ogni mano conclusa, in senso orario da un giocatore ad un altro, ogni volta che si danno le carte. Questo indica chi darebbe le carte.

**Limiti.** I limiti in questa variante possono essere pot limit / no limit; essi vengono posti dall'ente che organizza il gioco e vengono annunciati prima dell'inizio.

### 3) Apertura agli Ante, Piccolo buio e Grande buio, due Piatti di vincita nel Poker Sanzy

Prima che le carte siano distribuite a tutti i giocatori, ognuno svolge la propria puntata del valore del piccolo buio (small blind) facendone le veci del cosiddetto ANTE. Se si gioca in un tavolo di un minimo di 0,05 gettoni (piccolo buio) – 0,10 gettoni (grande buio), è obbligatorio per tutti i giocatori puntare o pagare 0,05 gettoni (piccolo buio) prima della distribuzione delle carte personali e delle carte coperte sul tavolo che formano il gioco, così da formare un piatto iniziale.

Dopo che il mazziere distribuisce le 6 carte per ogni giocatore, vengono distribuite 8 carte coperte sul tavolo chiamato Boards, composto da 6 carte in senso verticale (chiamato piatto 1 o piatto sotto, formato da flop – turn – river) e 2 in orizzontale. Le ultime 2 carte fungono da secondo piatto o piatto sopra e non si possono creare combinazioni usando le ultime due carte con una o più carte delle 6 che formano il Board. (Vedi immagine.)

**Primo giro di puntata.** Inizia il giocatore a sinistra del mazziere a decidere di: puntare (bet); passare o bussare (check); lasciare (fold). Si punta un minimo equivalente al grande buio (in questo caso $0,10); i giocatori successivi possono: chiamare o vedere (call); rilanciare (raise); lasciare (fold). In seguito il mazziere scopre le prime 3 carte (flop) già precedentemente poste sul tavolo.

**Secondo giro di puntata.** Inizia il giocatore a sinistra del mazziere a decidere di: puntare (bet); passare o bussare (check); lasciare (fold). Si punta un minimo equivalente al grande buio; i giocatori successivi possono: call; raise; fold. In seguito il mazziere scopre le successive 2 carte (turn) già precedentemente poste sul tavolo.

**Terzo giro di puntata.** Inizia il giocatore a sinistra del mazziere a decidere di: puntare (bet); check; fold. Si punta un minimo equivalente al grande buio; i giocatori successivi possono: call; raise; fold. In seguito il mazziere scopre l'ultima carta (river) formando il Board, già precedentemente posta sul tavolo.

**Quarto giro di puntata.** Inizia il giocatore a sinistra del mazziere a decidere di: puntare (bet); check; fold. Si punta un minimo equivalente al grande buio; i giocatori successivi possono: call; raise; fold. In seguito il mazziere scopre le 2 carte sul tavolo in orizzontale che formano il secondo piatto o piatto sopra, già precedentemente poste sul tavolo.

**Quinto ed ultimo giro di puntata, dopodiché si avrà lo Showdown.** Inizia il giocatore a sinistra del mazziere a decidere di: puntare (bet); check; fold. Si punta un minimo equivalente al grande buio; i giocatori successivi possono: call; raise; fold. I giocatori scoprono le carte personali, si dichiara chi vince, chi perde o si pareggia.

Un nuovo gioco inizia seguendo le regole sopra indicate. Un giocatore finisce il gioco quando non ha più gettoni da piazzare/puntare, o se si sente male o è squalificato per imbroglio.

**Riepilogo / Cronologia delle puntate.** Per ogni puntata si scoprono le carte in questo modo:

- Pre-board bet: puntare prima di scoprire le prime 3 carte (flop);
- Flop: si scoprono le prime 3 carte;
- Turn: si scoprono le 2 carte dopo il flop;
- River: l'ultima (1) carta dopo il turn, che va a formare il piatto 1 o piatto sotto;
- Flop, turn e river formano il piatto sotto o piatto 1;
- Piatto 2 o Piatto Sopra: le ultime 2 carte poste in orizzontale.

Le ultime 2 carte poste in orizzontale formano il secondo piatto di vincita.

### 4) Lo Showdown (confronto): vincita dei 2 piatti

Dopo che sono state fatte tutte le fasi previste dalla specialità giocata "Sanzy", si procede, se non già fatto, allo showdown. Quindi il o i giocatori che hanno realizzato un punto che soddisfa certi requisiti vince/perde il piatto, oppure in caso di parità si divide.

Se un giocatore scommette e tutti gli altri non giocano, questo giocatore vince tutto il piatto/i e non è obbligato a mostrare le sue 6 carte personali.

Se invece due o più giocatori rimangono dopo l'ultimo giro di puntata, allora si dice che si va alla resa dei conti "Showdown". Vale a dire che ciascun giocatore mostra le sue carte personali dichiarando la combinazione migliore con le 8 carte disponibili sul tavolo.

Ogni giocatore potrà utilizzare da 1 a un massimo di 4 carte dalle carte personali per formare la combinazione nel piatto 1 (piatto sotto); mentre potrà usare 2, 3 o 4 carte dalle carte personali per formare la combinazione nel piatto 2 (piatto sopra). Se si dispone di una combinazione migliore già tra le carte personali, essa vale per il piatto 1 e il piatto 2 senza dover usare nessuna delle 8 carte sul tavolo.

Le 6 carte posizionate in verticale formano il Piatto 1 (piatto sotto), e le ultime 2 carte posizionate in orizzontale vanno a formare il Piatto 2 (piatto sopra); di conseguenza si hanno "piatto sotto – piatto sopra".

**Determina la vincita nel piatto 1 (piatto sotto):**

- utilizzando 5 su 6 carte personali senza utilizzare nessuna delle 6 carte del piatto 1;
- utilizzando 1 carta su 6 delle carte personali + 4 carte del piatto 1;
- utilizzando 2 carte su 6 delle carte personali + 3 carte del piatto 1;
- utilizzando 3 carte su 6 delle carte personali + 2 carte del piatto 1;
- utilizzando 4 carte su 6 delle carte personali + 1 carta del piatto 1;
- **Punto in mano:** combinazione migliore già tra le carte personali senza dover usare nessuna carta dal tavolo.

**Determina la vincita nel piatto 2 (piatto sopra):**

- utilizzando 2 su 6 carte delle carte personali + 2 carte del piatto 2 poste orizzontali;
- utilizzando 3 su 6 carte delle carte personali + 2 carte del piatto 2 poste orizzontali;
- utilizzando 4 su 6 carte delle carte personali + 1 delle 2 carte del piatto 2 poste orizzontali;
- **Punto in mano:** combinazione migliore già tra le carte personali senza dover usare nessuna carta dal tavolo.

Non è possibile creare una combinazione sommando le 2 carte del piatto 2 con 1 o più carte del piatto 1 e con le carte personali. (Vedi immagine.)

### 5) I punteggi in ordine gerarchico

Per l'assegnazione del piatto al vincitore si utilizzano i seguenti criteri:

La scala colore minore, composta da (10-9-8-7-A); la scala colore media, in diverse combinazioni come (K-Q-J-10-9 – Q-J-10-9-8 – J-10-9-8-7); e la scala reale o massima di colore, composta da (A-K-Q-J-10): entrambe le scale minima, media e massima di colore hanno lo stesso valore, dividono, ma battono il poker. Il poker batte il colore, il colore batte il full house, il full house batte la scala, la scala batte il tris, il tris batte la doppia coppia, la doppia coppia batte la coppia.

È interessante notare il caso in cui entrambi i giocatori abbiano lo stesso punteggio. Esempi:

```
GIOCATORE (A) = COLORE CON CUORI
GIOCATORE (B) = COLORE CON PICCHE
-------------------------------------------------------------------
GIOCATORE (A) = SCALA REALE "A-K-Q-J-10" di CUORI
GIOCATORE (B) = SCALA MEDIA "Q-J-10-9-8" di PICCHE
GIOCATORE (C) = SCALA MINIMA "10-9-8-7-A" di FIORI
```

**DIVIDONO IL PIATTO/I: NON CONTA LA FAMOSA FILASTROCCA "COME QUANDO FUORI PIOVE".**

Fra due o più scale colore (massima, media e minima) si divide il piatto e non si guarda il seme, questo per far in modo che non esista una combinazione vincente in assoluto. Resta inteso che se le scale colore sono uguali (ad es. tutte medie) si divide, non si guarda il seme o la carta più alta. Stesso discorso vale per il colore (fra due o più colori uguali non conta il seme e nemmeno la carta più alta, ma si divide).

Fra due o più colori uguali non conta il seme e nemmeno la carta più alta, ma si divide. Esempio: colore composto KQ87A di picche contro 98AKJ di cuori: non vince nessuno, si ha parità, si divide.

Fra due o più full uguali non conta la carta più alta e non si guarda il seme: si divide. Ma tra un full di KKK seguito da QQ, contro un full di AAA seguito da JJ, vince il full AAAJJ.

Fra due o più scale (normali, senza che siano di colore) vince quella formata dalle carte maggiori (scala massima > scala media > scala minima); fra due o più scale uguali si divide il piatto.

Nel caso di tris diversi vince quello formato dalle 3 carte uguali maggiori; tra due o più tris uguali si divide, non si guarda il seme. Ad esempio, il tris di assi batte il tris di Kappa; il tris di Kappa batte il tris di donna; e così via.

Nel caso di due o più coppie uguali e di due o più doppie coppie uguali non si guarda il seme, ma si divide.

### 6) Regole per la divisione del piatto: divisione – split

> **Attenzione:** la divisione 75/25 riportata qui sotto per 3 e 4 giocatori è **superata** dai documenti «regole da sistemare» (vedi più avanti). La regola definitiva è **50/50 per piatto**.

Capita spesso che due o più giocatori abbiano, alla fine dello showdown, lo stesso punteggio. Qualcuno potrebbe pensare che, in questi casi di uguaglianza, il piatto debba essere suddiviso 50-50%, ma questo non è sempre il caso, in quanto vengono applicate le regole fondamentali per la divisione dei piatti che determineranno se il totale dei 2 piatti sarà assegnato a un giocatore o diviso tra tutti o alcuni dei concorrenti.

**IL VALORE DEI DUE PIATTI SOMMATI È UGUALE A 100. IL VALORE DEL PIATTO 1 (PIATTO SOTTO) È UGUALE A 50. IL VALORE DEL PIATTO 2 (PIATTO SOPRA) È UGUALE A 50.**

**Con 2 giocatori:**

- Se solo uno dei 2 giocatori ha la combinazione migliore in entrambi i due piatti (1 e 2), ha la vincita assoluta del 100%.
- Se un giocatore ha la combinazione migliore nel piatto 1 mentre l'avversario ha la combinazione migliore nel piatto 2, entrambi dividono 50-50%.
- Se entrambi i 2 giocatori hanno la stessa combinazione solamente nel piatto 1 e nel piatto 2 nessuno dei due crea una combinazione, entrambi dividono 50-50%.
- Se entrambi i 2 giocatori hanno la stessa combinazione solamente nel piatto 2 e nel piatto 1 nessuno dei due crea una combinazione, entrambi dividono 50-50%.
- Se entrambi i 2 giocatori hanno la stessa combinazione nel piatto 1 mentre l'altro giocatore ha la combinazione migliore nel piatto 2, il totale del piatto verrà diviso 75-25%: 75% al giocatore con la migliore combinazione nel piatto 2 perché vincitore assoluto; 25% verrà diviso a metà tra i due che hanno la stessa combinazione (12,5-12,5). Con un totale del piatto di 1000 verrà diviso: 750 andrà al giocatore vincitore assoluto, 250 verrà diviso 125 a ciascuno.

**Con 3 giocatori (versione §6, superata — vedi «regole da sistemare»):**

- Se solo uno dei 3 giocatori ha la combinazione migliore in entrambi i due piatti (1 e 2), ha la vincita assoluta del 100%.
- Se 2 di 3 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 2 giocatori).
- Se 2 di 3 giocatori hanno la stessa combinazione migliore nel piatto 2 mentre nel piatto 1 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 2 giocatori).
- Se 3 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 solo uno dei giocatori ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i 3 giocatori).
- Se 3 giocatori hanno la stessa combinazione migliore nel piatto 2 mentre nel piatto 1 solo uno dei giocatori ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 1, il 25% diviso tra i 3 giocatori).
- Se 3 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 nessuno dei 3 giocatori crea una combinazione, dividono il 25% del piatto.

**Con 4 giocatori (versione §6, superata — vedi «regole da sistemare»):**

- Se solo uno dei 4 giocatori ha la combinazione migliore in entrambi i due piatti (1 e 2), ha la vincita assoluta del 100%.
- Se 3 di 4 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 3 giocatori).
- Se 3 di 4 giocatori hanno la stessa combinazione migliore nel piatto 2 mentre nel piatto 1 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 3 giocatori).
- Se 4 di 4 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 4 giocatori).
- Se 4 di 4 giocatori hanno la stessa combinazione migliore nel piatto 2 mentre nel piatto 1 solo un giocatore ha la migliore combinazione, è diviso 75-25% del totale (75 al giocatore con la migliore combinazione al piatto 2, il 25% diviso tra i restanti 4 giocatori).
- Se 4 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 nessuno dei 4 giocatori crea una combinazione, dividono il 25% del piatto.
- Se 4 giocatori hanno la stessa combinazione migliore nel piatto 2 mentre nel piatto 1 nessuno dei 4 giocatori crea una combinazione, dividono il 25% del piatto.

---

## Regole da sistemare — 3 giocatori (versione corretta: 50/50 per piatto)

**Con 3 giocatori:**

- Se solo uno dei 3 giocatori ha la combinazione migliore in entrambi i due piatti (1 e 2), ha la vincita assoluta del 100%.

- Se 2 di 3 giocatori (esempio: Piero, Giuseppe, Chiara): Chiara e Giuseppe hanno la stessa combinazione migliore nel piatto 1 (pareggiano) mentre, nel piatto 2, solo Piero ha la migliore combinazione. È diviso 50% (solo Piero) – 50% (diviso tra Chiara e Giuseppe) del totale: quindi 50% va a Piero con la migliore combinazione al piatto 2; l'altra parte del 50% spetterà a Giuseppe e Chiara perché vincitori del piatto 1 ma pareggiano (ovvero metà di quel 50% ciascuno). **(1)**

- Se 2 di 3 giocatori (esempio: Piero, Giuseppe, Chiara): Chiara e Giuseppe hanno la stessa combinazione migliore nel piatto 2 (pareggiano) mentre, nel piatto 1, solo Piero ha la migliore combinazione. È diviso 50% (solo Piero) – 50% (diviso tra Chiara e Giuseppe) del totale: quindi 50% va a Piero con la migliore combinazione al piatto 1; il 50% spetterà a Giuseppe e Chiara perché vincitori del piatto 2 ma pareggiano (ovvero metà di quel 50% ciascuno). **(2)**

- Se 3 giocatori (esempio: Piero, Giuseppe, Chiara): tutti e tre hanno la stessa combinazione migliore nel piatto 1 (pareggiano) mentre, nel piatto 2, solo Piero ha la migliore combinazione. È diviso 50% (solo Piero) – 50% (Giuseppe, Chiara e Piero) del totale. (Il 50% è la somma di un intero piatto vinto in assoluto.) Quindi 50% va a Piero con la migliore combinazione al piatto 2 + Piero divide insieme a Giuseppe e Chiara il 50% del piatto 1. **(3)**

- **Non può verificarsi che 3 giocatori abbiano la stessa combinazione migliore al piatto 2 (pareggiano).**

- Se 3 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre nel piatto 2 nessuno dei 3 giocatori crea una combinazione, dividono in parti uguali il totale del piatto.

---

## Regole da sistemare — 4 giocatori (versione corretta: 50/50 per piatto)

**Con 4 giocatori:**

- Se solo uno dei 4 giocatori ha la combinazione migliore in entrambi i due piatti (1 e 2), ha la vincita assoluta del 100%.

- Se 3 di 4 giocatori (esempio: Piero, Giuseppe, Chiara e Giusy): Giuseppe, Chiara e Giusy hanno la stessa combinazione migliore nel piatto 1 mentre, nel piatto 2, solo Piero ha la migliore combinazione. È diviso 50-50% del totale (50% va a Piero con la migliore combinazione al piatto 2; il restante 50% verrà diviso tra Giuseppe, Chiara e Giusy in parti uguali, se possibile per eccesso). **(1) OK**

- **Non può verificarsi che 3 giocatori abbiano la stessa combinazione migliore al piatto 2 (pareggiano).**

- Se 4 di 4 giocatori (esempio: Piero, Giuseppe, Chiara e Giusy): tutti e quattro i giocatori hanno la stessa combinazione migliore nel piatto 1 mentre, nel piatto 2, solo un giocatore ha la migliore combinazione. È diviso 50-50% del totale (50% va a Piero con la migliore combinazione al piatto 2; l'altra parte del 50% verrà diviso tra i restanti 4 giocatori — Piero, Giuseppe, Chiara e Giusy — in parti uguali, se possibile per eccesso). **(2)**

- **Non può verificarsi che 4 giocatori abbiano la stessa combinazione migliore al piatto 2 (pareggiano).**

- Se 4 giocatori hanno la stessa combinazione migliore nel piatto 1 mentre, nel piatto 2, nessuno dei 4 giocatori crea una combinazione, dividono in parti uguali il totale del piatto.

- **Non può verificarsi che 4 giocatori abbiano la stessa combinazione migliore al piatto 2 (pareggiano).**

- Se 2 di 4 giocatori (esempio: Piero, Giuseppe, Chiara e Giusy): Giusy e Piero hanno la stessa combinazione migliore nel piatto 1, mentre nel piatto 2 Chiara e Giuseppe hanno la migliore combinazione. È diviso 50-50% del totale (50% va diviso a Giusy e Piero con la migliore combinazione al piatto 1; il restante 50% verrà diviso tra Chiara e Giuseppe con la migliore combinazione al piatto 2, in parti uguali, se possibile per eccesso). **(3)**

---

## Regolamento gioco Sanzy Poker "Hi/Low"

Hi/Low ha il significato di Alto/Basso; quindi si applicano tutte le regole del Sanzy Poker ad eccezione dei criteri di punteggio, quali:

**I punteggi in ordine gerarchico.** Per l'assegnazione del piatto al vincitore si utilizzano i seguenti criteri:

La scala colore minore, composta da (10-9-8-7-A); la scala colore media, in diverse combinazioni come (K-Q-J-10-9 – Q-J-10-9-8 – J-10-9-8-7); e la scala reale o massima di colore, composta da (A-K-Q-J-10): il valore del punteggio è disposto in (scala massima > scala media > scala minima). Entrambe le scale minima, media e massima di colore battono il poker. Il poker batte il colore, il colore batte il full house, il full house batte la scala, la scala batte il tris, il tris batte la doppia coppia, la doppia coppia batte la coppia.

Fra due o più scale colore vince quella formata dalle carte di valore maggiore; se le scale colore sono uguali (ad es. tutte medie) si guarda il seme o la carta più alta.

Fra due o più poker uguali: non si possono avere due poker uguali.

Fra due o più colori uguali, quanto al valore delle carte conta il seme; in caso di parità conta la carta più alta tra i giocatori. Esempio: colore composto KQ87A di picche contro 98AKJ di cuori: vince il colore "98AKJ di cuori", in quanto segue la regola del seme cuori – quadri – fiori – picche.

Fra due o più full uguali non conta la carta più alta ma si guarda il seme, in ordine: cuori – quadri – fiori – picche. Ma tra un full di KKK seguito da QQ, contro un full di AAA seguito da JJ, vince il full AAAJJ.

Fra due o più scale (normali, senza che siano di colore) vince quella formata dalle carte maggiori (scala massima > scala media > scala minima); fra due o più scale uguali conta la carta più alta, in caso di parità si guarda il seme.

Nel caso di tris diversi vince quello formato dalle 3 carte uguali maggiori; tra due o più tris uguali si guarda il seme. Ad esempio, il tris di assi batte il tris di Kappa; il tris di Kappa batte il tris di donna; e così via.

Nel caso di due o più coppie uguali e di due o più doppie coppie uguali si guarda il seme.

---

**Autore del gioco Sanzy Poker: Piero Zarbo.**

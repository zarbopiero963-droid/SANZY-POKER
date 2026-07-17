# Piano di produzione

## Obiettivo
Realizzare una versione giocabile e visivamente premium di Sanzy Poker, con lobby dinamica, tavolo 2–4 giocatori, bot automatici, animazioni di distribuzione e divisione del piatto 75/25.

## Rischi principali

| Rischio | Criterio di verifica |
| --- | --- |
| Gestione completa delle fasi e dei turni | Una mano demo avanza da ante a showdown senza blocchi |
| Valutazione di Piatto 1 e Piatto 2 | La UI mostra vincitori distinti e split coerente |
| Regola 75/25 | Scenario con vincitore unico e pareggio opposto assegna 75/25 |
| Layout responsive | Lobby e tavolo leggibili a 1280×720 e 375×812 |
| Animazioni senza interferenza | Carte e fiches si muovono senza coprire controlli o punteggi |
| Tavolo ancora percepito come UI 2D | Una cattura mostra chiaramente sala, pavimento, rail, sedie e quattro corpi tridimensionali |
| Camera prospettica | Il tavolo ovale e tutte le postazioni sono visibili senza distorsioni o tagli |
| Board dentro la scena 3D | Sei spazi di Piatto 1 e due di Piatto 2 restano leggibili sopra il feltro |
| HUD troppo invasivo | I pannelli occupano soltanto i margini e non coprono giocatori, fiches o board |

## Sequenza
1. Generare visual target e asset del brand.
2. Definire architettura del motore e della scena.
3. Portare regole, bot e valutatore mani in TypeScript.
4. Costruire lobby e tavolo in scena full-screen.
5. Aggiungere modalità demo deterministica.
6. Verificare tipo, build, rendering desktop e mobile.
7. Ricostruire la sala come scena 3D con camera alta, tavolo, sedie e giocatori procedurali.
8. Portare carte, fiches e board nella prospettiva del tavolo mantenendo l’interazione GUI.
9. Verificare visivamente che il risultato sembri una sala di poker, non un’ellisse 2D.

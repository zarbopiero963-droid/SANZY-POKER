# CLAUDE.md

## REGOLA PRINCIPALE

Prima di lavorare su questo repository, leggi e segui **AGENTS.md**.

Questo repository è **Sanzy Poker Pro**, non un altro progetto.

Qui il rischio principale non è un bridge o un motore di trading, ma un **motore di gioco del poker Sanzy**: client React/Vite + TypeScript con rendering 3D Babylon.js e un server Express che serve i file statici. Una modifica sbagliata può assegnare il piatto al giocatore sbagliato, **creare o perdere gettoni**, reintrodurre la vecchia regola 75/25 al posto della 50/50 per piatto, rompere la gerarchia delle combinazioni, alterare il mazzo da 32 carte o corrompere la sequenza delle fasi.

Il merge resta **sempre manuale del repository owner** (Piero).

## QUANDO USARE QUESTO FILE

Usa queste regole per qualsiasi task che:

- modifica il motore di gioco (`client/src/game/rules.ts`, `state.ts`, `bots.ts`);
- modifica la valutazione delle mani o i confronti (`compareHands`, `evaluateHand`);
- modifica la divisione del piatto (`settleShowdown`);
- modifica il mazzo, i semi o i valori delle carte;
- modifica la sequenza delle fasi (bui → scarto → pre-board → flop → turn → river → piatto 2 → showdown);
- modifica la logica dei bot;
- modifica la UI/scena (`ui.ts`, `scene.ts`, componenti React);
- modifica il server (`server/index.ts`) o la configurazione di deploy (Railway, `railway.json`, `nixpacks.toml`);
- modifica i workflow CI/build (`.github/workflows/**`, `vite.config.ts`, `package.json`, `tsconfig*.json`);
- richiede commit, push o PR;
- corregge review comments, check rossi, CodeRabbit, Sourcery, Codex o GitHub Actions.

Per domande, spiegazioni o analisi read-only non serve aprire PR.

## REGOLE NON NEGOZIABILI

- Non lavorare mai direttamente su `main`.
- Non fare mai merge.
- Non abilitare auto-merge.
- Non creare una seconda PR se esiste già una PR aperta non correlata.
- Non allargare lo scope.
- Non fare refactor generale se il task chiede una correzione specifica.
- Non committare `.env`, chiavi/API key, `node_modules`, `dist`, build artifact, cache, log, `.project-config.json` reale o file `__manus__` generati.
- Non stampare segreti nei log.
- **Non violare la conservazione dei gettoni**: la somma dei pagamenti dello showdown deve essere sempre esattamente uguale al piatto; nessun gettone creato o perso.
- **Non reintrodurre la regola 75/25** come caso speciale per 3-4 giocatori: la regola definitiva è **50/50 per piatto** (ogni piatto vale 50, diviso in parti uguali tra i suoi vincitori; chi vince entrambi da solo prende 100%).
- Non alterare la gerarchia delle combinazioni §5 senza task esplicito (nel Sanzy: scala colore > poker > **colore > full** > scala > tris > doppia coppia > coppia).
- Non alterare il mazzo (32 carte, 8 valori 7…A × 4 semi) senza task esplicito.
- Non confondere le due varianti: in **Standard** le parità dividono (niente seme, niente kicker); in **Hi/Low** lo spareggio usa il valore e poi il **seme della carta più alta della combinazione** (cuori > quadri > fiori > picche).
- Non far usare al Piatto 1 cinque carte dal tavolo (min 1 carta personale); non far usare al Piatto 2 meno di 3 carte personali; i due piatti non si mischiano mai (§4).
- Non rompere la sequenza dei cinque giri di puntata né la fase di scarto.
- Non lasciare timer/automazioni dei bot orfani in `dispose`.
- Non dichiarare DONE finale mentre i check GitHub sono ancora pending/running.
- Non risolvere review thread mentre i check sono ancora in corso.
- Non dichiarare test passati se non sono stati realmente eseguiti.
- Non creare test finti, decorativi o che non esercitano il codice reale.
- Ogni task che modifica codice **DEVE** generare automaticamente **test hard veritieri** nuovi o aggiornati che esercitino il comportamento reale del cambiamento — inclusi, quando pertinenti, gli scenari di correttezza matematica (conservazione dei gettoni, resti esatti, ordinamento antisimmetrico/transitivo, oracolo indipendente sul seme, fuzzing deterministico su 2/3/4 giocatori × Standard/Hi-Low). Un cambiamento di codice senza test hard corrispondenti è un PR incompleto e NON può dichiarare DONE.
- Se una modifica tocca l'aspetto design/UI/UX (tavolo, carte, fasi, HUD, showdown, layout mobile/desktop), aggiorna i documenti di progetto pertinenti (`todo.md`, `PLAN.md`, `STRUCTURE.md`, `ideas.md`) nello stesso PR, o dichiara N/A con motivazione.
- Non dichiarare READY_TO_MERGE: il merge resta sempre manuale.

## ORDINE OPERATIVO OBBLIGATORIO

Per ogni task che modifica codice o PR, segui sempre questo ordine:

1. clean branch preflight
2. Phase 0 read-only
3. patch plan
4. patch stretta
5. post-fix micro-audit
6. test hard veritieri locali
7. commit/push
8. aspetta fine di tutti i check GitHub
9. leggi check result + annotations
10. leggi PR comments
11. leggi review bodies
12. leggi inline comments
13. leggi unresolved threads
14. triage finding
15. eventuale nuova patch
16. nuova Phase 0 se serve
17. nuovo micro-audit
18. nuovi test hard veritieri
19. nuovo push
20. aspetta di nuovo fine check
21. final hard verify
22. report finale

Non puoi saltare: Phase 0, micro-audit, test hard veritieri, check completion gate, review/inline/thread triage, final hard verify.

## CHECK COMPLETION GATE — OBBLIGATORIO

Prima del controllo finale della PR devi aspettare che **tutti i check siano finiti**.

Non puoi fare final review, evidence resolve, resolve thread, READY o DONE finale mentre ci sono check ancora in corso. Devi controllare il current-head della PR e leggere: GitHub Actions (`ci.yml`: Typecheck e test, Build di produzione, Controllo formato), lo statusCheckRollup, i commit statuses, e CodeRabbit/Sourcery/Codex se presenti.

Sono considerati NON finiti gli stati: `PENDING`, `QUEUED`, `IN_PROGRESS`, `WAITING`, `REQUESTED`, `EXPECTED`, `UNKNOWN`, `null`, empty.

Se anche un solo check è ancora in corso, fermati e rispondi:

```
CHECKS_PENDING

Reason:
- I check della PR non sono ancora tutti finiti.

Pending checks:
- <nome check>
```

Quando i check sono pending: non dichiarare DONE/READY, non risolvere thread, non fare merge, non aprire un'altra PR, non fare patch casuali solo perché stai aspettando.

## REVIEWER DISPONIBILI — chi aspettare davvero

Su questo repository i reviewer che compaiono sulle PR sono **CodeRabbit**, **Sourcery** e **Codex**, più i job della CI (`Typecheck e test`, `Build di produzione`, `Controllo formato`). La copertura reale che conta è la CI verde + CodeRabbit.

- **CodeRabbit**: rivede l'intera PR, ma **salta la review quando la base non è il branch di default** del repo (è il comportamento osservato: se `main` non è impostato come default branch, pubblica «Review skipped»). Non è un errore da correggere: se vuoi la review, imposta `main` come default branch nelle impostazioni del repo (azione una-tantum del proprietario) oppure invoca `@coderabbitai review`.
- **Codex**: NON è un gate. Quando pubblica «You have reached your Codex usage limits» trattalo come **assente**, non pending: non aspettarlo, non contarlo nel gate, non bloccare il DONE su di lui.
- **Sourcery**: NON è un gate. Ha un rate limit settimanale; quando pubblica il messaggio di rate-limit, trattalo come assente.

Ogni push consuma minuti CI. Sii parsimonioso: accorpa i fix di review in un solo push per giro; non pushare per cleanup puramente cosmetici o per rincorrere falsi positivi da diff-per-push (un reviewer che ha visto solo l'ultimo commit e crede «mancante» un'implementazione che sta in un commit precedente della stessa PR) — a quelli rispondi nel thread con l'evidenza, mai con un commit.

## CONVERGENZA — inseguire i bug veri, non ciclare all'infinito sul by-design

I reviewer AI ri-revisionano a ogni commit e ri-sollevano **all'infinito gli stessi punti «per design»**: trattarli come lavoro nuovo a ogni giro è un loop che non converge e brucia CI. Classifica ogni finding in due categorie e agisci diversamente:

- **Bug logico/funzionale reale** — risultato sbagliato, rottura d'integrità dei dati, crash/hang, leak di risorse, falla di sicurezza, violazione di spec (conservazione gettoni, 50/50, gerarchia §5, mazzo, fasi, varianti). **Inseguilo:** scrivi PRIMA il test di regressione che fallisce sul vecchio codice, poi la patch, un solo push accorpato per giro. Questo NON è «ciclare»: è il lavoro.
- **Decisione by-design o eccezione documentata** — es. l'eccezione i18n IT/EN del modulo business, il confine del PR3 (store durevole / idempotenza / sessione server-authoritative), la modalità degradata volutamente fail-open senza `RESEND_API_KEY` per dev/CI, `trust proxy: 1` su Railway, anti-replay/rate-limit in-memory. Questi **non sono bug**. NON patcharli giro dopo giro: rispondi UNA volta nel thread con la motivazione/evidenza e vai avanti. Se un reviewer ri-solleva lo stesso punto by-design su un head successivo, rimanda alla risposta precedente — non ri-patchare.

Prova del nove prima di pushare un «fix»: cambia il comportamento osservabile per correggere un risultato sbagliato, oppure sta ri-discutendo una scelta già presa e documentata? Solo il primo caso merita un commit. Quando un punto by-design ricorre abbastanza da valere la pena, annotalo qui e in `AGENTS.md` (come richiesto dall'owner) così i giri futuri lo saltano subito. Non dichiarare «DONE» un loop di review infinito per sfinimento: converge classificando, correggendo i bug veri e lasciando all'owner la decisione di merge manuale sui punti by-design.

## AI REVIEW A DUE MODELLI — LABEL OBBLIGATORIE

Su questo repository esistono due workflow di code review AI (`.github/workflows/ai-review-fable.yml` → Anthropic Fable 5; `.github/workflows/ai-review-gpt.yml` → OpenAI). Si attivano **solo tramite label** e commentano la PR a ogni commit; **non sono check bloccanti** e il merge resta manuale del proprietario.

- **Prima di chiedere/dichiarare pronto il merge di una PR è OBBLIGATORIO applicare ENTRAMBE le label** `ai-review:fable` e `ai-review:gpt` e attendere che i due reviewer AI abbiano commentato il current-head.
- Se una label non è ancora applicata, applicala (o chiedi al proprietario di applicarla); non considerare la PR pronta per il merge finché entrambe le review AI non sono presenti sull'ultimo commit.
- Le review AI sono **informative**: leggile e, se sollevano problemi reali e azionabili, correggili con l'ordine operativo standard; i falsi positivi si chiudono nel thread con l'evidenza. Non bloccano il DONE se la CI è verde e i finding sono gestiti.
- I due workflow richiedono i Secret `ANTHROPIC_API_KEY_2` e `OPENAI_API_KEY_2` e le Variable `ANTHROPIC_REVIEW_MODEL` / `OPENAI_REVIEW_MODEL` (setup una-tantum del proprietario). Senza chiave il workflow salta senza rompere la CI.

## MONITORAGGIO ATTIVO DELLA PR — OBBLIGATORIO

Non basta leggere i commenti una volta: dopo aver aperto o aggiornato una PR devi **seguirla attivamente** finché non è mergiata o chiusa.

- **Iscriviti agli eventi della PR** appena la crei (o quando ti viene chiesto di sorvegliarne una): usa `subscribe_pr_activity` (tool MCP GitHub) per ricevere in sessione gli eventi `<github-webhook-activity>` — CI fallite, review, commenti inline. Se `subscribe_pr_activity` non è disponibile, ripiega sul polling controllato dei check/commenti (senza `sleep` a raffica) rispettando il check completion gate.
- **Per ogni evento ricevuto**: indaga se è azionabile. Se il fix è piccolo e sicuro, applicalo (una patch, un solo push per giro) e aggiorna lo stato; se è ambiguo o architetturale, chiedi al proprietario prima di agire; se è un non-gate noto (Codex «usage limits», Sourcery rate-limit, CodeRabbit «Review skipped» perché la base non è il default branch) salta senza azione, dicendolo.
- **Rispondi nei thread con l'evidenza, mai «a sensazione»**: per un finding risolto scrivi `Fatto in commit <SHA>` con i comandi eseguiti e l'esito (`pnpm check`: PASS, `pnpm test`: PASS, file:riga); per uno non applicabile scrivi `Skipped / already covered` con il motivo (outdated/duplicate/già coperto/fuori scope) e la prova. Non usare i webhook come unico segnale: CI verde, nuovi push e transizioni di merge-conflict non sempre arrivano come eventi — verifica anche via API quando serve.
- **La sottoscrizione non è finita finché la PR non è mergiata o chiusa.** Non spammare commenti sulla PR: replica solo quando serve davvero (un fix che chiude il punto o una domanda), non a ogni giro. Fermati subito se il proprietario chiede di smettere.
- **Un push consuma minuti CI**: accorpa i fix in un solo push per giro; non pushare per cleanup cosmetici o per rincorrere falsi positivi da diff-per-push (rispondi nel thread con l'evidenza).

## FINESTRA DI REVIEW POST-MERGE

Il merge resta sempre manuale del proprietario. Poiché i commenti-bot possono arrivare **dopo** il merge, la rete di sicurezza è il **tracciamento post-merge**: quando arriva un evento review su una PR già mergiata/chiusa, rileggila e cerca inline comment / review body con `submitted_at` successivo al merge, thread non risolti e annotazioni dei check. Se trovi qualcosa di reale e azionabile, aprilo come **nuova Issue** (con numero PR, head SHA, file:riga, bot, severità, link) e, per i fix veri, una **nuova PR dedicata** che parte dall'ultimo `main` e segue tutto l'ordine operativo. Non riusare né stackare sopra la PR mergiata. Una sola Issue può aggregare più finding della stessa PR; deduplica prima di aprirne una nuova.

## MINI PHASE 0 OBBLIGATORIA

Prima di patchare un task che tocca regole, valutazione mani, divisione piatti, mazzo, fasi, bot, UI/scena, server, deploy o CI, devi fare Phase 0 read-only. Non modificare file durante Phase 0.

```
SANZY_POKER_PHASE_0

Task:
- <richiesta>

Detected mode:
- <New task / Current PR repair / Unknown>

Current branch:
- <branch>

File da ispezionare:
- <file>

Comportamento attuale:
- <cosa fa adesso>

Rischi:
- <vincitore sbagliato / gettoni creati o persi / regola 75/25 reintrodotta /
   gerarchia alterata / mazzo alterato / varianti confuse / fasi rotte>

Patch stretta:
- <cosa modificare e cosa non modificare>

Test hard veritieri:
- <pnpm check / pnpm test / test mirati / fuzzing>

Stop conditions:
- <quando fermarsi>
```

Se manca evidenza, se il comportamento è ambiguo o se la modifica può alterare la correttezza matematica dello showdown, fermati con:

```
NEEDS_MANUAL

Reason:
- Phase 0 could not determine safe scope.
```

## MICRO-AUDIT POST-FIX — OBBLIGATORIO

Dopo ogni patch e prima di test, commit, push, resolve thread o DONE finale, controlla il diff (`git status --short`, `git diff --stat`, `git diff`).

```
POST_FIX_MICRO_AUDIT

Scope:
- PASS / FAIL

Forbidden files:
- PASS / FAIL   (niente .env, node_modules, dist, artifact, cache, log, segreti)

Chip conservation:
- PASS / FAIL   (somma pagamenti = piatto; nessun gettone creato/perso)

Pot-split rule (50/50 per piatto):
- PASS / FAIL   (nessuna reintroduzione del 75/25)

Hand hierarchy & deck:
- PASS / FAIL   (gerarchia §5 e mazzo 32 carte invariati salvo richiesta)

Variants (Standard/Hi-Low):
- PASS / FAIL   (parità dividono in Standard; seme della carta più alta in Hi/Low)

Phase sequence:
- PASS / FAIL   (cinque giri di puntata + scarto preservati)

Hard tests created/updated:
- PASS / FAIL

Docs updated:
- PASS / FAIL / N/A

Manual merge preserved:
- PASS / FAIL

Result:
- PASS / FAIL

Notes:
- <prove>
```

Se il micro-audit fallisce: niente test, niente commit, niente push, niente resolve, niente DONE. Puoi continuare solo con `POST_FIX_AUDIT=PASS`.

## TEST HARD VERITIERI — OBBLIGATORIO

I test devono essere veri, mirati e verificabili. Non puoi dire che un test è passato se non hai realmente eseguito il comando e visto esito positivo.

**Vietato**: inventare risultati; `expect(true)`; test che non chiamano funzioni reali del progetto; «dovrebbe passare» come PASS; nascondere fallimenti; skippare senza motivo scritto; dichiarare copertura falsa.

Minimo per modifiche TypeScript:

```
pnpm check      # tsc --noEmit
pnpm test       # vitest run
```

Prima del checkpoint, quando pratico anche la build di produzione:

```
pnpm build
```

### Test hard obbligatori per comportamento safety-critical del gioco

Per ogni modifica che tocca mazzo, valutazione mani, confronti, divisione piatti, sequenza fasi, coda azioni/puntate, all-in, showdown, bot o stato del gioco, aggiungi o aggiorna test seri che esercitino le **funzioni reali** del progetto e coprano i casi più pericolosi:

- **Mazzo**: 32 carte, 8 valori × 4 semi, nessun duplicato, shuffle come permutazione (input non mutato).
- **Valutazione**: riconoscimento di scala colore (massima/media/minima), poker, colore, full, scala, tris, doppia coppia, coppia, carta alta; asso alto e asso basso nella scala minima.
- **Gerarchia §5**: ogni categoria batte la successiva, incluse le regole Sanzy (colore batte full; scala colore minima batte il poker).
- **Confronti Standard**: le parità dividono (scale colore, colori, coppie/doppie/tris/full uguali) senza guardare seme né carta più alta.
- **Confronti Hi/Low**: valore poi **seme della carta più alta della combinazione** (i kicker non contano); gli esempi del regolamento (98AKJ cuori batte KQ87A picche; full AAAJJ batte KKKQQ).
- **Vincoli §4**: mai 5 carte dal tavolo sul Piatto 1; minimo 3 personali sul Piatto 2; i due piatti non si mischiano; punto in mano valido su entrambi.
- **Divisione §6 (50/50 per piatto)**: casi esatti per 2/3/4 giocatori con i numeri del regolamento (heads-up 750/250; 3 giocatori 500/250/250 e 666/167/167; 4 giocatori 500/167/167/166, 625/125/125/125, 250×4); piatti dispari senza gettoni persi; distribuzione esatta col resto maggiore.
- **Proprietà d'ordine (entrambe le varianti)**: antisimmetria, transitività, riflessività su un campione ampio di mani casuali.
- **Motore**: ante uguale per tutti, sequenza delle fasi con pre-board, ordine di parola, rilancio minimo, all-in senza gettoni negativi, vittoria per fold senza mostrare le carte, conservazione dei gettoni su più mani per ciascuna configurazione.

Il test deve **fallire se il bug torna** (regressione bloccata), non solo «passare». Per ogni fix che nasce da un bug/finding, scrivi PRIMA il test che riproduce il problema (deve fallire sul vecchio codice), poi la patch che lo fa passare.

```
HARD_TEST_EVIDENCE

Commands run:
- <comando esatto>: PASS / FAIL

Exit codes:
- <comando>: <exit code>

What was actually tested:
- <comportamento reale>

What was not tested:
- <es. rendering 3D reale nel browser, con motivo>

Test quality:
- REAL / PARTIAL / MANUAL_ONLY

Notes:
- <prove>
```

Se non puoi eseguire test:

```
TESTS_SKIPPED

Reason:
- <motivo esatto>

Risk:
- <cosa resta non verificato>

Required owner action:
- <comando o ambiente necessario>
```

Se i test sono finti, non eseguiti o solo teorici, non dichiarare DONE. Nota onesta sui limiti: ciò che richiede il **rendering 3D reale nel browser** (Babylon/WebGL, animazioni, layout mobile/desktop reale) va scritto come smoke/manual checklist precisa e marcato manual, non dichiarato come testato automaticamente. La logica pura (regole, stato, divisione) va invece sempre coperta con test deterministici offline.

## DOCUMENTAZIONE — AGGIORNAMENTO OBBLIGATORIO

Ogni volta che aggiungi, modifichi o elimini codice (funzione, regola, combinazione, variante, fase, opzione), aggiorna la documentazione corrispondente nello stesso PR. Le docs non devono mai restare disallineate dal codice.

In pratica, quando applicabile: `todo.md` (avanzamento e verifiche), `PLAN.md` (obiettivo, rischi), `STRUCTURE.md` (responsabilità dei moduli), `MEMORY.md` (decisioni/regole di dominio, es. la regola di divisione dei piatti), `ideas.md`/`reference-analysis.md`/`table-3d-reference.md` (design/tavolo), e i commenti/docstring in testa a moduli e funzioni non banali.

Il micro-audit e il final hard verify devono includere «docs aggiornate: PASS/FAIL/N/A» (PASS = docs aggiornate nello stesso PR · FAIL = codice modificato ma docs mancanti · N/A = modifica interna senza impatto documentale, con motivazione scritta).

## REVIEW COMMENTS / INLINE COMMENTS — OBBLIGATORIO

Quando lavori su una PR esistente, non limitarti ai check rossi. Leggi e valuta: commenti della PR, corpi delle review, inline review comment, review thread (unresolved/outdated), annotazioni dei check, CodeRabbit/Sourcery/Codex se presenti, file modificati, current PR head SHA. Il controllo finale va fatto **solo dopo** che tutti i check current-head sono finiti (alcuni bot pubblicano a check completato).

Classifica ogni finding: `PATCH_REQUIRED`, `TEST_REQUIRED`, `EVIDENCE_RESOLVE`, `SKIP_OUTDATED`, `SKIP_DUPLICATE`, `NEEDS_MANUAL`. Non risolvere mai un commento «a sensazione»: prima di dire risolto devi avere commit SHA, file modificato/ispezionato, test eseguito, risultato e motivo tecnico. Puoi marcare un thread risolto solo se tutti i check current-head sono finiti, è current-head, non è outdated, la patch è fatta o il problema è già coperto, i test rilevanti passano, hai i permessi e non serve una decisione del proprietario. Il merge resta manuale.

## PRIORITÀ TECNICHE DEL REPOSITORY

Preserva sempre:

- La correttezza matematica dello showdown: vincitore giusto e **conservazione esatta dei gettoni**.
- La regola di divisione **50/50 per piatto** (ogni piatto vale 50).
- La gerarchia §5 con le regole peculiari del Sanzy (colore batte full; scale colore battono il poker).
- Il mazzo da 32 carte e i valori 7…A.
- Le due varianti Standard e Hi/Low con i rispettivi criteri di spareggio.
- I vincoli §4 di composizione dei due piatti.
- La sequenza dei cinque giri di puntata e la fase di scarto.
- La coerenza dello stato (niente timer orfani, all-in senza gettoni negativi).
- Il confine architetturale: React ospita solo il canvas; regole e gameplay restano TypeScript indipendenti dal framework.
- La build Vite e il deploy Railway funzionanti; il server bindato su `0.0.0.0:PORT` con `/healthz`.
- Nessun segreto nel repository.
- Il merge manuale.

## FINAL HARD VERIFY — OBBLIGATORIO

Prima di dire DONE, verifica:

```
FINAL_HARD_VERIFY

Phase 0:
- PASS / FAIL

Post-fix micro-audit:
- PASS / FAIL

Hard truthful tests:
- PASS / FAIL / SKIPPED with reason

Hard tests created/updated for the change:
- PASS / FAIL / N/A con motivo

Docs updated for the change:
- PASS / FAIL / N/A con motivo

Chip conservation & 50/50 rule intact:
- PASS / FAIL

GitHub checks completed:
- YES / NO

GitHub checks result:
- PASS / FAIL / PENDING

PR comments checked:
- YES / NO

Review bodies checked:
- YES / NO

Inline comments checked:
- YES / NO

Unresolved threads checked:
- YES / NO

Last-5 PR post-merge sweep:
- YES / NO

Safety invariants:
- PASS / FAIL

Merge:
- MANUAL ONLY

Final status:
- DONE / PARTIAL / NOT DONE / CHECKS_PENDING / NEEDS_MANUAL
```

Se anche uno solo di questi punti manca, non dichiarare DONE. Usa `PARTIAL`, `CHECKS_PENDING` o `NEEDS_MANUAL` secondo il caso.

## BRANCH E PR

**Nuovo task**: crea un branch dedicato, lavora solo sul branch, crea una sola PR, non fare merge.

**Fix PR esistente**: resta sul branch della PR, non creare una nuova PR, pusha una sola fix mirata quando possibile, non fare merge.

Se una PR designata è già stata mergiata, il lavoro di follow-up è una modifica nuova: riparti dall'ultimo `main` (stesso nome branch), non stackare sopra la storia già mergiata.

Se push/PR non sono possibili: `NEEDS_MANUAL_UPDATE_BRANCH` con spiegazione.

## FORMATO RISPOSTA FINALE

```
DONE / PARTIAL / NOT DONE / CHECKS_PENDING / NEEDS_MANUAL

Summary:
- <cosa è stato cambiato>

Branch:
- <branch>

PR:
- <url o numero>

Commit:
- <sha>

Safety:
- <impatto su showdown / gettoni / regola 50/50 / gerarchia / varianti / fasi>

Phase 0:
- PASS / FAIL

Post-fix micro-audit:
- PASS / FAIL

Hard truthful tests:
- <comando>: pass/fail/skipped con motivo

GitHub checks:
- complete/pass/fail/pending con motivo

Review comments handled:
- <thread/comment URL o summary>: fixed/skipped/needs manual con evidence

Files changed:
- <file>

Final hard verify:
- DONE / PARTIAL / NOT DONE / CHECKS_PENDING / NEEDS_MANUAL

Notes:
- <limiti, test manuali, cose da sapere>
```

## REGOLA D'ORO

Non cercare di «fare tutto». Per questo repository è meglio una patch piccola, chiara e sicura che una grande riscrittura.

Il gioco deve restare prevedibile e corretto:

> mazzo integro → valutazione corretta delle mani → confronto corretto per variante → divisione 50/50 esatta del piatto → gettoni conservati.

Qualsiasi modifica che rompe questa catena deve essere bloccata o approvata esplicitamente dal proprietario.

Il merge resta sempre manuale.

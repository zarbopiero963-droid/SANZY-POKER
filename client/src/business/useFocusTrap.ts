/**
 * Hook di focus trap per i modali della sezione business (NDA, scadenza demo).
 *
 * Quando `active` è true: memorizza l'elemento a fuoco e lo ripristina allo
 * smontaggio, e mantiene il Tab dentro il contenitore `ref` (WCAG 2.4.3). I
 * focusabili sono letti dal DOM al momento del keydown e filtrati per
 * visibilità, così l'hook resta valido a ogni cambio di contenuto.
 */
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function visibleFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => el.offsetParent !== null || el === document.activeElement
  );
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean = true
): void {
  // Cattura l'elemento a fuoco PRIMA del commit di React: `autoFocus` di un campo
  // interno viene applicato in fase di commit (prima degli effetti passivi),
  // quindi leggere `document.activeElement` dentro l'effect catturerebbe un nodo
  // DENTRO il modale — al ripristino il focus cadrebbe su `body` (WCAG 2.4.3).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  if (active) {
    if (
      previouslyFocusedRef.current === null &&
      typeof document !== "undefined"
    ) {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
    }
  } else {
    previouslyFocusedRef.current = null;
  }

  // Ripristina il focus all'elemento d'apertura allo smontaggio del modale.
  useEffect(() => {
    if (!active) return;
    return () => previouslyFocusedRef.current?.focus?.();
  }, [active]);

  // Contiene il Tab dentro il contenitore.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const node = ref.current;
      if (!node) return;
      const focusables = visibleFocusables(node);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (!node.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ref, active]);
}

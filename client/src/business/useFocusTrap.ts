/**
 * Hook di focus trap per i modali della sezione business (NDA, scadenza demo).
 *
 * Quando `active` è true: memorizza l'elemento a fuoco e lo ripristina allo
 * smontaggio, e mantiene il Tab dentro il contenitore `ref` (WCAG 2.4.3). I
 * focusabili sono letti dal DOM al momento del keydown e filtrati per
 * visibilità, così l'hook resta valido a ogni cambio di contenuto.
 */
import { useEffect, type RefObject } from "react";

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
  // Salva e ripristina il focus attorno alla vita del modale.
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => previouslyFocused?.focus?.();
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

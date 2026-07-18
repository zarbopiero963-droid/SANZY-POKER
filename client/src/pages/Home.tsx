/**
 * Home di Sanzy Poker: prima la schermata d'ingresso (lingua → variante), poi
 * il canvas del gioco avviato nella variante scelta.
 */
import { useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import StartScreen from "@/components/StartScreen";
import type { Variant } from "@/game/rules";

export default function Home() {
  const [variant, setVariant] = useState<Variant | null>(null);

  if (!variant) {
    return (
      <StartScreen onStart={({ variant: chosen }) => setVariant(chosen)} />
    );
  }
  return <GameCanvas variant={variant} />;
}

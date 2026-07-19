/**
 * Sanzy Poker Pro — client poker desktop.
 * Riferimenti: lobby operativa a lista, tavolo ovale dominante e board Sanzy
 * vincolante: Piatto 1 orizzontale, Piatto 2 verticale a destra, mano in basso.
 */

import type { Scene } from "@babylonjs/core/scene";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Ellipse,
  Rectangle,
  ScrollViewer,
  Slider,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui/2D";
import { cardParts, type CardCode, type Variant } from "./rules";
import { formatChips, t } from "./i18n";
import {
  activeBorderAlphaByte,
  dotPulseAlpha,
  pulse01,
  withPulseAlpha,
} from "./anim";
import { VISIBLE_LOG_LINES, computeViewSignature } from "./viewSignature";
import type { GameController, PlayerState, TableState } from "./state";

/** Etichetta breve e maiuscola della variante per le barre del tavolo. */
function variantLabel(variant: Variant): string {
  return variant === "hilow" ? "HI / LOW" : "STANDARD";
}

const BG = "#15181F";
const TOP = "#20242CFA";
const PANEL = "#242832F2";
const PANEL_2 = "#2B303AF4";
const PANEL_3 = "#1B1F27F2";
const BORDER = "#FFFFFF18";
const TEXT = "#F3F5F7";
const MUTED = "#9DA4AE";
const ORANGE = "#F49A35";
const ORANGE_DARK = "#C96E17";
const GREEN = "#27C68B";
const FELT = "#176B50";
const RED = "#E05A5A";
type Screen = "lobby" | "table";

function rect(
  name: string,
  width: string | number,
  height: string | number,
  background = PANEL,
  radius = 8
) {
  const control = new Rectangle(name);
  control.width = typeof width === "number" ? `${width}px` : width;
  control.height = typeof height === "number" ? `${height}px` : height;
  control.background = background;
  control.cornerRadius = radius;
  control.thickness = 1;
  control.color = BORDER;
  return control;
}

function text(
  name: string,
  value: string,
  size = 15,
  color = TEXT,
  weight: string | number = 500,
  family = "Manrope"
) {
  const control = new TextBlock(name, value);
  control.fontFamily = family;
  control.fontSize = size;
  control.fontWeight = String(weight);
  control.color = color;
  control.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  control.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  control.resizeToFit = false;
  return control;
}

function placeTopLeft(control: Control, left: number, top: number) {
  control.left = `${left}px`;
  control.top = `${top}px`;
  control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  control.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
}

export class PokerUI {
  private readonly root: Rectangle;
  private unsubscribe: (() => void) | null = null;
  private pulseDots: Ellipse[] = [];
  // Bordi del posto di turno: pulsano nel loop tick() (per-frame), non nel
  // render gated. Ricostruiti a ogni rebuild insieme ai posti.
  private activeBorders: (Rectangle | Ellipse)[] = [];
  // Ultimo byte alpha bordo applicato (0..255): se non cambia tra due frame,
  // tick() salta la riassegnazione E la costruzione della stringa colore (meno
  // invalidazioni GUI e nessuna alloc per-frame su mobile). -1 = da riapplicare.
  private lastBorderAlphaByte = -1;
  // Ultima pulsazione quantizzata (0..255) applicata ai pulseDots: idem, evita
  // di riscrivere l'alpha dei punti quando il valore quantizzato non cambia.
  private lastDotPulse = -1;
  private eventSerial = -1;
  // Firma di ciò che è VISIBILE nell'HUD: si ricostruisce solo quando cambia,
  // non a ogni evento. Evita il frame "strappato" durante le puntate e non
  // ricrea (azzerando) lo slider di rilancio mentre il giocatore lo usa.
  private lastViewSignature = "";
  private audioContext: AudioContext | null = null;
  private mobile = false;
  private mobileHeight = 900;
  private currentTable: TableState | null = null;
  private currentScreen: Screen = "lobby";

  constructor(
    scene: Scene,
    private readonly gui: AdvancedDynamicTexture,
    private readonly controller: GameController,
    private readonly onScreenChange: (screen: Screen) => void
  ) {
    void scene;
    this.mobile =
      window.innerWidth < 720 ||
      window.innerWidth / Math.max(window.innerHeight, 1) < 0.78;
    this.mobileHeight = this.getMobileIdealHeight();
    this.gui.idealWidth = this.mobile ? 420 : 1600;
    this.gui.idealHeight = this.mobile ? this.mobileHeight : 900;
    this.gui.useSmallestIdeal = true;
    this.root = rect("ui-root", "100%", "100%", "transparent", 0);
    this.root.thickness = 0;
    this.gui.addControl(this.root);
    this.unsubscribe = this.controller.subscribe((table, screen) => {
      this.currentTable = table;
      this.currentScreen = screen;
      this.onScreenChange(screen);
      this.render(table, screen);
    });
  }

  setMobileMode(mobile: boolean) {
    const nextMobileHeight = this.getMobileIdealHeight();
    if (
      this.mobile === mobile &&
      (!mobile || this.mobileHeight === nextMobileHeight)
    )
      return;
    this.mobile = mobile;
    this.mobileHeight = nextMobileHeight;
    this.gui.idealWidth = mobile ? 420 : 1600;
    this.gui.idealHeight = mobile ? this.mobileHeight : 900;
    this.lastViewSignature = ""; // forza il rebuild al cambio mobile/viewport
    if (this.currentTable) this.render(this.currentTable, this.currentScreen);
  }

  private getMobileIdealHeight() {
    const viewport = window.visualViewport;
    const width = Math.max(viewport?.width ?? window.innerWidth, 1);
    const height = viewport?.height ?? window.innerHeight;
    return Math.max(700, Math.min(900, Math.round((420 * height) / width)));
  }

  private mobileActionTop(table: TableState) {
    const panelHeight = table.status === "waiting" ? 112 : 126;
    return this.mobileHeight - panelHeight - 6;
  }

  private tone(frequency = 280, duration = 0.05, gain = 0.028) {
    try {
      this.audioContext ||= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const volume = this.audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(gain, this.audioContext.currentTime);
      volume.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + duration
      );
      oscillator.connect(volume);
      volume.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {
      // Il browser può bloccare l'audio finché non riceve un gesto dell'utente.
    }
  }

  private button(
    label: string,
    width: number,
    height: number,
    onClick: () => void,
    primary = false
  ) {
    const control = Button.CreateSimpleButton(`button-${label}`, label);
    control.width = `${width}px`;
    control.height = `${height}px`;
    control.cornerRadius = 6;
    control.thickness = 1;
    control.color = primary ? "#17191D" : "#D8DCE1";
    control.background = primary ? ORANGE : "#303641";
    control.fontFamily = "Manrope";
    control.fontSize = 14;
    control.fontWeight = "800";
    control.hoverCursor = "pointer";
    control.onPointerEnterObservable.add(() => {
      control.background = primary ? "#FFAD4D" : "#3A414E";
      control.scaleX = 1.018;
      control.scaleY = 1.018;
    });
    control.onPointerOutObservable.add(() => {
      control.background = primary ? ORANGE : "#303641";
      control.scaleX = 1;
      control.scaleY = 1;
    });
    control.onPointerDownObservable.add(() => {
      control.scaleX = 0.97;
      control.scaleY = 0.97;
    });
    control.onPointerUpObservable.add(() => {
      control.scaleX = 1;
      control.scaleY = 1;
      this.tone(primary ? 430 : 280);
      onClick();
    });
    return control;
  }

  /**
   * Firma dello stato VISIBILE dell'HUD (delegata a `computeViewSignature`, un
   * modulo puro testabile offline). Se non cambia, non c'è nulla di nuovo da
   * disegnare: durante il turno del giocatore resta costante, quindi lo slider
   * non viene ricreato e non lampeggia.
   */
  private viewSignature(table: TableState, screen: Screen): string {
    return computeViewSignature(table, {
      screen,
      mobile: this.mobile,
      mobileHeight: this.mobileHeight,
    });
  }

  private render(table: TableState, screen: Screen) {
    // Cue audio sugli eventi, indipendente dalla ricostruzione visiva.
    if (this.eventSerial !== table.eventSerial) {
      this.eventSerial = table.eventSerial;
      if (["chips-to-pot", "winner", "showdown"].includes(table.lastEvent)) {
        this.tone(table.lastEvent === "chips-to-pot" ? 340 : 560, 0.08, 0.024);
      }
    }
    // Ricostruisci l'HUD SOLO se qualcosa di visibile è cambiato.
    const signature = this.viewSignature(table, screen);
    if (signature === this.lastViewSignature) return;
    this.lastViewSignature = signature;
    this.root.clearControls();
    this.pulseDots = [];
    this.activeBorders = [];
    // Nuovi controlli dopo il rebuild: forza tick() a riapplicare colore/alpha.
    this.lastBorderAlphaByte = -1;
    this.lastDotPulse = -1;
    if (screen === "lobby")
      this.mobile ? this.renderLobbyMobile() : this.renderLobby();
    else this.mobile ? this.renderTableMobile(table) : this.renderTable(table);
  }

  private brand(parent: Rectangle, compact = false) {
    const mark = rect(
      "brand-mark",
      compact ? 36 : 42,
      compact ? 36 : 42,
      "#14171D",
      7
    );
    mark.color = ORANGE;
    mark.thickness = 2;
    placeTopLeft(mark, compact ? 16 : 22, compact ? 12 : 11);
    parent.addControl(mark);
    const glyph = text("brand-glyph", "S♠", compact ? 15 : 18, ORANGE, 900);
    glyph.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    mark.addControl(glyph);
    const wordmark = text(
      "brand-wordmark",
      "SANZY POKER",
      compact ? 18 : 21,
      TEXT,
      900
    );
    wordmark.width = compact ? "170px" : "210px";
    wordmark.height = "42px";
    placeTopLeft(wordmark, compact ? 62 : 78, compact ? 9 : 10);
    parent.addControl(wordmark);
  }

  private renderLobbyMobile() {
    const background = rect("mobile-lobby-background", "100%", "100%", BG, 0);
    background.thickness = 0;
    this.root.addControl(background);

    const topBar = rect("mobile-lobby-topbar", "100%", 64, TOP, 0);
    topBar.thickness = 0;
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(topBar);
    this.brand(topBar, true);
    const wallet = text("mobile-wallet", "5.000 CHIP", 12, TEXT, 800);
    wallet.width = "104px";
    wallet.height = "64px";
    wallet.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    wallet.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    wallet.left = "-14px";
    topBar.addControl(wallet);

    const heading = text("mobile-lobby-heading", "Tavoli live", 27, TEXT, 900);
    heading.width = "392px";
    heading.height = "40px";
    placeTopLeft(heading, 14, 82);
    this.root.addControl(heading);
    const subtitle = text(
      "mobile-lobby-subtitle",
      "Scegli la variante e siediti al tavolo.",
      12,
      MUTED,
      600
    );
    subtitle.width = "392px";
    subtitle.height = "28px";
    placeTopLeft(subtitle, 14, 120);
    this.root.addControl(subtitle);

    const filters = ["TUTTI", "STANDARD", "HI / LOW"];
    filters.forEach((label, index) => {
      const chip = rect(
        `mobile-filter-${index}`,
        index === 0 ? 94 : 132,
        36,
        index === 0 ? ORANGE : "#2A303A",
        5
      );
      chip.color = index === 0 ? ORANGE : BORDER;
      placeTopLeft(chip, 14 + index * 132, 158);
      this.root.addControl(chip);
      const copy = text(
        `mobile-filter-label-${index}`,
        label,
        10,
        index === 0 ? "#17191D" : "#D4D8DD",
        900
      );
      copy.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      chip.addControl(copy);
    });

    const rooms: Array<{
      name: string;
      bots: string;
      variant: Variant;
      blinds: string;
      status: string;
    }> = [
      {
        name: "Sala Smeraldo",
        bots: "Nadia · Rico · Mara",
        variant: "standard",
        blinds: "25 / 50",
        status: "IN CORSO",
      },
      {
        name: "Aurora Hi/Low",
        bots: "Iris · Dino · Nadia",
        variant: "hilow",
        blinds: "25 / 50",
        status: "IN CORSO",
      },
      {
        name: "Tavolo Notturno",
        bots: "Rico · Mara · Dino",
        variant: "standard",
        blinds: "50 / 100",
        status: "IN CORSO",
      },
      {
        name: "Club Sanzy",
        bots: "Nadia · Iris",
        variant: "hilow",
        blinds: "10 / 20",
        status: "ATTESA",
      },
      {
        name: "Deep Stack",
        bots: "Dino · Rico · Iris",
        variant: "standard",
        blinds: "100 / 200",
        status: "IN CORSO",
      },
    ];
    rooms.forEach((room, index) => {
      const row = rect(
        `mobile-room-${index}`,
        392,
        112,
        index === 0 ? "#2E3540" : "#232832",
        7
      );
      row.color = index === 0 ? "#F49A3566" : "#FFFFFF10";
      row.hoverCursor = "pointer";
      placeTopLeft(row, 14, 212 + index * 122);
      this.root.addControl(row);
      const dot = new Ellipse(`mobile-room-dot-${index}`);
      dot.width = "9px";
      dot.height = "9px";
      dot.background = room.status === "IN CORSO" ? GREEN : ORANGE;
      dot.color = dot.background;
      placeTopLeft(dot, 16, 18);
      row.addControl(dot);
      this.pulseDots.push(dot);
      const name = text(`mobile-room-name-${index}`, room.name, 16, TEXT, 900);
      name.width = "238px";
      name.height = "30px";
      placeTopLeft(name, 36, 8);
      row.addControl(name);
      const status = text(
        `mobile-room-status-${index}`,
        room.status,
        9,
        room.status === "IN CORSO" ? GREEN : ORANGE,
        900
      );
      status.width = "102px";
      status.height = "30px";
      status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      placeTopLeft(status, 272, 8);
      row.addControl(status);
      const bots = text(`mobile-room-bots-${index}`, room.bots, 11, MUTED, 600);
      bots.width = "360px";
      bots.height = "24px";
      placeTopLeft(bots, 16, 41);
      row.addControl(bots);
      const meta = text(
        `mobile-room-meta-${index}`,
        `${room.variant === "hilow" ? "HI / LOW" : "STANDARD"}   •   BUI ${room.blinds}`,
        11,
        ORANGE,
        800
      );
      meta.width = "250px";
      meta.height = "28px";
      placeTopLeft(meta, 16, 72);
      row.addControl(meta);
      const enter = text(
        `mobile-room-enter-${index}`,
        "SIEDITI  →",
        11,
        TEXT,
        900
      );
      enter.width = "112px";
      enter.height = "28px";
      enter.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      placeTopLeft(enter, 262, 72);
      row.addControl(enter);
      row.onPointerUpObservable.add(() =>
        this.controller.openTable(3, room.variant)
      );
    });
  }

  private renderLobby() {
    const background = rect("lobby-background", "100%", "100%", BG, 0);
    background.thickness = 0;
    this.root.addControl(background);

    const topBar = rect("lobby-topbar", "100%", 64, TOP, 0);
    topBar.thickness = 0;
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(topBar);
    this.brand(topBar);

    const tabs = ["TAVOLI LIVE", "HI / LOW", "TORNEI", "AMICI"];
    tabs.forEach((label, index) => {
      const tab = text(
        `top-tab-${index}`,
        label,
        12,
        index === 0 ? ORANGE : MUTED,
        index === 0 ? 800 : 600
      );
      tab.width = "105px";
      tab.height = "64px";
      placeTopLeft(tab, 330 + index * 118, 0);
      tab.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      topBar.addControl(tab);
      if (index === 0) {
        const underline = rect("active-tab", 86, 3, ORANGE, 0);
        underline.thickness = 0;
        placeTopLeft(underline, 339, 61);
        topBar.addControl(underline);
      }
    });

    const online = rect("online-chip", 128, 32, "#18372EF2", 16);
    online.color = "#2AC58A55";
    placeTopLeft(online, 1240, 16);
    topBar.addControl(online);
    const dot = new Ellipse("online-dot");
    dot.width = "8px";
    dot.height = "8px";
    dot.background = GREEN;
    dot.color = GREEN;
    dot.left = "-46px";
    online.addControl(dot);
    this.pulseDots.push(dot);
    const onlineText = text("online-text", "12 ONLINE", 11, "#B9EEDB", 800);
    onlineText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    online.addControl(onlineText);
    const wallet = text("wallet", "5.000 CHIP", 14, TEXT, 800);
    wallet.width = "160px";
    wallet.height = "64px";
    wallet.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    wallet.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    wallet.left = "-28px";
    topBar.addControl(wallet);

    const sidebar = rect("lobby-sidebar", 210, "100%", "#1B1E25F8", 0);
    sidebar.thickness = 0;
    placeTopLeft(sidebar, 0, 64);
    this.root.addControl(sidebar);
    const navItems = [
      ["♠", "Poker"],
      ["▦", "I miei tavoli"],
      ["★", "Preferiti"],
      ["♣", "Classifica bot"],
      ["⚙", "Impostazioni"],
    ];
    navItems.forEach(([icon, label], index) => {
      const active = index === 0;
      const row = rect(
        `nav-${index}`,
        182,
        46,
        active ? "#2C323CE8" : "transparent",
        6
      );
      row.thickness = 0;
      placeTopLeft(row, 14, 26 + index * 54);
      sidebar.addControl(row);
      const symbol = text(
        `nav-icon-${index}`,
        icon,
        17,
        active ? ORANGE : MUTED,
        800
      );
      symbol.width = "30px";
      symbol.height = "46px";
      placeTopLeft(symbol, 14, 0);
      row.addControl(symbol);
      const copy = text(
        `nav-label-${index}`,
        label,
        14,
        active ? TEXT : MUTED,
        active ? 700 : 500
      );
      copy.width = "130px";
      copy.height = "46px";
      placeTopLeft(copy, 48, 0);
      row.addControl(copy);
    });
    const profile = rect("profile", 182, 88, "#242933", 8);
    placeTopLeft(profile, 14, 720);
    sidebar.addControl(profile);
    const avatar = new Ellipse("profile-avatar");
    avatar.width = "42px";
    avatar.height = "42px";
    avatar.background = "#6E8D33";
    avatar.color = "#8FB746";
    placeTopLeft(avatar, 14, 16);
    profile.addControl(avatar);
    const avatarLetter = text("profile-letter", "P", 18, TEXT, 900);
    avatarLetter.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    avatar.addControl(avatarLetter);
    const profileName = text("profile-name", "TU", 13, TEXT, 800);
    profileName.width = "90px";
    profileName.height = "24px";
    placeTopLeft(profileName, 68, 14);
    profile.addControl(profileName);
    const profileStack = text("profile-stack", "Stack 5.000", 12, MUTED, 600);
    profileStack.width = "98px";
    profileStack.height = "22px";
    placeTopLeft(profileStack, 68, 40);
    profile.addControl(profileStack);

    const heading = text("lobby-heading", "Tavoli live", 28, TEXT, 800);
    heading.width = "300px";
    heading.height = "44px";
    placeTopLeft(heading, 246, 92);
    this.root.addControl(heading);
    const subtitle = text(
      "lobby-subtitle",
      "Scegli un tavolo e siediti contro i bot già in partita.",
      13,
      MUTED,
      500
    );
    subtitle.width = "520px";
    subtitle.height = "28px";
    placeTopLeft(subtitle, 246, 132);
    this.root.addControl(subtitle);

    const filters = rect("filters", 1008, 58, PANEL_3, 7);
    placeTopLeft(filters, 246, 174);
    this.root.addControl(filters);
    const filterNames = [
      "TUTTI",
      "STANDARD",
      "HI / LOW",
      "BUI 25 / 50",
      "4 POSTI",
    ];
    filterNames.forEach((label, index) => {
      const chip = rect(
        `filter-${index}`,
        index === 0 ? 74 : 112,
        32,
        index === 0 ? ORANGE : "#2A303A",
        5
      );
      chip.color = index === 0 ? ORANGE : BORDER;
      placeTopLeft(chip, 16 + index * 124, 13);
      filters.addControl(chip);
      const labelText = text(
        `filter-label-${index}`,
        label,
        11,
        index === 0 ? "#17191D" : "#C9CED5",
        800
      );
      labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      chip.addControl(labelText);
    });

    const list = rect("table-list", 1008, 572, PANEL_3, 7);
    placeTopLeft(list, 246, 246);
    this.root.addControl(list);
    const headers = [
      ["TAVOLO", 24, 290],
      ["VARIANTE", 330, 150],
      ["BUI", 500, 100],
      ["GIOCATORI", 620, 120],
      ["STACK MEDIO", 760, 130],
      ["STATO", 905, 80],
    ] as const;
    headers.forEach(([label, left, width]) => {
      const header = text(`header-${label}`, label, 10, "#747C87", 800);
      header.width = `${width}px`;
      header.height = "44px";
      placeTopLeft(header, left, 0);
      list.addControl(header);
    });
    const divider = rect("list-divider", 960, 1, "#FFFFFF12", 0);
    divider.thickness = 0;
    placeTopLeft(divider, 24, 44);
    list.addControl(divider);

    const rooms: Array<{
      name: string;
      bots: string;
      variant: Variant;
      blinds: string;
      players: string;
      stack: string;
      status: string;
    }> = [
      {
        name: "Sala Smeraldo",
        bots: "Nadia · Rico · Mara",
        variant: "standard",
        blinds: "25 / 50",
        players: "3 / 4",
        stack: "5.120",
        status: "IN CORSO",
      },
      {
        name: "Aurora Hi/Low",
        bots: "Iris · Dino · Nadia",
        variant: "hilow",
        blinds: "25 / 50",
        players: "3 / 4",
        stack: "4.860",
        status: "IN CORSO",
      },
      {
        name: "Tavolo Notturno",
        bots: "Rico · Mara · Dino",
        variant: "standard",
        blinds: "50 / 100",
        players: "3 / 4",
        stack: "7.430",
        status: "IN CORSO",
      },
      {
        name: "Club Sanzy",
        bots: "Nadia · Iris",
        variant: "hilow",
        blinds: "10 / 20",
        players: "2 / 4",
        stack: "2.180",
        status: "ATTESA",
      },
      {
        name: "Deep Stack",
        bots: "Dino · Rico · Iris",
        variant: "standard",
        blinds: "100 / 200",
        players: "3 / 4",
        stack: "14.600",
        status: "IN CORSO",
      },
    ];
    rooms.forEach((room, index) => {
      const row = rect(
        `room-row-${index}`,
        960,
        88,
        index === 0 ? "#2E3540" : index % 2 ? "#222730" : "#252A33",
        5
      );
      row.color = index === 0 ? "#F49A3566" : "#FFFFFF0E";
      row.hoverCursor = "pointer";
      placeTopLeft(row, 24, 58 + index * 98);
      list.addControl(row);
      const statusDot = new Ellipse(`room-dot-${index}`);
      statusDot.width = "8px";
      statusDot.height = "8px";
      statusDot.background = room.status === "IN CORSO" ? GREEN : ORANGE;
      statusDot.color = statusDot.background;
      placeTopLeft(statusDot, 16, 22);
      row.addControl(statusDot);
      this.pulseDots.push(statusDot);
      const roomName = text(`room-name-${index}`, room.name, 15, TEXT, 800);
      roomName.width = "230px";
      roomName.height = "28px";
      placeTopLeft(roomName, 34, 11);
      row.addControl(roomName);
      const bots = text(`room-bots-${index}`, room.bots, 11, MUTED, 500);
      bots.width = "250px";
      bots.height = "24px";
      placeTopLeft(bots, 34, 42);
      row.addControl(bots);
      const values = [
        room.variant === "hilow" ? "Hi / Low" : "Standard",
        room.blinds,
        room.players,
        room.stack,
        room.status,
      ];
      const lefts = [306, 476, 596, 736, 881];
      const widths = [150, 100, 120, 130, 66];
      values.forEach((value, valueIndex) => {
        const cell = text(
          `room-${index}-cell-${valueIndex}`,
          value,
          12,
          valueIndex === 4 ? GREEN : "#D1D5DA",
          valueIndex === 4 ? 800 : 600
        );
        cell.width = `${widths[valueIndex]}px`;
        cell.height = "88px";
        placeTopLeft(cell, lefts[valueIndex], 0);
        row.addControl(cell);
      });
      row.onPointerEnterObservable.add(() => {
        row.background = "#353C48";
        row.left = "28px";
      });
      row.onPointerOutObservable.add(() => {
        row.background =
          index === 0 ? "#2E3540" : index % 2 ? "#222730" : "#252A33";
        row.left = "24px";
      });
      row.onPointerUpObservable.add(() =>
        this.controller.openTable(3, room.variant)
      );
    });

    const detail = rect("table-detail", 306, 746, PANEL, 8);
    placeTopLeft(detail, 1270, 92);
    this.root.addControl(detail);
    const preview = rect("detail-preview", 274, 164, "#102E26", 8);
    placeTopLeft(preview, 16, 16);
    detail.addControl(preview);
    const previewFelt = new Ellipse("detail-table");
    previewFelt.width = "226px";
    previewFelt.height = "112px";
    previewFelt.background = FELT;
    previewFelt.color = "#B57A34";
    previewFelt.thickness = 5;
    preview.addControl(previewFelt);
    [0, 1, 2, 3].forEach(index => {
      const miniSeat = new Ellipse(`mini-seat-${index}`);
      miniSeat.width = "23px";
      miniSeat.height = "23px";
      miniSeat.background = index === 3 ? ORANGE : "#39414C";
      miniSeat.color = "#FFFFFF22";
      miniSeat.left = `${[-92, 0, 92, 0][index]}px`;
      miniSeat.top = `${[0, -55, 0, 55][index]}px`;
      preview.addControl(miniSeat);
    });
    const selectedTitle = text(
      "selected-title",
      "Sala Smeraldo",
      21,
      TEXT,
      800
    );
    selectedTitle.width = "274px";
    selectedTitle.height = "38px";
    placeTopLeft(selectedTitle, 16, 204);
    detail.addControl(selectedTitle);
    const selectedMeta = text(
      "selected-meta",
      "STANDARD  ·  25 / 50",
      11,
      ORANGE,
      800
    );
    selectedMeta.width = "274px";
    selectedMeta.height = "26px";
    placeTopLeft(selectedMeta, 16, 242);
    detail.addControl(selectedMeta);
    const detailRows = [
      ["Posti", "3 / 4"],
      ["Buy-in", "5.000"],
      ["Piatto attuale", "325"],
      ["Velocità", "Normale"],
    ];
    detailRows.forEach(([label, value], index) => {
      const row = rect(
        `detail-row-${index}`,
        274,
        42,
        index % 2 ? "#292E38" : "#262B34",
        4
      );
      row.thickness = 0;
      placeTopLeft(row, 16, 292 + index * 48);
      detail.addControl(row);
      const key = text(`detail-key-${index}`, label, 12, MUTED, 500);
      key.width = "130px";
      key.height = "42px";
      placeTopLeft(key, 12, 0);
      row.addControl(key);
      const val = text(`detail-value-${index}`, value, 12, TEXT, 800);
      val.width = "110px";
      val.height = "42px";
      val.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      placeTopLeft(val, 150, 0);
      row.addControl(val);
    });
    const lineup = text("lineup-title", "GIOCATORI AL TAVOLO", 10, MUTED, 800);
    lineup.width = "274px";
    lineup.height = "26px";
    placeTopLeft(lineup, 16, 496);
    detail.addControl(lineup);
    ["Nadia", "Rico", "Mara"].forEach((name, index) => {
      const bot = rect(`lineup-${index}`, 274, 42, "transparent", 0);
      bot.thickness = 0;
      placeTopLeft(bot, 16, 526 + index * 44);
      detail.addControl(bot);
      const botAvatar = new Ellipse(`lineup-avatar-${index}`);
      botAvatar.width = "30px";
      botAvatar.height = "30px";
      botAvatar.background = ["#C85A73", "#4D85C8", "#6A9D55"][index];
      botAvatar.color = "#FFFFFF28";
      placeTopLeft(botAvatar, 0, 6);
      bot.addControl(botAvatar);
      const initial = text(`lineup-initial-${index}`, name[0], 12, TEXT, 900);
      initial.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      botAvatar.addControl(initial);
      const botName = text(`lineup-name-${index}`, name, 12, TEXT, 700);
      botName.width = "120px";
      botName.height = "42px";
      placeTopLeft(botName, 42, 0);
      bot.addControl(botName);
      const thinking = text(
        `lineup-state-${index}`,
        index === 1 ? "RILANCIA" : "IN GIOCO",
        10,
        index === 1 ? ORANGE : GREEN,
        800
      );
      thinking.width = "100px";
      thinking.height = "42px";
      thinking.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      placeTopLeft(thinking, 168, 0);
      bot.addControl(thinking);
    });
    const enter = this.button(
      "ENTRA AL TAVOLO",
      274,
      52,
      () => this.controller.openTable(3, "standard"),
      true
    );
    placeTopLeft(enter, 16, 672);
    detail.addControl(enter);
  }

  private card(
    code: CardCode | null,
    mode: "face" | "back" | "slot",
    width = 70,
    height = 96
  ) {
    const face = mode === "face";
    const card = rect(
      `card-${code ?? mode}-${Math.random()}`,
      width,
      height,
      face ? "#FAFAF7" : mode === "back" ? "#202B36" : "#0B513D66",
      6
    );
    card.color = face ? "#FFFFFF" : mode === "back" ? "#F49A3588" : "#B8D8CC44";
    card.thickness = mode === "slot" ? 2 : 1;
    if (face && code) {
      const { rank, symbol, red } = cardParts(code);
      const rankText = text(
        `rank-${code}-${Math.random()}`,
        rank,
        Math.round(width * 0.29),
        red ? "#D64545" : "#1E2329",
        900
      );
      rankText.width = `${width - 12}px`;
      rankText.height = `${height * 0.34}px`;
      placeTopLeft(rankText, 7, 1);
      card.addControl(rankText);
      const suitText = text(
        `suit-${code}-${Math.random()}`,
        symbol,
        Math.round(width * 0.46),
        red ? "#D64545" : "#1E2329",
        800
      );
      suitText.width = `${width}px`;
      suitText.height = `${height * 0.65}px`;
      suitText.top = `${height * 0.22}px`;
      suitText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      card.addControl(suitText);
    } else if (mode === "back") {
      const inner = rect(
        `card-back-inner-${Math.random()}`,
        width - 10,
        height - 10,
        "#273746",
        4
      );
      inner.color = "#F49A3555";
      card.addControl(inner);
      const symbol = text(
        `card-back-symbol-${Math.random()}`,
        "S♠",
        Math.round(width * 0.23),
        ORANGE,
        900
      );
      symbol.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      inner.addControl(symbol);
    } else {
      const slotMark = text(
        `slot-mark-${Math.random()}`,
        "·",
        24,
        "#8AC0AD55",
        800
      );
      slotMark.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      card.addControl(slotMark);
    }
    return card;
  }

  private seat(player: PlayerState, index: number, table: TableState) {
    const positions = [
      { left: 0, top: 742 },
      { left: -455, top: 205 },
      { left: 0, top: 122 },
      { left: 455, top: 205 },
    ];
    const position = positions[index] ?? positions[0];
    const active = table.status === "playing" && table.turnIndex === index;
    const panel = rect(
      `seat-${player.id}`,
      index === 0 ? 196 : 178,
      index === 0 ? 74 : 70,
      active ? "#313A43FA" : "#20252DF5",
      9
    );
    panel.color = active ? ORANGE : player.folded ? "#FFFFFF0D" : "#FFFFFF20";
    panel.thickness = active ? 2 : 1;
    panel.left = `${position.left}px`;
    panel.top = `${position.top}px`;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(panel);
    const avatar = new Ellipse(`seat-avatar-${player.id}`);
    avatar.width = index === 0 ? "48px" : "44px";
    avatar.height = index === 0 ? "48px" : "44px";
    avatar.background = player.accent;
    avatar.color = active ? ORANGE : "#FFFFFF24";
    avatar.thickness = active ? 3 : 1;
    avatar.left = "-58px";
    if (active) this.registerActiveBorder(panel, avatar);
    panel.addControl(avatar);
    const initial = text(
      `seat-initial-${player.id}`,
      player.name.slice(0, 1).toUpperCase(),
      18,
      TEXT,
      900
    );
    initial.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    avatar.addControl(initial);
    const name = text(`seat-name-${player.id}`, player.name, 14, TEXT, 800);
    name.width = "106px";
    name.height = "25px";
    name.left = "32px";
    name.top = "-15px";
    name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(name);
    const chips = text(
      `seat-chips-${player.id}`,
      `${formatChips(player.chips)} ${t("chips.unit")}`,
      12,
      "#D6DBDF",
      700
    );
    chips.width = "108px";
    chips.height = "24px";
    chips.left = "32px";
    chips.top = "10px";
    chips.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(chips);
    const action = rect(
      `seat-action-${player.id}`,
      92,
      23,
      active ? ORANGE : "#333A44",
      11
    );
    action.thickness = 0;
    action.left = "33px";
    action.top = "31px";
    panel.addControl(action);
    const actionText = text(
      `seat-action-text-${player.id}`,
      player.folded ? "FOLD" : player.lastAction.toUpperCase(),
      9,
      active ? "#17191D" : MUTED,
      800
    );
    actionText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    action.addControl(actionText);

    if (table.dealerIndex === index) {
      const dealer = new Ellipse(`dealer-${player.id}`);
      dealer.width = "25px";
      dealer.height = "25px";
      dealer.background = "#F4F4EE";
      dealer.color = "#D3D4CE";
      dealer.left = "79px";
      dealer.top = "-31px";
      panel.addControl(dealer);
      const d = text(`dealer-letter-${player.id}`, "D", 11, "#22262C", 900);
      d.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      dealer.addControl(d);
    }
  }

  private seatMobile(player: PlayerState, index: number, table: TableState) {
    const active = table.status === "playing" && table.turnIndex === index;
    if (index === 0) {
      const panel = rect(
        `mobile-seat-${player.id}`,
        166,
        48,
        active ? "#313A43FA" : "#20252DF8",
        9
      );
      panel.color = active ? ORANGE : "#FFFFFF20";
      panel.thickness = active ? 2 : 1;
      panel.top = `${this.mobileActionTop(table) - 54}px`;
      panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      this.root.addControl(panel);
      const avatar = new Ellipse(`mobile-seat-avatar-${player.id}`);
      avatar.width = "36px";
      avatar.height = "36px";
      avatar.background = player.accent;
      avatar.color = active ? ORANGE : "#FFFFFF24";
      avatar.left = "-58px";
      panel.addControl(avatar);
      if (active) this.registerActiveBorder(panel, avatar);
      const initial = text(
        `mobile-seat-initial-${player.id}`,
        player.name.slice(0, 1).toUpperCase(),
        14,
        TEXT,
        900
      );
      initial.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      avatar.addControl(initial);
      const name = text(
        `mobile-seat-name-${player.id}`,
        `${player.name}  ·  ${formatChips(player.chips)}`,
        12,
        TEXT,
        800
      );
      name.width = "112px";
      name.height = "23px";
      name.left = "24px";
      name.top = "-10px";
      panel.addControl(name);
      const action = text(
        `mobile-seat-action-${player.id}`,
        player.folded ? "FOLD" : player.lastAction.toUpperCase(),
        9,
        active ? ORANGE : MUTED,
        900
      );
      action.width = "112px";
      action.height = "20px";
      action.left = "24px";
      action.top = "12px";
      panel.addControl(action);
      return;
    }

    const positions = [
      { left: 8, width: 126 },
      { left: 147, width: 126 },
      { left: 286, width: 126 },
    ];
    const position = positions[index - 1] ?? positions[0];
    const showCards = Boolean(
      table.lastResult && !player.folded && player.cards.length === 5
    );
    const panel = rect(
      `mobile-seat-${player.id}`,
      position.width,
      showCards ? 78 : 54,
      active ? "#313A43FA" : "#20252DF8",
      8
    );
    panel.color = active ? ORANGE : player.folded ? "#FFFFFF0D" : "#FFFFFF20";
    panel.thickness = active ? 2 : 1;
    placeTopLeft(panel, position.left, 126);
    this.root.addControl(panel);
    const avatar = new Ellipse(`mobile-seat-avatar-${player.id}`);
    avatar.width = "28px";
    avatar.height = "28px";
    avatar.background = player.accent;
    avatar.color = active ? ORANGE : "#FFFFFF24";
    placeTopLeft(avatar, 8, 8);
    panel.addControl(avatar);
    if (active) this.registerActiveBorder(panel, avatar);
    const initial = text(
      `mobile-seat-initial-${player.id}`,
      player.name.slice(0, 1).toUpperCase(),
      11,
      TEXT,
      900
    );
    initial.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    avatar.addControl(initial);
    const name = text(
      `mobile-seat-name-${player.id}`,
      player.name,
      11,
      TEXT,
      900
    );
    name.width = "76px";
    name.height = "22px";
    placeTopLeft(name, 41, 3);
    panel.addControl(name);
    const chips = text(
      `mobile-seat-chips-${player.id}`,
      formatChips(player.chips),
      10,
      "#D6DBDF",
      700
    );
    chips.width = "76px";
    chips.height = "20px";
    placeTopLeft(chips, 41, 21);
    panel.addControl(chips);
    if (showCards) {
      player.cards.forEach((code, cardIndex) => {
        const card = this.card(code, "face", 19, 26);
        placeTopLeft(card, 10 + cardIndex * 21, 47);
        panel.addControl(card);
      });
    } else {
      const action = text(
        `mobile-seat-action-${player.id}`,
        player.folded ? "FOLD" : player.lastAction.toUpperCase(),
        8,
        active ? ORANGE : MUTED,
        900
      );
      action.width = "110px";
      action.height = "16px";
      placeTopLeft(action, 8, 37);
      action.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      panel.addControl(action);
    }
  }

  private renderTableMobile(table: TableState) {
    const topBar = rect("mobile-table-topbar", "100%", 58, TOP, 0);
    topBar.thickness = 0;
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(topBar);
    const room = text("mobile-table-room", table.name, 14, TEXT, 900);
    room.width = "270px";
    room.height = "30px";
    placeTopLeft(room, 16, 6);
    topBar.addControl(room);
    const roomMeta = text(
      "mobile-table-meta",
      `${variantLabel(table.variant)}  •  ${table.smallBlind}/${table.bigBlind}  •  ${t("meta.hand", { n: table.handNumber })}`,
      9,
      MUTED,
      800
    );
    roomMeta.width = "250px";
    roomMeta.height = "22px";
    placeTopLeft(roomMeta, 16, 30);
    topBar.addControl(roomMeta);
    const live = text("mobile-table-live", t("table.liveShort"), 9, GREEN, 900);
    live.width = "76px";
    live.height = "58px";
    live.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    live.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    live.left = "-12px";
    topBar.addControl(live);

    const phases = rect("mobile-phases", 404, 52, "#171C23F5", 8);
    placeTopLeft(phases, 8, 64);
    this.root.addControl(phases);
    const phaseKeys = [
      "blinds",
      "discard",
      "preflop",
      "flop",
      "turn",
      "river",
      "pot2",
    ];
    const phaseLabels = phaseKeys.map(key => t(`phaseShort.${key}`));
    phaseLabels.forEach((label, index) => {
      const active = table.phase === phaseKeys[index];
      const done =
        phaseKeys.indexOf(table.phase) > index ||
        table.phase === "showdown" ||
        (table.status === "waiting" && table.handNumber > 0);
      const step = rect(
        `mobile-phase-${index}`,
        index === 1 ? 60 : 54,
        38,
        active ? "#3B352B" : "transparent",
        5
      );
      step.thickness = active ? 1 : 0;
      step.color = active ? "#F49A3566" : "transparent";
      placeTopLeft(step, 6 + index * 56, 7);
      phases.addControl(step);
      const marker = text(
        `mobile-phase-marker-${index}`,
        done ? "✓" : String(index + 1),
        8,
        active ? "#17191D" : done ? GREEN : MUTED,
        900
      );
      marker.width = "16px";
      marker.height = "18px";
      marker.color = active ? ORANGE : done ? GREEN : MUTED;
      marker.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      placeTopLeft(marker, 2, 12);
      step.addControl(marker);
      const copy = text(
        `mobile-phase-label-${index}`,
        label,
        index === 1 ? 7 : 8,
        active ? TEXT : done ? "#C0CCC7" : MUTED,
        900
      );
      copy.width = index === 1 ? "42px" : "36px";
      copy.height = "38px";
      placeTopLeft(copy, 18, 0);
      copy.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      step.addControl(copy);
    });

    table.players.forEach((player, index) =>
      this.seatMobile(player, index, table)
    );

    if (!table.lastResult) {
      const pot = rect("mobile-pot", 140, 32, "#172323F5", 16);
      pot.color = "#F49A3566";
      pot.top = "186px";
      pot.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      this.root.addControl(pot);
      const potText = text(
        "mobile-pot-text",
        t("pot.label", { n: formatChips(table.pot) }),
        11,
        ORANGE,
        900
      );
      potText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      pot.addControl(potText);
    }

    const boardOne = rect("mobile-board-one-label", 132, 22, "#101B19ED", 11);
    boardOne.color = "#8EBBAB44";
    placeTopLeft(boardOne, 18, 226);
    this.root.addControl(boardOne);
    const boardOneText = text(
      "mobile-board-one-copy",
      t("board.p1short"),
      9,
      "#B9D6CB",
      900
    );
    boardOneText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    boardOne.addControl(boardOneText);
    const boardTwo = rect("mobile-board-two-label", 88, 22, "#101B19ED", 11);
    boardTwo.color = "#8EBBAB44";
    placeTopLeft(boardTwo, 314, 226);
    this.root.addControl(boardTwo);
    const boardTwoText = text(
      "mobile-board-two-copy",
      t("board.p2short"),
      9,
      "#B9D6CB",
      900
    );
    boardTwoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    boardTwo.addControl(boardTwoText);

    this.renderHumanHandMobile(table);
    if (table.lastResult) this.renderResultMobile(table);
    else this.renderActionsMobile(table);
  }

  private renderHumanHandMobile(table: TableState) {
    const human = table.players[0];
    if (!human?.cards.length) return;
    const discard = table.phase === "discard" && human.cards.length === 6;
    const seatTop = this.mobileActionTop(table) - 54;
    const handTop = seatTop - (discard ? 116 : 96);
    human.cards.forEach((code, index) => {
      const card = this.card(code, "face", 62, 88);
      const spread = human.cards.length === 6 ? 48 : 52;
      card.left = `${(index - (human.cards.length - 1) / 2) * spread}px`;
      card.top = `${handTop}px`;
      card.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      card.rotation =
        ((index - (human.cards.length - 1) / 2) * 1.35 * Math.PI) / 180;
      if (discard) {
        card.hoverCursor = "pointer";
        card.onPointerUpObservable.add(() =>
          this.controller.humanDiscard(code)
        );
      }
      this.root.addControl(card);
    });
    if (discard) {
      const hint = rect("mobile-discard-hint", 280, 32, "#2E261EF2", 16);
      hint.color = "#F49A3566";
      hint.top = `${handTop - 40}px`;
      hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      this.root.addControl(hint);
      const hintText = text(
        "mobile-discard-hint-text",
        t("discard.hintMobile"),
        10,
        ORANGE,
        900
      );
      hintText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      hint.addControl(hintText);
    }
  }

  private renderActionsMobile(table: TableState) {
    const human = table.players[0];
    const humanTurn =
      table.status === "playing" && table.turnIndex === 0 && !human.folded;
    const panel = rect(
      "mobile-action-panel",
      408,
      table.status === "waiting" ? 112 : 126,
      "#171C23FA",
      9
    );
    panel.color = humanTurn ? "#F49A3566" : BORDER;
    placeTopLeft(panel, 6, this.mobileActionTop(table));
    this.root.addControl(panel);
    if (table.status === "waiting") {
      const completed = text(
        "mobile-completed",
        table.lastResult ? t("waiting.done") : t("waiting.ready"),
        15,
        TEXT,
        900
      );
      completed.width = "174px";
      completed.height = "42px";
      placeTopLeft(completed, 14, 8);
      panel.addControl(completed);
      const start = this.button(
        table.handNumber === 0 ? t("button.play") : t("button.newHand"),
        190,
        48,
        () => this.controller.startHand(),
        true
      );
      placeTopLeft(start, 204, 12);
      panel.addControl(start);
      return;
    }

    const callAmount = Math.max(0, table.roundMaxBet - human.roundBet);
    const canRaise =
      humanTurn &&
      table.roundRaises === 0 &&
      human.chips > callAmount + table.bigBlind;
    const fold = this.button("FOLD", 88, 44, () =>
      this.controller.humanAction("fold")
    );
    placeTopLeft(fold, 12, 10);
    fold.isEnabled = humanTurn;
    panel.addControl(fold);
    const checkCall = this.button(
      callAmount ? t("action.callN", { n: callAmount }) : "CHECK",
      128,
      44,
      () => this.controller.humanAction(callAmount ? "call" : "check"),
      true
    );
    placeTopLeft(checkCall, 106, 10);
    checkCall.isEnabled = humanTurn;
    panel.addControl(checkCall);
    const allIn = this.button("ALL-IN", 88, 44, () =>
      this.controller.humanAction("allin")
    );
    placeTopLeft(allIn, 240, 10);
    allIn.isEnabled = humanTurn;
    panel.addControl(allIn);
    const timerText = text(
      "mobile-turn-state",
      humanTurn
        ? t("turn.yours")
        : t("decision.thinkingShort", {
            name: table.players[table.turnIndex]?.name ?? t("dealer.fallback"),
          }),
      9,
      humanTurn ? ORANGE : MUTED,
      900
    );
    timerText.width = "66px";
    timerText.height = "44px";
    timerText.textWrapping = true;
    timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    placeTopLeft(timerText, 334, 10);
    panel.addControl(timerText);

    const slider = new Slider("mobile-raise-slider");
    slider.minimum = Math.max(
      table.roundMaxBet + table.bigBlind,
      table.bigBlind * 2
    );
    slider.maximum = Math.max(slider.minimum, human.chips + human.roundBet);
    slider.value = Math.min(
      slider.maximum,
      Math.max(slider.minimum, table.roundMaxBet + table.bigBlind * 2)
    );
    slider.width = "212px";
    slider.height = "18px";
    slider.color = ORANGE;
    slider.background = "#3A414B";
    slider.thumbColor = "#FFB45D";
    slider.isEnabled = canRaise;
    placeTopLeft(slider, 14, 78);
    panel.addControl(slider);
    // Importo di rilancio mostrato sul pulsante e aggiornato in tempo reale
    // mentre si trascina lo slider (prima restava fisso al valore iniziale).
    const raiseLabel = (value: number) =>
      t("action.raiseN", { n: Math.round(value) });
    const raise = this.button(
      raiseLabel(slider.value),
      158,
      44,
      () => this.controller.humanAction("raise", Math.round(slider.value)),
      true
    );
    placeTopLeft(raise, 238, 67);
    raise.isEnabled = canRaise;
    panel.addControl(raise);
    slider.onValueChangedObservable.add(value => {
      if (raise.textBlock) raise.textBlock.text = raiseLabel(value);
    });
  }

  private renderResultMobile(table: TableState) {
    const result = table.lastResult!;
    const overlay = rect("mobile-result-overlay", 408, 126, "#171C23FC", 9);
    overlay.color = ORANGE;
    overlay.shadowColor = "#000000";
    overlay.shadowBlur = 18;
    placeTopLeft(overlay, 6, this.mobileActionTop(table));
    this.root.addControl(overlay);
    const eyebrow = text(
      "mobile-result-eyebrow",
      `${t("result.showdown")}  ·  ${result.splitRule === "solo" ? t("result.solo") : t("result.split")}`,
      10,
      ORANGE,
      900
    );
    eyebrow.width = "270px";
    eyebrow.height = "24px";
    placeTopLeft(eyebrow, 14, 8);
    overlay.addControl(eyebrow);
    const pot1 = text(
      "mobile-result-pot1",
      `P1  ${result.bestPot1}  ·  ${result.pot1Winners.join(", ")}`,
      10,
      "#D7DCE1",
      800
    );
    pot1.width = "270px";
    pot1.height = "28px";
    placeTopLeft(pot1, 14, 36);
    overlay.addControl(pot1);
    const pot2 = text(
      "mobile-result-pot2",
      `P2  ${result.bestPot2}  ·  ${result.pot2Winners.join(", ")}`,
      10,
      "#D7DCE1",
      800
    );
    pot2.width = "270px";
    pot2.height = "28px";
    placeTopLeft(pot2, 14, 64);
    overlay.addControl(pot2);
    const close = this.button(
      t("button.newHand"),
      112,
      78,
      () => this.controller.startHand(),
      true
    );
    placeTopLeft(close, 282, 24);
    overlay.addControl(close);
  }

  private renderTable(table: TableState) {
    const topBar = rect("table-topbar", "100%", 58, TOP, 0);
    topBar.thickness = 0;
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(topBar);
    this.brand(topBar, true);
    const room = text("table-room", table.name, 14, TEXT, 800);
    room.width = "300px";
    room.height = "58px";
    placeTopLeft(room, 404, 0);
    topBar.addControl(room);
    const roomMeta = text(
      "table-room-meta",
      `${variantLabel(table.variant)}   •   ${table.smallBlind} / ${table.bigBlind}   •   ${t("meta.hand", { n: table.handNumber })}`,
      11,
      MUTED,
      700
    );
    roomMeta.width = "410px";
    roomMeta.height = "58px";
    placeTopLeft(roomMeta, 714, 0);
    topBar.addControl(roomMeta);
    const live = text("table-live", t("table.live"), 11, GREEN, 800);
    live.width = "160px";
    live.height = "58px";
    live.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    live.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    live.left = "-24px";
    topBar.addControl(live);

    const phasePanel = rect("phase-panel", 190, 438, PANEL_3, 7);
    placeTopLeft(phasePanel, 16, 76);
    this.root.addControl(phasePanel);
    const phaseTitle = text("phase-title", t("phase.title"), 11, MUTED, 800);
    phaseTitle.width = "158px";
    phaseTitle.height = "38px";
    placeTopLeft(phaseTitle, 16, 8);
    phasePanel.addControl(phaseTitle);
    const phaseKeys = [
      "blinds",
      "discard",
      "preflop",
      "flop",
      "turn",
      "river",
      "pot2",
    ];
    const phaseLabels = phaseKeys.map(key => t(`phase.${key}`));
    phaseLabels.forEach((label, index) => {
      const active = table.phase === phaseKeys[index];
      const done =
        phaseKeys.indexOf(table.phase) > index ||
        table.phase === "showdown" ||
        (table.status === "waiting" && table.handNumber > 0);
      const step = rect(
        `phase-step-${index}`,
        158,
        48,
        active ? "#3B352B" : "transparent",
        5
      );
      step.thickness = active ? 1 : 0;
      step.color = active ? "#F49A3566" : "transparent";
      placeTopLeft(step, 16, 50 + index * 56);
      phasePanel.addControl(step);
      const number = new Ellipse(`phase-number-${index}`);
      number.width = "26px";
      number.height = "26px";
      number.background = active ? ORANGE : done ? "#276B57" : "#303640";
      number.color = number.background;
      number.left = "-55px";
      step.addControl(number);
      const numberText = text(
        `phase-number-text-${index}`,
        done ? "✓" : String(index + 1),
        10,
        done || active ? TEXT : MUTED,
        900
      );
      numberText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      number.addControl(numberText);
      const labelText = text(
        `phase-label-${index}`,
        label,
        13,
        active ? TEXT : done ? "#B9C7C2" : MUTED,
        active ? 800 : 600
      );
      labelText.width = "105px";
      labelText.height = "48px";
      labelText.left = "24px";
      step.addControl(labelText);
    });

    const logPanel = rect("log-panel", 190, 248, PANEL_3, 7);
    placeTopLeft(logPanel, 16, 528);
    this.root.addControl(logPanel);
    const logTitle = text("log-title", t("log.title"), 11, MUTED, 800);
    logTitle.width = "158px";
    logTitle.height = "34px";
    placeTopLeft(logTitle, 16, 5);
    logPanel.addControl(logTitle);
    const viewer = new ScrollViewer("log-scroll");
    viewer.width = "160px";
    viewer.height = "194px";
    viewer.top = "38px";
    viewer.thickness = 0;
    viewer.barColor = ORANGE;
    viewer.barSize = 3;
    logPanel.addControl(viewer);
    const logStack = new StackPanel("log-stack");
    logStack.width = "154px";
    viewer.addControl(logStack);
    table.log.slice(0, VISIBLE_LOG_LINES).forEach((entry, index) => {
      const line = text(
        `log-line-${index}`,
        entry,
        10,
        index === 0 ? "#E1E4E7" : "#7E8792",
        index === 0 ? 700 : 500
      );
      line.width = "150px";
      line.height = "46px";
      line.textWrapping = true;
      line.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      logStack.addControl(line);
    });

    table.players.forEach((player, index) => this.seat(player, index, table));

    const pot = rect("pot-display", 186, 48, "#1A2424E8", 24);
    pot.color = "#F49A3566";
    pot.top = "194px";
    pot.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(pot);
    const potText = text(
      "pot-text",
      t("pot.label", { n: formatChips(table.pot) }),
      14,
      ORANGE,
      900
    );
    potText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    pot.addControl(potText);

    // Le carte comuni sono mesh 3D. La GUI conserva solo le etichette della
    // specifica vincolante: tre Flop, due Turn, una River; Piatto 2 a destra.
    const groupLabels = [
      ["FLOP", -202, 250],
      ["TURN", 20, 164],
      ["RIVER", 162, 92],
    ] as const;
    groupLabels.forEach(([label, left, width]) => {
      const copy = text(`board-group-${label}`, label, 11, "#B9D6CB", 800);
      copy.width = `${width}px`;
      copy.height = "24px";
      copy.left = `${left}px`;
      copy.top = "390px";
      copy.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      copy.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      this.root.addControl(copy);
    });
    const pot1Label = text("pot1-label", t("board.p1"), 10, "#9CC1B3", 800);
    pot1Label.width = "210px";
    pot1Label.height = "24px";
    pot1Label.left = "-337px";
    pot1Label.top = "250px";
    pot1Label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    pot1Label.rotation = -Math.PI / 2;
    this.root.addControl(pot1Label);

    const separator = rect("board-separator", 2, 182, "#B7D8CC55", 0);
    separator.thickness = 0;
    separator.left = "255px";
    separator.top = "250px";
    separator.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.root.addControl(separator);
    const pot2Label = text("pot2-label", t("board.p2"), 10, "#9CC1B3", 800);
    pot2Label.width = "110px";
    pot2Label.height = "24px";
    pot2Label.left = "352px";
    pot2Label.top = "350px";
    pot2Label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    pot2Label.rotation = Math.PI / 2;
    this.root.addControl(pot2Label);
    this.renderHumanHand(table);
    this.renderActions(table);
  }

  private renderHumanHand(table: TableState) {
    const human = table.players[0];
    if (!human?.cards.length) return;
    const discard = table.phase === "discard" && human.cards.length === 6;
    human.cards.forEach((code, index) => {
      const card = this.card(code, "face", 78, 108);
      const spread = human.cards.length === 6 ? 62 : 70;
      card.left = `${(index - (human.cards.length - 1) / 2) * spread}px`;
      card.top = discard ? "596px" : "618px";
      card.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      card.rotation =
        ((index - (human.cards.length - 1) / 2) * 1.7 * Math.PI) / 180;
      if (discard) {
        card.hoverCursor = "pointer";
        card.onPointerEnterObservable.add(() => {
          card.top = "580px";
          card.color = ORANGE;
          card.thickness = 3;
        });
        card.onPointerOutObservable.add(() => {
          card.top = "596px";
          card.color = "#FFFFFF";
          card.thickness = 1;
        });
        card.onPointerUpObservable.add(() =>
          this.controller.humanDiscard(code)
        );
      }
      this.root.addControl(card);
    });
    if (discard) {
      const hint = rect("discard-hint", 366, 36, "#2E261EEB", 18);
      hint.color = "#F49A3566";
      hint.top = "550px";
      hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      this.root.addControl(hint);
      const hintText = text(
        "discard-hint-text",
        t("discard.hint"),
        11,
        ORANGE,
        900
      );
      hintText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      hint.addControl(hintText);
    }
  }

  private renderActions(table: TableState) {
    const human = table.players[0];
    const humanTurn =
      table.status === "playing" && table.turnIndex === 0 && !human.folded;
    const panel = rect("action-panel", 312, 272, PANEL_3, 8);
    panel.color = humanTurn ? "#F49A3566" : BORDER;
    placeTopLeft(panel, 1272, 528);
    this.root.addControl(panel);
    const title = text(
      "action-title",
      humanTurn ? t("turn.yours") : t("panel.actions"),
      12,
      humanTurn ? ORANGE : MUTED,
      900
    );
    title.width = "280px";
    title.height = "36px";
    placeTopLeft(title, 16, 6);
    panel.addControl(title);

    if (table.status === "waiting") {
      const completed = text(
        "completed",
        table.lastResult
          ? `${t("result.showdown")} · ${table.lastResult.splitRule === "solo" ? t("result.solo") : t("result.splitShort")}`
          : t("waiting.ready"),
        18,
        table.lastResult ? ORANGE : TEXT,
        900
      );
      completed.width = "280px";
      completed.height = "42px";
      placeTopLeft(completed, 16, 42);
      panel.addControl(completed);
      if (table.lastResult) {
        const pot1 = text(
          "completed-pot1",
          `P1  ${table.lastResult.bestPot1}\n${table.lastResult.pot1Winners.join(", ")}`,
          10,
          "#D7DCE1",
          700
        );
        pot1.width = "132px";
        pot1.height = "58px";
        placeTopLeft(pot1, 16, 88);
        panel.addControl(pot1);
        const pot2 = text(
          "completed-pot2",
          `P2  ${table.lastResult.bestPot2}\n${table.lastResult.pot2Winners.join(", ")}`,
          10,
          "#D7DCE1",
          700
        );
        pot2.width = "132px";
        pot2.height = "58px";
        placeTopLeft(pot2, 156, 88);
        panel.addControl(pot2);
      }
      const start = this.button(
        table.handNumber === 0 ? t("button.play") : t("button.newHand"),
        280,
        52,
        () => this.controller.startHand(),
        true
      );
      placeTopLeft(start, 16, table.lastResult ? 180 : 112);
      panel.addControl(start);
      return;
    }

    const callAmount = Math.max(0, table.roundMaxBet - human.roundBet);
    const canRaise =
      humanTurn &&
      table.roundRaises === 0 &&
      human.chips > callAmount + table.bigBlind;
    const fold = this.button("FOLD", 84, 46, () =>
      this.controller.humanAction("fold")
    );
    placeTopLeft(fold, 16, 48);
    fold.isEnabled = humanTurn;
    panel.addControl(fold);
    const checkCall = this.button(
      callAmount ? t("action.callN", { n: callAmount }) : "CHECK",
      102,
      46,
      () => this.controller.humanAction(callAmount ? "call" : "check"),
      true
    );
    placeTopLeft(checkCall, 105, 48);
    checkCall.isEnabled = humanTurn;
    panel.addControl(checkCall);
    const allIn = this.button("ALL-IN", 84, 46, () =>
      this.controller.humanAction("allin")
    );
    placeTopLeft(allIn, 212, 48);
    allIn.isEnabled = humanTurn;
    panel.addControl(allIn);

    const slider = new Slider("raise-slider");
    slider.minimum = Math.max(
      table.roundMaxBet + table.bigBlind,
      table.bigBlind * 2
    );
    slider.maximum = Math.max(slider.minimum, human.chips + human.roundBet);
    slider.value = Math.min(
      slider.maximum,
      Math.max(slider.minimum, table.roundMaxBet + table.bigBlind * 2)
    );
    slider.width = "180px";
    slider.height = "18px";
    slider.color = ORANGE;
    slider.background = "#3A414B";
    slider.thumbColor = "#FFB45D";
    slider.isEnabled = canRaise;
    placeTopLeft(slider, 16, 126);
    panel.addControl(slider);
    const raise = this.button(
      "RAISE",
      94,
      44,
      () => this.controller.humanAction("raise", Math.round(slider.value)),
      true
    );
    placeTopLeft(raise, 202, 112);
    raise.isEnabled = canRaise;
    panel.addControl(raise);
    const amount = text(
      "raise-amount",
      t("bet.amount", { n: Math.round(slider.value) }),
      12,
      ORANGE,
      800
    );
    amount.width = "180px";
    amount.height = "30px";
    placeTopLeft(amount, 16, 151);
    panel.addControl(amount);
    // L'importo si aggiorna mentre si trascina lo slider (era statico).
    slider.onValueChangedObservable.add(value => {
      amount.text = t("bet.amount", { n: Math.round(value) });
    });
    const timer = rect(
      "decision-timer",
      280,
      48,
      humanTurn ? "#2C312D" : "#242A32",
      6
    );
    timer.color = humanTurn ? "#F49A3544" : BORDER;
    placeTopLeft(timer, 16, 196);
    panel.addControl(timer);
    const timerText = text(
      "decision-timer-text",
      humanTurn
        ? t("decision.timer")
        : t("decision.thinking", {
            name: table.players[table.turnIndex]?.name ?? t("dealer.fallback"),
          }),
      11,
      humanTurn ? ORANGE : MUTED,
      800
    );
    timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    timer.addControl(timerText);
  }

  private renderResult(table: TableState) {
    const result = table.lastResult!;
    const overlay = rect("result-overlay", 590, 224, "#1C2129FA", 10);
    overlay.color = ORANGE;
    overlay.shadowColor = "#000000";
    overlay.shadowBlur = 30;
    this.root.addControl(overlay);
    const eyebrow = text(
      "result-eyebrow",
      `${t("result.showdown")}  ·  ${result.splitRule === "solo" ? t("result.solo") : t("result.split")}`,
      11,
      ORANGE,
      900
    );
    eyebrow.width = "550px";
    eyebrow.height = "30px";
    eyebrow.top = "16px";
    eyebrow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    eyebrow.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    overlay.addControl(eyebrow);
    const title = text(
      "result-title",
      result.splitRule === "solo" ? t("result.solo") : t("result.titleSplit"),
      25,
      TEXT,
      900
    );
    title.width = "550px";
    title.height = "42px";
    title.top = "47px";
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    overlay.addControl(title);
    const pot1 = text(
      "result-pot1",
      `${t("result.pot1")}  ·  ${result.bestPot1}  ·  ${result.pot1Winners.join(", ")}`,
      13,
      "#D7DCE1",
      700
    );
    pot1.width = "530px";
    pot1.height = "30px";
    pot1.top = "103px";
    pot1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    pot1.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    overlay.addControl(pot1);
    const pot2 = text(
      "result-pot2",
      `${t("result.pot2")}  ·  ${result.bestPot2}  ·  ${result.pot2Winners.join(", ")}`,
      13,
      "#D7DCE1",
      700
    );
    pot2.width = "530px";
    pot2.height = "30px";
    pot2.top = "136px";
    pot2.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    pot2.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    overlay.addControl(pot2);
    const close = this.button(
      t("button.continue"),
      160,
      38,
      () => this.controller.startHand(),
      true
    );
    close.top = "171px";
    close.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    overlay.addControl(close);
  }

  /** Registra i controlli del posto attivo che tick() farà pulsare. */
  private registerActiveBorder(...controls: (Rectangle | Ellipse)[]) {
    this.activeBorders.push(...controls);
    // Invalida la cache così tick() riapplica il colore ai nuovi controlli,
    // anche se registrati fuori dal ciclo di rebuild.
    this.lastBorderAlphaByte = -1;
  }

  tick(elapsed: number) {
    // Punti di stato: aggiorna l'alpha SOLO se la pulsazione quantizzata (0..255)
    // è cambiata dal frame precedente → niente invalidazioni GUI a vuoto.
    if (this.pulseDots.length) {
      const dotPulse = Math.round(pulse01(elapsed) * 255);
      if (dotPulse !== this.lastDotPulse) {
        this.lastDotPulse = dotPulse;
        this.pulseDots.forEach((dot, index) => {
          dot.alpha = dotPulseAlpha(elapsed, index);
        });
      }
    }
    // Bordo del giocatore di turno: alpha arancione pulsante (respira senza
    // sparire). Solo colore del bordo, non alpha del pannello, così nome/stack
    // restano pienamente leggibili. Riassegna SOLO se il colore quantizzato è
    // cambiato dal frame precedente: evita invalidazioni GUI inutili su mobile.
    if (this.activeBorders.length) {
      const alphaByte = activeBorderAlphaByte(elapsed);
      if (alphaByte !== this.lastBorderAlphaByte) {
        this.lastBorderAlphaByte = alphaByte;
        // Stringa colore costruita SOLO sul cache-miss (niente alloc per-frame).
        const color = withPulseAlpha(ORANGE, elapsed);
        this.activeBorders.forEach(border => (border.color = color));
      }
    }
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    // Svuota gli array animati da tick(): se il loop girasse dopo il dispose non
    // scriverebbe su controlli già distrutti.
    this.pulseDots = [];
    this.activeBorders = [];
    this.audioContext?.close().catch(() => undefined);
    this.gui.dispose();
  }
}

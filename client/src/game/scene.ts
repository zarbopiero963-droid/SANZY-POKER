/**
 * Direzione: client poker 3D realistico, camera alta prospettica, sala visibile,
 * persone sedute e tavolo come oggetto fisico. La GUI resta soltanto HUD.
 */

import {
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  CubicEase,
  DirectionalLight,
  DynamicTexture,
  EasingFunction,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { GameController, type PlayerState, type TableState } from "./state";
import { cardParts, type CardCode, type Variant } from "./rules";
import { PokerUI } from "./ui";

export type GameHandle = {
  scene: Scene;
  controller: GameController;
  dispose: () => void;
};

const FELT = new Color3(0.035, 0.31, 0.205);
const RAIL = new Color3(0.055, 0.075, 0.07);
const WOOD = new Color3(0.18, 0.085, 0.035);
const GOLD = new Color3(0.96, 0.49, 0.12);

function material(scene: Scene, name: string, color: Color3, rough = 0.8) {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(1 - rough, 1 - rough, 1 - rough);
  return value;
}

function cylinderBetween(
  scene: Scene,
  name: string,
  from: Vector3,
  to: Vector3,
  radius: number,
  mat: StandardMaterial
) {
  const direction = to.subtract(from);
  const length = direction.length();
  const limb = MeshBuilder.CreateCylinder(
    name,
    { height: length, diameter: radius * 2, tessellation: 14 },
    scene
  );
  limb.position = from.add(to).scale(0.5);
  const unitDirection = direction.normalize();
  const up = Vector3.Up();
  const dot = Math.max(-1, Math.min(1, Vector3.Dot(up, unitDirection)));
  if (dot > 0.999999) {
    limb.rotationQuaternion = Quaternion.Identity();
  } else if (dot < -0.999999) {
    limb.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), Math.PI);
  } else {
    const axis = Vector3.Cross(up, unitDirection).normalize();
    limb.rotationQuaternion = Quaternion.RotationAxis(axis, Math.acos(dot));
  }
  limb.material = mat;
  return limb;
}

function createChair(scene: Scene, parent: TransformNode, name: string) {
  const darkWood = material(
    scene,
    `${name}-wood`,
    new Color3(0.12, 0.055, 0.026),
    0.72
  );
  const leather = material(
    scene,
    `${name}-leather`,
    new Color3(0.055, 0.07, 0.068),
    0.48
  );
  const seat = MeshBuilder.CreateBox(
    `${name}-seat`,
    { width: 1.15, height: 0.18, depth: 1.05 },
    scene
  );
  seat.parent = parent;
  seat.position.y = 1.05;
  seat.position.z = 0.08;
  seat.material = leather;
  const back = MeshBuilder.CreateBox(
    `${name}-back`,
    { width: 1.22, height: 1.42, depth: 0.18 },
    scene
  );
  back.parent = parent;
  back.position.set(0, 1.7, 0.52);
  back.rotation.x = -0.1;
  back.material = leather;
  [-0.48, 0.48].forEach(x => {
    [-0.35, 0.4].forEach(z => {
      const leg = MeshBuilder.CreateCylinder(
        `${name}-leg-${x}-${z}`,
        { height: 1.02, diameter: 0.1, tessellation: 12 },
        scene
      );
      leg.parent = parent;
      leg.position.set(x, 0.51, z);
      leg.material = darkWood;
    });
  });
  const rail = MeshBuilder.CreateBox(
    `${name}-rail`,
    { width: 1.28, height: 0.12, depth: 0.12 },
    scene
  );
  rail.parent = parent;
  rail.position.set(0, 2.35, 0.46);
  rail.material = darkWood;
}

function createPerson(
  scene: Scene,
  parent: TransformNode,
  name: string,
  shirtHex: string,
  skin: Color3,
  hair: Color3
) {
  const shirt = material(
    scene,
    `${name}-shirt`,
    Color3.FromHexString(shirtHex),
    0.7
  );
  const skinMat = material(scene, `${name}-skin`, skin, 0.82);
  const hairMat = material(scene, `${name}-hair`, hair, 0.9);
  const trousers = material(
    scene,
    `${name}-trousers`,
    new Color3(0.045, 0.055, 0.075),
    0.86
  );

  const torso = MeshBuilder.CreateCapsule(
    `${name}-torso`,
    { height: 1.72, radius: 0.48, tessellation: 18 },
    scene
  );
  torso.parent = parent;
  torso.position.set(0, 2.02, -0.08);
  torso.scaling.z = 0.72;
  torso.material = shirt;
  const head = MeshBuilder.CreateSphere(
    `${name}-head`,
    { diameter: 0.72, segments: 20 },
    scene
  );
  head.parent = parent;
  head.position.set(0, 3.1, -0.18);
  head.scaling.z = 0.9;
  head.material = skinMat;
  const hairCap = MeshBuilder.CreateSphere(
    `${name}-hair`,
    { diameter: 0.75, segments: 18, slice: 0.58 },
    scene
  );
  hairCap.parent = parent;
  hairCap.position.set(0, 3.24, -0.13);
  hairCap.rotation.x = Math.PI;
  hairCap.material = hairMat;

  cylinderBetween(
    scene,
    `${name}-arm-l`,
    new Vector3(-0.35, 2.48, -0.17),
    new Vector3(-0.72, 1.82, -0.82),
    0.14,
    skinMat
  ).parent = parent;
  cylinderBetween(
    scene,
    `${name}-arm-r`,
    new Vector3(0.35, 2.48, -0.17),
    new Vector3(0.72, 1.82, -0.82),
    0.14,
    skinMat
  ).parent = parent;
  cylinderBetween(
    scene,
    `${name}-leg-l`,
    new Vector3(-0.22, 1.47, 0.05),
    new Vector3(-0.25, 0.35, -0.22),
    0.18,
    trousers
  ).parent = parent;
  cylinderBetween(
    scene,
    `${name}-leg-r`,
    new Vector3(0.22, 1.47, 0.05),
    new Vector3(0.25, 0.35, -0.22),
    0.18,
    trousers
  ).parent = parent;
}

function createCardTexture(
  scene: Scene,
  name: string,
  code: CardCode | null,
  face: boolean
) {
  const texture = new DynamicTexture(
    `${name}-texture`,
    { width: 384, height: 540 },
    scene,
    false
  );
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 384, 540);
  if (!face || !code) {
    context.fillStyle = "#162835";
    context.fillRect(0, 0, 384, 540);
    context.strokeStyle = "#f39a36";
    context.lineWidth = 20;
    context.strokeRect(30, 30, 324, 480);
    context.strokeStyle = "#79909b";
    context.lineWidth = 5;
    context.strokeRect(54, 54, 276, 432);
    texture.update();
    texture.drawText("S", null, 330, "900 112px Arial", "#f39a36", null, true);
  } else {
    const { rank, symbol, red } = cardParts(code);
    const ink = red ? "#d53b3f" : "#161b20";
    context.fillStyle = "#f8f5ea";
    context.fillRect(0, 0, 384, 540);
    texture.update();
    texture.drawText(rank, 24, 118, "900 98px Arial", ink, null, true);
    texture.drawText(symbol, 28, 212, "900 82px Arial", ink, null, true);
    texture.drawText(symbol, null, 405, "900 206px Arial", ink, null, true);
  }
  return texture;
}

function createCard(
  scene: Scene,
  root: TransformNode,
  name: string,
  code: CardCode | null,
  face: boolean,
  x: number,
  z: number,
  rotation = 0,
  flipDelayFrames = -1,
  dealFrom?: { x: number; z: number }
) {
  const card = MeshBuilder.CreateBox(
    name,
    { width: 0.68, height: 0.035, depth: 0.98 },
    scene
  );
  card.parent = root;
  card.position.set(x, 1.83, z);
  card.rotation.y = rotation;
  card.material = material(
    scene,
    `${name}-edge-mat`,
    face ? new Color3(0.91, 0.9, 0.85) : new Color3(0.04, 0.075, 0.09),
    0.58
  );
  const facePlane = MeshBuilder.CreatePlane(
    `${name}-face`,
    { width: 0.64, height: 0.94 },
    scene
  );
  facePlane.parent = card;
  facePlane.position.y = 0.019;
  facePlane.rotation.x = Math.PI / 2;
  const faceMat = material(
    scene,
    `${name}-face-mat`,
    new Color3(1, 1, 1),
    0.72
  );
  faceMat.diffuseTexture = createCardTexture(scene, name, code, face);
  faceMat.emissiveColor = face
    ? new Color3(0.08, 0.08, 0.07)
    : new Color3(0.025, 0.045, 0.055);
  faceMat.backFaceCulling = false;
  facePlane.material = faceMat;

  const backPlane = MeshBuilder.CreatePlane(
    `${name}-back`,
    { width: 0.64, height: 0.94 },
    scene
  );
  backPlane.parent = card;
  backPlane.position.y = -0.019;
  backPlane.rotation.x = -Math.PI / 2;
  const backMat = material(
    scene,
    `${name}-back-mat`,
    new Color3(1, 1, 1),
    0.76
  );
  backMat.diffuseTexture = createCardTexture(
    scene,
    `${name}-back`,
    null,
    false
  );
  backMat.emissiveColor = new Color3(0.025, 0.045, 0.055);
  backMat.backFaceCulling = false;
  backPlane.material = backMat;

  if (face && flipDelayFrames >= 0) {
    // Distribuzione: la carta attende il suo turno (stagger `delay`), poi
    // scivola dal mazzo allo slot (`slide` frame) e infine si gira scoperta.
    const delay = Math.max(0, flipDelayFrames);
    const dealing = dealFrom != null;
    const slide = dealing ? 12 : 0;
    const flipStart = delay + slide;
    const middle = flipStart + 13;
    const end = flipStart + 26;
    card.rotation.x = Math.PI; // parte coperta

    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    const animations: Animation[] = [];

    if (dealing) {
      card.position.x = dealFrom.x;
      card.position.z = dealFrom.z;
      const slideX = new Animation(
        `${name}-slide-x`,
        "position.x",
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      slideX.setKeys([
        { frame: 0, value: dealFrom.x },
        { frame: delay, value: dealFrom.x },
        { frame: flipStart, value: x },
      ]);
      slideX.setEasingFunction(easing);
      const slideZ = new Animation(
        `${name}-slide-z`,
        "position.z",
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      slideZ.setKeys([
        { frame: 0, value: dealFrom.z },
        { frame: delay, value: dealFrom.z },
        { frame: flipStart, value: z },
      ]);
      slideZ.setEasingFunction(easing);
      animations.push(slideX, slideZ);
    }

    const startY = dealing ? 2.12 : 1.86;
    card.position.y = startY;

    const flip = new Animation(
      `${name}-flip`,
      "rotation.x",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    flip.setKeys([
      { frame: 0, value: Math.PI },
      { frame: flipStart, value: Math.PI },
      { frame: middle, value: Math.PI / 2 },
      { frame: end, value: 0 },
    ]);
    flip.setEasingFunction(easing);

    const lift = new Animation(
      `${name}-lift`,
      "position.y",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    lift.setKeys(
      dealing
        ? [
            { frame: 0, value: startY },
            { frame: delay, value: startY },
            { frame: flipStart, value: 1.86 },
            { frame: middle, value: 2.18 },
            { frame: end, value: 1.83 },
          ]
        : [
            { frame: 0, value: 1.86 },
            { frame: delay, value: 1.86 },
            { frame: middle, value: 2.18 },
            { frame: end, value: 1.83 },
          ]
    );
    lift.setEasingFunction(easing);
    animations.push(flip, lift);
    card.animations = animations;
    scene.beginAnimation(card, 0, end, false);
  }
  return card;
}

function createSlot(
  scene: Scene,
  root: TransformNode,
  name: string,
  x: number,
  z: number
) {
  const slot = MeshBuilder.CreateBox(
    name,
    { width: 0.72, height: 0.012, depth: 1.02 },
    scene
  );
  slot.parent = root;
  slot.position.set(x, 1.8, z);
  const slotMat = material(
    scene,
    `${name}-mat`,
    new Color3(0.02, 0.19, 0.13),
    0.9
  );
  slotMat.alpha = 0.7;
  slot.material = slotMat;
}

function createChip(
  scene: Scene,
  root: TransformNode,
  name: string,
  x: number,
  y: number,
  z: number,
  color: Color3,
  from?: { x: number; z: number },
  delayFrames = -1
) {
  const chip = MeshBuilder.CreateCylinder(
    name,
    { height: 0.06, diameter: 0.31, tessellation: 24 },
    scene
  );
  chip.parent = root;
  chip.position.set(x, y, z);
  chip.material = material(scene, `${name}-mat`, color, 0.4);

  // Convergenza al piatto: la fiche nuova entra dal fronte del tavolo e scivola
  // (con un piccolo arco) fino alla sua posizione nella pila del piatto.
  if (from && delayFrames >= 0) {
    const delay = Math.max(0, delayFrames);
    const end = delay + 12;
    chip.position.set(from.x, y + 0.55, from.z);
    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    const track = (
      property: string,
      hold: number,
      target: number,
      peak?: number
    ) => {
      const anim = new Animation(
        `${name}-${property}`,
        property,
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      const keys = [
        { frame: 0, value: hold },
        { frame: delay, value: hold },
      ];
      if (peak !== undefined)
        keys.push({ frame: (delay + end) / 2, value: peak });
      keys.push({ frame: end, value: target });
      anim.setKeys(keys);
      anim.setEasingFunction(easing);
      return anim;
    };
    chip.animations = [
      track("position.x", from.x, x),
      track("position.z", from.z, z),
      track("position.y", y + 0.55, y, y + 0.75),
    ];
    scene.beginAnimation(chip, 0, end, false);
  }
  return chip;
}

class PokerRoom3D {
  private roomRoot: TransformNode;
  private tableRoot: TransformNode;
  private dynamicRoot: TransformNode;
  private chipsRoot: TransformNode;
  private stations: TransformNode[] = [];
  private mobile = false;
  private renderedHandNumber = -1;
  private renderedBoard1Revealed = 0;
  private renderedBoard2Revealed = false;
  private unsubscribe: () => void;
  // Firme separate: le carte si ricostruiscono solo quando cambiano davvero
  // (fase/mano/scoperta), le fiches del piatto solo quando cambia il numero di
  // gettoni. Così una puntata NON distrugge e ricrea le carte a ogni evento —
  // niente più lampeggio o texture "grigie" durante i movimenti.
  private lastCardSignature = "";
  private lastChipSignature = "";
  private renderedChipCount = 0;

  constructor(
    private scene: Scene,
    private controller: GameController,
    private shadow: ShadowGenerator
  ) {
    this.roomRoot = new TransformNode("room-root", scene);
    this.tableRoot = new TransformNode("poker-table-root", scene);
    this.dynamicRoot = new TransformNode("dynamic-table-content", scene);
    this.dynamicRoot.parent = this.tableRoot;
    this.chipsRoot = new TransformNode("dynamic-pot-chips", scene);
    this.chipsRoot.parent = this.tableRoot;
    this.buildRoom();
    this.buildTable();
    this.unsubscribe = controller.subscribe((table, screen) =>
      this.update(table, screen)
    );
  }

  private buildRoom() {
    const floorMat = material(
      this.scene,
      "floor-mat",
      new Color3(0.16, 0.075, 0.03),
      0.72
    );
    const floor = MeshBuilder.CreateGround(
      "wood-floor",
      { width: 24, height: 18, subdivisions: 1 },
      this.scene
    );
    floor.material = floorMat;
    floor.receiveShadows = true;
    floor.parent = this.roomRoot;
    for (let x = -12; x <= 12; x += 0.8) {
      const seam = MeshBuilder.CreateBox(
        `floor-seam-${x}`,
        { width: 0.012, height: 0.008, depth: 18 },
        this.scene
      );
      seam.position.set(x, 0.009, 0);
      seam.material = material(
        this.scene,
        `seam-mat-${x}`,
        new Color3(0.055, 0.025, 0.012),
        0.92
      );
      seam.parent = this.roomRoot;
    }
    const backWall = MeshBuilder.CreateBox(
      "back-wall",
      { width: 24, height: 7, depth: 0.35 },
      this.scene
    );
    backWall.position.set(0, 3.5, 8.9);
    backWall.material = material(
      this.scene,
      "wall-mat",
      new Color3(0.035, 0.04, 0.045),
      0.94
    );
    backWall.parent = this.roomRoot;
    const brassLine = MeshBuilder.CreateBox(
      "wall-brass",
      { width: 10, height: 0.045, depth: 0.05 },
      this.scene
    );
    brassLine.position.set(0, 3.6, 8.69);
    brassLine.material = material(this.scene, "wall-brass-mat", GOLD, 0.35);
    brassLine.parent = this.roomRoot;
  }

  private buildTable() {
    const pedestalMat = material(
      this.scene,
      "pedestal-mat",
      new Color3(0.035, 0.04, 0.04),
      0.55
    );
    const pedestal = MeshBuilder.CreateCylinder(
      "table-pedestal",
      { diameterTop: 3.2, diameterBottom: 4.2, height: 1.4, tessellation: 48 },
      this.scene
    );
    pedestal.position.y = 0.7;
    pedestal.scaling.x = 1.5;
    pedestal.material = pedestalMat;
    pedestal.parent = this.tableRoot;
    const base = MeshBuilder.CreateCylinder(
      "table-base",
      { diameter: 6.35, height: 0.42, tessellation: 64 },
      this.scene
    );
    base.position.y = 1.35;
    base.scaling.x = 1.58;
    base.material = material(this.scene, "table-base-mat", WOOD, 0.46);
    base.parent = this.tableRoot;
    this.shadow.addShadowCaster(base);
    const felt = MeshBuilder.CreateCylinder(
      "felt-surface-3d",
      { diameter: 5.78, height: 0.13, tessellation: 64 },
      this.scene
    );
    felt.position.y = 1.6;
    felt.scaling.x = 1.57;
    felt.material = material(this.scene, "felt-mat", FELT, 0.96);
    felt.parent = this.tableRoot;
    felt.receiveShadows = true;
    const rail = MeshBuilder.CreateTorus(
      "padded-rail",
      { diameter: 5.92, thickness: 0.34, tessellation: 96 },
      this.scene
    );
    rail.position.y = 1.78;
    rail.rotation.x = Math.PI / 2;
    rail.scaling.x = 1.59;
    rail.material = material(this.scene, "rail-mat", RAIL, 0.36);
    rail.parent = this.tableRoot;
    this.shadow.addShadowCaster(rail);
    const goldInset = MeshBuilder.CreateTorus(
      "gold-inset",
      { diameter: 5.62, thickness: 0.045, tessellation: 96 },
      this.scene
    );
    goldInset.position.y = 1.79;
    goldInset.rotation.x = Math.PI / 2;
    goldInset.scaling.x = 1.58;
    goldInset.material = material(this.scene, "gold-inset-mat", GOLD, 0.3);
    goldInset.parent = this.tableRoot;

    const seatConfigs = [
      {
        x: 0,
        z: -5.1,
        r: 0,
        shirt: "#e6e8e5",
        skin: new Color3(0.67, 0.43, 0.3),
        hair: new Color3(0.12, 0.07, 0.04),
      },
      {
        x: -6.15,
        z: 0,
        r: -Math.PI / 2,
        shirt: "#294a57",
        skin: new Color3(0.76, 0.55, 0.39),
        hair: new Color3(0.04, 0.035, 0.03),
      },
      {
        x: 0,
        z: 5.1,
        r: Math.PI,
        shirt: "#7b2639",
        skin: new Color3(0.74, 0.52, 0.37),
        hair: new Color3(0.4, 0.22, 0.08),
      },
      {
        x: 6.15,
        z: 0,
        r: Math.PI / 2,
        shirt: "#c8c4b8",
        skin: new Color3(0.48, 0.3, 0.21),
        hair: new Color3(0.72, 0.72, 0.68),
      },
    ];
    seatConfigs.forEach((config, index) => {
      const station = new TransformNode(`station-${index}`, this.scene);
      station.parent = this.tableRoot;
      station.position.set(config.x, 0, config.z);
      station.rotation.y = config.r;
      this.stations.push(station);
      createChair(this.scene, station, `chair-${index}`);
      createPerson(
        this.scene,
        station,
        `player-model-${index}`,
        config.shirt,
        config.skin,
        config.hair
      );
      station
        .getChildMeshes()
        .forEach(mesh => this.shadow.addShadowCaster(mesh));
    });
  }

  setMobileMode(mobile: boolean) {
    if (this.mobile === mobile) return;
    this.mobile = mobile;
    // In verticale tutti i posti sono rappresentati dall’HUD. Conserviamo il
    // tavolo e le board 3D, ma rimuoviamo modelli e oggetti decorativi che
    // finivano sotto badge, piatto e carte operative.
    this.stations.forEach(station => station.setEnabled(!mobile));
    this.lastCardSignature = "";
    this.lastChipSignature = "";
    this.renderedChipCount = 0;
    this.update(this.controller.table, this.controller.screen);
  }

  private createChipStack(
    root: TransformNode,
    name: string,
    x: number,
    z: number,
    count = 6
  ) {
    const colors = [
      new Color3(0.9, 0.18, 0.13),
      new Color3(0.93, 0.72, 0.16),
      new Color3(0.12, 0.42, 0.68),
    ];
    for (let index = 0; index < count; index += 1) {
      createChip(
        this.scene,
        root,
        `${name}-${index}`,
        x,
        1.84 + index * 0.062,
        z,
        colors[index % colors.length]
      );
    }
  }

  private renderPlayerCards(
    root: TransformNode,
    table: TableState,
    player: PlayerState,
    index: number
  ) {
    if (!player.cards.length) return;
    const face = index === 0 || table.revealAll;
    if (index === 0) {
      this.createChipStack(root, "human-stack", 3.1, -2.1, 9);
      return;
    }
    const samples = player.cards.slice(0, 2);
    samples.forEach((code, cardIndex) => {
      if (index === 1)
        createCard(
          this.scene,
          root,
          `left-card-${cardIndex}`,
          code,
          face,
          -4.05,
          -0.28 + cardIndex * 0.58,
          Math.PI / 2
        );
      if (index === 2)
        createCard(
          this.scene,
          root,
          `top-card-${cardIndex}`,
          code,
          face,
          -0.34 + cardIndex * 0.68,
          2.3,
          Math.PI
        );
      if (index === 3)
        createCard(
          this.scene,
          root,
          `right-card-${cardIndex}`,
          code,
          face,
          4.05,
          0.28 - cardIndex * 0.58,
          Math.PI / 2
        );
    });
    if (index === 1) this.createChipStack(root, "left-stack", -3.7, 1.25, 7);
    if (index === 2) this.createChipStack(root, "top-stack", 1.6, 2.1, 7);
    if (index === 3) this.createChipStack(root, "right-stack", 3.7, -1.25, 7);
  }

  private update(table: TableState, screen: "lobby" | "table") {
    this.tableRoot.setEnabled(screen === "table");
    if (screen !== "table") return;
    this.syncPotChips(table);
    // Le carte dipendono solo da fase/mano/scoperta/scarto/dealer: NON da
    // eventSerial né dal piatto. Evita di distruggerle a ogni puntata.
    const cardSignature = `${table.handNumber}-${table.phase}-${table.board1Revealed}-${table.board2Revealed}-${table.revealAll}-${table.dealerIndex}-${this.mobile ? "m" : "d"}-${table.players.map(player => player.cards.length).join("-")}`;
    if (cardSignature === this.lastCardSignature) return;
    this.lastCardSignature = cardSignature;
    this.dynamicRoot.dispose(false, true);
    this.dynamicRoot = new TransformNode("dynamic-table-content", this.scene);
    this.dynamicRoot.parent = this.tableRoot;

    const newHand = table.handNumber !== this.renderedHandNumber;
    const previousBoard1Revealed = newHand ? 0 : this.renderedBoard1Revealed;
    const previousBoard2Revealed = newHand
      ? false
      : this.renderedBoard2Revealed;

    const board1X = [-2.55, -1.7, -0.85, 0.18, 1.03, 2.05];
    // Punto "mazzo" da cui le carte scoperte scivolano fino allo slot.
    const DEAL_FROM = { x: 0, z: -1.35 };
    table.board1.forEach((code, index) => {
      const visible = index < table.board1Revealed || table.revealAll;
      const newlyRevealed =
        visible && index >= previousBoard1Revealed && !table.revealAll;
      if (visible)
        createCard(
          this.scene,
          this.dynamicRoot,
          `board1-card-${index}`,
          code,
          true,
          board1X[index],
          0.15,
          0,
          newlyRevealed ? (index - previousBoard1Revealed) * 7 : -1,
          newlyRevealed ? DEAL_FROM : undefined
        );
      else
        createSlot(
          this.scene,
          this.dynamicRoot,
          `board1-slot-${index}`,
          board1X[index],
          0.15
        );
    });
    table.board2.forEach((code, index) => {
      const visible = table.board2Revealed || table.revealAll;
      const newlyRevealed =
        visible && !previousBoard2Revealed && !table.revealAll;
      if (visible)
        createCard(
          this.scene,
          this.dynamicRoot,
          `board2-card-${index}`,
          code,
          true,
          3.28,
          -0.52 + index * 1.08,
          0,
          newlyRevealed ? index * 8 : -1,
          newlyRevealed ? DEAL_FROM : undefined
        );
      else
        createSlot(
          this.scene,
          this.dynamicRoot,
          `board2-slot-${index}`,
          3.28,
          -0.52 + index * 1.08
        );
    });
    if (!this.mobile) {
      table.players.forEach((player, index) =>
        this.renderPlayerCards(this.dynamicRoot, table, player, index)
      );
      const dealerPositions = [
        new Vector3(-2.8, 1.84, -2.05),
        new Vector3(-3.55, 1.84, -1.55),
        new Vector3(-1.45, 1.84, 2.05),
        new Vector3(3.55, 1.84, 1.55),
      ];
      const dealerAt = dealerPositions[table.dealerIndex] ?? dealerPositions[0];
      const dealer = MeshBuilder.CreateCylinder(
        "dealer-button-3d",
        { diameter: 0.38, height: 0.07, tessellation: 32 },
        this.scene
      );
      dealer.parent = this.dynamicRoot;
      dealer.position.copyFrom(dealerAt);
      dealer.material = material(
        this.scene,
        "dealer-button-mat",
        new Color3(0.93, 0.93, 0.88),
        0.32
      );
    }
    this.renderedHandNumber = table.handNumber;
    this.renderedBoard1Revealed = table.board1Revealed;
    this.renderedBoard2Revealed = table.board2Revealed;
  }

  /**
   * Fiches del piatto in un root dedicato: si ricostruiscono SOLO quando cambia
   * il numero di gettoni, non a ogni evento. Separandole dalle carte, una
   * puntata non tocca le carte (niente lampeggio/grigio durante i movimenti).
   */
  private syncPotChips(table: TableState) {
    const chipCount = this.mobile
      ? 0
      : Math.min(18, Math.max(4, Math.ceil(table.pot / 50)));
    const chipSignature = `${chipCount}`;
    if (chipSignature === this.lastChipSignature) return;
    // Solo le fiche AGGIUNTE (piatto cresciuto) convergono con animazione; le
    // altre restano ferme. Se il conteggio cala (nuova mano) niente animazione.
    const previousChipCount = this.renderedChipCount;
    this.lastChipSignature = chipSignature;
    this.renderedChipCount = chipCount;
    this.chipsRoot.dispose(false, true);
    this.chipsRoot = new TransformNode("dynamic-pot-chips", this.scene);
    this.chipsRoot.parent = this.tableRoot;
    for (let index = 0; index < chipCount; index += 1) {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = -0.75 + column * 0.3;
      const z = 1.28 + (column % 2) * 0.12;
      const isNew = index >= previousChipCount && chipCount > previousChipCount;
      createChip(
        this.scene,
        this.chipsRoot,
        `pot-chip-${index}`,
        x,
        1.84 + row * 0.064,
        z,
        index % 2 ? GOLD : new Color3(0.82, 0.12, 0.12),
        isNew ? { x: x * 0.4, z: 2.9 } : undefined,
        isNew ? (index - previousChipCount) * 4 : -1
      );
    }
  }

  dispose() {
    this.unsubscribe();
    this.roomRoot.dispose(false, true);
    this.tableRoot.dispose(false, true);
  }
}

export async function createGameScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  variant: Variant = "standard"
): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.012, 0.018, 0.02, 1);
  const camera = new ArcRotateCamera(
    "poker-camera",
    -Math.PI / 2,
    0.88,
    16.2,
    new Vector3(0, 1.15, 0),
    scene
  );
  camera.fov = 0.68;
  camera.minZ = 0.1;
  camera.inputs.clear();
  scene.activeCamera = camera;

  const ambient = new HemisphericLight(
    "room-ambient",
    new Vector3(0, 1, 0),
    scene
  );
  ambient.intensity = 1.15;
  ambient.diffuse = new Color3(0.62, 0.72, 0.67);
  ambient.groundColor = new Color3(0.17, 0.09, 0.045);
  const key = new DirectionalLight(
    "table-key",
    new Vector3(-0.25, -1, 0.35),
    scene
  );
  key.position = new Vector3(4, 10, -7);
  key.intensity = 2.2;
  key.diffuse = new Color3(1, 0.84, 0.64);
  const shadow = new ShadowGenerator(1024, key);
  shadow.useBlurExponentialShadowMap = true;
  shadow.blurKernel = 24;
  shadow.darkness = 0.42;

  const demo = new URLSearchParams(window.location.search).has("demo");
  const controller = new GameController(demo, variant);
  const room = new PokerRoom3D(scene, controller, shadow);
  const gui = AdvancedDynamicTexture.CreateFullscreenUI(
    "sanzy-poker-ui",
    true,
    scene
  );
  const ui = new PokerUI(scene, gui, controller, () => undefined);
  const applyResponsiveLayout = () => {
    const mobile =
      window.innerWidth < 720 ||
      window.innerWidth / Math.max(window.innerHeight, 1) < 0.78;
    ui.setMobileMode(mobile);
    room.setMobileMode(mobile);
    if (mobile) {
      camera.alpha = -Math.PI / 2;
      camera.beta = 0.46;
      camera.radius = 22;
      camera.fov = 0.85;
      camera.setTarget(new Vector3(0, 1.15, -1.05));
    } else {
      camera.alpha = -Math.PI / 2;
      camera.beta = 0.88;
      camera.radius = 16.2;
      camera.fov = 0.68;
      camera.setTarget(new Vector3(0, 1.15, 0));
    }
  };
  applyResponsiveLayout();
  window.addEventListener("resize", applyResponsiveLayout);
  window.visualViewport?.addEventListener("resize", applyResponsiveLayout);
  if (demo) {
    window.setTimeout(() => {
      if (
        controller.table.status === "waiting" &&
        controller.table.handNumber === 0
      )
        controller.startHand();
    }, 80);
  }

  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    elapsed += engine.getDeltaTime() / 1000;
    ui.tick(elapsed);
  });

  return {
    scene,
    controller,
    dispose: () => {
      window.removeEventListener("resize", applyResponsiveLayout);
      window.visualViewport?.removeEventListener(
        "resize",
        applyResponsiveLayout
      );
      room.dispose();
      ui.dispose();
      controller.dispose();
      scene.dispose();
      void canvas;
    },
  };
}

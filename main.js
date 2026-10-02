import * as THREE from "./vendor/three.module.js";
import RAPIER from "./vendor/rapier.mjs";

await RAPIER.init();

const requestedStage = Number(new URLSearchParams(location.search).get("stage"));
const stageNumber = [1, 2, 3].includes(requestedStage) ? requestedStage : 1;

const ui = {
  game: document.querySelector("#game"), loading: document.querySelector("#loading"),
  intro: document.querySelector("#introSequence"), introCaption: document.querySelector("#introCaption"), skipIntro: document.querySelector("#skipIntro"),
  startOverlay: document.querySelector("#startOverlay"), resultOverlay: document.querySelector("#resultOverlay"), stageTransition: document.querySelector("#stageTransition"),
  startButton: document.querySelector("#startButton"), retryButton: document.querySelector("#retryButton"), stageOneButton: document.querySelector("#stageOneButton"),
  fireButton: document.querySelector("#fireButton"), powerBar: document.querySelector("#powerBar"), ammoPips: document.querySelector("#ammoPips"),
  princessCam: document.querySelector("#princessCam"), princessCamViewport: document.querySelector("#princessCamViewport"), princessCamState: document.querySelector("#princessCamState"),
  missionLabel: document.querySelector("#missionLabel"), missionText: document.querySelector("#missionText"),
  startEyebrow: document.querySelector("#startEyebrow"), startTitle: document.querySelector("#startTitle"), startStory: document.querySelector("#startStory"),
  hpPips: document.querySelector("#hpPips"), princessSpeech: document.querySelector("#princessSpeech"),
  cameraHint: document.querySelector("#cameraHint"), heroSpeech: document.querySelector("#heroSpeech"),
  slowCaption: document.querySelector("#slowCaption"), resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"), resultEyebrow: document.querySelector("#resultEyebrow"),
};

// ★追加：カメラ切り替えボタンを自動生成して追加
const controlsPanel = document.querySelector(".controls");
const camBtn = document.createElement("button");
camBtn.type = "button";
camBtn.id = "cameraButton";
camBtn.innerHTML = "<span>MODE</span>🎥 カメラ";
camBtn.style.marginRight = "10px";
controlsPanel.insertBefore(camBtn, ui.fireButton);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79c8da);
scene.fog = new THREE.Fog(0x79c8da, 58, 105);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.game.appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute("aria-label", "ゲームフィールド");

const princessRenderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
princessRenderer.outputColorSpace = THREE.SRGBColorSpace;
princessRenderer.shadowMap.enabled = false;
princessRenderer.setPixelRatio(1);
ui.princessCamViewport.appendChild(princessRenderer.domElement);
const princessCamera = new THREE.PerspectiveCamera(36, 205 / 123, .1, 42);
const princessCamTarget = new THREE.Vector3();
const princessCamRay = new THREE.Raycaster();

const camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 160);
camera.position.copy(stageNumber === 3 ? new THREE.Vector3(46, 38, 62) : stageNumber === 2 ? new THREE.Vector3(39, 31, 53) : new THREE.Vector3(35, 27, 47));
const defaultLookAt = stageNumber === 3 ? new THREE.Vector3(10, 10, 3) : stageNumber === 2 ? new THREE.Vector3(10, 8, 5) : new THREE.Vector3(8, 6, 7);
camera.lookAt(defaultLookAt);
camera.currentLookAt = defaultLookAt.clone(); // カメラ追従用

scene.add(new THREE.HemisphereLight(0xffedcf, 0x594b77, 2.2));
const sun = new THREE.DirectionalLight(0xfff0cc, 3.3);
sun.position.set(-16, 25, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -18;
scene.add(sun);

const world = new RAPIER.World({ x: 0, y: -14, z: 0 });
world.timestep = 1 / 60;
const eventQueue = new RAPIER.EventQueue(true);

const COLORS = {
  grass: 0x5dbb78, dirt: 0x925f55, stone: 0xb7a58d, stoneDark: 0x84766e,
  roof: 0xd45a59, wood: 0x80584b, gold: 0xffcf58, ink: 0x2c2237,
  pink: 0xf072a4, dress: 0xffa8cb, cannon: 0x40566b, wheel: 0x332c3b,
  stoneLight: 0xd8c7a3, stoneWarm: 0xc59672, mortar: 0x6d6570,
  roofDark: 0x913f52, window: 0x292940, banner: 0x7b315f, moss: 0x5f8a63,
};
ui.startButton.href = `./?stage=${stageNumber}&play=1`;

if (stageNumber === 2) {
  document.title = "PIXEL SIEGE - 崩れかけの古城";
  ui.missionLabel.textContent = "第二章";
  ui.missionText.textContent = "二階の部屋から姫を助け出せ！";
  ui.startEyebrow.textContent = "第二章";
  ui.startTitle.textContent = "崩れかけの古城";
  ui.startStory.innerHTML = "黒い翼の男を追い、崩れかけの古城へ。<br />姫は二階の部屋に閉じ込められている。<br />出口まで壊してしまったら、姫は降りられない。<small>崩れた石が足場になるかもしれない</small>";
} else if (stageNumber === 3) {
  document.title = "PIXEL SIEGE - 黒い翼の城";
  ui.missionLabel.textContent = "第三章";
  ui.missionText.textContent = "黒い翼の城から姫を助け出せ！";
  ui.startEyebrow.textContent = "第三章";
  ui.startTitle.textContent = "黒い翼の城";
  ui.startStory.innerHTML = "黒い翼の男は、姫を大きな城へ連れ去った。<br />姫がいるのは三階。城の中には古い階段が残っている。<br />階段を全部壊すと、姫は外へ出られない。<small>壊す場所をよく見きわめよう</small>";
}
const MAT = {};
for (const [key, color] of Object.entries(COLORS)) {
  MAT[key] = new THREE.MeshToonMaterial({ color });
}

const syncObjects = [];
const blocks = [];
const chamberBars = [];
const stairPieces = [];
const STAGE3_LAYOUT = Object.freeze({
  centerX: 10,
  centerZ: -2.35,
  frontWallZ: 7.2,
  backWallZ: -11.4,
  sideWallOffset: 14.3,
  westExitX: -5.15,
  eastExitX: 25.15,
  frontExitZ: 8.05,
  backExitZ: -12.25,
});
const projectiles = [];
const explosions = [];
let structuralCheckTimer = 0;
let princess;
const princessParts = {};
let princessExposed = false;
let rescueTimer = 0;
let ammo = 5;
let yaw = 0;
let pitch = THREE.MathUtils.degToRad(38);
let playing = false;
let result = false;
let slowMotion = 1;
let shotCooldown = 0;
let lastShotAt = -99;
let elapsed = 0;
let audioCtx;
let sweatTimer = 0;
const moveKeys = new Set();
let isCharging = false;
let chargeLevel = 0;

let princessHP = 3;
let princessInvincible = 0; 
let isSuccess = false; 
let angryTimer = 0; 
let speechTimeout;
let heroSpeechTimeout;
const princessFallLines = [
  "姫なのに、なんて扱いなの！",
  "姫が転ぶとかありえないわ……",
  "あれ？ 私って姫よね！？",
  "ちょっと、今の見てた！？",
  "こんな救出、聞いてないわ！",
];
const heroFallLines = [
  "姫がのたうちまわってる……",
  "ひ、姫！？",
  "しっかりなさってください！",
  "今のは大丈夫なんですか！？",
  "姫、ご無事ですかー！",
];
const princessRescueAccidentLines = [
  "なんて日なの！",
  "ありえないわ……",
  "助かったと思ったのに！",
  "最後の最後でこれ！？",
];
const heroRescueAccidentLines = [
  "姫ーっ！",
  "あと少しだったのにー！",
  "ここまで来てですか！？",
  "圧倒的、絶望！",
  "助かったはずなのにー！",
  "なんてことだーっ！",
];
const princessAimWarningLines = [
  "あなた正気！？",
  "狙ってる！　狙ってるでしょ！",
  "サイコパスなの！？",
  "撃つ気じゃないでしょうね！？",
  "当たる！　当たるから！",
];
let princessAimWarningCooldown = 0;
let trajectoryPoints = [];
const introTimers = [];
let openingRevealTimer = null;
let openingEnded = false;
let gameStarted = false;
let hitSlowTimer = 0;
let complaintPending = false;
const rescueState = {
  active: false,
  time: 0,
  particleTimer: 0,
  start: new THREE.Vector3(),
  heroStart: new THREE.Vector3(),
  heroBaseY: 0,
  abducted: false,
  standQuat: new THREE.Quaternion(),
  escapePath: [],
  pathIndex: 0,
  pathPosition: new THREE.Vector3(),
  walkCompleteTime: 0,
  exitPosition: new THREE.Vector3(),
  finaleCue: 0,
};
const escapeSearch = { lastAt: -99, lastHintAt: -99, blocked: false };
const fallState = { active: false, startY: 0, lowestY: 0, cooldown: 0 };
let groundedEscapeTimer = 0;
const princessRecovery = {
  active: false,
  progress: 0,
  delay: 0,
  stillTime: 0,
  position: new THREE.Vector3(),
  startQuat: new THREE.Quaternion(),
};
const princessAmbient = {
  moving: false,
  timer: 1.1,
  direction: 1,
  gesture: 0,
  phase: 0,
};
let heroPanicTimer = 0;
const heroPanicBase = new THREE.Vector3();

// ★追加：カメラ操作用の変数
let isCameraMode = false;
let camYaw = 0.55; 
let camPitch = 0.55;
let camDist = 55;
const camTarget = new THREE.Vector3(10, 6, 7);
const cameraKeys = new Set();

function mat(color) { return new THREE.MeshToonMaterial({ color }); }

function createBodyMesh({ size, position, material, type = "dynamic", density = 1, restitution = 0.05, friction = 0.75, userData = {}, shape = "box" }) {
  let geometry, colliderDesc;
  if (shape === "cylinder") {
    geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 12);
    colliderDesc = RAPIER.ColliderDesc.cylinder(size.y / 2, size.x);
  } else if (shape === "cone") {
    // Four sides keep tower roofs readable as chunky pixel-art silhouettes.
    geometry = new THREE.ConeGeometry(size.x, size.y, 4);
    colliderDesc = RAPIER.ColliderDesc.cone(size.y / 2, size.x);
  } else {
    geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const desc = type === "fixed" ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
  desc.setTranslation(position.x, position.y, position.z);
  if (type === "dynamic") desc.setCanSleep(true).setLinearDamping(0.08).setAngularDamping(0.12);
  
  const body = world.createRigidBody(desc);
  body.userData = userData;
  colliderDesc.setDensity(density).setRestitution(restitution).setFriction(friction);
  world.createCollider(colliderDesc, body);
  
  if (type === "dynamic") syncObjects.push({ mesh, body });
  return { mesh, body };
}

function makeGround() {
  createBodyMesh({ size: new THREE.Vector3(76, 1, 90), position: new THREE.Vector3(6, -0.5, 7), material: MAT.grass, type: "fixed" });
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(76, 1.2, 90), MAT.dirt);
  dirt.position.set(6, -1.55, 7); dirt.receiveShadow = true; scene.add(dirt);
}

function makeScenery() {
  const mountainMats = [mat(0x667796), mat(0x776f91), mat(0x596d82)];
  const snowMat = mat(0xe7e2d2);
  const treeDark = mat(0x35694e), treeMid = mat(0x4f8b5b), treeLight = mat(0x76a963);

  const mountains = [
    [-29, -41, 24, 25, 0], [-10, -46, 32, 31, 1], [13, -49, 36, 34, 2],
    [36, -43, 27, 29, 0], [55, -39, 21, 24, 1],
  ];
  for (const [x, z, radius, height, materialIndex] of mountains) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 4), mountainMats[materialIndex]);
    mountain.position.set(x, height / 2 - 1, z); mountain.rotation.y = Math.PI / 4;
    mountain.receiveShadow = true; scene.add(mountain);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * .31, height * .31, 4), snowMat);
    cap.position.set(x, height * .845 - 1, z); cap.rotation.y = Math.PI / 4; scene.add(cap);
  }

  const addTree = (x, z, scale, tint = 0) => {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.7, .7), MAT.wood);
    trunk.position.y = 1.35; trunk.castShadow = true; group.add(trunk);
    const foliage = [treeDark, treeMid, treeLight];
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.25 - i * .32, 3.5, 4), foliage[(i + tint) % foliage.length]);
      crown.position.y = 3.1 + i * 1.45; crown.rotation.y = Math.PI / 4; crown.castShadow = true; group.add(crown);
    }
    group.position.set(x, 0, z); group.scale.setScalar(scale); scene.add(group);
  };
  [
    [-24, -15, 1.25, 0], [-19, -11, .9, 1], [-13, -18, 1.1, 2], [-5, -15, .75, 0],
    [26, -16, .95, 1], [33, -13, 1.25, 2], [39, -20, 1.05, 0], [46, -11, .8, 1],
    [-28, 7, .8, 2], [43, 9, .95, 0],
  ].forEach(args => addTree(...args));

  const cloudMat = mat(0xfff2d8);
  [[-15, 17, -34, 1.2], [27, 22, -39, 1.45], [48, 15, -31, .9]].forEach(([x, y, z, s]) => {
    const cloud = new THREE.Group();
    [[0, 0, 0, 5.2], [-3.1, -.25, .2, 3], [3.2, -.15, .1, 3.5], [.5, 1.25, 0, 3.2]].forEach(([cx, cy, cz, w]) => {
      const puff = new THREE.Mesh(new THREE.BoxGeometry(w, 2.1, 1.8), cloudMat);
      puff.position.set(cx, cy, cz); cloud.add(puff);
    });
    cloud.position.set(x, y, z); cloud.scale.setScalar(s); scene.add(cloud);
  });

  // Small color clusters make the playable field feel inhabited without adding physics cost.
  const flowerColors = [0xffdf6e, 0xf28ab2, 0xd9f4ff];
  for (let i = 0; i < 34; i++) {
    const flower = new THREE.Mesh(new THREE.BoxGeometry(.18, .28, .18), mat(flowerColors[i % flowerColors.length]));
    const side = i % 2 ? -1 : 1;
    flower.position.set(10 + side * (13 + (i * 7) % 18), .16, -4 + (i * 11) % 35);
    flower.rotation.y = (i % 4) * Math.PI / 4; scene.add(flower);
  }
}

function addBlock(x, y, z, material = MAT.stone, size = new THREE.Vector3(1, 1, 1), shape = "box") {
  const b = createBodyMesh({ size, position: new THREE.Vector3(x, y, z), material, type: "fixed", density: 1.7, friction: .64, userData: { type: "block" }, shape });
  b.start = new THREE.Vector3(x, y, z);
  b.size = size.clone();
  b.shape = shape;
  b.activated = false;
  syncObjects.push({ mesh: b.mesh, body: b.body });
  blocks.push(b);
  return b;
}

function blockHalfExtents(block) {
  return block.shape === "box"
    ? new THREE.Vector3(block.size.x / 2, block.size.y / 2, block.size.z / 2)
    : new THREE.Vector3(block.size.x, block.size.y / 2, block.size.x);
}

function blockHasVerticalSupport(block, supportMemo = new Map(), visiting = new Set()) {
  if (supportMemo.has(block)) return supportMemo.get(block);
  if (visiting.has(block)) return false;
  visiting.add(block);
  const position = block.body.translation();
  const half = blockHalfExtents(block);
  const bottom = position.y - half.y;
  if (bottom <= .12) {
    supportMemo.set(block, true);
    visiting.delete(block);
    return true;
  }

  for (const support of blocks) {
    if (support === block) continue;
    const supportPosition = support.body.translation();
    const supportHalf = blockHalfExtents(support);
    const supportTop = supportPosition.y + supportHalf.y;
    const gap = bottom - supportTop;
    if (gap < -.24 || gap > .42) continue;

    const overlapX = half.x + supportHalf.x - Math.abs(position.x - supportPosition.x);
    const overlapZ = half.z + supportHalf.z - Math.abs(position.z - supportPosition.z);
    if (overlapX > Math.min(half.x, supportHalf.x) * .18
      && overlapZ > Math.min(half.z, supportHalf.z) * .18
      && blockHasVerticalSupport(support, supportMemo, visiting)) {
      supportMemo.set(block, true);
      visiting.delete(block);
      return true;
    }
  }
  supportMemo.set(block, false);
  visiting.delete(block);
  return false;
}

function activateUnsupportedBlocks(realDt) {
  if (lastShotAt < 0 || !blocks.some(block => block.activated)) return;
  structuralCheckTimer -= realDt;
  if (structuralCheckTimer > 0) return;
  structuralCheckTimer = .12;
  const supportMemo = new Map();

  // Fixed castle pieces are cheap and stable before impact, but once their
  // supporting masonry has moved they must join the simulation instead of
  // hanging in mid-air. Disturbance is propagated through neighbouring pieces
  // so upper floors and roofs fall in a natural chain rather than all at once.
  for (const block of blocks) {
    const grounded = blockHasVerticalSupport(block, supportMemo, new Set());
    if (block.activated) {
      block.unsupportedFor = grounded ? 0 : (block.unsupportedFor || 0) + .12;
      if (!grounded && block.unsupportedFor >= .24 && block.body.isSleeping()) block.body.wakeUp();
      continue;
    }
    const nearDisturbedStructure = blocks.some(other => other.activated && other !== block
      && block.start.distanceTo(other.start) < 5.2);
    if (!nearDisturbedStructure) continue;

    if (grounded) {
      block.unsupportedFor = 0;
      continue;
    }
    block.unsupportedFor = (block.unsupportedFor || 0) + .12;
    if (block.unsupportedFor < .24) continue;
    block.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    block.body.wakeUp();
    block.activated = true;
  }
}

function stoneFor(x, y, z = 0) {
  const n = Math.abs((x * 17 + y * 11 + z * 7) % 13);
  if (n < 3) return MAT.stoneDark;
  if (n > 10) return MAT.stoneLight;
  return n === 7 ? MAT.stoneWarm : MAT.stone;
}

function addSlab(x, y, z, width, depth = 1, material = MAT.stoneDark) {
  return addBlock(x, y, z, material, new THREE.Vector3(width, .48, depth));
}

function addColumn(x, y, z, height, material = MAT.stoneLight, radius = .34) {
  addBlock(x, y, z, material, new THREE.Vector3(radius * 1.25, .34, radius * 1.25), "cylinder");
  addBlock(x, y + height / 2, z, material, new THREE.Vector3(radius, height, radius), "cylinder");
  addBlock(x, y + height, z, MAT.stoneWarm, new THREE.Vector3(radius * 1.35, .3, radius * 1.35), "cylinder");
}

function addWindow(x, y, z, height = 2.15) {
  addBlock(x, y, z - .08, MAT.window, new THREE.Vector3(.66, height, .2));
  addBlock(x - .5, y, z, MAT.stoneLight, new THREE.Vector3(.22, height + .45, .42));
  addBlock(x + .5, y, z, MAT.stoneLight, new THREE.Vector3(.22, height + .45, .42));
  addBlock(x, y + height / 2 + .27, z, MAT.stoneWarm, new THREE.Vector3(1.25, .28, .48));
}

function addArch(cx, cy, z, halfWidth = 2) {
  // Pixel-art arch: stepped voussoirs and a bright keystone.
  for (const side of [-1, 1]) {
    addBlock(cx + side * (halfWidth + .42), cy - .8, z, MAT.stoneLight, new THREE.Vector3(.55, 2.4, .72));
    addBlock(cx + side * (halfWidth - .72), cy + .65, z, MAT.stoneWarm, new THREE.Vector3(1.1, .55, .74));
    addBlock(cx + side * (halfWidth - 1.55), cy + 1.08, z, MAT.stoneLight, new THREE.Vector3(.72, .5, .76));
  }
  addBlock(cx, cy + 1.28, z, MAT.gold, new THREE.Vector3(.62, .68, .82));
}

function addBattlements(cx, y, z, halfWidth, spacing = 2) {
  addSlab(cx, y - .42, z, halfWidth * 2 + 1.1, 1.25, MAT.stoneDark);
  for (let x = -halfWidth; x <= halfWidth; x += spacing) {
    addBlock(cx + x, y + .16, z, x % 4 === 0 ? MAT.stoneWarm : MAT.stoneLight, new THREE.Vector3(.95, 1.15, 1.12));
  }
}

function addButtress(x, z, height = 5) {
  for (let i = 0; i < height; i++) {
    const depth = 1.75 - i * .18;
    addBlock(x, i + .5, z + depth * .34, i % 2 ? MAT.stoneDark : MAT.stoneWarm, new THREE.Vector3(1.05, 1, depth));
  }
}

function addFlag(x, y, z, flip = 1) {
  addBlock(x, y + 1.3, z, MAT.ink, new THREE.Vector3(.11, 2.8, .11), "cylinder");
  addBlock(x + .58 * flip, y + 2.05, z, MAT.banner, new THREE.Vector3(1.15, .72, .12));
  addBlock(x + .88 * flip, y + 1.8, z, MAT.gold, new THREE.Vector3(.28, .24, .14));
}

// Castle kit: foundation, keep, wings, towers, balcony, arches, windows and flags.
function makeCastleStage1() {
  const ox = 10;
  const unit = 1.04;

  // Broad, stepped foundation using large masonry pieces instead of hundreds of identical cubes.
  for (const y of [.48, 1.38]) {
    for (let x = -10; x <= 10; x += 2) {
      const offset = y > 1 ? 1 : 0;
      addBlock(ox + x + offset, y, -1.45, stoneFor(x, Math.round(y), -1), new THREE.Vector3(1.92, .88, 3.5));
    }
  }
  addSlab(ox, 2.02, -1.35, 22.8, 4.15, MAT.stoneDark);

  // Central keep. The chamber opening stays readable, but is framed like a royal balcony.
  for (let y = 2; y <= 10; y++) {
    for (let x = -4; x <= 4; x++) {
      const chamber = Math.abs(x) <= 2 && y >= 3 && y <= 7;
      const decorativeGap = y === 9 && Math.abs(x) === 2;
      if (chamber || decorativeGap) continue;
      addBlock(ox + x * unit, y + .5, 0, stoneFor(x, y), new THREE.Vector3(1, 1, 1.08));
    }
  }
  // Deep rear wall and a real room around the princess.
  for (let y = 2; y <= 8; y++) {
    for (let x = -3; x <= 3; x++) {
      addBlock(ox + x * unit, y + .5, -3.05, stoneFor(x + 2, y, -3));
    }
  }
  for (const x of [-3.12, 3.12]) {
    for (let y = 2; y <= 8; y++) addBlock(ox + x, y + .5, -1.52, stoneFor(x, y), new THREE.Vector3(1, 1, 2.05));
  }
  addSlab(ox, 2.55, -1.48, 7.4, 3.4, MAT.wood);
  addSlab(ox, 8.42, -1.48, 8.6, 3.65, MAT.stoneDark);

  // Balcony edge, columns, arch stones and iron bars.
  addSlab(ox, 3.05, .72, 6.55, 1.18, MAT.stoneWarm);
  addSlab(ox, 3.42, .88, 7.25, .72, MAT.stoneLight);
  addColumn(ox - 2.72, 3.32, .32, 4.25);
  addColumn(ox + 2.72, 3.32, .32, 4.25);
  addArch(ox, 6.72, .22, 2.28);
  for (const x of [-1.55, -.52, .52, 1.55]) {
    const bar = addBlock(ox + x, 5.45, .62, MAT.ink, new THREE.Vector3(.13, 4.25, .13), "cylinder");
    bar.isChamberBar = true;
    chamberBars.push(bar);
  }

  // Lower side wings connect the keep to the towers.
  for (const side of [-1, 1]) {
    for (let y = 2; y <= 7; y++) {
      for (let ix = 5; ix <= 7; ix++) {
        const x = ix * side;
        const windowGap = ix === 6 && (y === 4 || y === 5);
        if (!windowGap) addBlock(ox + x * unit, y + .5, -.18, stoneFor(x, y), new THREE.Vector3(1, 1, 1.18));
      }
    }
    addWindow(ox + side * 6.24, 5.05, .44, 2.05);
    addBattlements(ox + side * 6.25, 8.32, -.18, 1.75, 1.7);
    addButtress(ox + side * 4.65, .45, 5);
  }

  // Two massive gate towers with visible depth, inset windows and pyramidal roofs.
  for (const side of [-1, 1]) {
    const tx = ox + side * 9.05;
    for (let y = 2; y <= 11; y++) {
      for (let x = -1; x <= 1; x++) {
        const windowGap = x === 0 && (y === 5 || y === 6 || y === 9);
        if (!windowGap) addBlock(tx + x * unit, y + .5, -.34, stoneFor(x + side * 9, y), new THREE.Vector3(1, 1, 1.22));
        addBlock(tx + x * unit, y + .5, -2.42, stoneFor(x - side * 3, y, -2), new THREE.Vector3(1, 1, 1.05));
      }
      addBlock(tx - side * 1.08, y + .5, -1.38, stoneFor(side * 8, y), new THREE.Vector3(1, 1, 1.25));
    }
    addWindow(tx, 6.1, .36, 2.0);
    addWindow(tx, 9.55, .36, 1.45);
    addBattlements(tx, 12.42, -.62, 1.8, 1.8);
    addBlock(tx, 14.0, -1.35, side < 0 ? MAT.roofDark : MAT.roof, new THREE.Vector3(2.45, 2.8, 2.45), "cone");
    addFlag(tx, 15.4, -1.35, side);
    addButtress(tx + side * 2.0, .5, 6);
  }

  // Keep crown: stepped parapet, gold cornice and a central royal banner.
  addBattlements(ox, 11.55, -.22, 4.15, 2);
  addSlab(ox, 10.86, .2, 9.8, .52, MAT.gold);
  addFlag(ox, 12.2, -.3, 1);
  addBlock(ox, 9.55, .58, MAT.banner, new THREE.Vector3(1.45, 1.55, .16));
  addBlock(ox, 9.55, .69, MAT.gold, new THREE.Vector3(.24, 1.15, .12));

  // Mossy base accents keep the stonework from reading as a flat checkerboard.
  for (const x of [-8.5, -5.4, 4.2, 7.7]) {
    addBlock(ox + x, 2.25, .62, MAT.moss, new THREE.Vector3(1.3, .28, .2));
  }
}

function addCrest(x, y, z, flip = 1) {
  addBlock(x, y, z, MAT.banner, new THREE.Vector3(1.25, 1.55, .18));
  addBlock(x, y + .05, z + .12, MAT.gold, new THREE.Vector3(.22, 1.05, .12));
  addBlock(x + .34 * flip, y + .22, z + .13, MAT.gold, new THREE.Vector3(.48, .22, .13));
}

function addTorch(x, y, z) {
  addBlock(x, y, z, MAT.wood, new THREE.Vector3(.16, .85, .16));
  addBlock(x, y + .63, z, MAT.orange || MAT.gold, new THREE.Vector3(.34, .42, .34), "cone");
}

function makeCastleStage2() {
  const ox = 10;
  const unit = 1.04;

  // A wider double-step foundation makes the second fortress feel heavier.
  for (const y of [.48, 1.38]) {
    for (let x = -12; x <= 12; x += 2) {
      addBlock(ox + x + (y > 1 ? 1 : 0), y, -1.65, stoneFor(x, Math.round(y), -2), new THREE.Vector3(1.92, .88, 4.15));
    }
  }
  addSlab(ox, 2.02, -1.55, 27.2, 4.7, MAT.stoneDark);

  // Lower storey: three decorative arch bays with deep masonry behind them.
  for (let y = 2; y <= 7; y++) {
    for (let x = -5; x <= 5; x++) {
      const gateVoid = y <= 5 && (Math.abs(x) <= 1 || Math.abs(x) === 4);
      if (!gateVoid) addBlock(ox + x * unit, y + .5, -.1, stoneFor(x, y), new THREE.Vector3(1, 1, 1.22));
      addBlock(ox + x * unit, y + .5, -3.3, stoneFor(x + 3, y, -3), new THREE.Vector3(1, 1, 1.05));
    }
  }
  addArch(ox, 5.25, .5, 2.15);
  addArch(ox - 4.2, 4.7, .48, 1.25);
  addArch(ox + 4.2, 4.7, .48, 1.25);
  addTorch(ox - 2.9, 4.15, .72);
  addTorch(ox + 2.9, 4.15, .72);
  addSlab(ox, 7.72, -1.5, 12.7, 3.8, MAT.wood);
  addSlab(ox, 8.05, .75, 10.2, 1.15, MAT.stoneWarm);

  // The princess chamber is unmistakably on the second floor.
  for (let y = 8; y <= 13; y++) {
    for (let x = -5; x <= 5; x++) {
      const chamber = Math.abs(x) <= 2 && y <= 12;
      const inset = y === 12 && Math.abs(x) === 4;
      if (!chamber && !inset) addBlock(ox + x * unit, y + .5, 0, stoneFor(x, y), new THREE.Vector3(1, 1, 1.15));
    }
  }
  for (let y = 8; y <= 13; y++) {
    for (let x = -3; x <= 3; x++) addBlock(ox + x * unit, y + .5, -3.28, stoneFor(x - 2, y, -4));
  }
  for (const x of [-3.15, 3.15]) {
    for (let y = 8; y <= 13; y++) addBlock(ox + x, y + .5, -1.6, stoneFor(x, y), new THREE.Vector3(1, 1, 2.18));
  }
  addSlab(ox, 8.38, .92, 7.45, .72, MAT.stoneLight);
  addColumn(ox - 2.78, 8.34, .35, 4.75);
  addColumn(ox + 2.78, 8.34, .35, 4.75);
  addArch(ox, 12.12, .27, 2.32);
  for (const x of [-1.58, -.53, .53, 1.58]) {
    const bar = addBlock(ox + x, 10.45, .67, MAT.ink, new THREE.Vector3(.13, 4.45, .13), "cylinder");
    bar.isChamberBar = true;
    chamberBars.push(bar);
  }

  // Wider side wings and taller corner towers, with windows and heraldry.
  for (const side of [-1, 1]) {
    for (let y = 2; y <= 10; y++) {
      for (let ix = 6; ix <= 9; ix++) {
        const x = ix * side;
        const windowGap = ix === 8 && (y === 4 || y === 5 || y === 8);
        if (!windowGap) addBlock(ox + x * unit, y + .5, -.25, stoneFor(x, y), new THREE.Vector3(1, 1, 1.22));
      }
    }
    addWindow(ox + side * 8.3, 5.1, .4, 2.05);
    addWindow(ox + side * 8.3, 8.75, .4, 1.65);
    addBattlements(ox + side * 7.8, 11.25, -.25, 2.45, 1.6);
    addCrest(ox + side * 6.7, 7.2, .7, side);
    addButtress(ox + side * 5.75, .55, 7);

    const tx = ox + side * 11.35;
    for (let y = 2; y <= 14; y++) {
      for (let x = -1; x <= 1; x++) {
        const windowGap = x === 0 && [5, 6, 9, 12].includes(y);
        if (!windowGap) addBlock(tx + x * unit, y + .5, -.45, stoneFor(x + side * 11, y), new THREE.Vector3(1, 1, 1.28));
        addBlock(tx + x * unit, y + .5, -2.75, stoneFor(x - side * 4, y, -3), new THREE.Vector3(1, 1, 1.08));
      }
    }
    addWindow(tx, 6.0, .34, 1.9);
    addWindow(tx, 10.15, .34, 1.65);
    addBattlements(tx, 15.35, -.72, 1.85, 1.75);
    addBlock(tx, 17.05, -1.45, side < 0 ? MAT.roofDark : MAT.roof, new THREE.Vector3(2.65, 3.2, 2.65), "cone");
    addFlag(tx, 18.7, -1.45, side);
    addButtress(tx + side * 2.0, .5, 8);
  }

  addBattlements(ox, 14.65, -.32, 5.05, 1.7);
  addSlab(ox, 13.95, .22, 11.8, .56, MAT.gold);
  addCrest(ox, 13.0, .68, 1);
  addFlag(ox, 15.35, -.35, 1);
  for (const x of [-10.6, -7.2, -3.8, 3.8, 7.2, 10.6]) {
    addBlock(ox + x, 2.28, .78, MAT.moss, new THREE.Vector3(1.35, .3, .2));
  }
}

function addStairFlight(start, direction, steps = 10, rise = .67, run = .78, width = 1.85) {
  const alongX = Math.abs(direction.x) > Math.abs(direction.z);
  for (let i = 0; i < steps; i++) {
    const step = addBlock(
      start.x + direction.x * run * i,
      start.y + rise * i,
      start.z + direction.z * run * i,
      i % 2 ? MAT.stoneWarm : MAT.stoneLight,
      alongX ? new THREE.Vector3(run + .12, .44, width) : new THREE.Vector3(width, .44, run + .12),
    );
    step.isStair = true;
    stairPieces.push(step);
  }
}

function addStairLanding(x, y, z, size, material = MAT.wood) {
  const landing = addBlock(x, y, z, material, size);
  landing.isStair = true;
  stairPieces.push(landing);
  return landing;
}

function faceAlongMovement(character, from, to, physicsBody = null, minimumDistance = .002) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (dx * dx + dz * dz <= minimumDistance * minimumDistance) return false;
  const yaw = Math.atan2(dx, dz);
  character.rotation.y = yaw;
  if (physicsBody) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    physicsBody.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true);
  }
  return true;
}

function makeCastleStage3() {
  const ox = STAGE3_LAYOUT.centerX;
  const cz = STAGE3_LAYOUT.centerZ;
  const frontZ = STAGE3_LAYOUT.frontWallZ;
  const backZ = STAGE3_LAYOUT.backWallZ;
  const sideX = STAGE3_LAYOUT.sideWallOffset;
  const sideWallZs = [-9.2, -7.0, -4.8, -2.6, -.4, 1.8, 4.0];
  const sideGateOpen = z => z > -1.6 && z < 3.1;

  // The broader foundations leave every gate flush with the grass. The
  // princess never has to climb a hidden curb to leave the fortress.
  for (let x = -12; x <= 12; x += 2) {
    if (Math.abs(x) >= 2.2) addBlock(ox + x, .46, frontZ, stoneFor(x, 0, 7), new THREE.Vector3(1.9, .9, 2.25));
    addBlock(ox + x, .46, backZ, stoneFor(x, 0, -11), new THREE.Vector3(1.9, .9, 2.25));
  }
  for (const z of sideWallZs) {
    if (sideGateOpen(z)) continue;
    addBlock(ox - sideX, .46, z, stoneFor(-14, 0, z), new THREE.Vector3(2.2, .9, 2.05));
    addBlock(ox + sideX, .46, z, stoneFor(14, 0, z), new THREE.Vector3(2.2, .9, 2.05));
  }

  // Four-sided curtain wall. Every direction now offers real masonry targets.
  for (let y = 1; y <= 6; y++) {
    for (let x = -12; x <= 12; x += 2) {
      const gateOpening = Math.abs(x) < 2.2 && y <= 4;
      if (!gateOpening) addBlock(ox + x, y + .5, frontZ, stoneFor(x, y, 4), new THREE.Vector3(1.9, 1, 1.18));
      const rearArrowSlit = Math.abs(x) === 5 && (y === 3 || y === 4);
      if (!rearArrowSlit) addBlock(ox + x, y + .5, backZ, stoneFor(x + 2, y, -8), new THREE.Vector3(1.9, 1, 1.18));
    }
    for (const z of sideWallZs) {
      const sideSlit = Math.abs(z + 2.1) < .3 && (y === 3 || y === 4);
      const levelSideGate = sideGateOpen(z) && y <= 5;
      if (!sideSlit && !levelSideGate) {
        addBlock(ox - sideX, y + .5, z, stoneFor(-12, y, z), new THREE.Vector3(1.18, 1, 1.95));
        addBlock(ox + sideX, y + .5, z, stoneFor(12, y, z), new THREE.Vector3(1.18, 1, 1.95));
      }
    }
  }
  addArch(ox, 5.35, frontZ + .66, 2.3);
  // Wide side-gate lintels and posts make the two ground-level exits readable.
  for (const side of [-1, 1]) {
    const gateX = ox + side * sideX;
    addBlock(gateX, 6.28, .75, MAT.stoneDark, new THREE.Vector3(1.35, 1.25, 5.0));
    addColumn(gateX, .15, -1.72, 4.9, MAT.stoneLight, .38);
    addColumn(gateX, .15, 3.22, 4.9, MAT.stoneWarm, .38);
    addSlab(gateX + side * 2.25, -.24, .75, 4.5, 4.7, MAT.stoneWarm);
  }
  addSlab(ox - 8.1, 7.05, frontZ, 8.9, 1.5, MAT.stoneDark);
  addSlab(ox + 8.1, 7.05, frontZ, 8.9, 1.5, MAT.stoneDark);
  addSlab(ox, 7.05, backZ, 25.0, 1.5, MAT.stoneDark);
  for (let x = -12; x <= 12; x += 2.4) {
    addBlock(ox + x, 7.72, frontZ, MAT.stoneLight, new THREE.Vector3(1.05, 1.15, 1.25));
    addBlock(ox + x, 7.72, backZ, MAT.stoneWarm, new THREE.Vector3(1.05, 1.15, 1.25));
  }
  for (const z of sideWallZs) {
    addBlock(ox - sideX, 7.72, z, MAT.stoneLight, new THREE.Vector3(1.25, 1.15, 1.05));
    addBlock(ox + sideX, 7.72, z, MAT.stoneWarm, new THREE.Vector3(1.25, 1.15, 1.05));
  }

  // Four genuinely volumetric corner towers anchor the curtain wall.
  const towerCenters = [
    [ox - sideX, frontZ], [ox + sideX, frontZ],
    [ox - sideX, backZ], [ox + sideX, backZ],
  ];
  for (let towerIndex = 0; towerIndex < towerCenters.length; towerIndex++) {
    const [tx, tz] = towerCenters[towerIndex];
    for (let y = 1; y <= 10; y++) {
      for (const [dx, dz] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
        addBlock(tx + dx, y + .5, tz + dz, stoneFor(dx + towerIndex * 3, y, dz), new THREE.Vector3(1.95, 1, 1.95));
      }
    }
    addSlab(tx, 11.18, tz, 5.1, 4.9, MAT.stoneDark);
    for (const [dx, dz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
      addBlock(tx + dx, 11.9, tz + dz, towerIndex % 2 ? MAT.stoneWarm : MAT.stoneLight, new THREE.Vector3(1.05, 1.3, 1.05));
    }
    addBlock(tx, 13.45, tz, towerIndex % 2 ? MAT.roof : MAT.roofDark, new THREE.Vector3(2.75, 3.1, 2.75), "cone");
    addFlag(tx, 15.0, tz, towerIndex % 2 ? 1 : -1);
  }

  // The central keep is a complete three-storey building with front, rear and side walls.
  const keepFront = 1.45;
  const keepBack = -6.8;
  const keepSide = 6.35;
  for (let y = 2; y <= 17; y++) {
    const thirdFloor = y >= 13;
    for (let x = -5.6; x <= 5.6; x += 1.4) {
      const lowerDoor = Math.abs(x) < 1.55 && y <= 6;
      const royalCell = thirdFloor && Math.abs(x) < 2.65 && y <= 16;
      const frontWindow = !thirdFloor && Math.abs(x) > 3.25 && [4, 5, 9, 10].includes(y);
      if (!lowerDoor && !royalCell && !frontWindow) {
        addBlock(ox + x, y + .5, keepFront, stoneFor(x, y, 1), new THREE.Vector3(1.32, 1, 1.18));
      }
      const rearWindow = Math.abs(Math.abs(x) - 2.8) < .2 && [5, 10, 15].includes(y);
      if (!rearWindow) addBlock(ox + x, y + .5, keepBack, stoneFor(x + 3, y, -6), new THREE.Vector3(1.32, 1, 1.18));
    }
    for (let z = -5.8; z <= .4; z += 1.55) {
      const slit = Math.abs(z + 2.2) < .4 && [5, 10, 15].includes(y);
      const leftLowerDoor = y <= 6 && z < -2.65;
      const rightLowerDoor = y <= 6 && z > -1.25;
      const leftGalleryDoor = y >= 7 && y <= 9 && z < -2.65;
      const rightGalleryDoor = y >= 7 && y <= 9 && z > -1.25;
      const leftCellDoor = y >= 13 && y <= 15 && z > -.95;
      const rightCellDoor = y >= 13 && y <= 15 && z < -3.1;
      if (!slit && !leftLowerDoor && !leftGalleryDoor && !leftCellDoor) {
        addBlock(ox - keepSide, y + .5, z, stoneFor(-5, y, z), new THREE.Vector3(1.18, 1, 1.42));
      }
      if (!slit && !rightLowerDoor && !rightGalleryDoor && !rightCellDoor) {
        addBlock(ox + keepSide, y + .5, z, stoneFor(5, y, z), new THREE.Vector3(1.18, 1, 1.42));
      }
    }
  }

  // Segmented structural floors bind the keep into a single believable mass.
  for (const floorY of [1.92, 7.0, 12.58]) {
    for (const dx of [-4.2, 0, 4.2]) {
      addBlock(ox + dx, floorY, -2.68, floorY === 7 ? MAT.wood : MAT.stoneDark, new THREE.Vector3(4.05, .48, 8.15));
    }
  }
  addArch(ox, 5.35, keepFront + .66, 1.75);
  addSlab(ox, 7.33, keepFront + .38, 13.0, .9, MAT.stoneWarm);
  addSlab(ox, 12.92, keepFront + .38, 13.0, .9, MAT.stoneLight);
  addColumn(ox - 3.18, 12.9, keepFront + .58, 4.0);
  addColumn(ox + 3.18, 12.9, keepFront + .58, 4.0);
  addArch(ox, 16.15, keepFront + .52, 2.65);
  for (const x of [-1.55, -.52, .52, 1.55]) {
    const bar = addBlock(ox + x, 14.98, keepFront + .82, MAT.ink, new THREE.Vector3(.13, 4.05, .13), "cylinder");
    bar.isChamberBar = true;
    chamberBars.push(bar);
  }

  // Parapets wrap all four edges of the keep roof.
  addSlab(ox, 18.18, keepFront, 14.0, 1.25, MAT.stoneDark);
  addSlab(ox, 18.18, keepBack, 14.0, 1.25, MAT.stoneDark);
  for (let x = -5.6; x <= 5.6; x += 2.25) {
    addBlock(ox + x, 18.85, keepFront, MAT.stoneLight, new THREE.Vector3(1.05, 1.2, 1.05));
    addBlock(ox + x, 18.85, keepBack, MAT.stoneWarm, new THREE.Vector3(1.05, 1.2, 1.05));
  }
  for (const side of [-1, 1]) {
    for (let z = -5.7; z <= .4; z += 2.05) {
      addBlock(ox + side * keepSide, 18.85, z, side < 0 ? MAT.stoneLight : MAT.stoneWarm, new THREE.Vector3(1.05, 1.2, 1.05));
    }
  }
  addSlab(ox, 17.64, keepFront + .45, 14.2, .55, MAT.gold);
  addCrest(ox - 4.7, 15.2, keepFront + 1.02, -1);
  addCrest(ox + 4.7, 15.2, keepFront + 1.02, 1);
  addFlag(ox, 19.0, cz, 1);

  // A gatehouse bridges the outer wall to the keep and makes the courtyard legible.
  addColumn(ox - 2.65, 1.0, 2.75, 5.1, MAT.stoneWarm, .42);
  addColumn(ox + 2.65, 1.0, 2.75, 5.1, MAT.stoneWarm, .42);
  addSlab(ox, 6.25, 2.75, 6.6, 1.25, MAT.stoneLight);
  addCrest(ox, 5.0, 3.48, 1);

  // Two complete, generously proportioned routes run from the prison floor to
  // ground level. Each flight overlaps a broad landing so the walk graph and
  // the visible stonework describe exactly the same route.
  addStairFlight(new THREE.Vector3(3.55, .22, 3.55), new THREE.Vector3(0, 0, -1), 11, .62, .68, 3.15);
  addStairLanding(3.65, 7.0, -3.85, new THREE.Vector3(4.25, .48, 4.25), MAT.stoneLight);
  addStairFlight(new THREE.Vector3(3.55, 7.3, -4.85), new THREE.Vector3(0, 0, 1), 11, .52, .62, 3.15);
  addStairLanding(3.7, 12.58, 1.28, new THREE.Vector3(4.25, .48, 3.7), MAT.stoneLight);

  // The east route enters through the new level side gate, continues onto the
  // second-floor gallery, and turns toward the rear prison-floor doorway.
  addStairLanding(25.35, .24, .72, new THREE.Vector3(2.5, .48, 3.4), MAT.stoneWarm);
  addStairFlight(new THREE.Vector3(24.2, .22, .72), new THREE.Vector3(-1, 0, 0), 12, .56, .61, 3.15);
  addStairLanding(16.5, 7.0, .72, new THREE.Vector3(4.6, .48, 4.3), MAT.stoneWarm);
  addStairFlight(new THREE.Vector3(16.45, 7.3, 1.12), new THREE.Vector3(0, 0, -1), 11, .52, .62, 3.15);
  addStairLanding(16.3, 12.58, -5.05, new THREE.Vector3(4.25, .48, 3.7), MAT.stoneWarm);

  // A broad front stair and gallery make the entrance hall believable and
  // offer a third way to reach the first landing after partial destruction.
  addStairFlight(new THREE.Vector3(10, .22, 9.9), new THREE.Vector3(0, 0, -1), 11, .62, .68, 3.6);
  addStairLanding(10, 7.0, 2.72, new THREE.Vector3(4.8, .48, 4.0), MAT.stoneWarm);

  // The cell threshold and upper galleries are wide enough for turns and
  // recovery animations; neither side ends at a narrow floating ledge.
  addStairLanding(10, 12.62, .05, new THREE.Vector3(6.2, .42, 5.6), MAT.wood);
  addStairLanding(6.0, 12.62, .8, new THREE.Vector3(4.6, .42, 3.15), MAT.wood);
  addStairLanding(14.15, 12.62, -4.55, new THREE.Vector3(4.5, .42, 3.15), MAT.wood);
  addStairLanding(11.65, 12.62, -2.75, new THREE.Vector3(3.4, .42, 4.8), MAT.wood);

  // Buttresses, banners and moss make the rear and side approaches worth scouting.
  for (const side of [-1, 1]) {
    addButtress(ox + side * 8.8, frontZ + .35, 6);
    addButtress(ox + side * 8.8, backZ - .35, 6);
    addCrest(ox + side * 10.2, 4.7, frontZ + .68, side);
  }
  for (const [x, z] of [[-10.2, 7.85], [10.2, 7.85], [-14.6, -4.1], [14.6, -4.1], [-9.0, -12.05], [9.0, -12.05]]) {
    addBlock(ox + x, 2.2, z, MAT.moss, new THREE.Vector3(1.35, .3, .22));
  }
}

function makeCastle() {
  if (stageNumber === 3) makeCastleStage3();
  else if (stageNumber === 2) makeCastleStage2();
  else makeCastleStage1();
}

function characterMat(color) {
  // The deliberately low segment counts provide the faceting; MeshToonMaterial
  // keeps those planes readable without smoothing them into glossy figures.
  return new THREE.MeshToonMaterial({ color });
}

function characterMesh(geometry, material, x, y, z, parent) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeFacetedLimb({ length, topRadius, bottomRadius, material, handMaterial = null, bootMaterial = null }) {
  const pivot = new THREE.Group();
  characterMesh(new THREE.CylinderGeometry(topRadius, bottomRadius, length, 5), material, 0, -length * .48, 0, pivot);
  if (handMaterial) characterMesh(new THREE.DodecahedronGeometry(bottomRadius * 1.18, 0), handMaterial, 0, -length - bottomRadius * .32, .015, pivot);
  if (bootMaterial) {
    const boot = characterMesh(new THREE.BoxGeometry(bottomRadius * 2.25, .22, bottomRadius * 3.25), bootMaterial, 0, -length - .06, .09, pivot);
    boot.rotation.x = -.08;
  }
  return pivot;
}

function makeJointedArm({ length, topRadius, bottomRadius, material, handMaterial }) {
  const shoulder = new THREE.Group();
  const upperLength = length * .52;
  const lowerLength = length * .48;
  const elbowRadius = (topRadius + bottomRadius) * .53;
  characterMesh(new THREE.CylinderGeometry(topRadius, elbowRadius, upperLength, 5), material, 0, -upperLength * .48, 0, shoulder);
  const elbow = new THREE.Group();
  elbow.position.y = -upperLength;
  characterMesh(new THREE.DodecahedronGeometry(elbowRadius * 1.08, 0), material, 0, 0, 0, elbow);
  characterMesh(new THREE.CylinderGeometry(elbowRadius, bottomRadius, lowerLength, 5), material, 0, -lowerLength * .48, 0, elbow);
  characterMesh(new THREE.DodecahedronGeometry(bottomRadius * 1.22, 0), handMaterial, 0, -lowerLength - bottomRadius * .32, .015, elbow);
  shoulder.add(elbow);
  return { shoulder, elbow };
}

function addLowPolyFace(group, y, skinMaterial, hairMaterial, expression = "calm") {
  const hair = characterMesh(new THREE.DodecahedronGeometry(.39, 0), hairMaterial, 0, y + .04, -.075, group);
  hair.scale.set(1.02, 1.08, .93);
  const face = characterMesh(new THREE.DodecahedronGeometry(.34, 0), skinMaterial, 0, y, .055, group);
  face.scale.set(.92, 1.06, .84);
  const eyeMaterial = characterMat(expression === "rival" ? 0xffcf58 : 0x29233a);
  for (const side of [-1, 1]) {
    const eye = characterMesh(new THREE.BoxGeometry(.075, .075, .045), eyeMaterial, side * .105, y + .035, .335, group);
    eye.rotation.z = expression === "rival" ? side * -.2 : 0;
  }
  const nose = characterMesh(new THREE.ConeGeometry(.055, .13, 4), skinMaterial, 0, y - .035, .36, group);
  nose.rotation.x = Math.PI / 2;
  const mouthMaterial = characterMat(expression === "rival" ? 0x5b2032 : 0xb84e68);
  const mouth = characterMesh(new THREE.BoxGeometry(.12, .035, .035), mouthMaterial, 0, y - .155, .325, group);
  if (expression === "rival") mouth.rotation.z = -.12;
  return { face, hair };
}

function makePrincess() {
  const group = new THREE.Group();
  const skin = characterMat(0xffd2ad), hairMat = characterMat(0x754536);
  const dressMat = characterMat(0xf58fbd), dressLight = characterMat(0xffb5d2), dressDark = characterMat(0xb94f83);
  const skirt = characterMesh(new THREE.ConeGeometry(.64, 1.22, 6), dressMat, 0, .63, 0, group);
  skirt.rotation.y = Math.PI / 6;
  const bodice = characterMesh(new THREE.CylinderGeometry(.29, .43, .72, 5), dressLight, 0, 1.32, 0, group);
  bodice.rotation.y = Math.PI / 5;
  characterMesh(new THREE.CylinderGeometry(.43, .43, .12, 6), dressDark, 0, 1.02, 0, group);
  characterMesh(new THREE.BoxGeometry(.16, .66, .10), characterMat(0xffdce8), 0, 1.33, .39, group);
  addLowPolyFace(group, 1.94, skin, hairMat, "calm");
  for (const side of [-1, 1]) {
    const sideHair = characterMesh(new THREE.CylinderGeometry(.11, .15, .7, 5), hairMat, side * .29, 1.73, -.08, group);
    sideHair.rotation.z = side * .08;
  }
  const crownBand = characterMesh(new THREE.CylinderGeometry(.29, .31, .15, 6), characterMat(0xe5a92f), 0, 2.30, -.01, group);
  const crown = characterMesh(new THREE.ConeGeometry(.31, .43, 5), characterMat(0xffd35c), 0, 2.53, -.01, group);
  crown.rotation.y = Math.PI / 5;
  for (const side of [-1, 1]) {
    const { shoulder, elbow } = makeJointedArm({ length: .58, topRadius: .12, bottomRadius: .09, material: skin, handMaterial: skin });
    shoulder.position.set(side * .43, 1.58, 0);
    characterMesh(new THREE.DodecahedronGeometry(.18, 0), dressLight, 0, -.04, 0, shoulder).scale.set(1.15, .9, 1.05);
    shoulder.rotation.z = side * -.08;
    elbow.rotation.x = -.12;
    elbow.rotation.z = side * .18;
    princessParts[side < 0 ? "leftArm" : "rightArm"] = shoulder;
    princessParts[side < 0 ? "leftElbow" : "rightElbow"] = elbow;
    group.add(shoulder);
  }
  characterMesh(new THREE.BoxGeometry(.19, .11, .26), dressDark, -.19, .12, .05, group);
  characterMesh(new THREE.BoxGeometry(.19, .11, .26), dressDark, .19, .12, .05, group);
  scene.add(group);

  // ★変更：バルコニーの高さに合わせて配置を調整
  const homePos = stageNumber === 3 ? new THREE.Vector3(10, 13.72, -1.08) : stageNumber === 2 ? new THREE.Vector3(10, 8.88, -1.08) : new THREE.Vector3(10, 4.0, -1.05);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(homePos.x, homePos.y, homePos.z).setCanSleep(true).setLinearDamping(.4).setAngularDamping(1.2));
  body.userData = { type: "princess" };
  const col = world.createCollider(RAPIER.ColliderDesc.capsule(.72, .43).setDensity(.65).setFriction(.9).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
  syncObjects.push({ mesh: group, body, offsetY: .1 });
  
  princess = { mesh: group, body, collider: col, home: homePos, isDead: false, deathTime: 0 };
}

const cannon = new THREE.Group();
const turret = new THREE.Group();
const barrelPivot = new THREE.Group();
const hero = new THREE.Group();
const heroParts = {};
const rival = new THREE.Group();
const rivalParts = {};

function makeCannon() {
  cannon.position.set(10, 0, stageNumber === 3 ? 31.5 : stageNumber === 2 ? 29.2 : 26.5);
  cannon.rotation.y = Math.PI / 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, .9, 2.9), MAT.cannon); base.position.y = .65; base.castShadow = true; cannon.add(base);
  for (const z of [-1.5, 1.5]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .42, 8), MAT.wheel);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(0, .7, z); wheel.castShadow = true; cannon.add(wheel);
  }
  
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), MAT.wood);
  handleBar.rotation.x = Math.PI / 2;
  handleBar.position.set(-2.2, 1.4, 0);
  handleBar.castShadow = true;
  cannon.add(handleBar);
  
  for (const z of [-1.2, 1.2]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), MAT.wood);
    stem.rotation.z = Math.PI / 2;
    stem.position.set(-1.8, 1.1, z);
    cannon.add(stem);
  }

  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, .65, 8), MAT.cannon); turntable.position.y = 1.35; turntable.castShadow = true; turret.add(turntable);
  barrelPivot.position.y = 1.65;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(5.2, .62, .62), MAT.ink); barrel.position.x = 2.45; barrel.castShadow = true; barrelPivot.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(.45, .9, .9), MAT.gold); muzzle.position.x = 5.05; barrelPivot.add(muzzle);
  turret.add(barrelPivot); cannon.add(turret); scene.add(cannon);
}

function makeHero() {
  const skin = characterMat(0xffc7a0), tunic = characterMat(0x347bb1), tunicDark = characterMat(0x245579);
  const pants = characterMat(0x3b3652), boot = characterMat(0x312737), scarf = characterMat(0xe4525f), hairMat = characterMat(0x694432);
  const body = characterMesh(new THREE.CylinderGeometry(.34, .43, .95, 5), tunic, 0, 1.38, 0, hero);
  body.rotation.y = Math.PI / 5;
  characterMesh(new THREE.CylinderGeometry(.44, .44, .15, 6), tunicDark, 0, .98, 0, hero);
  characterMesh(new THREE.CylinderGeometry(.43, .43, .18, 6), scarf, 0, 1.82, 0, hero);
  addLowPolyFace(hero, 2.18, skin, hairMat, "hero");
  for (let i = 0; i < 5; i++) {
    const spike = characterMesh(new THREE.ConeGeometry(.11, .42, 4), hairMat, (i - 2) * .14, 2.55 + (i % 2) * .06, -.04, hero);
    spike.rotation.z = (i - 2) * -.17;
  }
  for (const side of [-1, 1]) {
    const { shoulder: arm, elbow } = makeJointedArm({ length: .76, topRadius: .13, bottomRadius: .10, material: skin, handMaterial: skin });
    arm.position.set(side * .48, 1.68, -.05); arm.rotation.z = side * -.12; hero.add(arm);
    characterMesh(new THREE.CylinderGeometry(.15, .13, .28, 5), tunic, 0, -.12, 0, arm);
    elbow.rotation.x = -.28;
    elbow.rotation.z = side * .22;
    heroParts[side < 0 ? "leftArm" : "rightArm"] = arm;
    heroParts[side < 0 ? "leftElbow" : "rightElbow"] = elbow;
    const leg = makeFacetedLimb({ length: .78, topRadius: .16, bottomRadius: .13, material: pants, bootMaterial: boot });
    leg.position.set(side * .20, .92, 0); hero.add(leg);
    heroParts[side < 0 ? "leftLeg" : "rightLeg"] = leg;
  }
  const scarfTail = characterMesh(new THREE.ConeGeometry(.15, .65, 3), scarf, -.17, 1.52, -.31, hero);
  scarfTail.rotation.x = -.45; scarfTail.rotation.z = -.18;
  hero.scale.setScalar(1.05);
  hero.rotation.y = Math.PI; 
  scene.add(hero);
}

function makeRival() {
  const skin = characterMat(0xd99878), red = characterMat(0xb8394f), redDark = characterMat(0x742d48), black = characterMat(0x171323);
  const body = characterMesh(new THREE.CylinderGeometry(.43, .57, 1.28, 5), red, 0, 1.48, 0, rival);
  body.rotation.y = Math.PI / 5;
  characterMesh(new THREE.CylinderGeometry(.57, .57, .16, 6), characterMat(0xd7a83d), 0, 1.08, 0, rival);
  addLowPolyFace(rival, 2.42, skin, black, "rival");
  for (const side of [-1, 1]) {
    const horn = characterMesh(new THREE.ConeGeometry(.13, .5, 4), redDark, side * .27, 2.92, -.03, rival);
    horn.rotation.z = side * -.3;
    const wing = new THREE.Group();
    wing.position.set(side * .42, 2.08, -.28);
    for (let i = 0; i < 3; i++) {
      const feather = characterMesh(new THREE.ConeGeometry(.23 + i * .035, 1.75 - i * .18, 3), black, side * (.52 + i * .27), -.28 - i * .19, -.08 - i * .03, wing);
      feather.rotation.z = side * (.72 + i * .14);
      feather.rotation.x = -.1;
    }
    rivalParts[side < 0 ? "leftWing" : "rightWing"] = wing;
    rival.add(wing);
    const { shoulder: arm, elbow } = makeJointedArm({ length: .82, topRadius: .14, bottomRadius: .10, material: redDark, handMaterial: skin });
    arm.position.set(side * .57, 1.82, .04); arm.rotation.z = side * -.3; rival.add(arm);
    elbow.rotation.x = -.34;
    elbow.rotation.z = side * .18;
    rivalParts[side < 0 ? "leftArm" : "rightArm"] = arm;
    rivalParts[side < 0 ? "leftElbow" : "rightElbow"] = elbow;
    const leg = makeFacetedLimb({ length: .85, topRadius: .17, bottomRadius: .13, material: redDark, bootMaterial: black });
    leg.position.set(side * .22, .98, 0); rival.add(leg);
  }
  const cape = characterMesh(new THREE.ConeGeometry(.78, 1.65, 4, 1, true), redDark, 0, 1.48, -.39, rival);
  cape.rotation.y = Math.PI / 4; cape.scale.z = .25;
  rival.scale.setScalar(1.15);
  rival.visible = false;
  scene.add(rival);
}

function updateMovement(dt) {
  if (!playing || result || isCameraMode || rescueState.active) return;
  const move = new THREE.Vector3(
    (moveKeys.has("KeyD") ? 1 : 0) - (moveKeys.has("KeyA") ? 1 : 0),
    0,
    (moveKeys.has("KeyS") ? 1 : 0) - (moveKeys.has("KeyW") ? 1 : 0),
  );
  const moving = move.lengthSq() > 0;

  const castleCenter = stageNumber === 3
    ? new THREE.Vector3(STAGE3_LAYOUT.centerX, 0, STAGE3_LAYOUT.centerZ)
    : new THREE.Vector3(10, 0, -1.2);
  const outward = cannon.position.clone().sub(castleCenter).setY(0).normalize();
  const heroOffset = stageNumber === 3 ? outward.multiplyScalar(2.9) : new THREE.Vector3(0, 0, 2.9);
  hero.position.lerp(cannon.position.clone().add(heroOffset), 0.5);
  // Automatic placement beside the cannon is not player movement. When idle,
  // keep the hero looking at the handles instead of preserving the direction
  // of the hidden spawn-to-cannon slide.
  if (!moving) {
    hero.rotation.y = Math.atan2(cannon.position.x - hero.position.x, cannon.position.z - hero.position.z);
  }

  if (moving) {
    move.normalize();
    cannon.position.addScaledVector(move, 3.15 * dt);
    if (stageNumber === 3) {
      cannon.position.x = THREE.MathUtils.clamp(cannon.position.x, -18, 38);
      cannon.position.z = THREE.MathUtils.clamp(cannon.position.z, -31, 36);
      const radial = cannon.position.clone().sub(castleCenter).setY(0);
      if (radial.length() < 19.2) cannon.position.copy(castleCenter.clone().add(radial.normalize().multiplyScalar(19.2)));
    } else {
      cannon.position.x = THREE.MathUtils.clamp(cannon.position.x, 3, 17);
      cannon.position.z = THREE.MathUtils.clamp(cannon.position.z, 22, 31);
    }
    const isPushing = move.z < 0;
    hero.rotation.y = Math.atan2(move.x, move.z);
    hero.rotation.x = isPushing ? -0.4 : 0.2;

    const legSwing = Math.sin(elapsed * 25) * 1.2;
    heroParts.leftLeg.rotation.x = legSwing;
    heroParts.rightLeg.rotation.x = -legSwing;
    heroParts.leftArm.rotation.x = -1.2;
    heroParts.rightArm.rotation.x = -1.2;
    heroParts.leftElbow.rotation.x = -1.05 + legSwing * .08;
    heroParts.rightElbow.rotation.x = -1.05 - legSwing * .08;

    sweatTimer -= dt;
    if (sweatTimer <= 0) {
      sweatTimer = .12;
      const sweat = makeParticle(hero.position.clone().add(new THREE.Vector3((Math.random() - .5) * .5, 2.55, (Math.random() - .5) * .3)), 0x8eeaff, .16 + Math.random() * .08, 1);
      sweat.velocity.set((Math.random() - .5) * 2.4, 3 + Math.random() * 1.2, (Math.random() - .5) * 2.4);
      sweat.life = .9;
      explosions.push(sweat);
    }
  } else {
    hero.rotation.x *= 0.8;
    heroParts.leftLeg.rotation.x *= 0.75; heroParts.rightLeg.rotation.x *= 0.75;
    heroParts.leftArm.rotation.x = -1.0;
    heroParts.rightArm.rotation.x = -1.0;
    heroParts.leftElbow.rotation.x = THREE.MathUtils.lerp(heroParts.leftElbow.rotation.x, -.28, .18);
    heroParts.rightElbow.rotation.x = THREE.MathUtils.lerp(heroParts.rightElbow.rotation.x, -.28, .18);
  }
  if (moving) updateCannon();
}

const trajectory = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xfff3c5, dashSize: .45, gapSize: .28, transparent: true, opacity: .8 }));
scene.add(trajectory);

function cannonAimAngle() {
  if (stageNumber !== 3) return yaw;
  const dx = STAGE3_LAYOUT.centerX - cannon.position.x;
  const dz = STAGE3_LAYOUT.centerZ - cannon.position.z;
  return Math.atan2(-dx, -dz) + yaw;
}

function muzzleState() {
  const horizontal = Math.cos(pitch);
  const aimAngle = cannonAimAngle();
  const dir = new THREE.Vector3(-Math.sin(aimAngle) * horizontal, Math.sin(pitch), -Math.cos(aimAngle) * horizontal);
  const start = cannon.position.clone().add(new THREE.Vector3(0, 1.65, 0)).addScaledVector(dir, 5.2);
  return { dir, start };
}

function updateCannon() {
  turret.rotation.y = cannonAimAngle();
  barrelPivot.rotation.z = pitch;
  const { dir, start } = muzzleState();
  const displayPower = isCharging ? chargeLevel : 1.0; 
  const speed = 10 + displayPower * 25; 
  
  const points = [];
  for (let t = 0; t <= 2.1; t += .09) {
    const p = start.clone().addScaledVector(dir, speed * t);
    p.y += -.5 * 14 * t * t;
    if (p.y < .15) break;
    points.push(p);
  }
  trajectoryPoints = points;
  trajectory.geometry.dispose();
  trajectory.geometry = new THREE.BufferGeometry().setFromPoints(points);
  trajectory.computeLineDistances();
}

function updateAmmo() {
  ui.ammoPips.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const pip = document.createElement("i");
    pip.className = `ammo-pip${i >= ammo ? " spent" : ""}`;
    ui.ammoPips.appendChild(pip);
  }
  ui.fireButton.disabled = ammo <= 0 || !playing || result || isCameraMode || rescueState.active || shotCooldown > 0;
}

function updateHP() {
  if(!ui.hpPips) return;
  ui.hpPips.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const pip = document.createElement("span");
    pip.className = `hp-pip${i >= princessHP ? " spent" : ""}`;
    pip.textContent = "♥";
    ui.hpPips.appendChild(pip);
  }
}

function showPrincessSpeech(text, mood = "angry", duration = 2500) {
  if(!ui.princessSpeech) return;
  ui.princessSpeech.textContent = text;
  ui.princessSpeech.classList.toggle("joy", mood === "joy");
  ui.princessSpeech.classList.add("visible");
  if (speechTimeout) clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => {
    ui.princessSpeech.classList.remove("visible");
  }, duration);
}

function fire(power) {
  if (!playing || result || isCameraMode || rescueState.active || ammo <= 0 || shotCooldown > 0) return;
  initAudio();
  const { dir, start } = muzzleState();
  const radius = .48;
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), MAT.ink);
  mesh.castShadow = true; scene.add(mesh);
  
  const speed = 10 + power * 25; 
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setLinvel(dir.x * speed, dir.y * speed, dir.z * speed).setCcdEnabled(true));
  body.userData = { type: "ball" };
  const collider = world.createCollider(RAPIER.ColliderDesc.ball(radius).setDensity(4.5).setRestitution(.12).setFriction(.65).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
  projectiles.push({ mesh, body, collider, born: elapsed, impacted: false });
  syncObjects.push({ mesh, body });
  ammo--; shotCooldown = .7; lastShotAt = elapsed;
  cannonKick(power); 
  sound("fire"); 
  updateAmmo();
  updateCannon();
}

function cannonKick(power) {
  turret.position.x = -0.5 * power;
  setTimeout(() => { turret.position.x = 0; }, 110);
  
  const kickDir = muzzleState().dir.clone().setY(0).normalize();
  cannon.position.addScaledVector(kickDir, -1.8 * power);
  if (stageNumber !== 3) cannon.position.z = Math.min(cannon.position.z, 31);
  
  hero.rotation.x = -0.7; 
  setTimeout(() => { hero.rotation.x = 0; }, 300);

  const { start } = muzzleState();
  for (let i = 0; i < 7; i++) explosions.push(makeParticle(start, 0xffcf58, .12 + Math.random() * .16, 5));
}

function makeParticle(position, color, size, speed) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat(color));
  mesh.position.copy(position); scene.add(mesh);
  return { mesh, velocity: new THREE.Vector3((Math.random() - .5) * speed, Math.random() * speed, (Math.random() - .5) * speed), life: .65 + Math.random() * .4 };
}

function explodeAt(position) {
  sound("impact");
  for (let i = 0; i < 22; i++) explosions.push(makeParticle(position, i % 3 ? 0xffcf58 : 0xf05b62, .1 + Math.random() * .2, 8));
  cameraShake = .5;
}

function damagePrincess() {
  if (princessInvincible > 0 || result) return;
  princessHP--;
  princessInvincible = 1.2; 
  updateHP();
  
  const p = princess.body.translation();
  for (let i = 0; i < 12; i++) {
    explosions.push(makeParticle(new THREE.Vector3(p.x, p.y + 1, p.z), 0xf05b62, 0.15 + Math.random() * 0.1, 4));
  }

  if (princessHP <= 0) {
    if (rescueState.active) failRescueAccident();
    else failPrincess("崩れた石の下で、姫は力尽きてしまった…。");
    princess.isDead = true;
    princess.deathTime = elapsed;
  } else {
    // First emphasize the collision, then let the princess complain clearly.
    hitSlowTimer = .72;
    complaintPending = true;
    angryTimer = 0;
    slowMotion = .16;
    showPrincessSpeech("きゃっ！");
    ui.slowCaption.textContent = "OUCH!!";
    ui.slowCaption.classList.add("impact");
    ui.slowCaption.classList.remove("visible");
    void ui.slowCaption.offsetWidth;
    ui.slowCaption.classList.add("visible");
    cameraShake = .72;
    const pvel = princess.body.linvel();
    princess.body.setLinvel({ x: pvel.x, y: 4.0, z: pvel.z }, true);
    princessRecovery.delay = 1.05;
    princessRecovery.stillTime = 0;
    sound("impact");
  }
}

function trajectoryIsAimedAtPrincess() {
  if (!princess || princess.isDead || princessHP <= 0 || trajectoryPoints.length < 2) return false;
  const p = princess.body.translation();
  const targets = [
    new THREE.Vector3(p.x, p.y, p.z),
    new THREE.Vector3(p.x, p.y + .75, p.z),
    new THREE.Vector3(p.x, p.y + 1.5, p.z),
    new THREE.Vector3(p.x, p.y + 2.25, p.z),
  ];
  const segment = new THREE.Line3();
  const closest = new THREE.Vector3();
  for (let i = 1; i < trajectoryPoints.length; i++) {
    segment.set(trajectoryPoints[i - 1], trajectoryPoints[i]);
    for (const target of targets) {
      segment.closestPointToPoint(target, true, closest);
      if (closest.distanceToSquared(target) < 1.35 * 1.35) return true;
    }
  }
  return false;
}

function updatePrincessAimWarning(realDt) {
  princessAimWarningCooldown = Math.max(0, princessAimWarningCooldown - realDt);
  if (!playing || result || isCameraMode || rescueState.active || princess.isDead || princessHP <= 0) return;
  if (!trajectoryIsAimedAtPrincess() || princessAimWarningCooldown > 0) return;
  if (hitSlowTimer > 0 || complaintPending || princessRecovery.active || angryTimer > 0 || ui.princessSpeech?.classList.contains("visible")) return;
  princessAimWarningCooldown = 4.2;
  angryTimer = 2.7;
  showPrincessSpeech(randomLine(princessAimWarningLines), "angry", 2700);
}

function randomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function beginPrincessRecovery() {
  if (princessRecovery.active || princess.isDead || result || rescueState.active || princessHP <= 0) return;
  const p = princess.body.translation();
  const q = princess.body.rotation();
  princessRecovery.active = true;
  princessRecovery.progress = 0;
  princessRecovery.stillTime = 0;
  princessRecovery.position.set(p.x, p.y, p.z);
  princessRecovery.startQuat.set(q.x, q.y, q.z, q.w);
  princess.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  princess.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  princess.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  angryTimer = Math.max(angryTimer, 2.6);
  showPrincessSpeech(randomLine(princessFallLines), "angry", 3000);
  showHeroSpeech(randomLine(heroFallLines), true, 2800);
}

function updatePrincessRecovery(realDt) {
  if (!princess || princess.isDead || result || rescueState.active || princessHP <= 0) return;
  if (princessRecovery.delay > 0) princessRecovery.delay -= realDt;

  if (princessRecovery.active) {
    princessRecovery.progress = Math.min(1, princessRecovery.progress + realDt / .72);
    const u = THREE.MathUtils.smoothstep(princessRecovery.progress, 0, 1);
    const upright = princessRecovery.startQuat.clone().slerp(new THREE.Quaternion(), u);
    const standY = princessRecovery.position.y + Math.sin(u * Math.PI) * .24;
    princess.body.setTranslation({ x: princessRecovery.position.x, y: standY, z: princessRecovery.position.z }, true);
    princess.body.setRotation({ x: upright.x, y: upright.y, z: upright.z, w: upright.w }, true);
    if (princessRecovery.progress >= 1) {
      princess.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      princess.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      princess.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      princess.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      princessInvincible = Math.max(princessInvincible, .7);
      princessRecovery.active = false;
      princessRecovery.delay = .8;
    }
    return;
  }

  const q = princess.body.rotation();
  const tilt = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).y;
  const v = princess.body.linvel();
  const speed = Math.hypot(v.x, v.y, v.z);
  const clearlyFallen = tilt < .72;
  if (clearlyFallen && speed < 1.7) princessRecovery.stillTime += realDt;
  else princessRecovery.stillTime = 0;

  const impactRecoveryReady = princessRecovery.delay <= 0 && tilt < .84 && speed < 3.4;
  if (princessRecovery.stillTime > .55 || impactRecoveryReady) beginPrincessRecovery();
}

function updatePrincessCamState() {
  let text = "安全", mode = "";
  if (princess.isDead || princessHP <= 0) { text = "ダウン"; mode = "danger"; }
  else if (princessRecovery.active) { text = "起き上がり中"; mode = "danger"; }
  else if (hitSlowTimer > 0 || princessRecovery.delay > .45) { text = "衝撃！"; mode = "danger"; }
  else if (rescueState.active) { text = rescueState.abducted ? (stageNumber === 3 ? "黒い翼！" : "連れ去り！") : "救出中！"; mode = stageNumber === 3 && rescueState.abducted ? "danger" : "joy"; }
  else if (escapeSearch.blocked) { text = "道がない！"; mode = "danger"; }
  else if (princessExposed) { text = "出口を発見！"; mode = "joy"; }
  ui.princessCamState.textContent = text;
  ui.princessCam.classList.toggle("danger", mode === "danger");
  ui.princessCam.classList.toggle("joy", mode === "joy");
}

function renderPrincessCamera() {
  if (!princess) return;
  // Frame the new, taller low-poly character from her dress hem through the
  // crown. The camera remains world-front-facing even when she tumbles.
  const focus = princess.mesh.position.clone().add(new THREE.Vector3(0, 1.62, 0));
  // The castle front faces +Z, so this is a straight-on close-up rather than
  // the previous diagonal surveillance angle.
  const desired = focus.clone().add(new THREE.Vector3(0, .03, 3.65));
  if (princessCamera.position.lengthSq() < .01) {
    princessCamera.position.copy(desired);
    princessCamTarget.copy(focus);
  }
  const followDistance = princessCamera.position.distanceTo(desired);
  princessCamera.position.lerp(desired, followDistance > 2.2 ? .68 : .30);
  princessCamTarget.lerp(focus, followDistance > 2.2 ? .72 : .46);
  princessCamera.lookAt(princessCamTarget);

  // Rubble may fly between the close-up camera and the princess. Hide only
  // those activated pieces for this secondary render, then immediately restore
  // them so the main game view still shows every piece of the collapse.
  const toPrincess = princessCamTarget.clone().sub(princessCamera.position);
  const cameraDistance = toPrincess.length();
  const rubbleMeshes = blocks.filter(block => block.activated && block.mesh.visible).map(block => block.mesh);
  const hiddenForCloseup = [];
  if (rubbleMeshes.length && cameraDistance > .1) {
    princessCamRay.set(princessCamera.position, toPrincess.normalize());
    princessCamRay.far = Math.max(.1, cameraDistance - .42);
    for (const hit of princessCamRay.intersectObjects(rubbleMeshes, false)) {
      if (!hiddenForCloseup.includes(hit.object)) {
        hit.object.visible = false;
        hiddenForCloseup.push(hit.object);
      }
    }
  }
  princessRenderer.render(scene, princessCamera);
  for (const mesh of hiddenForCloseup) mesh.visible = true;
  updatePrincessCamState();
}

function structureBoxBlocksCharacter(box, x, z, feetY, radius = .36) {
  const overlapsFootprint = x + radius > box.min.x && x - radius < box.max.x
    && z + radius > box.min.z && z - radius < box.max.z;
  if (!overlapsFootprint) return false;
  // A supporting floor ends at the character's feet and must remain walkable.
  // A wall, column base or intact block extending into the body volume is solid.
  return box.max.y > feetY + .28 && box.min.y < feetY + 1.95;
}

function intactStructureBlocksPoint(x, z, feetY) {
  for (const block of blocks) {
    if (block.shape !== "box" || block.activated || block.isStair) continue;
    block.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(block.mesh);
    if (structureBoxBlocksCharacter(box, x, z, feetY)) return true;
  }
  return false;
}

function findSafeEscapePath() {
  const p = princess.body.translation();
  const princessFeet = p.y - 1.05;
  const spacing = stageNumber === 3 ? .55 : .8;
  const minX = stageNumber === 3 ? STAGE3_LAYOUT.westExitX - 1.8 : 5.2;
  const maxX = stageNumber === 3 ? STAGE3_LAYOUT.eastExitX + 1.8 : 14.8;
  const minZ = stageNumber === 3 ? STAGE3_LAYOUT.backExitZ - 1.2 : -4.2;
  const maxZ = stageNumber === 3 ? STAGE3_LAYOUT.frontExitZ + 1.8 : 10.6;
  const cols = Math.floor((maxX - minX) / spacing) + 1;
  const rows = Math.floor((maxZ - minZ) / spacing) + 1;
  const walkSurfaces = [];
  const intactObstacles = [];

  for (const block of blocks) {
    if (block.shape !== "box") continue;
    const velocity = block.body.linvel();
    const spin = block.body.angvel();
    if (block.activated && (Math.hypot(velocity.x, velocity.y, velocity.z) > .72 || Math.hypot(spin.x, spin.y, spin.z) > .8)) continue;
    block.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(block.mesh);
    if (!block.activated && !block.isStair) intactObstacles.push(box);
    const width = box.max.x - box.min.x;
    const depth = box.max.z - box.min.z;
    if (stageNumber === 3 && !block.isStair && !block.activated && width < 1.5 && depth < 1.5) continue;
    if (width < .58 || depth < .58 || box.max.y < .08 || box.max.y > princessFeet + .72) continue;
    walkSurfaces.push({ box, y: box.max.y, block });
  }

  const cells = new Map();
  const keyFor = (ix, iz) => `${ix},${iz}`;
  for (let iz = 0; iz < rows; iz++) {
    const z = minZ + iz * spacing;
    for (let ix = 0; ix < cols; ix++) {
      const x = minX + ix * spacing;
      const covering = walkSurfaces.filter(surface => x >= surface.box.min.x - .02 && x <= surface.box.max.x + .02 && z >= surface.box.min.z - .02 && z <= surface.box.max.z + .02);
      const heights = covering.map(surface => surface.y);
      const groundBlocked = covering.some(surface => surface.box.min.y < 1.8 && surface.box.max.y > .62);
      if (!groundBlocked) heights.push(0);
      heights.sort((a, b) => a - b);
      const unique = heights
        .filter((height, index) => index === 0 || Math.abs(height - heights[index - 1]) > .22)
        .filter(height => !intactObstacles.some(box => structureBoxBlocksCharacter(box, x, z, height)));
      cells.set(keyFor(ix, iz), unique.map((y, level) => ({ id: `${ix},${iz},${level}`, ix, iz, x, y, z })));
    }
  }

  const allNodes = [...cells.values()].flat();
  let startNode = null, startScore = Infinity;
  for (const node of allNodes) {
    const horizontal = Math.hypot(node.x - p.x, node.z - p.z);
    const vertical = Math.abs(node.y - princessFeet);
    const score = horizontal + vertical * 1.8;
    if (horizontal <= 1.5 && vertical <= 1.35 && score < startScore) {
      startNode = node;
      startScore = score;
    }
  }
  if (!startNode) return null;

  const queue = [startNode];
  const visited = new Set([startNode.id]);
  const previous = new Map();
  let goal = null;
  // Include the current grid column: a stair tread often overlaps a landing
  // horizontally, and changing height inside that overlap is a valid step.
  const directions = [-1, 0, 1].flatMap(dx => [-1, 0, 1].map(dz => [dx, dz]));

  while (queue.length && visited.size < (stageNumber === 3 ? 8000 : 4500)) {
    const current = queue.shift();
    const reachedExit = stageNumber === 3
      ? current.y <= .25 && (current.z >= STAGE3_LAYOUT.frontExitZ || current.z <= STAGE3_LAYOUT.backExitZ || current.x <= STAGE3_LAYOUT.westExitX || current.x >= STAGE3_LAYOUT.eastExitX)
      : current.y <= .25 && (current.z >= 5.8 || current.x <= 2 || current.x >= 18);
    if (reachedExit) {
      goal = current;
      break;
    }
    for (const [dx, dz] of directions) {
      const neighbors = cells.get(keyFor(current.ix + dx, current.iz + dz)) || [];
      for (const next of neighbors) {
        const rise = next.y - current.y;
        if (rise > .72 || rise < -1.2 || visited.has(next.id)) continue;
        visited.add(next.id);
        previous.set(next.id, current);
        queue.push(next);
      }
    }
  }
  if (!goal) return null;

  const path = [];
  for (let node = goal; node; node = previous.get(node.id)) path.push(new THREE.Vector3(node.x, node.y + 1.18, node.z));
  path.reverse();
  path[0].set(p.x, p.y, p.z);
  const usedDebris = new Set();
  const usedStairs = new Set();
  for (const point of path) {
    for (const surface of walkSurfaces) {
      if (Math.abs(surface.y - (point.y - 1.18)) > .24) continue;
      if (point.x >= surface.box.min.x && point.x <= surface.box.max.x && point.z >= surface.box.min.z && point.z <= surface.box.max.z) {
        if (surface.block.activated) usedDebris.add(surface.block);
        if (surface.block.isStair) usedStairs.add(surface.block);
      }
    }
  }
  // A valid route must genuinely use rubble created by the player, not an
  // untouched parapet or side wall that only happens to form a staircase.
  if (stageNumber === 3 ? usedStairs.size < 6 : usedDebris.size < 2) return null;
  return path;
}

function supportHeightAt(x, z, expectedFeetY) {
  let best = null;
  let bestScore = Infinity;
  for (const block of blocks) {
    if (block.shape !== "box") continue;
    const velocity = block.body.linvel();
    const spin = block.body.angvel();
    if (block.activated && (Math.hypot(velocity.x, velocity.y, velocity.z) > .85 || Math.hypot(spin.x, spin.y, spin.z) > 1.0)) continue;
    block.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(block.mesh);
    if (x < box.min.x - .045 || x > box.max.x + .045 || z < box.min.z - .045 || z > box.max.z + .045) continue;
    const score = Math.abs(box.max.y - expectedFeetY);
    if (score <= 1.24 && score < bestScore) {
      best = box.max.y;
      bestScore = score;
    }
  }
  if (expectedFeetY <= 1.25 && Math.abs(expectedFeetY) < bestScore) return 0;
  return best;
}

function cancelGuidedEscape() {
  rescueState.active = false;
  rescueState.escapePath = [];
  rescueState.walkCompleteTime = 0;
  rescueState.finaleCue = 0;
  isSuccess = false;
  princess.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  princess.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  princess.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  trajectory.visible = playing && !result && !isCameraMode;
  escapeSearch.lastAt = elapsed - .25;
  escapeSearch.blocked = true;
  showPrincessSpeech("足場が崩れたわ！ 別の道を探すわ！", "angry", 3000);
  updateAmmo();
}

function usableStairCount() {
  return stairPieces.filter(step => {
    const p = step.body.translation();
    const v = step.body.linvel();
    return Math.hypot(p.x - step.start.x, p.y - step.start.y, p.z - step.start.z) < 1.15 && Math.hypot(v.x, v.y, v.z) < .9;
  }).length;
}

function updatePrincessFallDamage(realDt) {
  if (!princess || princess.isDead || result || rescueState.active || princessRecovery.active) return;
  if (fallState.cooldown > 0) fallState.cooldown -= realDt;
  const p = princess.body.translation();
  const v = princess.body.linvel();

  if (!fallState.active && v.y < -1.35) {
    fallState.active = true;
    fallState.startY = p.y;
    fallState.lowestY = p.y;
  }
  if (!fallState.active) return;
  fallState.lowestY = Math.min(fallState.lowestY, p.y);

  if (v.y > -.35) {
    const drop = fallState.startY - fallState.lowestY;
    fallState.active = false;
    if (drop > 2.65 && fallState.cooldown <= 0) {
      fallState.cooldown = 1.4;
      if (drop > 5.4) princessHP = Math.min(princessHP, 1);
      damagePrincess();
      if (!princess.isDead) showPrincessSpeech(drop > 5.4 ? "高すぎるところから落ちたわ！" : "いたた……高い所は危険ね！", "angry", 3000);
    }
  }
}

function failRescueAccident() {
  if (result) return;
  rescueState.active = false;
  rival.visible = false;
  heroPanicTimer = 3.2;
  heroPanicBase.copy(hero.position);
  showPrincessSpeech(randomLine(princessRescueAccidentLines), "angry", 2800);
  showHeroSpeech(randomLine(heroRescueAccidentLines), true, 3000);
  failPrincess("助かったと思った、その瞬間だった。落ちてきた石が姫を直撃した…。", true);
}

function updateHeroPanic(realDt) {
  if (heroPanicTimer <= 0) return;
  heroPanicTimer -= realDt;
  const wave = Math.sin(elapsed * 25);
  hero.position.x = heroPanicBase.x + wave * .13;
  hero.position.z = heroPanicBase.z;
  hero.position.y = heroPanicBase.y + Math.abs(Math.sin(elapsed * 10)) * .48;
  heroParts.leftArm.rotation.z = 1.55 + wave * .85;
  heroParts.rightArm.rotation.z = -1.55 - wave * .85;
  heroParts.leftArm.rotation.x = -.55;
  heroParts.rightArm.rotation.x = -.55;
  heroParts.leftElbow.rotation.x = -1.35 + wave * .3;
  heroParts.rightElbow.rotation.x = -1.35 - wave * .3;
}

function updatePrincessReaction(realDt) {
  if (hitSlowTimer > 0 && !result) {
    hitSlowTimer -= realDt;
    if (hitSlowTimer <= 0) {
      slowMotion = 1;
      ui.slowCaption.classList.remove("visible", "impact");
      if (complaintPending) {
        complaintPending = false;
        angryTimer = 3.4;
        const complaints = ["ちょっと！ どこをねらってるの！？ 💢", "石まで当てないで！ 💢", "助け方が乱暴すぎるわ！ 💢", "今の、わざとじゃないでしょうね！？ 💢", "もう少し丁寧に助けて！ 💢"];
        showPrincessSpeech(randomLine(complaints));
      }
    }
  }

  const leftArm = princessParts.leftArm, rightArm = princessParts.rightArm;
  const leftElbow = princessParts.leftElbow, rightElbow = princessParts.rightElbow;
  if (angryTimer > 0 && !princess.isDead) {
    angryTimer -= realDt;
    const p = princess.body.translation();
    const towardPlayer = Math.atan2(cannon.position.x - p.x, cannon.position.z - p.z);
    princess.mesh.rotation.y = towardPlayer;
    rightArm.rotation.x = -1.5 + Math.sin(elapsed * 18) * .18;
    rightArm.rotation.z = -.35;
    leftArm.rotation.x = -.2;
    leftArm.rotation.z = .45 + Math.sin(elapsed * 12) * .18;
    rightElbow.rotation.x = -1.45 + Math.sin(elapsed * 18) * .22;
    leftElbow.rotation.x = -.72 + Math.sin(elapsed * 12) * .16;
    princess.mesh.position.x += Math.sin(elapsed * 36) * .045;
    if (Math.random() < 0.24) {
      const smoke = makeParticle(new THREE.Vector3(p.x + (Math.random() - .5) * .5, p.y + 2.1, p.z), 0xffffff, .26 + Math.random() * .18, 0);
      smoke.velocity.set((Math.random() - .5), 2 + Math.random(), (Math.random() - .5));
      smoke.life = .6; explosions.push(smoke);
    }
  } else if (!rescueState.active) {
    rightArm.rotation.x *= .78; rightArm.rotation.z *= .78;
    leftArm.rotation.x *= .78; leftArm.rotation.z *= .78;
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -.12, .18);
    leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -.12, .18);
  }
}

function princessIsCalmForAmbientMotion() {
  if (!playing || result || princess.isDead || princessHP <= 0 || princessExposed || rescueState.active || princessRecovery.active) return false;
  if (hitSlowTimer > 0 || angryTimer > 0 || complaintPending || elapsed - lastShotAt < 1.35) return false;
  const p = princess.body.translation();
  const q = princess.body.rotation();
  const v = princess.body.linvel();
  const horizontalSpeed = Math.hypot(v.x, v.z);
  const nearHome = Math.abs(p.x - princess.home.x) < 1.15 && Math.abs(p.z - princess.home.z) < .7 && Math.abs(p.y - princess.home.y) < .8;
  const upright = Math.abs(q.x) < .12 && Math.abs(q.z) < .12;
  return nearHome && upright && Math.abs(v.y) < .45 && horizontalSpeed < .75;
}

function updatePrincessAmbientMotion(realDt) {
  if (!princessIsCalmForAmbientMotion()) {
    princessAmbient.moving = false;
    princessAmbient.timer = Math.max(princessAmbient.timer, .7);
    return;
  }

  princessAmbient.phase += realDt;
  princessAmbient.timer -= realDt;
  const p = princess.body.translation();
  const limit = stageNumber === 1 ? .42 : .56;

  if (princessAmbient.timer <= 0) {
    princessAmbient.moving = !princessAmbient.moving;
    if (princessAmbient.moving) {
      if (p.x > princess.home.x + limit * .62) princessAmbient.direction = -1;
      else if (p.x < princess.home.x - limit * .62) princessAmbient.direction = 1;
      else princessAmbient.direction = Math.random() < .5 ? -1 : 1;
      princessAmbient.timer = 1.15 + Math.random() * .65;
    } else {
      princessAmbient.gesture = Math.floor(Math.random() * 3);
      princessAmbient.timer = 1.25 + Math.random() * 1.7;
    }
  }

  if (princessAmbient.moving && Math.abs(p.x - princess.home.x) >= limit) {
    princessAmbient.moving = false;
    princessAmbient.gesture = Math.floor(Math.random() * 3);
    princessAmbient.timer = 1.1 + Math.random() * 1.2;
  }

  const v = princess.body.linvel();
  if (princessAmbient.moving) {
    const vx = princessAmbient.direction * .30;
    princess.body.setLinvel({ x: vx, y: v.y, z: 0 }, true);
    const facing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), princessAmbient.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    princess.body.setRotation({ x: facing.x, y: facing.y, z: facing.z, w: facing.w }, true);
    princess.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  } else if (Math.hypot(v.x, v.z) < .75) {
    princess.body.setLinvel({ x: 0, y: v.y, z: 0 }, true);
  }
}

function updatePrincessAmbientPose() {
  if (!playing || result || princess.isDead || rescueState.active || princessRecovery.active || angryTimer > 0 || hitSlowTimer > 0) return;
  const leftArm = princessParts.leftArm, rightArm = princessParts.rightArm;
  const leftElbow = princessParts.leftElbow, rightElbow = princessParts.rightElbow;

  if (princessAmbient.moving && !princessExposed) {
    const swing = Math.sin(elapsed * 8.5) * .42;
    leftArm.rotation.x = swing;
    rightArm.rotation.x = -swing;
    leftElbow.rotation.x = -.38 - swing * .18;
    rightElbow.rotation.x = -.38 + swing * .18;
    princess.mesh.position.y += Math.abs(Math.sin(elapsed * 8.5)) * .035;
    return;
  }

  const wave = Math.sin(elapsed * 3.2);
  if (princessExposed) {
    // Once the room is open, show that she is actively searching without
    // forcing her onto unsafe rubble before a valid escape route exists.
    princess.mesh.rotation.y += Math.sin(elapsed * 1.35) * .34;
    leftArm.rotation.z = .34 + wave * .13;
    rightArm.rotation.z = -.34 - wave * .13;
    leftElbow.rotation.x = -.48 + wave * .12;
    rightElbow.rotation.x = -.48 - wave * .12;
  } else if (princessAmbient.gesture === 0) {
    rightArm.rotation.z = -.62 - wave * .16;
    rightElbow.rotation.x = -.82 + wave * .18;
  } else if (princessAmbient.gesture === 1) {
    leftArm.rotation.x = -.35 + wave * .12;
    rightArm.rotation.x = -.35 - wave * .12;
    leftElbow.rotation.x = -.62;
    rightElbow.rotation.x = -.62;
  } else {
    princess.mesh.rotation.y += wave * .12;
    leftArm.rotation.z = .22 + wave * .08;
    rightArm.rotation.z = -.22 - wave * .08;
  }
}

function showHeroSpeech(text, danger = false, duration = 2800) {
  if (!ui.heroSpeech) return;
  ui.heroSpeech.textContent = text;
  ui.heroSpeech.classList.toggle("danger", danger);
  ui.heroSpeech.classList.add("visible");
  if (heroSpeechTimeout) clearTimeout(heroSpeechTimeout);
  heroSpeechTimeout = setTimeout(() => ui.heroSpeech?.classList.remove("visible"), duration);
}

function beginRescueSequence(escapePath = []) {
  if (rescueState.active || result) return;
  if (stageNumber === 3 && escapePath.length <= 1) {
    const current = princess.body.translation();
    const start = new THREE.Vector3(current.x, current.y, current.z);
    const outward = start.clone().sub(new THREE.Vector3(10, start.y, -1.2)).setY(0);
    if (outward.lengthSq() < .01) outward.set(0, 0, 1);
    outward.normalize().multiplyScalar(1.15);
    escapePath = [start, start.clone().add(outward)];
  }
  rescueState.active = true;
  rescueState.time = 0;
  rescueState.particleTimer = 0;
  rescueState.abducted = false;
  rescueState.escapePath = escapePath;
  rescueState.pathIndex = 1;
  rescueState.walkCompleteTime = 0;
  princessRecovery.active = false;
  princessRecovery.delay = 0;
  rival.visible = false;
  princess.mesh.visible = true;
  const p = princess.body.translation();
  rescueState.start.set(p.x, p.y, p.z);
  rescueState.pathPosition.copy(rescueState.start);
  rescueState.exitPosition.copy(rescueState.start);
  rescueState.heroStart.copy(hero.position);
  rescueState.heroBaseY = hero.position.y;
  const fallenRotation = princess.body.rotation();
  rescueState.standQuat.set(fallenRotation.x, fallenRotation.y, fallenRotation.z, fallenRotation.w);
  isSuccess = true;
  isCharging = false;
  hitSlowTimer = 0; complaintPending = false; angryTimer = 0; slowMotion = 1;
  if (isCameraMode) {
    isCameraMode = false;
    camBtn.classList.remove("active");
    camBtn.innerHTML = "<span>MODE</span>🎥 カメラ";
    renderer.domElement.classList.remove("camera-mode");
    ui.cameraHint?.classList.remove("visible");
    camera.zoom = 1; camera.updateProjectionMatrix();
  }
  moveKeys.clear(); cameraKeys.clear();
  trajectory.visible = false;
  if (escapePath.length > 1) {
    showPrincessSpeech("ここなら安全に降りられそう！", "joy", 3400);
    showHeroSpeech("その道なら行ける！ ゆっくり！");
  } else {
    showPrincessSpeech("助かったわ！ やったー！", "joy", 5800);
    showHeroSpeech("やったー！");
  }
  princess.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  princess.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  princess.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  princess.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  sound(escapePath.length > 1 ? "help" : "rescue");
  updateAmmo();
}

function updateSafePathRescue(realDt) {
  const path = rescueState.escapePath;
  const standDuration = .62;

  if (rescueState.time < standDuration) {
    princess.body.setTranslation({ x: rescueState.start.x, y: rescueState.start.y, z: rescueState.start.z }, true);
    return;
  }

  if (!rescueState.walkCompleteTime) {
    const target = path[Math.min(rescueState.pathIndex, path.length - 1)];
    const delta = target.clone().sub(rescueState.pathPosition);
    const horizontalDelta = new THREE.Vector3(delta.x, 0, delta.z);
    const distance = horizontalDelta.length();
    const step = realDt * 1.55;
    const travel = distance <= step ? 1 : step / Math.max(distance, .0001);
    const proposed = rescueState.pathPosition.clone();
    proposed.x = THREE.MathUtils.lerp(proposed.x, target.x, travel);
    proposed.z = THREE.MathUtils.lerp(proposed.z, target.z, travel);
    const expectedFeet = THREE.MathUtils.lerp(rescueState.pathPosition.y - 1.18, target.y - 1.18, travel);
    const supportY = supportHeightAt(proposed.x, proposed.z, expectedFeet);
    if (supportY === null) {
      cancelGuidedEscape();
      return;
    }
    if (intactStructureBlocksPoint(proposed.x, proposed.z, supportY)) {
      cancelGuidedEscape();
      return;
    }
    proposed.y = supportY + 1.18;
    if (distance > .005) faceAlongMovement(princess.mesh, rescueState.pathPosition, proposed, princess.body);
    if (distance <= step) {
      rescueState.pathPosition.copy(proposed);
      rescueState.pathIndex++;
      if (rescueState.pathIndex >= path.length) {
        rescueState.walkCompleteTime = rescueState.time;
        rescueState.exitPosition.copy(rescueState.pathPosition);
        showPrincessSpeech(stageNumber === 3 ? "外まで出られたわ！" : "降りられたわ！ やったー！", "joy", stageNumber === 3 ? 1700 : 5200);
        if (stageNumber === 3) ui.heroSpeech?.classList.remove("visible");
        else showHeroSpeech("やったー！");
        sound("rescue");
      }
    } else {
      rescueState.pathPosition.copy(proposed);
    }
    princess.body.setTranslation({ x: rescueState.pathPosition.x, y: rescueState.pathPosition.y, z: rescueState.pathPosition.z }, true);
    princessParts.leftArm.rotation.x = Math.sin(rescueState.time * 12) * .55;
    princessParts.rightArm.rotation.x = -Math.sin(rescueState.time * 12) * .55;
    princessParts.leftArm.rotation.z = .18;
    princessParts.rightArm.rotation.z = -.18;
    princessParts.leftElbow.rotation.x = -.55 + Math.sin(rescueState.time * 12) * .22;
    princessParts.rightElbow.rotation.x = -.55 - Math.sin(rescueState.time * 12) * .22;
    hero.rotation.y = Math.atan2(rescueState.pathPosition.x - hero.position.x, rescueState.pathPosition.z - hero.position.z);
    return;
  }

  const t = rescueState.time - rescueState.walkCompleteTime;
  const exit = rescueState.exitPosition;
  const celebration = new THREE.Vector3(exit.x, exit.y + Math.abs(Math.sin(t * 6.5)) * .72, exit.z + Math.min(1.8, t * .7));
  const princessBeforeCelebrate = princess.body.translation();
  faceAlongMovement(princess.mesh, princessBeforeCelebrate, celebration, princess.body);
  princess.body.setTranslation({ x: celebration.x, y: celebration.y, z: celebration.z }, true);
  princessParts.leftArm.rotation.z = 2.45;
  princessParts.rightArm.rotation.z = -2.45;
  princessParts.leftElbow.rotation.x = -1.15 + Math.sin(t * 10) * .28;
  princessParts.rightElbow.rotation.x = -1.15 - Math.sin(t * 10) * .28;

  const heroGoal = new THREE.Vector3(exit.x + 2.4, rescueState.heroBaseY, exit.z + 1.4);
  const heroBeforeRun = hero.position.clone();
  hero.position.lerp(heroGoal, .035);
  if (!faceAlongMovement(hero, heroBeforeRun, hero.position)) {
    hero.rotation.y = Math.atan2(celebration.x - hero.position.x, celebration.z - hero.position.z);
  }
  heroParts.leftArm.rotation.z = 2.5;
  heroParts.rightArm.rotation.z = -2.5;
  heroParts.leftElbow.rotation.x = -1.2 + Math.sin(t * 9) * .25;
  heroParts.rightElbow.rotation.x = -1.2 - Math.sin(t * 9) * .25;
  hero.position.y = rescueState.heroBaseY + Math.abs(Math.sin(t * 7)) * .6;

  if (stageNumber === 3) {
    if (t >= 1.05 && rescueState.finaleCue < 1) {
      rescueState.finaleCue = 1;
      ui.princessSpeech?.classList.remove("visible");
      showHeroSpeech("姫！ こっちへ！");
    }
    if (t >= 2.35) {
      ui.heroSpeech?.classList.remove("visible");
      rival.visible = true;
      const wingBeat = Math.sin(t * 18) * .5;
      rivalParts.leftWing.rotation.y = wingBeat;
      rivalParts.rightWing.rotation.y = -wingBeat;
      rivalParts.leftArm.rotation.z = -1.0;
      rivalParts.rightArm.rotation.z = 1.0;
      rivalParts.leftElbow.rotation.x = -1.35;
      rivalParts.rightElbow.rotation.x = -1.35;
      const blockPoint = new THREE.Vector3(exit.x + 1.15, exit.y + 1.15, exit.z + 1.0);
      const u = Math.min(1, (t - 2.35) / 1.35);
      const eased = 1 - Math.pow(1 - u, 3);
      const rivalFlightStart = new THREE.Vector3(30, 17, -8);
      rival.position.lerpVectors(rivalFlightStart, blockPoint, eased);
      rival.rotation.set(0, rival.rotation.y, Math.sin(u * Math.PI) * -.2);
      if (!faceAlongMovement(rival, rivalFlightStart, blockPoint)) {
        rival.rotation.y = Math.atan2(hero.position.x - blockPoint.x, hero.position.z - blockPoint.z);
      }
      if (u >= .98 && !rescueState.abducted) {
        rescueState.abducted = true;
        rescueState.finaleCue = 2;
        ui.princessSpeech?.classList.remove("visible");
        ui.heroSpeech?.classList.remove("visible");
        sound("impact");
        cameraShake = .55;
      }
    }
    if (t >= 4.35 && rescueState.finaleCue < 3) {
      rescueState.finaleCue = 3;
      ui.heroSpeech?.classList.remove("visible");
      ui.princessSpeech?.classList.remove("visible");
    }
    if (t > 5.9) finish(true, "城門の先で、黒い翼が二人の道を塞いだ。決着の時は近い。", false, "TO BE CONTINUED…！");
    return;
  }

  if (t >= 2.85) {
    rival.visible = true;
    const wingBeat = Math.sin(t * 18) * .48;
    rivalParts.leftWing.rotation.y = wingBeat;
    rivalParts.rightWing.rotation.y = -wingBeat;
    rivalParts.leftArm.rotation.x = -1.0;
    rivalParts.rightArm.rotation.x = -1.0;
    rivalParts.leftElbow.rotation.x = -1.3;
    rivalParts.rightElbow.rotation.x = -1.3;
    const catchPoint = new THREE.Vector3(exit.x + .9, exit.y + 2.3, exit.z + 1.95);
    if (t < 3.95) {
      const u = (t - 2.85) / 1.1;
      const eased = 1 - Math.pow(1 - u, 3);
      const rivalFlightStart = new THREE.Vector3(27, 15, 2);
      rival.position.lerpVectors(rivalFlightStart, catchPoint, eased);
      rival.rotation.set(.12, rival.rotation.y, Math.sin(u * Math.PI) * -.22);
      faceAlongMovement(rival, rivalFlightStart, catchPoint);
    } else {
      if (!rescueState.abducted) {
        rescueState.abducted = true;
        ui.princessSpeech?.classList.remove("visible");
        showHeroSpeech("またかーっ！", true);
        sound("fail"); cameraShake = .65;
      }
      const u = Math.min(1, (t - 3.95) / 1.7);
      const rivalEscape = new THREE.Vector3(-30, 35, -24);
      rival.position.lerpVectors(catchPoint, rivalEscape, u);
      faceAlongMovement(rival, catchPoint, rivalEscape);
      rival.rotation.z = Math.sin(u * Math.PI) * .28;
      const carried = rival.position.clone().add(new THREE.Vector3(.9, -1.05, .15));
      princess.body.setTranslation({ x: carried.x, y: carried.y, z: carried.z }, true);
      faceAlongMovement(princess.mesh, catchPoint, rivalEscape, princess.body);
      princessParts.leftArm.rotation.z = -1.5;
      princessParts.rightArm.rotation.z = 1.5;
      if (u >= .98) {
        rival.visible = false;
        princess.mesh.visible = false;
      }
    }
  }

  if (t > 5.85) finish(true, "手が届く直前、黒い翼の男は姫をさらって夜空へ消えた。", false, "まだ終わらない！");
}

function updateRescueSequence(realDt) {
  if (!rescueState.active || result) return;
  rescueState.time += realDt;
  if (rescueState.escapePath.length > 1) {
    updateSafePathRescue(realDt);
    return;
  }
  // Give a princess who was knocked over just before the clear a moment to
  // stand up before she starts running out of the ruined castle.
  const standDuration = .62;
  const t = Math.max(0, rescueState.time - standDuration);
  const start = rescueState.start;
  const pos = new THREE.Vector3();
  const princessBeforeMove = princess.body.translation();

  if (rescueState.time < standDuration) {
    pos.copy(start);
  } else if (t < .8) {
    const u = t / .8;
    pos.set(THREE.MathUtils.lerp(start.x, 10, u), start.y + Math.sin(u * Math.PI) * .65, THREE.MathUtils.lerp(start.z, 1.8, u));
  } else if (t < 2.05) {
    const u = (t - .8) / 1.25;
    pos.set(10, THREE.MathUtils.lerp(start.y, 1.18, u) + Math.sin(u * Math.PI) * 2.7, THREE.MathUtils.lerp(1.8, 7.2, u));
  } else if (t < 3.2) {
    const u = (t - 2.05) / 1.15;
    pos.set(THREE.MathUtils.lerp(10, 8.8, u), 1.18 + Math.abs(Math.sin(u * Math.PI * 3)) * .32, THREE.MathUtils.lerp(7.2, 11.2, u));
  } else {
    const joyT = t - 3.2;
    pos.set(8.8, 1.18 + Math.abs(Math.sin(joyT * 6.5)) * 1.25, 11.2);
    princess.mesh.rotation.y = Math.sin(joyT * 5) * .45;
    princessParts.leftArm.rotation.z = 2.45;
    princessParts.rightArm.rotation.z = -2.45;
    princessParts.leftElbow.rotation.x = -1.18 + Math.sin(joyT * 11) * .3;
    princessParts.rightElbow.rotation.x = -1.18 - Math.sin(joyT * 11) * .3;
  }
  if (t < 3.2) {
    princessParts.leftArm.rotation.z = 0;
    princessParts.rightArm.rotation.z = 0;
    princessParts.leftArm.rotation.x = Math.sin(t * 12) * .65;
    princessParts.rightArm.rotation.x = -Math.sin(t * 12) * .65;
    princessParts.leftElbow.rotation.x = -.52 + Math.sin(t * 12) * .25;
    princessParts.rightElbow.rotation.x = -.52 - Math.sin(t * 12) * .25;
  }
  if (t < 3.2) faceAlongMovement(princess.mesh, princessBeforeMove, pos, princess.body);
  princess.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);

  // The hero celebrates visibly instead of remaining glued to the cannon.
  const heroRun = Math.min(1, t / 2.5);
  const heroBeforeRun = hero.position.clone();
  hero.position.x = THREE.MathUtils.lerp(rescueState.heroStart.x, cannon.position.x + 3.2, heroRun);
  hero.position.z = THREE.MathUtils.lerp(rescueState.heroStart.z, cannon.position.z - 3.8, heroRun);
  if (!faceAlongMovement(hero, heroBeforeRun, hero.position)) {
    hero.rotation.y = Math.atan2(pos.x - hero.position.x, pos.z - hero.position.z);
  }
  heroParts.leftArm.rotation.z = 2.5;
  heroParts.rightArm.rotation.z = -2.5;
  heroParts.leftArm.rotation.x = -.3;
  heroParts.rightArm.rotation.x = -.3;
  heroParts.leftElbow.rotation.x = -1.1 + Math.sin(t * 9) * .22;
  heroParts.rightElbow.rotation.x = -1.1 - Math.sin(t * 9) * .22;
  hero.position.y = rescueState.heroBaseY + (t > 2.4 ? Math.abs(Math.sin(t * 7)) * .7 : 0);

  if (t >= 4.35) {
    rival.visible = true;
    const wingBeat = Math.sin(t * 18) * .48;
    rivalParts.leftWing.rotation.y = wingBeat;
    rivalParts.rightWing.rotation.y = -wingBeat;
    rivalParts.leftArm.rotation.x = -1.0;
    rivalParts.rightArm.rotation.x = -1.0;
    rivalParts.leftElbow.rotation.x = -1.3;
    rivalParts.rightElbow.rotation.x = -1.3;
    if (t < 5.45) {
      const u = (t - 4.35) / 1.1;
      const eased = 1 - Math.pow(1 - u, 3);
      const rivalFlightStart = new THREE.Vector3(27, 15, 2);
      const rivalCatchPoint = new THREE.Vector3(9.8, 3.5, 11.25);
      rival.position.lerpVectors(rivalFlightStart, rivalCatchPoint, eased);
      rival.rotation.set(.12, rival.rotation.y, Math.sin(u * Math.PI) * -.22);
      faceAlongMovement(rival, rivalFlightStart, rivalCatchPoint);
    } else {
      if (!rescueState.abducted) {
        rescueState.abducted = true;
        ui.princessSpeech?.classList.remove("visible");
        showHeroSpeech("またかーっ！", true);
        sound("fail"); cameraShake = .65;
      }
      const u = Math.min(1, (t - 5.45) / 1.75);
      const rivalCatchPoint = new THREE.Vector3(9.8, 3.5, 11.25);
      const rivalEscape = new THREE.Vector3(-30, 35, -24);
      rival.position.lerpVectors(rivalCatchPoint, rivalEscape, u);
      faceAlongMovement(rival, rivalCatchPoint, rivalEscape);
      rival.rotation.z = Math.sin(u * Math.PI) * .28;
      const carried = rival.position.clone().add(new THREE.Vector3(.9, -1.05, .15));
      princess.body.setTranslation({ x: carried.x, y: carried.y, z: carried.z }, true);
      faceAlongMovement(princess.mesh, rivalCatchPoint, rivalEscape, princess.body);
      princessParts.leftArm.rotation.z = -1.5;
      princessParts.rightArm.rotation.z = 1.5;
      princessParts.leftElbow.rotation.x = -1.45;
      princessParts.rightElbow.rotation.x = -1.45;
      heroParts.leftArm.rotation.z = 1.8 + Math.sin(t * 22) * .8;
      heroParts.rightArm.rotation.z = -1.8 - Math.sin(t * 22) * .8;
      heroParts.leftElbow.rotation.x = -1.4 + Math.sin(t * 22) * .28;
      heroParts.rightElbow.rotation.x = -1.4 - Math.sin(t * 22) * .28;
      hero.position.y = rescueState.heroBaseY + Math.abs(Math.sin(t * 11)) * .55;
      if (u >= .98) {
        rival.visible = false;
        princess.mesh.visible = false;
      }
    }
  }

  rescueState.particleTimer -= realDt;
  if (t > 2.6 && t < 5.35 && rescueState.particleTimer <= 0) {
    rescueState.particleTimer = .09;
    const colors = [0xffcf58, 0xf072a4, 0x77dba8, 0xffffff];
    for (let i = 0; i < 4; i++) {
      const burst = makeParticle(pos.clone().add(new THREE.Vector3((Math.random() - .5) * 2.2, 1.2 + Math.random(), (Math.random() - .5) * 1.2)), colors[(i + Math.floor(t * 10)) % colors.length], .14 + Math.random() * .13, 5);
      burst.velocity.y += 2.5; burst.life = 1.1; explosions.push(burst);
    }
    if (Math.floor(t * 10) % 2 === 0) {
      const cheer = makeParticle(hero.position.clone().add(new THREE.Vector3((Math.random() - .5) * 1.5, 2.2, 0)), colors[Math.floor(Math.random() * colors.length)], .12 + Math.random() * .12, 4);
      cheer.velocity.y += 2; cheer.life = .9; explosions.push(cheer);
    }
  }
  if (t > 7.55) finish(true, "黒い翼の男は姫を抱え、次の城へ飛び去った。戦いはまだ終わらない。", false, "まだ終わらない！");
}

function checkRescueDebris() {
  if (!rescueState.active || rescueState.abducted || result || princessInvincible > 0) return;
  const pp = princess.body.translation();
  for (const block of blocks) {
    if (!block.activated) continue;
    const bp = block.body.translation(), v = block.body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    const distance = Math.hypot(bp.x - pp.x, bp.y - pp.y, bp.z - pp.z);
    const guidedWalk = rescueState.escapePath.length > 1 && !rescueState.walkCompleteTime;
    const dangerSpeed = guidedWalk ? 5.0 : 2.8;
    if (speed > dangerSpeed && distance < 1.15) {
      if (!guidedWalk) princessHP = 1;
      damagePrincess();
      break;
    }
  }
}

function handleCollisions() {
  eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (!started || result) return;
    const c1 = world.getCollider(h1), c2 = world.getCollider(h2);
    if (!c1 || !c2) return;
    const b1 = c1.parent(), b2 = c2.parent();
    const t1 = b1?.userData?.type, t2 = b2?.userData?.type;
    
    if ((t1 === "ball" && t2 === "princess") || (t2 === "ball" && t1 === "princess")) {
      if (!princess.isDead) {
        failPrincess("砲弾が姫に直撃してしまった…。");
        princess.isDead = true;
        princess.deathTime = elapsed;
      }
    }
    
    if ((t1 === "block" && t2 === "princess") || (t2 === "block" && t1 === "princess")) {
      const blockBody = t1 === "block" ? b1 : b2;
      const v = blockBody.linvel();
      const blockSpeed = Math.hypot(v.x, v.y, v.z);
      const guidedWalk = rescueState.active && rescueState.escapePath.length > 1 && !rescueState.walkCompleteTime;
      const damageSpeed = guidedWalk ? 4.8 : 1.5;
      if (blockSpeed > damageSpeed) {
        if (rescueState.active && !guidedWalk && blockSpeed > 2.8) princessHP = Math.min(princessHP, 1);
        damagePrincess();
      }
    }

    const ballBody = t1 === "ball" ? b1 : t2 === "ball" ? b2 : null;
    if (ballBody) {
      const ball = projectiles.find(p => p.body === ballBody);
      if (ball && !ball.impacted) {
        ball.impacted = true;
        const p = ballBody.translation(); explodeAt(new THREE.Vector3(p.x, p.y, p.z));
        const center = new THREE.Vector3(p.x, p.y, p.z);
        if (princessExposed) {
          const pp = princess.body.translation();
          if (center.distanceTo(new THREE.Vector3(pp.x, pp.y, pp.z)) < 2.25) {
            if (!princess.isDead) {
              failPrincess("爆風が姫のいる部屋まで届いてしまった…。");
              princess.isDead = true;
              princess.deathTime = elapsed;
            }
          }
        }
        for (const block of blocks) {
          const q = block.body.translation();
          const delta = new THREE.Vector3(q.x - center.x, q.y - center.y, q.z - center.z);
          const d = delta.length();
          if (d < 6.35) {
            if (!block.activated) {
              block.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
              block.activated = true;
            }
            delta.normalize().multiplyScalar((3.8 - d) * 5.7);
            delta.y += 4.1;
            if (d < 3.8) block.body.applyImpulse(delta, true);
          }
        }
      }
    }
  });
}

function checkPrincessExposure(dt) {
  if (!playing || result || rescueState.active) return;
  if (!princessExposed) {
    const removedBars = chamberBars.filter(bar => {
      const p = bar.body.translation();
      return Math.hypot(p.x - bar.start.x, p.y - bar.start.y, p.z - bar.start.z) > .75;
    }).length;
    if (removedBars >= 2 && elapsed - lastShotAt > .5) {
      princessExposed = true;
      sound("help");
    }
  }
  if (princessExposed) rescueTimer += dt;
}

function checkResult(dt) {
  if (!playing || result || rescueState.active) return;
  const p = princess.body.translation();
  if (p.y < -2 || Math.abs(p.x) > 31 || Math.abs(p.z) > 20) {
    princess.isDead = true;
    princess.deathTime = elapsed;
    return failPrincess("爆風で姫が城の外まで吹き飛ばされてしまった…。");
  }
  const velocity = princess.body.linvel();
  const safe = Math.hypot(velocity.x, velocity.y, velocity.z) < 1.1;
  const nearbyDanger = blocks.some(block => {
    if (!block.activated) return false;
    const bp = block.body.translation(), bv = block.body.linvel();
    return Math.hypot(bp.x - p.x, bp.y - p.y, bp.z - p.z) < 2.2 && Math.hypot(bv.x, bv.y, bv.z) > 2.2;
  });
  const outsideStage3Walls = p.z > STAGE3_LAYOUT.frontExitZ || p.z < STAGE3_LAYOUT.backExitZ || p.x < STAGE3_LAYOUT.westExitX || p.x > STAGE3_LAYOUT.eastExitX;
  const reachedGround = stageNumber >= 2 && p.y < 4.25 && safe && !nearbyDanger && !princessRecovery.active && (stageNumber !== 3 || outsideStage3Walls);
  if (reachedGround) {
    groundedEscapeTimer += dt;
    escapeSearch.blocked = false;
    if (!princessExposed) {
      princessExposed = true;
      sound("help");
    }
    if (groundedEscapeTimer > 1.35) {
      beginRescueSequence();
      return;
    }
  } else {
    groundedEscapeTimer = 0;
  }
  if (princessExposed) {
    const requiresSafeDescent = stageNumber >= 2 && p.y > 3.2;
    if (requiresSafeDescent && safe && rescueTimer > 1.4 && elapsed - escapeSearch.lastAt > .7) {
      escapeSearch.lastAt = elapsed;
      const path = findSafeEscapePath();
      if (path?.length > 1) {
        escapeSearch.blocked = false;
        beginRescueSequence(path);
      } else {
        escapeSearch.blocked = true;
        const stairsLost = stageNumber === 3 && usableStairCount() < 6;
        if (elapsed - escapeSearch.lastHintAt > 4.8) {
          escapeSearch.lastHintAt = elapsed;
          showPrincessSpeech(stairsLost ? "階段がなくなってる！ これじゃ降りられないわ！" : "この高さは危ないわ！ 降りられる道はないの？", "angry", 3500);
        }
        if (ammo <= 0 && elapsed - lastShotAt > 7.5) {
          finish(false, stairsLost ? "扉は開いたが、階段が崩れていて姫は降りられない。" : "部屋から出られたものの、地上へ降りる道がない。");
        }
      }
    } else if (!requiresSafeDescent && safe && rescueTimer > 4.5 && (stageNumber !== 3 || outsideStage3Walls)) {
      escapeSearch.blocked = false;
      beginRescueSequence();
    } else if (stageNumber === 3 && !requiresSafeDescent && safe && !outsideStage3Walls) {
    }
  } else if (ammo <= 0 && elapsed - lastShotAt > 5.5) {
    finish(false, "砲弾を使い切った。姫はまだ城の中だ…。");
  }
}

function failPrincess(message = "砲弾が姫に直撃してしまった……。", keepPrincessSpeech = false) {
  if (result) return;
  result = true; slowMotion = .1;
  hitSlowTimer = 0; complaintPending = false;
  if (!keepPrincessSpeech) ui.princessSpeech?.classList.remove("visible");
  ui.slowCaption.textContent = "OH NOOOOO...!";
  ui.slowCaption.classList.remove("impact");
  ui.slowCaption.classList.remove("visible"); void ui.slowCaption.offsetWidth; ui.slowCaption.classList.add("visible");
  sound("fail");
  setTimeout(() => finish(false, message, true), 1900);
}

function finish(success, message, alreadyResult = false, titleOverride = "") {
  if (result && !alreadyResult) return;
  result = true; playing = false; trajectory.visible = false;
  ui.princessSpeech?.classList.remove("visible");
  ui.heroSpeech?.classList.remove("visible");
  isSuccess = success;
  ui.resultEyebrow.textContent = success ? "VICTORY" : "GAME OVER";
  ui.resultTitle.textContent = titleOverride || (success ? "姫を助け出した！" : "救出失敗…");
  ui.resultText.textContent = message;
  ui.resultTitle.style.color = success ? "#318b62" : "#d9414f";
  ui.resultOverlay.classList.toggle("victory", success);
  ui.retryButton.textContent = success && stageNumber < 3 ? "次の城へ" : "もう一度挑む";
  ui.stageOneButton.hidden = success;
  setTimeout(() => ui.resultOverlay.classList.add("visible"), alreadyResult ? 0 : 550);
  updateAmmo();
}

function initAudio() { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); }
function sound(kind) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const settings = { fire: [90, 35, .25], impact: [70, 25, .18], help: [440, 730, .35], rescue: [520, 1040, .55], fail: [260, 55, 1.1] }[kind] || [220, 110, .2];
  osc.type = kind === "help" ? "square" : "sawtooth";
  osc.frequency.setValueAtTime(settings[0], now); osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
  gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(.16, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + settings[2]);
  osc.start(now); osc.stop(now + settings[2] + .02);
}

camBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  isCameraMode = !isCameraMode;
  dragging = false;
  moveKeys.clear(); cameraKeys.clear();
  camBtn.classList.toggle("active", isCameraMode);
  camBtn.innerHTML = isCameraMode ? "<span>MODE</span>↩ 砲台へ" : "<span>MODE</span>🎥 カメラ";
  renderer.domElement.classList.toggle("camera-mode", isCameraMode);
  ui.cameraHint?.classList.toggle("visible", isCameraMode);
  trajectory.visible = !isCameraMode && playing && !result && !rescueState.active;
  if (!isCameraMode) camera.zoom = 1;
  camera.updateProjectionMatrix();
  updateAmmo();
});

let dragging = false, dragX = 0, dragY = 0;
let rightFirePointerId = null;
renderer.domElement.addEventListener("pointerdown", e => {
  if (e.button === 2) {
    e.preventDefault();
    if (playing && !result && !isCameraMode && !rescueState.active && !isCharging && ammo > 0 && shotCooldown <= 0) {
      rightFirePointerId = e.pointerId;
      renderer.domElement.setPointerCapture?.(e.pointerId);
      isCharging = true;
      chargeLevel = 0;
    }
    return;
  }
  if (e.button === 0 && playing && !result && !rescueState.active) {
    dragging = true; dragX = e.clientX; dragY = e.clientY;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  }
});

addEventListener("pointermove", e => {
  if (!dragging || !playing || result) return;
  const dx = e.clientX - dragX, dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY;
  
  if (isCameraMode) {
    camYaw -= dx * 0.01;
    camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.01, 0.1, Math.PI / 2 - 0.1);
  } else {
    yaw = THREE.MathUtils.clamp(yaw - dx * 0.0045, THREE.MathUtils.degToRad(-22), THREE.MathUtils.degToRad(22));
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, THREE.MathUtils.degToRad(12), THREE.MathUtils.degToRad(58));
    updateCannon();
  }
});
addEventListener("pointerup", e => {
  dragging = false;
  if (e.button === 2 && e.pointerId === rightFirePointerId) {
    rightFirePointerId = null;
    if (isCharging) {
      isCharging = false;
      fire(chargeLevel);
      chargeLevel = 0;
    }
  }
});
addEventListener("pointercancel", e => {
  dragging = false;
  if (e.pointerId === rightFirePointerId) {
    rightFirePointerId = null;
    isCharging = false;
    chargeLevel = 0;
  }
});
renderer.domElement.addEventListener("contextmenu", e => e.preventDefault());
renderer.domElement.addEventListener("wheel", e => {
  if (!isCameraMode || !playing || result) return;
  e.preventDefault();
  camera.zoom = THREE.MathUtils.clamp(camera.zoom * Math.exp(-e.deltaY * .0012), .62, 2.15);
  camera.updateProjectionMatrix();
}, { passive: false });

function updateCameraNavigation(dt) {
  if (!isCameraMode || !playing || result) return;
  const forward = ((cameraKeys.has("KeyW") ? 1 : 0) - (cameraKeys.has("KeyS") ? 1 : 0));
  const side = ((cameraKeys.has("KeyD") ? 1 : 0) - (cameraKeys.has("KeyA") ? 1 : 0));
  const rise = ((cameraKeys.has("KeyE") ? 1 : 0) - (cameraKeys.has("KeyQ") ? 1 : 0));
  const speed = 17 * dt / camera.zoom;
  camTarget.x += (-Math.sin(camYaw) * forward + Math.cos(camYaw) * side) * speed;
  camTarget.z += (-Math.cos(camYaw) * forward - Math.sin(camYaw) * side) * speed;
  camTarget.y += rise * speed * .7;
  camTarget.x = THREE.MathUtils.clamp(camTarget.x, -18, 38);
  camTarget.y = THREE.MathUtils.clamp(camTarget.y, 2, 17);
  camTarget.z = THREE.MathUtils.clamp(camTarget.z, -18, 34);
}

function endOpening() {
  if (openingEnded) return;
  openingEnded = true;
  introTimers.splice(0).forEach(clearTimeout);
  if (openingRevealTimer) clearTimeout(openingRevealTimer);
  if (ui.skipIntro) ui.skipIntro.disabled = true;
  try { sessionStorage.setItem("pixelSiegeIntroSeen", "1"); } catch {}
  ui.intro?.classList.add("leaving");
  openingRevealTimer = setTimeout(() => {
    openingRevealTimer = null;
    ui.intro?.classList.remove("visible");
    ui.intro?.classList.add("finished");
    if (!gameStarted && !playing && !result) beginGame();
  }, 560);
}

function showStartOverlay() {
  if (gameStarted || playing || result) return;
  ui.startOverlay.removeAttribute("aria-hidden");
  ui.startOverlay.classList.add("visible");
  ui.startButton.disabled = false;
}

function hideStartOverlay() {
  ui.startOverlay.classList.remove("visible");
  ui.startOverlay.setAttribute("aria-hidden", "true");
}

function startOpening() {
  const pageParams = new URLSearchParams(location.search);
  const continuing = pageParams.has("continue");
  const forceIntro = pageParams.has("intro") && !continuing;
  let seen = false;
  try { seen = sessionStorage.getItem("pixelSiegeIntroSeen") === "1"; } catch {}
  // A continue URL is an explicit request to resume at the current chapter.
  // Do not depend on sessionStorage here: embedded/private browsers may clear or
  // reject it, which used to replay the prologue after every retry.
  if (continuing || stageNumber >= 2 || (seen && !forceIntro)) {
    openingEnded = true;
    ui.intro?.classList.remove("visible");
    ui.intro?.classList.add("finished");
    if (!gameStarted && !playing && !result) beginGame();
    return;
  }
  const cue = (delay, action) => introTimers.push(setTimeout(action, delay));
  cue(2300, () => {
    ui.intro?.classList.add("ominous");
    ui.introCaption.textContent = "突然、風が止まり、空が暗くなった。";
  });
  cue(3900, () => {
    ui.intro?.classList.remove("ominous");
    ui.intro?.classList.add("rival-arrives");
    ui.introCaption.textContent = "黒い翼の男が空から現れた！";
    sound("impact");
  });
  cue(5350, () => {
    ui.intro?.classList.remove("rival-arrives");
    ui.intro?.classList.add("abduction");
    ui.introCaption.textContent = "男は姫をさらい、空の彼方へ消えていった。";
    sound("fail");
  });
  cue(7650, () => { ui.introCaption.textContent = "姫を助けるため、黒い翼を追いかけろ！"; });
  cue(9400, endOpening);
}

ui.skipIntro?.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();
  endOpening();
}, { once: true });

let firePointerId = null;
ui.fireButton.addEventListener("pointerdown", e => { 
  e.stopPropagation(); 
  if (playing && !result && !isCameraMode && !rescueState.active && !isCharging && ammo > 0 && shotCooldown <= 0) {
    firePointerId = e.pointerId;
    ui.fireButton.setPointerCapture?.(e.pointerId);
    isCharging = true;
    chargeLevel = 0;
  }
});
ui.fireButton.addEventListener("pointerup", e => {
  e.stopPropagation();
  if (isCharging && e.pointerId === firePointerId) {
    isCharging = false;
    firePointerId = null;
    fire(chargeLevel);
  }
});
ui.fireButton.addEventListener("pointercancel", e => {
  if (e.pointerId === firePointerId) {
    isCharging = false;
    firePointerId = null;
  }
});

addEventListener("keydown", e => {
  if (isCameraMode && ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"].includes(e.code)) cameraKeys.add(e.code);
  else if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) moveKeys.add(e.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (!playing || result) return;
  if (rescueState.active) return;
  if (isCameraMode) {
    if (e.code === "ArrowLeft") camYaw += .07;
    if (e.code === "ArrowRight") camYaw -= .07;
    if (e.code === "ArrowUp") camPitch = Math.min(1.35, camPitch + .055);
    if (e.code === "ArrowDown") camPitch = Math.max(.12, camPitch - .055);
    return;
  }
  if (e.code === "ArrowLeft") yaw += .035;
  if (e.code === "ArrowRight") yaw -= .035;
  if (e.code === "ArrowUp") pitch += .035;
  if (e.code === "ArrowDown") pitch -= .035;
  yaw = THREE.MathUtils.clamp(yaw, THREE.MathUtils.degToRad(-22), THREE.MathUtils.degToRad(22));
  pitch = THREE.MathUtils.clamp(pitch, THREE.MathUtils.degToRad(12), THREE.MathUtils.degToRad(58));
  
  if (e.code === "Space" && !e.repeat && !isCharging && ammo > 0 && shotCooldown <= 0) {
    isCharging = true;
    chargeLevel = 0;
  }
  updateCannon();
});

addEventListener("keyup", e => {
  moveKeys.delete(e.code);
  cameraKeys.delete(e.code);
  if (e.code === "Space" && isCharging) {
    isCharging = false;
    fire(chargeLevel);
  }
});

function beginGame(event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (gameStarted || playing || result) {
    hideStartOverlay();
    return;
  }
  gameStarted = true;
  openingEnded = true;
  introTimers.splice(0).forEach(clearTimeout);
  if (openingRevealTimer) {
    clearTimeout(openingRevealTimer);
    openingRevealTimer = null;
  }
  ui.intro?.classList.remove("visible", "leaving");
  ui.intro?.classList.add("finished");
  dragging = false;
  isCharging = false;
  firePointerId = null;
  rightFirePointerId = null;
  // Enter play before audio setup. A browser that blocks Web Audio must never
  // leave the player trapped on (or returned to) the chapter card.
  playing = true;
  result = false;
  ui.resultOverlay.classList.remove("visible");
  hideStartOverlay();
  ui.startButton.disabled = true;
  trajectory.visible = true;
  updateAmmo();
  try { initAudio(); } catch (error) { console.warn("Audio unavailable; continuing without sound.", error); }
}

// Some browser/trackpad combinations have dropped the synthetic click after a
// pointer interaction. Start on pointer release as well; beginGame is idempotent
// so the subsequent click cannot create or reopen another chapter card.
ui.startButton.addEventListener("click", beginGame);
ui.startButton.addEventListener("pointerdown", e => e.stopPropagation());
ui.startButton.addEventListener("pointerup", beginGame);
window.addEventListener("pixel-siege-start", beginGame);
if (window.__pixelSiegeStartRequested) beginGame();
ui.retryButton.addEventListener("click", () => {
  if (isSuccess && stageNumber < 3) transitionToStage(`./?stage=${stageNumber + 1}&continue=1&from=clear`);
  else {
    try { sessionStorage.setItem("pixelSiegeIntroSeen", "1"); } catch {}
    location.href = `./?stage=${stageNumber}&continue=1`;
  }
});
ui.stageOneButton.addEventListener("click", () => { location.href = "./?stage=1&continue=1"; });

let stageNavigationPending = false;
function transitionToStage(url) {
  if (stageNavigationPending) return;
  stageNavigationPending = true;
  ui.resultOverlay.classList.add("leaving");
  ui.stageTransition?.classList.add("visible");
  setTimeout(() => { location.href = url; }, 920);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  const scale = w < 700 ? .62 : .72;
  renderer.setSize(Math.floor(w * scale), Math.floor(h * scale), false);
  const aspect = w / h;
  const viewH = stageNumber === 3 ? (aspect < 1 ? 53 : 45) : stageNumber === 2 ? (aspect < 1 ? 46 : 39) : (aspect < 1 ? 43 : 34);
  camera.top = viewH / 2; camera.bottom = -viewH / 2;
  camera.left = -viewH * aspect / 2; camera.right = viewH * aspect / 2;
  camera.updateProjectionMatrix();
  const princessCamWidth = ui.princessCamViewport.clientWidth || 205;
  const princessCamHeight = ui.princessCamViewport.clientHeight || 123;
  princessRenderer.setSize(princessCamWidth, princessCamHeight, false);
  princessCamera.aspect = princessCamWidth / princessCamHeight;
  princessCamera.updateProjectionMatrix();
}
addEventListener("resize", resize);

let previous = performance.now();
let accumulator = 0;
let cameraShake = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(.05, (now - previous) / 1000); previous = now;
  const dt = realDt * slowMotion; elapsed += realDt;

  // Once play has started, stale intro timers or duplicated pointer events may
  // never make the chapter card visible again.
  if (gameStarted || playing) hideStartOverlay();
  
  if (shotCooldown > 0) { shotCooldown -= realDt; updateAmmo(); }
  
  if (princessInvincible > 0) princessInvincible -= realDt;
  
  updateMovement(realDt);
  updateCameraNavigation(realDt);
  updatePrincessAmbientMotion(realDt);

  if (isCharging) {
    chargeLevel += realDt * .82;
    if (chargeLevel >= 1) chargeLevel %= 1;
    barrelPivot.position.x = (Math.random() - 0.5) * 0.15 * chargeLevel;
    barrelPivot.position.y = 1.65 + (Math.random() - 0.5) * 0.15 * chargeLevel;
    ui.powerBar.style.transform = `scaleX(${chargeLevel})`;
    updateCannon();
  } else {
    barrelPivot.position.x = 0;
    barrelPivot.position.y = 1.65;
    ui.powerBar.style.transform = "scaleX(0)";
  }

  // Keep the entire simulation frozen behind the prologue/chapter card. The
  // princess previously fell through settling rubble before play began, so the
  // first click could immediately open GAME OVER and look like a looping dialog.
  if (playing && !result) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      world.timestep = 1 / 60;
      world.step(eventQueue);
      handleCollisions();
      accumulator -= 1 / 60;
    }

    activateUnsupportedBlocks(realDt);

    updateRescueSequence(realDt);
    updatePrincessFallDamage(realDt);
    updatePrincessRecovery(realDt);
    checkRescueDebris();
  } else {
    accumulator = 0;
  }

  for (const item of syncObjects) {
    const p = item.body.translation(), q = item.body.rotation();
    item.mesh.position.set(p.x, p.y + (item.offsetY || 0), p.z);
    item.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }

  if (princess.isDead) {
    const t = Math.min(1.0, (elapsed - princess.deathTime) * 3);
    princess.mesh.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, t);
    princess.mesh.position.y -= t * 0.5;
  } else if (princessExposed && !result && !rescueState.active) {
    princess.mesh.rotation.y = Math.sin(elapsed * 8) * .35;
    princess.mesh.position.y += Math.abs(Math.sin(elapsed * 9)) * .08;
  }

  if (!result && playing && !princessExposed && !princess.isDead) {
    const { dir, start } = muzzleState();
    const p = princess.body.translation();
    const toPrincess = new THREE.Vector3(p.x - start.x, p.y - start.y, p.z - start.z).normalize();
    if (dir.angleTo(toPrincess) < 0.12) {
      princess.mesh.position.x += (Math.random() - 0.5) * 0.15;
      princess.mesh.position.z += (Math.random() - 0.5) * 0.15;
    }
  }

  updatePrincessReaction(realDt);
  updatePrincessAmbientPose();
  updatePrincessAimWarning(realDt);
  updateHeroPanic(realDt);

  if (ui.princessSpeech && ui.princessSpeech.classList.contains("visible")) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pos = princess.mesh.position.clone();
    pos.y += 2.8; 
    pos.project(camera);
    const x = rect.left + (pos.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (pos.y * -0.5 + 0.5) * rect.height;
    ui.princessSpeech.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 100%))`;
  }

  if (rescueState.active && rescueState.time < .62) {
    const u = THREE.MathUtils.smoothstep(rescueState.time / .62, 0, 1);
    princess.mesh.quaternion.copy(rescueState.standQuat).slerp(new THREE.Quaternion(), u);
    princess.mesh.position.y += Math.sin(u * Math.PI) * .18;
  }
  if (ui.heroSpeech?.classList.contains("visible")) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pos = hero.position.clone(); pos.y += 3.1; pos.project(camera);
    const x = rect.left + (pos.x * .5 + .5) * rect.width;
    const y = rect.top + (pos.y * -.5 + .5) * rect.height;
    ui.heroSpeech.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 100%))`;
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i]; p.life -= realDt; p.velocity.y -= 9 * realDt; p.mesh.position.addScaledVector(p.velocity, realDt);
    p.mesh.rotation.x += realDt * 8; p.mesh.rotation.y += realDt * 6;
    if (p.life <= 0) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); explosions.splice(i, 1); }
  }
  if (playing && !result) {
    checkPrincessExposure(realDt);
    checkResult(realDt);
  }
  
  cameraShake = Math.max(0, cameraShake - realDt * 1.6);
  const sx = (Math.random() - .5) * cameraShake, sy = (Math.random() - .5) * cameraShake;
  
  // ★変更：カメラモード時の位置計算
  if (playing && isCameraMode) {
    const tarX = camTarget.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const tarY = camTarget.y + Math.sin(camPitch) * camDist;
    const tarZ = camTarget.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    camera.position.lerp(new THREE.Vector3(tarX + sx, tarY + sy, tarZ), 0.15);
    
    camera.currentLookAt.lerp(camTarget, 0.15);
    const lookAtPos = camera.currentLookAt.clone();
    lookAtPos.x += sx; lookAtPos.y += sy;
    camera.lookAt(lookAtPos);
  } else {
    // 救出後は城全景ではなく、城門の外に集まった三人を追う。
    const finaleCamera = stageNumber === 3 && rescueState.active && rescueState.walkCompleteTime > 0;
    let fixedCamera;
    let lookAtPos;
    if (finaleCamera) {
      const princessPos = princess.body.translation();
      const focus = new THREE.Vector3(princessPos.x, Math.max(2.4, princessPos.y + 1.15), princessPos.z);
      if (rival.visible) focus.lerp(rival.position, .28);
      fixedCamera = focus.clone().add(new THREE.Vector3(18 + sx, 12 + sy, 21));
      lookAtPos = focus.clone();
      lookAtPos.x += sx;
      lookAtPos.y += sy;
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, 1.58, .075);
    } else {
      fixedCamera = stageNumber === 3 ? new THREE.Vector3(46 + sx, 38 + sy, 62) : stageNumber === 2 ? new THREE.Vector3(39 + sx, 31 + sy, 53) : new THREE.Vector3(35 + sx, 27 + sy, 47);
      lookAtPos = stageNumber === 3 ? new THREE.Vector3(10 + sx, 10 + sy, 3) : stageNumber === 2 ? new THREE.Vector3(10 + sx, 8 + sy, 5) : new THREE.Vector3(8 + sx, 6 + sy, 7);
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, 1, .075);
    }
    camera.updateProjectionMatrix();
    camera.position.lerp(fixedCamera, 0.1);
    camera.currentLookAt.lerp(lookAtPos, 0.1);
    camera.lookAt(camera.currentLookAt);
  }
  
  renderer.render(scene, camera);
  renderPrincessCamera();
}

makeGround(); makeScenery(); makeCastle(); makePrincess(); makeCannon(); makeHero(); makeRival(); updateCannon(); updateHP(); updateAmmo(); resize();
ui.loading.classList.remove("visible");
requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has("play")) {
  openingEnded = true;
  ui.intro?.classList.remove("visible", "leaving");
  ui.intro?.classList.add("finished");
  beginGame();
} else {
  startOpening();
}

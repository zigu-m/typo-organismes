console.log("ready");

// =========================
// CONFIG
// =========================
const DEFAULT_GRID_WIDTH = 30;
const DEFAULT_GRID_HEIGHT = 30;
const LETTER_SPACING = 2;
const DRAW_SCALE = 24;

const letterFiles = {
  A: "rle/a.rle",
  B: "rle/b.rle",
  C: "rle/c.rle",
  D: "rle/d.rle",
  E: "rle/e.rle",
  F: "rle/f.rle",
  G: "rle/g.rle",
  H: "rle/h.rle",
  I: "rle/i.rle",
  J: "rle/j.rle",
  K: "rle/k.rle",
  L: "rle/l.rle",
  M: "rle/m.rle",
  N: "rle/n.rle",
  O: "rle/o.rle",
  P: "rle/p.rle",
  Q: "rle/q.rle",
  R: "rle/r.rle",
  S: "rle/s.rle",
  T: "rle/t.rle",
  U: "rle/u.rle",
  V: "rle/v.rle",
  W: "rle/w.rle",
  X: "rle/x.rle",
  Y: "rle/y.rle",
  Z: "rle/z.rle"
};

// =========================
// DRAW CANVAS
// =========================
const $drawcanvas = document.getElementById("canva-draw");
const drawctx = $drawcanvas.getContext("2d");
const $backdrop = document.getElementById("backdrop");
const $lifeModal = document.getElementById("life-modal");
const $golCloseBTN = document.getElementById("gol-close");

let gridWidth = DEFAULT_GRID_WIDTH;
let gridHeight = DEFAULT_GRID_HEIGHT;
let pixelWidth = 0;
let pixelHeight = 0;
let viewGrid = true;

function createPixelGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(false));
}

let pixels = createPixelGrid(gridWidth, gridHeight);
let historyStack = [];

// =========================
// HISTORY
// =========================
function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

const MAX_HISTORY = 50;

function saveState() {
  historyStack.push({
    pixels: cloneGrid(pixels),
    gridWidth,
    gridHeight
  });

  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift(); // 오래된거 제거
  }
}

function undoState() {
  if (historyStack.length === 0) return;

  const previous = historyStack.pop();
  pixels = cloneGrid(previous.pixels);
  gridWidth = previous.gridWidth;
  gridHeight = previous.gridHeight;

  resizeCanvas();
}

// =========================
// DRAWING
// =========================
function resizeCanvas() {
  const maxWidth = window.innerWidth * 0.8;   // ⭐ 화면 기준
  const maxHeight = window.innerHeight * 0.8; // ⭐ 화면 기준

  const aspect = gridWidth / gridHeight;

  let canvasWidth = maxWidth;
  let canvasHeight = canvasWidth / aspect;

  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight;
    canvasWidth = canvasHeight * aspect;
  }

  $drawcanvas.width = Math.floor(canvasWidth);
  $drawcanvas.height = Math.floor(canvasHeight);

  pixelWidth = $drawcanvas.width / gridWidth;
  pixelHeight = $drawcanvas.height / gridHeight;

  drawGrid();
}

function drawGrid() {
  drawctx.clearRect(0, 0, $drawcanvas.width, $drawcanvas.height);

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      drawctx.fillStyle = pixels[row][col] ? "black" : "white";
      drawctx.fillRect(
        col * pixelWidth,
        row * pixelHeight,
        pixelWidth,
        pixelHeight
      );
    }
  }

  drawGuidelines();
}

function drawGuidelines() {
  if (!viewGrid) return;

  const guidelineColor = "rgba(77, 220, 220, 0.45)";
  const guidelineSpecialColor = "rgba(66, 181, 66, 0.7)";

  for (let x = 1; x <= gridWidth - 1; x++) {
    drawctx.strokeStyle = x === Math.floor(gridWidth / 2)
      ? guidelineSpecialColor
      : guidelineColor;

    drawctx.beginPath();
    drawctx.moveTo(x * pixelWidth, 0);
    drawctx.lineTo(x * pixelWidth, $drawcanvas.height);
    drawctx.stroke();
  }

  for (let y = 1; y <= gridHeight - 1; y++) {
    drawctx.strokeStyle = y === Math.floor(gridHeight / 2)
      ? guidelineSpecialColor
      : guidelineColor;

    drawctx.beginPath();
    drawctx.moveTo(0, y * pixelHeight);
    drawctx.lineTo($drawcanvas.width, y * pixelHeight);
    drawctx.stroke();
  }
}

function clearGrid() {
  saveState();
  pixels = createPixelGrid(DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT);
  gridWidth = DEFAULT_GRID_WIDTH;
  gridHeight = DEFAULT_GRID_HEIGHT;
  resizeCanvas();
}

// =========================
// RLE PARSING
// =========================
function getRleString(fullstring) {
  let width = null;
  let height = null;
  let rleString = "";
  let name = null;

  const nameMatch = fullstring.match(/^#N\s+(.+)$/mi);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  const sizeMatch = fullstring.match(/x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)/i);
  if (sizeMatch) {
    width = parseInt(sizeMatch[1], 10);
    height = parseInt(sizeMatch[2], 10);
  }

  const match = fullstring.match(/(?:^|\n)([bo\d$][\s\S]*?!)/);
  rleString = match ? match[1].replace(/\s+/g, "") : "";

  return {
    rleString,
    width: width > 0 ? width : null,
    height: height > 0 ? height : null,
    name
  };
}

function inferRleSize(rleString) {
  let row = 0;
  let col = 0;
  let maxCol = 0;
  let countStr = "";

  for (let i = 0; i < rleString.length; i++) {
    const char = rleString[i];

    if (char >= "0" && char <= "9") {
      countStr += char;
      continue;
    }

    const count = countStr ? parseInt(countStr, 10) : 1;
    countStr = "";

    if (char === "b" || char === "o") {
      col += count;
      maxCol = Math.max(maxCol, col);
    } else if (char === "$") {
      row += count;
      col = 0;
    } else if (char === "!") {
      break;
    }
  }

  return {
    width: maxCol,
    height: row + 1
  };
}

function rleToPixelMatrix(rleString, width, height) {
  const matrix = Array.from({ length: height }, () => Array(width).fill(false));

  let row = 0;
  let col = 0;
  let countStr = "";

  for (let i = 0; i < rleString.length; i++) {
    const char = rleString[i];

    if (char >= "0" && char <= "9") {
      countStr += char;
      continue;
    }

    const count = countStr ? parseInt(countStr, 10) : 1;
    countStr = "";

    if (char === "b") {
      col += count;
    } else if (char === "o") {
      for (let c = 0; c < count; c++) {
        if (row < height && col < width) {
          matrix[row][col] = true;
        }
        col++;
      }
    } else if (char === "$") {
      row += count;
      col = 0;
    } else if (char === "!") {
      break;
    }
  }

  return matrix;
}

// =========================
// LETTER COMPOSITION
// =========================

function appendLetter(matrix, width, height) {
  const hasPixels = pixels.some((row) => row.some(Boolean));
  const startX = hasPixels ? gridWidth + LETTER_SPACING : 0;

  const newWidth = hasPixels
    ? gridWidth + width + LETTER_SPACING
    : Math.max(gridWidth, width);

  const newHeight = Math.max(gridHeight, height);
  const newPixels = createPixelGrid(newWidth, newHeight);

  // 기존 픽셀 복사
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      newPixels[y][x] = pixels[y][x];
    }
  }

  // 새 글자 붙이기 (세로 가운데 정렬)
  const offsetY = Math.floor((newHeight - height) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (matrix[y][x]) {
        newPixels[offsetY + y][startX + x] = true;
      }
    }
  }

  pixels = newPixels;
  gridWidth = newWidth;
  gridHeight = newHeight;

  resizeCanvas();
}

const letterCache = {};

async function loadLetter(letter) {
  if (letterCache[letter]) {
    saveState();
    appendLetter(letterCache[letter].matrix, letterCache[letter].width, letterCache[letter].height);
    return;
  }

  const filePath = letterFiles[letter];

  const response = await fetch(filePath);
  const text = await response.text();

  const rleData = getRleString(text);

  if (!rleData.width || !rleData.height) {
    const inferred = inferRleSize(rleData.rleString);
    rleData.width = inferred.width;
    rleData.height = inferred.height;
  }

  const matrix = rleToPixelMatrix(
    rleData.rleString,
    rleData.width,
    rleData.height
  );

  // 캐시 저장
  letterCache[letter] = {
    matrix,
    width: rleData.width,
    height: rleData.height
  };

  saveState();
  appendLetter(matrix, rleData.width, rleData.height);
}

// =========================
// UI
// =========================
const $letterContainer = document.getElementById("letter-buttons");
const $undo = document.getElementById("undo");
const $clear = document.getElementById("clear");
const $toggleGrid = document.getElementById("toggle-grid");
const $preview = document.getElementById("preview");
const $lifePanel = document.getElementById("life-panel");

Object.keys(letterFiles).forEach((letter) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "letter-btn";
  btn.textContent = letter;

  btn.addEventListener("click", () => {
    loadLetter(letter);
  });

  $letterContainer.appendChild(btn);
});

$undo.addEventListener("click", () => {
  undoState();
});

$clear.addEventListener("click", () => {
  clearGrid();
});

$toggleGrid.addEventListener("click", () => {
  viewGrid = !viewGrid;
  $toggleGrid.classList.toggle("active", !viewGrid);
  $toggleGrid.textContent = viewGrid ? "Hide Grid" : "Show Grid";
  drawGrid();
});

document.addEventListener("keydown", (event) => {
  const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
  if (isUndo) {
    event.preventDefault();
    undoState();
  }
});

// =========================
// GAME OF LIFE
// =========================
const $golcanvas = document.getElementById("gol");
const golctx = $golcanvas.getContext("2d");
golctx.imageSmoothingEnabled = false;

const $golStepDisplay = document.getElementById("gol-step-display");

const $golPlayBTN = document.getElementById("gol-start");
const $golPauseBTN = document.getElementById("gol-pause");
const $golStepBTN = document.getElementById("gol-step");
const $golStopBTN = document.getElementById("gol-stop");

let golGrid = [];
let golInitialGrid = [];
let golCols = 100;
let golRows = 100;
let golPixelSize = 0;
let golTimer = null;
let golStepCount = 0;

function createGolGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(false));
}

function centerDrawGridToGolGrid() {
  const paddingX = 20;
  const paddingY = 20;

  golCols = Math.max(gridWidth + paddingX * 2, 100);
  golRows = Math.max(gridHeight + paddingY * 2, 100);

  golGrid = createGolGrid(golCols, golRows);

  const offsetX = Math.floor((golCols - gridWidth) / 2);
  const offsetY = Math.floor((golRows - gridHeight) / 2);

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      if (pixels[row][col]) {
        golGrid[offsetY + row][offsetX + col] = true;
      }
    }
  }

  golInitialGrid = golGrid.map((row) => row.slice());
}

function drawGolGrid() {
  golctx.clearRect(0, 0, $golcanvas.width, $golcanvas.height);

  golctx.fillStyle = "white";
  golctx.fillRect(0, 0, $golcanvas.width, $golcanvas.height);

  const drawWidth = golCols * golPixelSize;
  const drawHeight = golRows * golPixelSize;

  const startX = Math.floor(($golcanvas.width - drawWidth) / 2);
  const startY = Math.floor(($golcanvas.height - drawHeight) / 2);

  for (let y = 0; y < golRows; y++) {
    for (let x = 0; x < golCols; x++) {
      if (golGrid[y][x]) {
        golctx.fillStyle = "black";
        golctx.fillRect(
          startX + x * golPixelSize,
          startY + y * golPixelSize,
          golPixelSize,
          golPixelSize
        );
      }
    }
  }
}

function resizeGolCanvas() {
  $golcanvas.width = 1000;
  $golcanvas.height = 800;
  golPixelSize = Math.min($golcanvas.width / golCols, $golcanvas.height / golRows);
  drawGolGrid();
}

function getAliveNeighbors(x, y) {
  let count = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;

      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < golCols &&
        ny < golRows &&
        golGrid[ny][nx]
      ) {
        count++;
      }
    }
  }

  return count;
}

function stepGol() {
  const next = createGolGrid(golCols, golRows);

  for (let y = 0; y < golRows; y++) {
    for (let x = 0; x < golCols; x++) {
      const alive = golGrid[y][x];
      const neighbors = getAliveNeighbors(x, y);

      if (alive && (neighbors === 2 || neighbors === 3)) {
        next[y][x] = true;
      } else if (!alive && neighbors === 3) {
        next[y][x] = true;
      }
    }
  }

  golGrid = next;

  // 👉 여기 추가
  golStepCount++;
  $golStepDisplay.textContent = `Step: ${golStepCount}`;

  drawGolGrid();
}

function resetGol() {
  clearInterval(golTimer);
  golTimer = null;
  golGrid = golInitialGrid.map((row) => row.slice());

  golStepCount = 0;
  $golStepDisplay.textContent = "Step: 0";
  
  drawGolGrid();
}

function closeLifeModal() {
  clearInterval(golTimer);
  golTimer = null;

  $backdrop.classList.add("hidden");
  $lifeModal.classList.add("hidden");
}

$preview.addEventListener("click", () => {
  $backdrop.classList.remove("hidden");
  $lifeModal.classList.remove("hidden");

  centerDrawGridToGolGrid();

  golStepCount = 0;
  $golStepDisplay.textContent = "Step: 0";

  resizeGolCanvas();
});

$golPlayBTN.addEventListener("click", () => {
  if (golTimer) return;
  golTimer = setInterval(() => {
    stepGol();
  }, 180);
});

$golPauseBTN.addEventListener("click", () => {
  clearInterval(golTimer);
  golTimer = null;
});

$golStepBTN.addEventListener("click", () => {
  stepGol();
});

$golStopBTN.addEventListener("click", () => {
  resetGol();
});

$golCloseBTN.addEventListener("click", () => {
  closeLifeModal();
});

$backdrop.addEventListener("click", () => {
  closeLifeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$lifeModal.classList.contains("hidden")) {
    closeLifeModal();
  }
});

// =========================
// INIT
// =========================
resizeCanvas();

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!$lifeModal.classList.contains("hidden")) {
    resizeGolCanvas();
  }
});




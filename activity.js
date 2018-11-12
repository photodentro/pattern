/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0

 Scaling requirements:
 * We want to be able to support full screen.
 * We don't want to use a specific size like 800x600, because then even the
   fonts are scaled!
 * We want to rely on a 16:9 aspect ratio.
 So, result:
 * We resize the canvas on window.resize to fit the window while keeping 16:9.
 * We resize/reposition everything manually.
*/
// TODO: create a game global object to avoid polluting the namespace?
var stage;
var bg;
// Region = {
//   cont: Container, box: Shape, tiles: [Bitmap], color: String, selectedTile,
//   gx: GridX, gy: GridY, ts: TileSize, bs: BlankSpace, ma: Margin, x, y }
var r1 = { tiles: Array(24), color: "DarkTurquoise" };
var r2 = { tiles: Array(16), color: "OrangeRed" };
var r3 = { tiles: Array(2), color: "DeepSkyBlue" };
// the menu bar buttons
var r4 = { tiles: Array(5) };
var statusText, lvlText;
var imgSuccess;
const ratio = 16/9;
// To use .svg images, they must not have width or height="100%":
// https://bugzilla.mozilla.org/show_bug.cgi?id=874811
// Additionally, preloadjs currently doesn't work with .svg images.
// Put the tiles first so that we can get them by index more easily
var resourceNames = ['question_mark', 'face_angry', 'face_glasses', 'face_happy', 'face_tonque', 'shape_circle', 'shape_hexagon', 'shape_rhombus', 'shape_square', 'bar_home', 'bar_help', 'bar_about', 'bar_previous', 'bar_next', 'background', 'flower_good', 'lion_good', 'try_again', 'blank'];
var resources = [];
var resourcesLoaded = 0;
var level;
var endGame = false;

window.onload = init;

function init() {
  console.clear();
  stage = new createjs.Stage("mainCanvas");
  stage.enableMouseOver();
  stage.snapToPixelEnabled = true;
  createjs.Bitmap.prototype.snapToPixel = true;
  statusText = new createjs.Text("Φόρτωση...", "20px Arial", "white");
  statusText.textAlign = "center";
  statusText.textBaseline = "middle";
  stage.addChild(statusText);
  resize();

  // Resource preloading
  for (var i = 0; i < resourceNames.length; i++) {
    resources[i] = new Image();
    resources[i].src = "resource/" + resourceNames[i] + ".svg";
    resources[i].rname = resourceNames[i];
    resources[i].onload = queueFileLoad;
  }
  // The last queueFileLoad calls queueComplete. Execution continues there.
}

function queueFileLoad(event) {
  // Edge needs the images to be cached before they're used
  if (resourcesLoaded === 0) {
    bg = new createjs.Bitmap(event.target);
    bg.cache();
  } else {
    bg.image = event.target;
    bg.updateCache();
  }
  resourcesLoaded++;
  statusText.text = "Φόρτωση " + parseInt(100*resourcesLoaded/resourceNames.length) + " %";
  stage.update();
  if (resourcesLoaded == resourceNames.length)
    queueComplete(event);
}

// Return an integer from 0 to num-1.
function random(num) {
  return Math.floor(Math.random() * num);
}

function imgByName(name) {
  return resources[resourceNames.indexOf(name)];
}

// Return a ColorFilter. Red=0, Green=1, Blue=2, Yellow=3.
function ColorFilter(i) {
  // Internal function ColorComponent
  function CC(bit) {
    if (bit)
      return 1
    else
      return 0.5;
  }

  var rgby = [4, 2, 3, 6];
  i = rgby[i % 4];
  return new createjs.ColorFilter(CC(i&4), CC(i&2), CC(i&1), 1, 0, 0, 0, 0)
}

function queueComplete(event) {
  console.log("Finished loading resources");
  // We only keep statusText for debugging; not visible in production builds
  statusText.visible = false;
  bg = new createjs.Bitmap(imgByName("background"));
  stage.addChild(bg);

  r1.box = new createjs.Shape();
  stage.addChild(r1.box);
  r1.cont = new createjs.Container();
  stage.addChild(r1.cont);
  // We always initialize the max number of tiles, and reuse them
  for (i = 0; i < r1.tiles.length; i++) {
    r1.tiles[i] = new createjs.Bitmap(imgByName("blank"));
    r1.tiles[i].addEventListener("click", onR1click);
    r1.tiles[i].addEventListener("mouseover", onR1mouseover);
    r1.tiles[i].addEventListener("mouseout", onR1mouseout);
    r1.tiles[i].i = i;
    r1.cont.addChild(r1.tiles[i]);
  }
  r1.selectedTile = null;

  r2.box = new createjs.Shape();
  stage.addChild(r2.box);
  r2.cont = new createjs.Container();
  stage.addChild(r2.cont);
  for (i = 0; i < r2.tiles.length; i++) {
    if (i < 4)
      r2.tiles[i] = new createjs.Bitmap(resources[resourceNames.indexOf("shape_circle") + i % 4]);
    else if (i < 8) {
      r2.tiles[i] = new createjs.Bitmap(imgByName("shape_circle"));
      r2.tiles[i].filters = [ ColorFilter(i % 4) ];
    }
    else if (i < 12)
      r2.tiles[i] = new createjs.Bitmap(imgByName("shape_circle"));
    else {
      r2.tiles[i] = new createjs.Bitmap(resources[resourceNames.indexOf("face_angry") + i % 4]);
      r2.tiles[i].mouseEnabled = false;
    }
    r2.tiles[i].addEventListener("click", onR2click);
    r2.tiles[i].addEventListener("mouseover", onR2mouseover);
    r2.tiles[i].addEventListener("mouseout", onR2mouseout);
    r2.tiles[i].i = i;
    r2.cont.addChild(r2.tiles[i]);
  }

  r3.box = new createjs.Shape();
  stage.addChild(r3.box);
  r3.cont = new createjs.Container();
  stage.addChild(r3.cont);
  for (i = 0; i < r3.tiles.length; i++) {
    r3.tiles[i] = new createjs.Bitmap(imgByName("blank"));
    r3.tiles[i].i = i;
    r3.cont.addChild(r3.tiles[i]);
  }

  var onMenuClick = [onMenuHome, onMenuHelp, onMenuAbout, onMenuPrevious, onMenuNext];
  r4.cont = new createjs.Container();
  stage.addChild(r4.cont);
  for (i = 0; i < r4.tiles.length; i++) {
    r4.tiles[i] = new createjs.Bitmap(resources[resourceNames.indexOf("bar_home") + i]);
    r4.tiles[i].addEventListener("click", onMenuClick[i]);
    r4.tiles[i].addEventListener("mouseover", onR4mouseover);
    r4.tiles[i].addEventListener("mouseout", onR4mouseout);
    r4.tiles[i].i = i;
    r4.cont.addChild(r4.tiles[i]);
  }

  lvlText = new createjs.Text("1", "20px Arial", "white");
  lvlText.textAlign = "center";
  lvlText.textBaseline = "middle";
  stage.addChild(lvlText);

  imgSuccess = new createjs.Bitmap(imgByName("blank"));
  imgSuccess.visible = false;
  stage.addChild(imgSuccess);

  // Bring statusText in front of everything
  statusText.textAlign = "right";
  statusText.textBaseline = "alphabetic";
  stage.setChildIndex(statusText, stage.numChildren - 1);

  initLevel(0);
  window.addEventListener('resize', resize, false);
  createjs.Ticker.on("tick", tick);
  // createjs.Ticker.timingMode = createjs.Ticker.RAF;
  // createjs.Ticker.framerate = 10;
}

function onR1click(event) {
  if (event.target.image.rname != "question_mark")
    return;
  for (i = 0; i < r3.combination.length; i++)
    if (event.target.solution[i] != r3.combination[i]) {
      // Try again!
      r3.tiles[0].image = imgByName("try_again");
      r3.tiles[0].filters = [ ];
      r3.tiles[0].updateCache();
      r3.tiles[1].image = imgByName("blank");
      r3.tiles[1].updateCache();
      r3.combination = [-1, -1, -1];
      stage.update();
      return;
    }
  onR1mouseout(event);  // Unhover it
  event.target.image = r3.tiles[0].image;
  event.target.filters = r3.tiles[0].filters;
  event.target.updateCache();
  // TODO: link face images in shapeimage.somevar
  r1.tiles[event.target.i+12].image = r3.tiles[1].image;
  r1.tiles[event.target.i+12].visible = true;
  r1.tiles[event.target.i+12].updateCache();
  stage.update();
  checkEndGame();
}

function onR1mouseover(event) {
  if (event.target.image.rname == "question_mark") {
    event.target.scaleX = 1.2*event.target.savedscaleX;
    event.target.scaleY = 1.2*event.target.savedscaleY;
    stage.update();
  }
}

function onR1mouseout(event) {
  if (event.target.image.rname == "question_mark") {
    event.target.scaleX = event.target.savedscaleX;
    event.target.scaleY = event.target.savedscaleY;
    stage.update();
  }
}

function onR2click(event) {
  if (r3.tiles[0].image == imgByName("try_again")) {  // Remove try_again
    r3.tiles[0].image = imgByName("blank");
    r3.tiles[0].updateCache();
  }
  if (event.target.i < 4) {  // Shape
    r3.combination[0] = event.target.i % 4;
    r3.tiles[0].image = event.target.image;
    r3.tiles[0].updateCache();
  } else if (event.target.i < 8) {  // Color
    r3.combination[1] = event.target.i % 4;
    r3.tiles[0].filters = event.target.filters;
    r3.tiles[0].updateCache();
    // Nah, faces look better in gray
    // r3.tiles[1].filters = event.target.filters;
    // r3.tiles[1].updateCache();
  } else if (event.target.i < 12) {  // Face
    r3.combination[2] = event.target.i % 4;
    r3.tiles[1].image = r2.tiles[event.target.i + 4].image;
    r3.tiles[1].updateCache();
  }
  stage.update();
}

function onR2mouseover(event) {
  event.target.scaleX = 1.2*event.target.savedscaleX;
  event.target.scaleY = 1.2*event.target.savedscaleY;
  if (event.target.i >= 8) {
    r2.tiles[event.target.i + 4].scaleX = 1.2*r2.tiles[event.target.i + 4].savedscaleX;
    r2.tiles[event.target.i + 4].scaleY = 1.2*r2.tiles[event.target.i + 4].savedscaleY;
  }
  stage.update();
}

function onR2mouseout(event) {
  event.target.scaleX = event.target.savedscaleX;
  event.target.scaleY = event.target.savedscaleY;
  if (event.target.i >= 8) {
    r2.tiles[event.target.i + 4].scaleX = r2.tiles[event.target.i + 4].savedscaleX;
    r2.tiles[event.target.i + 4].scaleY = r2.tiles[event.target.i + 4].savedscaleY;
  }
  stage.update();
}

function onR4mouseover(event) {
  event.target.scaleX = 1.2*event.target.savedscaleX;
  event.target.scaleY = 1.2*event.target.savedscaleY;
  stage.update();
}

function onR4mouseout(event) {
  event.target.scaleX = event.target.savedscaleX;
  event.target.scaleY = event.target.savedscaleY;
  stage.update();
}

function onMenuHome(event) {
  window.history.back();
}

function onMenuHelp(event) {
  alert("Από το αριστερό κουτί, επιλέξτε σχήμα, χρώμα και έκφραση, ώστε να ταιριάζει με αυτό που φαντάζεστε ότι πρέπει να μπει στη θέση του ερωτηματικού στο πάνω κουτί. Μετά πατήστε το ερωτηματικό.");
}

function onMenuAbout(event) {
  window.open("credits/index_DS_II.html");
}

function onMenuPrevious(event) {
  initLevel(level - 1);
}

function onMenuNext(event) {
  initLevel(level + 1);
}

// tilesArray, tileWidth, boxWidth
function alignTiles(tilesA, tileW, boxW) {
  // We do want at least one pixel spacing between the tiles
  tilesPerRow = Math.floor(boxW/(tileW+1))
  // If all tiles fit, use that number
  tilesPerRow = Math.min(tilesA.length, tilesPerRow)
  margin = (boxW - tileW*tilesPerRow) / (tilesPerRow-1)
  for (i = 0; i < tilesA.length; i++) {
    if (!tilesA[i].image) {
      console.log(i)
      console.log(tilesA)
    }
    tilesA[i].scaleX = tileW / tilesA[i].image.width;
    tilesA[i].scaleY = tileW / tilesA[i].image.height;
    tilesA[i].regX = tilesA[i].image.width / 2;
    tilesA[i].regY = tilesA[i].image.height / 2;
    tilesA[i].x = (margin+tileW) * (i % tilesPerRow) + tilesA[i].scaleX*tilesA[i].regX;
    tilesA[i].y = (margin+tileW) * Math.floor(i / tilesPerRow) + tilesA[i].scaleY*tilesA[i].regY;
    // These copies are used to preserve the original scale on mouseover
    tilesA[i].savedscaleX = tilesA[i].scaleX;
    tilesA[i].savedscaleY = tilesA[i].scaleY;
    tilesA[i].cache(0, 0, tilesA[i].image.width, tilesA[i].image.height)
  }
}

function alignRegion(r) {
  if (r.box) {
    r.box.x = r.x;
    r.box.y = r.y;
    r.box.alpha = 0.5;
    r.box.graphics.clear();
    r.box.graphics.beginStroke("#000");
    r.box.graphics.setStrokeStyle(1);
    r.box.graphics.beginFill(r.color).drawRoundRect(
      0, 0, r.gx*r.ts + (r.gx+1)*r.ma, r.gy*r.ts + (r.gy+1)*r.ma, r.ma);
  }
  r.cont.x = r.x + r.ma;
  r.cont.y = r.y + r.ma;
  alignTiles(r.tiles, r.ts, r.gx*r.ts + (r.gx-1)*r.ma);
}

function resize() {
  // Resize the canvas element
  winratio = window.innerWidth/window.innerHeight;
  if (winratio >= ratio) {
    stage.canvas.height = window.innerHeight;
    stage.canvas.width = stage.canvas.height * ratio;
  } else {
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = stage.canvas.width / ratio;
  }

  // If loadComplete() hasn't been called yet, the rest of the items aren't available
  if (!("box" in r1)) {
    statusText.x = stage.canvas.width / 2;
    statusText.y = stage.canvas.height / 2;
    statusText.font = parseInt(stage.canvas.height/10) + "px Arial";
    return;
  }

  // Region1
  // We want to fit gx tiles, plus 2 for spacing.
  r1.ts = Math.floor(stage.canvas.width / (r1.gx + 2));
  r1.bs = stage.canvas.width - r1.gx * r1.ts;  // Total blank space
  // This depicts the vertical margins between the tiles
  r1.ma = r1.bs / (5 + (1 + (r1.gx - 1) + 1) + 5);
  r1.x = 5 * r1.ma;
  r1.y = r1.ma;
  alignRegion(r1);
  for (i = 0; i < 12; i++)
    r1.tiles[12 + i].y = r1.tiles[i].y;

  // Region2
  r2.ts = 1.5 * r1.ts;
  r2.ma = r1.ma;
  r2.x = r1.x + 5*r2.ma;
  r2.y = r1.y + r1.gy*r1.ts + (r1.gy+2)*r1.ma;
  alignRegion(r2);
  for (i = 0; i < 4; i++)
    r2.tiles[12 + i].y = r2.tiles[8 + i].y;

  // Region3
  r3.ts = 3*r2.ts;
  r3.ma = 2*r2.ma;
  r3.x = stage.canvas.width - 3*r2.ts - 9*r2.ma - 5*r2.ma;
  r3.y = r2.y;
  alignRegion(r3);

  // Region4
  r4.ts = stage.canvas.height / 10;
  r4.ma = r4.ts / 5;
  r4.x = 0;
  r4.y = stage.canvas.height - r4.ts - 2*r4.ma;
  alignRegion(r4);
  // Make space for the level
  r4.tiles[r4.tiles.length-1].x += r4.ts + r4.ma;

  lvlText.text = level + 1;
  lvlText.x = parseInt(4.5*(r4.ma+r4.ts) + r4.ma/2);
  lvlText.y = stage.canvas.height - r4.ma/2 - r4.ts/2;
  lvlText.font = parseInt(2*r4.ts/2) + "px Arial";

  // If level is single digit, move lvlText and bar_previous a bit left
  if (level + 1 < 10) {
    lvlText.x -= r4.ts/4;
    r4.tiles[r4.tiles.length-1].x -= r4.ts/2;
  }

  imgSuccess.scaleY = (2/3) * stage.canvas.height / imgSuccess.image.height;
  imgSuccess.scaleX = imgSuccess.scaleY;
  imgSuccess.regX = imgSuccess.image.width / 2;
  imgSuccess.regY = imgSuccess.image.height / 2;
  imgSuccess.x = stage.canvas.width / 2;
  imgSuccess.y = stage.canvas.height / 2;

  statusText.text = "Επίπεδο: " + (level + 1);
  statusText.x = stage.canvas.width - r4.ma;
  statusText.y = stage.canvas.height - r4.ma;
  statusText.font = parseInt(r4.ts/2) + "px Arial";

  // Fill all the canvas with the background
  bg.scaleX = stage.canvas.width / bg.image.width;
  bg.scaleY = stage.canvas.height / bg.image.height;
  bg.cache(0, 0, bg.image.width, bg.image.height);

  stage.update();
}

dx = 5;
function tick() {
  if (endGame) {
     imgSuccess.scaleX *= 1.01;
     imgSuccess.scaleY *= 1.01;
  }
  else if (r1.selectedTile) {
    r1.selectedTile.rotation += dx;
    if (Math.abs(r1.selectedTile.rotation) > 10)
      dx = -dx;
  }
  statusText.text = "Επίπεδο: " + (level + 1 ) + ', fps: ' + Math.round(createjs.Ticker.getMeasuredFPS());
  stage.update();
}

// Return a shuffled array [0, ..., num-1].
// If different_index==true, make sure that array[i] != i.
function shuffled_array(num, different_index) {
    var result = [];
    var i, j, temp;

    // Fill the array with [0, ..., num-1]
    for (i = 0; i < num; i++)
        result.push(i);
    // shuffle the array
    for (i = 0; i < num; i++) {
        j = random(num);
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    // Make sure that result[i] != i
    if (different_index)
        for (i = 0; i < num; i++)
            if (result[i] == i) {
                j = (i + 1) % num;
                temp = result[i];
                result[i] = result[j];
                result[j] = temp;
            }
    return result;
}

function initLevel(newLevel) {
  // Internal level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  var numLevels = 7;
  level = (newLevel + numLevels) % numLevels;

  // lvl = 0..1: all characteristics = random[2..4]
  // lvl = 2..3: two characteristics = random[2..4], one fixed
  // lvl = 4..5: one characteristic  = random[2..4], two fixed
  // lvl = 6..7: all characteristics = different randoms[2..4]
  lvl = {};

  r = 2 + random(3);
  chrs = [r, r, r];
  if (level < 2) {
    chrs = [r, r, r];
  } else if (level < 4) {
    chrs = [r, r, r];
    chrs[random(3)] = 1
  } else if (level < 6) {
    chrs = [1, 1, 1];
    chrs[random(3)] = r;
  } else {
    chrs = [2 + random(3), 2 + random(3), 2 + random(3)];
  }
  lvl.snum = chrs[0];
  lvl.cnum = chrs[1];
  lvl.fnum = chrs[2];
  lvl.shapes = shuffled_array(4).slice(0, lvl.snum);
  lvl.colors = shuffled_array(4).slice(0, lvl.cnum);
  lvl.faces = shuffled_array(4).slice(0, lvl.fnum);

  // Region1
  r1.tilesNum = 12;
  r1.gx = 12;
  r1.gy = 1;
  for (i = 0; i < r1.tiles.length; i++) {
    r1.tiles[i].solution = [lvl.shapes[i % lvl.snum],
      lvl.colors[i % lvl.cnum], lvl.faces[i % lvl.fnum]];
    if (i < 11) {
      r1.tiles[i].image = resources[resourceNames.indexOf("shape_circle") + r1.tiles[i].solution[0]]
      r1.tiles[i].filters = [ ColorFilter(r1.tiles[i].solution[1]) ];
    } else {
      r1.tiles[i].image = resources[resourceNames.indexOf("face_angry") + r1.tiles[i].solution[2]]
      // r1.tiles[i].filters = [ ColorFilter(i) ];
    }
  }
  r1.tiles[11].image = imgByName("question_mark");
  r1.tiles[11].filters = [];

  r1.tiles[23].visible = false;
  // Region2
  r2.tilesNum = 12;
  r2.gx = 4;
  r2.gy = 3;
  // Region3
  r3.tilesNum = 1;
  r3.gx = 1;
  r3.gy = 1;
  r3.tiles[0].image = imgByName("blank");
  r3.tiles[0].filters = [ ];
  r3.tiles[1].image = imgByName("blank");
  r3.combination = [-1, -1, -1];
  // Region4
  r4.tilesNum = 5;
  r4.gx = 5;
  r4.gy = 1;
  endGame = false;
  imgSuccess.image = resources[resourceNames.indexOf("flower_good") + random(2)];
  imgSuccess.visible = false;
  if (r1.selectedTile) {
    r1.selectedTile.rotation = 0;
    r1.selectedTile = null;
  }
  resize();
}

function checkEndGame() {
  endGame = true;
  for (i = 0; i < 12; i++) {
    if (r1.tiles[i].image.rname == "question_mark")
      endGame = false;
  }
  if (endGame) {
    imgSuccess.visible = true;
    setTimeout(onMenuNext, 3000);
    stage.update();
  }
}

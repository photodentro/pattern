/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0
*/
var act = null;  // activity object, see initActivity()

function onError(message, source, lineno, colno, error) {
  alert(sformat('Σφάλμα προγραμματιστή!\n'
    + 'message: {}\nsource: {}\nlineno: {}\ncolno: {}\nerror: {}',
  message, source, lineno, colno, error));
}

// ES6 string templates don't work in old Android WebView
function sformat(format) {
  var args = arguments;
  var i = 0;
  return format.replace(/{(\d*)}/g, function sformatReplace(match, number) {
    i += 1;
    if (typeof args[number] !== 'undefined') {
      return args[number];
    }
    if (typeof args[i] !== 'undefined') {
      return args[i];
    }
    return match;
  });
}

// Return an integer from 0 to num-1.
function random(num) {
  return Math.floor(Math.random() * num);
}

// Return a shuffled array [0, ..., num-1].
// If differentIndex==true, make sure that array[i] != i.
function shuffledArray(num, differentIndex) {
  var result = [];
  var i;
  var j;
  var temp;

  // Fill the array with [0, ..., num-1]
  for (i = 0; i < num; i += 1) {
    result.push(i);
  }
  // Shuffle the array
  for (i = 0; i < num; i += 1) {
    j = random(num);
    temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  // Make sure that result[i] != i
  if (differentIndex) {
    for (i = 0; i < num; i += 1) {
      if (result[i] === i) {
        j = (i + 1) % num;
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
      }
    }
  }
  return result;
}

function ge(element) {
  return document.getElementById(element);
}

function setKeyframes(element, rule, duration) {
  var e = element;
  var i;
  var name = sformat('{}_animation', e.id);

  // The webkit* stuff is for old android webview versions
  e.style.animationName = '';
  e.style.webkitAnimationName = '';
  // First, delete the old animation for this element, if it exists
  for (i = 0; i < act.sheet.cssRules.length; i += 1) {
    if (act.sheet.cssRules[i].name === name) {
      act.sheet.deleteRule(i);
    }
  }
  // Now add the rule
  try {
    act.sheet.insertRule(sformat('@keyframes {} { {} }', name, rule), act.sheet.cssRules.length);
  } catch (err) {
    act.sheet.insertRule(sformat('@-webkit-keyframes {} { {} }', name, rule), act.sheet.cssRules.length);
  }
  void e.getClientRects();  // e.offsetWidth doesn't cause reflow with svg images
  // IE needs animationDuration before animationName
  e.style.animationDuration = duration || '2s';
  e.style.webkitAnimationDuration = e.style.animationDuration;
  e.style.animationName = name;
  e.style.webkitAnimationName = e.style.animationName;
}

function onResize(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;
  if (w / h < 640 / 360) {
    document.body.style.fontSize = sformat('{}px', 10 * w / 640);
  } else {
    document.body.style.fontSize = sformat('{}px', 10 * h / 360);
  }
}

function doPreventDefault(event) {
  event.preventDefault();
}

function onHome(event) {
  window.history.back();
}

function onHelp(event) {
  ge('help').style.display = 'flex';
  ge('helpaudio').play();
}

function onHelpHide(event) {
  ge('help').style.display = '';
}

function onAbout(event) {
  window.open('credits/index_DS_II.html');
}

function onFullScreen(event) {
  var doc = window.document;
  var docEl = doc.documentElement;
  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen
    || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen
    || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement
    && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}

function onPrevious(event) {
  initLevel(act.level - 1);
}

function onNext(event) {
  initLevel(act.level + 1);
}

function onQuestionMarkClick(event) {
  checkLevelOver();
}

function onCharacteristicsClick(event) {
  var id;
  var i;

  /* Sometimes target is an element inside the svg... */
  id = event.target.id || event.target.ownerSVGElement.id;
  i = parseInt(id.slice(1), 10);  /* E.g. c10 becomes 10 */
  act.s[0].$combination[Math.floor(i / 4)] = i % 4;
  combineSVG(act.s[0], act.s[0].$combination);
}

function combineSVG(target, combination) {
  var ih;
  var grads = ['#redgrad', '#greengrad', '#bluegrad', '#yellowgrad'];
  var strokes = ['"#a44"', '"#4a4"', '"#48a"', '"#aa8"'];
  var t = target;

  ih = '';
  if (combination[0] >= 0) {
    ih = act.c[combination[0]].innerHTML;
    if (!ih) {
      msg = "This activity doesn't work in Internet Explorer.\nUse another browser.";
      alert(msg);
      window.onerror = "";
      throw new Error(msg);
    }
    if (combination[1] >= 0) {
      ih = ih.replace('"#fff"', sformat('url("{}")', grads[combination[1]]));
      ih = ih.replace('"#888"', strokes[combination[1]]);
    }
    if (combination[2] >= 0) {
      ih += act.c[8 + combination[2]].innerHTML;
    }
  }
  t.innerHTML = ih;
}

function checkLevelOver() {
  var i;

  for (i = 0; i <= 2; i += 1) {
    if (act.s[0].$combination[i] !== act.p[11].$combination[i]) {
      setKeyframes(ge('solution'), [
        '0% { background-color: rgba(192,192,240,0.5); }',
        '40% { background-color: rgba(128,0,0,0.75); }',
        '60% { background-color: rgba(128,0,0,0.75); }',
        '100% { opacity: 1; }'].join('\n'), '1s');
      setKeyframes(act.s[0], [
        '0% { opacity: 1; }',
        '40% { opacity: 0; }',
        '60% { opacity: 0; }',
        '100% { opacity: 1; }'].join('\n'), '1s');
      setKeyframes(act.s[1], [
        '0% { opacity: 0; }',
        '40% { opacity: 1; }',
        '60% { opacity: 1; }',
        '100% { opacity: 0; }'].join('\n'), '1s');
      return;
    }
  }
  for (i = 0; i < 12; i += 1) {
    setKeyframes(act.p[i], [  // A wave effect
      '0% { transform: translate(0, 0); }',
      sformat('{}% { transform: translate(0, 0); }', 1 + 5 * i),
      sformat('{}% { transform: translate(0, -2em); }', 10 + 5 * i),
      sformat('{}% { transform: translate(0, 2em); }', 30 + 5 * i),
      sformat('{}% { transform: translate(0, 0); }', 40 + 5 * i),
      '100% { transform: translate(0, 0) }'].join('\n'), '4s');
  }
  setKeyframes(act.s[0], [
    '0% { transform: rotate(360deg); }',
    '80% { transform: rotate(0deg); opacity: 1; }',
    '100% { opacity: 0; }'].join('\n'), '4s');
  setTimeout(initLevel, 4000, act.level + 1);
}

function initLevel(newLevel) {
  // Internal level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  // lvl = 0..1: all characteristics = random[2..4]
  // lvl = 2..3: two characteristics = random[2..4], one fixed
  // lvl = 4..5: one characteristic  = random[2..4], two fixed
  // lvl = 6..7: all characteristics = different randoms[2..4]
  var numLevels = 7;
  var r;  /* In early levels we only need a single random */
  var chrp;  /* [shapesPeriod, colorsPeriod, facesPeriod] */
  var sp;  /* Shapes Period, the number of shapes that are rotated */
  var cp;  /* Colors Period */
  var fp;  /* Faces Period */
  var shapes;  /* The indices of the #sp rotated random shapes */
  var colors;
  var faces;
  var i;

  act.level = (newLevel + numLevels) % numLevels;
  r = 2 + random(3);
  chrp = [r, r, r];
  if (act.level < 2) {
    chrp = [r, r, r];
  } else if (act.level < 4) {
    chrp = [r, r, r];
    chrp[random(3)] = 1;
  } else if (act.level < 6) {
    chrp = [1, 1, 1];
    chrp[random(3)] = r;
  } else {
    chrp = [2 + random(3), 2 + random(3), 2 + random(3)];
  }
  sp = chrp[0];
  cp = chrp[1];
  fp = chrp[2];
  shapes = shuffledArray(4).slice(0, sp);
  colors = shuffledArray(4).slice(0, cp);
  faces = shuffledArray(4).slice(0, fp);

  /* Calculate the pattern and store it in the svg images */
  for (i = 0; i < 12; i += 1) {
    act.p[i].$combination = [shapes[i % sp], colors[i % cp], faces[i % fp]];
    if (i < 11) {
      combineSVG(act.p[i], act.p[i].$combination);
    } else {
      act.p[i].innerHTML = act.p[11].$initialHTML;
    }
  }
  act.s[0].innerHTML = act.p[11].$initialHTML;
  act.s[0].$combination = [-1, -1, -1];

  ge('level').innerHTML = act.level + 1;
}

function initActivity() {
  var i;

  act = {
    level: 0,
    p: [],  /* pattern svg objects */
    c: [],  /* characteristics svg objects */
    s: [],  /* solution svg objects */
    sheet: null,
    dragobj: null,
    mouseX: 0,  // The ontouchend event doesn't contain any coords,
    mouseY: 0,  // so we keep the last ontouchmove ones.
  };
  for (i = 0; i < 12; i += 1) {
    act.p.push(ge(sformat('p{}', i)));
    act.c.push(ge(sformat('c{}', i)));
    act.c[i].onclick = onCharacteristicsClick;
  }
  act.p[11].onclick = onQuestionMarkClick;
  act.p[11].$initialHTML = act.p[11].innerHTML;
  for (i = 0; i < 2; i += 1) {
    act.s.push(ge(sformat('s{}', i)));
  }
  onResize();
  // Create a <style> element for animations, to avoid CORS issues on Chrome
  act.sheet = document.styleSheets[0];
  // TODO: dynamically? document.head.appendChild(document.createElement('style'));
  // Install event handlers
  document.body.onresize = onResize;
  document.body.oncontextmenu = doPreventDefault;
  ge('bar_home').onclick = onHome;
  ge('bar_help').onclick = onHelp;
  ge('help').onclick = onHelpHide;
  ge('bar_about').onclick = onAbout;
  ge('bar_fullscreen').onclick = onFullScreen;
  ge('bar_previous').onclick = onPrevious;
  ge('bar_next').onclick = onNext;
  for (i = 0; i < document.images.length; i += 1) {
    document.images[i].ondragstart = doPreventDefault;
  }
  initLevel(act.level);
}

window.onerror = onError;
window.onload = initActivity;
// Call onResize even before the images are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onResize);
} else {  // `DOMContentLoaded` already fired
  onResize();
}

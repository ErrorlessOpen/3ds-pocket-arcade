/* Local-file front end for EmulatorJS. ROM data is passed as a File object, not uploaded. */
var selectedSystem = "nds";
var emulatorStarted = false;

function chooseSystem(system) {
  selectedSystem = system;
  document.querySelector(".console").className = "console " + (system === "3ds" ? "system-3ds" : "system-ds");
  document.getElementById("ds-choice").className = system === "nds" ? "system-choice active" : "system-choice";
  document.getElementById("3ds-choice").className = system === "3ds" ? "system-choice active" : "system-choice";
  if (system === "3ds" && !window.crossOriginIsolated) {
    setStatus("3DS mode needs browser support for SharedArrayBuffer. Open this page in a modern desktop browser.", "error");
  } else if (system === "3ds") {
    setStatus("3DS mode ready. Choose a .3ds, .cia, or .zip file.", "normal");
  } else {
    setStatus("DS mode selected. Choose a .nds or .zip file.", "normal");
  }
}

function setStatus(message, type) {
  var status = document.getElementById("status");
  status.className = "status" + (type === "error" ? " error" : "");
  status.innerHTML = message;
}

function getExtension(name) {
  var dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
}

function loadGame(file) {
  var ext;
  var core;
  var dataPath = "https://cdn.emulatorjs.org/stable/data/";
  var loader;
  var name;
  if (!file || emulatorStarted) { return; }

  ext = getExtension(file.name);
  if (selectedSystem === "nds") {
    if (ext !== "nds" && ext !== "zip") {
      setStatus("That file does not look like a DS game. Choose .nds or .zip, or switch to 3DS mode.", "error");
      return;
    }
    core = "nds";
  } else {
    if (ext !== "3ds" && ext !== "cci" && ext !== "cia" && ext !== "cxi" && ext !== "app" && ext !== "zip") {
      setStatus("Choose a .3ds, .cia, or .zip file for 3DS mode.", "error");
      return;
    }
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      setStatus("This browser cannot start the 3DS core because it does not support SharedArrayBuffer. Your game file was not uploaded.", "error");
      return;
    }
    core = "3ds";
  }

  name = file.name.replace(/\.[^.]+$/, "");
  document.getElementById("welcome").style.display = "none";
  document.getElementById("game").innerHTML = "";
  document.getElementById("game").style.display = "block";
  setStatus("Loading " + escapeHtml(name) + "… the emulator engine may take a moment to download.", "normal");

  window.EJS_player = "#game";
  window.EJS_gameUrl = file;
  window.EJS_core = core;
  window.EJS_pathtodata = dataPath;
  window.EJS_startOnLoaded = true;
  window.EJS_threads = core === "3ds";
  window.EJS_browserMode = "mobile";
  window.EJS_color = "#e64b52";
  window.EJS_backgroundColor = "#050505";
  window.EJS_askBeforeExit = false;
  window.EJS_VirtualGamepadSettings = [
    {type: "dpad", location: "left", left: "50%", top: "48%", joystickInput: false, inputValues: [4, 5, 6, 7]},
    {type: "zone", location: "right", left: "50%", top: "25%", joystickInput: true, color: "white", inputValues: [19, 18, 17, 16]},
    {type: "button", text: "X", id: "x", location: "right", left: 39, top: 92, bold: true, input_value: 1},
    {type: "button", text: "Y", id: "y", location: "right", left: 0, top: 131, bold: true, input_value: 9},
    {type: "button", text: "B", id: "b", location: "right", left: 78, top: 131, bold: true, input_value: 0},
    {type: "button", text: "A", id: "a", location: "right", left: 39, top: 170, bold: true, input_value: 8},
    {type: "button", text: "SELECT", id: "select", location: "center", left: -48, top: 8, fontSize: 11, input_value: 2},
    {type: "button", text: "START", id: "start", location: "center", left: 14, top: 8, fontSize: 11, input_value: 3}
  ];
  window.EJS_ready = function () {
    setStatus("Ready — " + escapeHtml(name) + ". Touch the screen or use the controls.", "normal");
    emulatorStarted = true;
  };
  window.EJS_onGameStart = function () { setStatus("Playing " + escapeHtml(name) + ".", "normal"); };
  loader = document.createElement("script");
  loader.src = dataPath + "loader.js";
  loader.onload = function () { emulatorStarted = true; };
  loader.onerror = function () {
    setStatus("The emulator engine did not load. Check your internet connection and reload this page.", "error");
    document.getElementById("welcome").style.display = "block";
  };
  document.body.appendChild(loader);
}

function sendEmulatorInput(index, value) {
  var emulator = window.EJS_emulator;
  if (!emulator || !emulator.gameManager || typeof emulator.gameManager.simulateInput !== "function") { return; }
  emulator.gameManager.simulateInput(0, index, value);
}

function bindTouchButton(button) {
  var index = parseInt(button.getAttribute("data-input"), 10);
  var active = false;
  button.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    active = true;
    if (button.setPointerCapture) { button.setPointerCapture(event.pointerId); }
    sendEmulatorInput(index, 1);
  });
  function release(event) {
    if (!active) { return; }
    event.preventDefault();
    active = false;
    sendEmulatorInput(index, 0);
  }
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

function bindCirclePad() {
  var pad = document.getElementById("circle-pad");
  var held = [];
  var active = false;
  function update(event) {
    var rect = pad.getBoundingClientRect();
    var dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    var dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    var next = [];
    if (Math.abs(dx) > 0.3 && Math.abs(dx) >= Math.abs(dy)) { next.push(dx < 0 ? 6 : 7); }
    else if (Math.abs(dy) > 0.3) { next.push(dy < 0 ? 4 : 5); }
    if (held.length && (!next.length || held[0] !== next[0])) { sendEmulatorInput(held[0], 0); }
    if (next.length && (!held.length || held[0] !== next[0])) { sendEmulatorInput(next[0], 1); }
    held = next;
  }
  pad.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    active = true;
    if (pad.setPointerCapture) { pad.setPointerCapture(event.pointerId); }
    update(event);
  });
  pad.addEventListener("pointermove", function (event) { if (active) { event.preventDefault(); update(event); } });
  function release(event) {
    if (!active) { return; }
    event.preventDefault();
    active = false;
    if (held.length) { sendEmulatorInput(held[0], 0); }
    held = [];
  }
  pad.addEventListener("pointerup", release);
  pad.addEventListener("pointercancel", release);
  pad.addEventListener("lostpointercapture", release);
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

document.getElementById("rom-file").onchange = function () {
  if (this.files && this.files.length > 0) { loadGame(this.files[0]); }
};

document.querySelector(".console").className = "console system-ds";
var controlButtons = document.querySelectorAll(".console-controls [data-input]");
var controlIndex;
for (controlIndex = 0; controlIndex < controlButtons.length; controlIndex += 1) { bindTouchButton(controlButtons[controlIndex]); }
bindCirclePad();

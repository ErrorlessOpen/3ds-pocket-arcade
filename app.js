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
  if (!file) { return; }
  if (emulatorStarted) {
    setStatus("Reload this page before switching to a different game.", "error");
    return;
  }

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
  if (window.CloudSave) { window.CloudSave.setGame(name, file.size); }
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
  window.EJS_fixedSaveInterval = 15000;
  window.EJS_onSaveUpdate = function (event) {
    if (window.CloudSave && event && event.save) { window.CloudSave.uploadSave(event.save); }
  };
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

var GAME_LIBRARY_DB = "pocket-arcade-library";
var GAME_LIBRARY_STORE = "games";
var gameLibraryDbPromise = null;
var gameCatalog = [
  {id: "wild-world", title: "Animal Crossing: Wild World", system: "nds", mark: "DS", fileHint: "Animal Crossing - Wild World (USA) (Rev 1).nds", accept: ".nds,.zip", extensions: ["nds", "zip"]},
  {id: "nintendogs-cats", title: "Nintendogs + Cats: Golden Retriever", system: "3ds", mark: "3DS", fileHint: "Nintendogs + Cats - Golden Retriever & New Friends (Europe) (Rev 2).zip", accept: ".3ds,.cci,.cia,.cxi,.app,.zip", extensions: ["3ds", "cci", "cia", "cxi", "app", "zip"]},
  {id: "mario-3d-land-zip", title: "Super Mario 3D Land · ZIP", system: "3ds", mark: "3DS", fileHint: "Super Mario 3D Land (Europe) (Rev 2).zip", accept: ".3ds,.cci,.cia,.cxi,.app,.zip", extensions: ["3ds", "cci", "cia", "cxi", "app", "zip"]},
  {id: "mario-3d-land-cia", title: "Super Mario 3D Land · CIA", system: "3ds", mark: "3DS", fileHint: "Super Mario 3D Land (Europe) (Legit CIA).cia", accept: ".3ds,.cci,.cia,.cxi,.app,.zip", extensions: ["3ds", "cci", "cia", "cxi", "app", "zip"]},
  {id: "new-leaf", title: "Animal Crossing: New Leaf", system: "3ds", mark: "3DS", fileHint: "Animal Crossing - New Leaf (Europe).zip", accept: ".3ds,.cci,.cia,.cxi,.app,.zip", extensions: ["3ds", "cci", "cia", "cxi", "app", "zip"]}
];

function openGameLibraryDb() {
  if (!window.indexedDB) { return Promise.reject(new Error("This browser does not support a local game library. Use a modern browser.")); }
  if (!gameLibraryDbPromise) {
    gameLibraryDbPromise = new Promise(function (resolve, reject) {
      var request = window.indexedDB.open(GAME_LIBRARY_DB, 1);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(GAME_LIBRARY_STORE)) {
          db.createObjectStore(GAME_LIBRARY_STORE, {keyPath: "id"});
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not open local browser storage.")); };
      request.onblocked = function () { reject(new Error("Close other Pocket Arcade tabs and try again.")); };
    });
  }
  return gameLibraryDbPromise;
}

function getGameLibraryRecords() {
  return openGameLibraryDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(GAME_LIBRARY_STORE, "readonly");
      var request = transaction.objectStore(GAME_LIBRARY_STORE).getAll();
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error || new Error("Could not read the local game library.")); };
    });
  });
}

function getGameLibraryRecord(id) {
  return openGameLibraryDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(GAME_LIBRARY_STORE, "readonly");
      var request = transaction.objectStore(GAME_LIBRARY_STORE).get(id);
      request.onsuccess = function () { resolve(request.result || null); };
      request.onerror = function () { reject(request.error || new Error("Could not read that game from this browser.")); };
    });
  });
}

function saveGameToLibrary(entry, file) {
  if (entry.extensions.indexOf(getExtension(file.name)) === -1) {
    return Promise.reject(new Error("Choose a supported game file for " + entry.title + "."));
  }
  return openGameLibraryDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(GAME_LIBRARY_STORE, "readwrite");
      transaction.objectStore(GAME_LIBRARY_STORE).put({
        id: entry.id,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        addedAt: Date.now(),
        gameFile: file
      });
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error || new Error("Browser storage could not save that game file.")); };
      transaction.onabort = function () { reject(transaction.error || new Error("The browser stopped saving that file. Check available storage space.")); };
    });
  });
}

function findCatalogEntryForFile(file) {
  var name = file.name.toLowerCase();
  var extension = getExtension(file.name);
  if (name.indexOf("wild world") !== -1) { return gameCatalog[0]; }
  if (name.indexOf("nintendogs") !== -1) { return gameCatalog[1]; }
  if (name.indexOf("new leaf") !== -1) { return gameCatalog[4]; }
  if (name.indexOf("super mario 3d land") !== -1 && extension === "zip") { return gameCatalog[2]; }
  if (name.indexOf("super mario 3d land") !== -1 && extension === "cia") { return gameCatalog[3]; }
  return null;
}

function renderGameLibrary(records) {
  var container = document.getElementById("game-library-list");
  var status = document.getElementById("library-status");
  var recordsById = {};
  var installedCount = 0;
  if (!container || !status) { return; }
  records.forEach(function (record) { recordsById[record.id] = record; });
  container.innerHTML = gameCatalog.map(function (entry) {
    var record = recordsById[entry.id];
    var fileInfo = record
      ? escapeHtml(record.fileName) + " · " + (Number(record.fileSize || 0) / (1024 * 1024)).toFixed(1) + " MB"
      : "Not installed in this browser";
    if (record) { installedCount += 1; }
    return '<article class="game-card">' +
      '<div class="game-card-top"><span class="game-card-mark ' + (entry.system === "nds" ? "ds" : "") + '">' + escapeHtml(entry.mark) + '</span>' +
      '<div><h2>' + escapeHtml(entry.title) + '</h2><p class="game-card-meta">' + (entry.system === "nds" ? "Nintendo DS" : "Nintendo 3DS") + ' · ' + escapeHtml(entry.fileHint.split(".").pop().toUpperCase()) + '</p></div></div>' +
      '<p class="game-card-file" title="' + fileInfo + '">' + fileInfo + '</p>' +
      '<div class="game-card-actions"><button type="button" data-action="install" data-game-id="' + entry.id + '">' + (record ? "Replace file" : "Choose file") + '</button>' +
      '<button type="button" class="library-play" data-action="play" data-game-id="' + entry.id + '"' + (record ? "" : " disabled") + '>Play</button></div>' +
      '<input class="game-library-file" data-game-id="' + entry.id + '" type="file" accept="' + escapeHtml(entry.accept) + '" aria-label="Choose file for ' + escapeHtml(entry.title) + '">' +
      '</article>';
  }).join("");
  status.textContent = installedCount + " of 5 files installed in this browser. Game files stay on this device; they are not uploaded to GitHub or Supabase.";
}

function refreshGameLibrary() {
  return getGameLibraryRecords().then(function (records) {
    renderGameLibrary(records);
    return records;
  });
}

function importGameFiles(fileList, singleGameId) {
  var files = Array.prototype.slice.call(fileList || []);
  var imports = [];
  var unmatched = [];
  var assigned = {};
  if (!files.length) { return Promise.resolve(); }
  files.forEach(function (file) {
    var entry = singleGameId
      ? gameCatalog.filter(function (candidate) { return candidate.id === singleGameId; })[0]
      : findCatalogEntryForFile(file);
    if (!entry || entry.extensions.indexOf(getExtension(file.name)) === -1 || assigned[entry.id]) {
      unmatched.push(file.name);
      return;
    }
    assigned[entry.id] = true;
    imports.push({entry: entry, file: file});
  });
  if (!imports.length) {
    var noMatch = "No files matched a game slot. Choose a file from the matching game card.";
    document.getElementById("library-status").textContent = noMatch;
    return Promise.resolve();
  }
  var chain = Promise.resolve();
  imports.forEach(function (item) {
    chain = chain.then(function () { return saveGameToLibrary(item.entry, item.file); });
  });
  return chain.then(function () {
    return refreshGameLibrary();
  }).then(function () {
    var message = "Installed " + imports.length + " file" + (imports.length === 1 ? "" : "s") + " in this browser.";
    if (unmatched.length) { message += " Not matched: " + unmatched.join(", ") + ". Choose those from their individual game cards."; }
    document.getElementById("library-status").textContent = message + " Nothing was sent to the website.";
  }).catch(function (error) {
    document.getElementById("library-status").textContent = "Import stopped: " + error.message + " Game files remain local; check this browser's available storage.";
    refreshGameLibrary().catch(function () {});
  });
}

function playLibraryGame(id) {
  var entry = gameCatalog.filter(function (candidate) { return candidate.id === id; })[0];
  if (!entry) { return; }
  getGameLibraryRecord(id).then(function (record) {
    if (!record || !record.gameFile) { throw new Error("Import this game file into the library first."); }
    var gameFile = record.gameFile instanceof File
      ? record.gameFile
      : new File([record.gameFile], record.fileName, {type: record.fileType || "application/octet-stream"});
    chooseSystem(entry.system);
    loadGame(gameFile);
    document.getElementById("game-shell").scrollIntoView({behavior: "smooth", block: "center"});
  }).catch(function (error) {
    document.getElementById("library-status").textContent = error.message;
  });
}

function initializeGameLibrary() {
  var list = document.getElementById("game-library-list");
  var multiInput = document.getElementById("library-files");
  if (!list || !multiInput) { return; }
  multiInput.addEventListener("change", function () {
    importGameFiles(multiInput.files, null);
    multiInput.value = "";
  });
  list.addEventListener("change", function (event) {
    var target = event.target;
    if (!target || !target.classList.contains("game-library-file")) { return; }
    importGameFiles(target.files, target.getAttribute("data-game-id"));
    target.value = "";
  });
  list.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button) { return; }
    var id = button.getAttribute("data-game-id");
    if (button.getAttribute("data-action") === "install") {
      var input = list.querySelector('.game-library-file[data-game-id="' + id + '"]');
      if (input) { input.click(); }
    } else if (button.getAttribute("data-action") === "play") {
      playLibraryGame(id);
    }
  });
  refreshGameLibrary().catch(function (error) {
    document.getElementById("library-status").textContent = error.message;
  });
}

document.getElementById("rom-file").onchange = function () {
  if (this.files && this.files.length > 0) { loadGame(this.files[0]); }
};

document.querySelector(".console").className = "console system-ds";
var controlButtons = document.querySelectorAll(".console-controls [data-input]");
var controlIndex;
for (controlIndex = 0; controlIndex < controlButtons.length; controlIndex += 1) { bindTouchButton(controlButtons[controlIndex]); }
bindCirclePad();
initializeGameLibrary();

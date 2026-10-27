/* Encrypted Supabase save backup. ROM files and the encryption passphrase stay local. */
(function () {
  "use strict";

  var config = window.CLOUD_SAVE_CONFIG || {};
  var baseUrl = String(config.url || "").replace(/\/$/, "");
  var anonKey = config.anonKey || "";
  var statusNode = document.getElementById("cloud-status");
  var emailNode = document.getElementById("cloud-email");
  var accountPasswordNode = document.getElementById("cloud-account-password");
  var passphraseNode = document.getElementById("cloud-passphrase");
  var signUpButton = document.getElementById("cloud-sign-up");
  var signInButton = document.getElementById("cloud-sign-in");
  var enableButton = document.getElementById("cloud-enable");
  var downloadButton = document.getElementById("cloud-download");
  var session = null;
  var userId = "";
  var gameKey = "";
  var gameName = "game";
  var passphrase = "";
  var enabled = false;
  var uploading = false;

  function setStatus(message, error) {
    if (!statusNode) { return; }
    statusNode.textContent = message;
    statusNode.className = "cloud-status" + (error ? " error" : "");
  }

  function updateButtons() {
    var configured = !!(baseUrl && anonKey && window.fetch && window.crypto && window.crypto.subtle);
    if (signUpButton) { signUpButton.disabled = !configured; }
    if (signInButton) { signInButton.disabled = !configured; }
    if (enableButton) { enableButton.disabled = !userId || !gameKey; }
    if (downloadButton) { downloadButton.disabled = !userId || !gameKey; }
  }

  function api(path, method, body, token, extraHeaders) {
    var headers = { apikey: anonKey, "Content-Type": "application/json" };
    var options = { method: method, headers: headers };
    var url = baseUrl + path;
    if (token) { headers.Authorization = "Bearer " + token; }
    if (extraHeaders) {
      Object.keys(extraHeaders).forEach(function (key) { headers[key] = extraHeaders[key]; });
    }
    if (body !== null && typeof body !== "undefined") { options.body = JSON.stringify(body); }
    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var parsed = null;
        if (text) {
          try { parsed = JSON.parse(text); } catch (ignore) { parsed = { message: text }; }
        }
        if (!response.ok) {
          throw new Error((parsed && (parsed.msg || parsed.message || parsed.error_description || parsed.error)) || "Supabase request failed (" + response.status + ").");
        }
        return parsed;
      });
    });
  }

  function storeSession(result) {
    if (!result || !result.access_token || !result.user || !result.user.id) {
      throw new Error("Supabase did not return a signed-in session. Check your email for a confirmation link, then sign in.");
    }
    session = {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || "",
      expiresAt: Date.now() + (Number(result.expires_in) || 3600) * 1000,
      userId: result.user.id
    };
    userId = session.userId;
    try { window.sessionStorage.setItem("pocketArcadeCloudSession", JSON.stringify(session)); } catch (ignore) {}
    updateButtons();
  }

  function loadSession() {
    var saved;
    try { saved = window.sessionStorage.getItem("pocketArcadeCloudSession"); } catch (ignore) { saved = null; }
    if (!saved) { return; }
    try {
      session = JSON.parse(saved);
      if (session && session.userId && session.accessToken) { userId = session.userId; }
      else { session = null; }
    } catch (ignoreParse) { session = null; }
  }

  function refreshSession() {
    if (!session || !session.refreshToken) { return Promise.reject(new Error("Sign in again to use cloud saves.")); }
    return api("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: session.refreshToken }, null)
      .then(function (result) { storeSession(result); return session.accessToken; });
  }

  function accessToken() {
    if (!session || !session.accessToken) { return Promise.reject(new Error("Sign in to your Supabase account first.")); }
    if (session.expiresAt - Date.now() < 60000) { return refreshSession(); }
    return Promise.resolve(session.accessToken);
  }

  function accountBody() {
    var email = emailNode ? emailNode.value.trim() : "";
    var password = accountPasswordNode ? accountPasswordNode.value : "";
    if (!email || !password) { throw new Error("Enter your Supabase account email and password."); }
    return { email: email, password: password };
  }

  function signUp() {
    var body;
    try { body = accountBody(); } catch (error) { setStatus(error.message, true); return; }
    setStatus("Creating your Supabase account…");
    api("/auth/v1/signup", "POST", body, null)
      .then(function (result) {
        if (result && result.access_token) { storeSession(result); }
        if (accountPasswordNode) { accountPasswordNode.value = ""; }
        setStatus("Account request sent. If Supabase asks for email confirmation, confirm it and then sign in here.");
      })
      .catch(function (error) { setStatus(error.message, true); });
  }

  function signIn() {
    var body;
    try { body = accountBody(); } catch (error) { setStatus(error.message, true); return; }
    setStatus("Signing in to Supabase…");
    api("/auth/v1/token?grant_type=password", "POST", body, null)
      .then(function (result) {
        storeSession(result);
        if (accountPasswordNode) { accountPasswordNode.value = ""; }
        setStatus("Signed in. Select a game, enter your save passphrase, then enable encrypted auto-backup.");
      })
      .catch(function (error) { setStatus(error.message, true); });
  }

  function digestGameKey(name, size) {
    var input = new TextEncoder().encode(name + "|" + size);
    return window.crypto.subtle.digest("SHA-256", input).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (byte) { return ("0" + byte.toString(16)).slice(-2); }).join("");
    });
  }

  function bytesFrom(value) {
    if (value instanceof ArrayBuffer) { return new Uint8Array(value); }
    if (ArrayBuffer.isView(value)) { return new Uint8Array(value.buffer, value.byteOffset, value.byteLength); }
    if (value && value.buffer instanceof ArrayBuffer && ArrayBuffer.isView(value.buffer)) {
      return new Uint8Array(value.buffer.buffer, value.buffer.byteOffset, value.buffer.byteLength);
    }
    throw new Error("EmulatorJS did not provide a save buffer.");
  }

  function toBase64(bytes) {
    var text = "";
    var i;
    for (i = 0; i < bytes.length; i += 0x8000) {
      text += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    }
    return window.btoa(text);
  }

  function fromBase64(text) {
    var raw = window.atob(text);
    var bytes = new Uint8Array(raw.length);
    var i;
    for (i = 0; i < raw.length; i += 1) { bytes[i] = raw.charCodeAt(i); }
    return bytes;
  }

  function deriveKey(salt) {
    var encoder = new TextEncoder();
    return window.crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"])
      .then(function (material) {
        return window.crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      });
  }

  function encryptSave(save) {
    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    var data = bytesFrom(save);
    return deriveKey(salt).then(function (key) {
      return window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
    }).then(function (ciphertext) {
      return { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
    });
  }

  function decryptSave(record) {
    if (!passphrase) { return Promise.reject(new Error("Enter your save passphrase first.")); }
    var salt = fromBase64(record.salt);
    var iv = fromBase64(record.iv);
    return deriveKey(salt).then(function (key) {
      return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, fromBase64(record.ciphertext));
    });
  }

  function enableSync() {
    var value = passphraseNode ? passphraseNode.value : "";
    if (value.length < 12) { setStatus("Choose a save passphrase at least 12 characters long.", true); return; }
    if (!userId) { setStatus("Sign in to Supabase before enabling cloud saves.", true); return; }
    if (!gameKey) { setStatus("Choose a game file before enabling cloud saves.", true); return; }
    passphrase = value;
    enabled = true;
    if (passphraseNode) { passphraseNode.value = ""; }
    setStatus("Encrypted auto-backup is enabled for " + gameName + ". Save data uploads only after EmulatorJS reports a save change.");
    updateButtons();
  }

  function uploadSave(save) {
    if (!enabled || uploading || !userId || !gameKey || !passphrase || !save) { return; }
    uploading = true;
    setStatus("Encrypting and backing up the latest save…");
    encryptSave(save)
      .then(function (encrypted) {
        return accessToken().then(function (token) {
          return api("/rest/v1/emulator_saves?on_conflict=user_id%2Cgame_key", "POST", {
            user_id: userId,
            game_key: gameKey,
            salt: encrypted.salt,
            iv: encrypted.iv,
            ciphertext: encrypted.ciphertext,
            updated_at: new Date().toISOString()
          }, token, { Prefer: "resolution=merge-duplicates,return=minimal" });
        });
      })
      .then(function () { setStatus("Encrypted save backup updated for " + gameName + "."); })
      .catch(function (error) { setStatus("Cloud backup failed: " + error.message, true); })
      .then(function () { uploading = false; });
  }

  function downloadLatest() {
    if (!userId || !gameKey) { setStatus("Sign in and load the game whose backup you want.", true); return; }
    if (!passphrase && passphraseNode && passphraseNode.value.length >= 12) {
      passphrase = passphraseNode.value;
      passphraseNode.value = "";
    }
    if (!passphrase) { setStatus("Enter the save passphrase you used for this backup.", true); return; }
    setStatus("Fetching your encrypted save…");
    accessToken().then(function (token) {
      return api("/rest/v1/emulator_saves?select=game_key,salt,iv,ciphertext,updated_at&game_key=eq." + encodeURIComponent(gameKey) + "&limit=1", "GET", null, token);
    }).then(function (rows) {
      if (!rows || !rows.length) { throw new Error("There is no cloud save for this game yet."); }
      return decryptSave(rows[0]);
    }).then(function (buffer) {
      var blob = new Blob([buffer], { type: "application/octet-stream" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = gameName.replace(/[^a-z0-9_-]+/gi, "-") + ".sav";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
      setStatus("Save downloaded. In EmulatorJS, choose “Load SAV files” and select it to restore.");
    }).catch(function (error) { setStatus("Could not restore cloud save: " + error.message, true); });
  }

  if (signUpButton) { signUpButton.addEventListener("click", signUp); }
  if (signInButton) { signInButton.addEventListener("click", signIn); }
  if (enableButton) { enableButton.addEventListener("click", enableSync); }
  if (downloadButton) { downloadButton.addEventListener("click", downloadLatest); }

  loadSession();
  updateButtons();
  if (!baseUrl || !anonKey) {
    setStatus("Supabase setup is pending. Add the project URL and public anon key to cloud-config.js; saves remain in this browser until then.");
  } else if (!window.fetch || !window.crypto || !window.crypto.subtle || typeof TextEncoder === "undefined") {
    setStatus("Cloud saves require a modern browser with Web Crypto support.", true);
  } else if (userId) {
    setStatus("Signed-in session found. Enter your save passphrase to enable encrypted backups.");
  }

  window.CloudSave = {
    setGame: function (name, size) {
      gameName = name || "game";
      gameKey = "";
      if (!baseUrl || !anonKey || !window.crypto || !window.crypto.subtle || typeof TextEncoder === "undefined") { updateButtons(); return; }
      digestGameKey(gameName, size || 0).then(function (key) { gameKey = key; updateButtons(); }).catch(function () { setStatus("Could not prepare a private game identifier for cloud saves.", true); });
      updateButtons();
    },
    uploadSave: uploadSave
  };
}());

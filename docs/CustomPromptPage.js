define([], function () {
  "use strict";

  console.log("[ApiFetcher] === Module Loaded ===");

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════
  function CustomPromptPage() {
    console.log("[ApiFetcher] 🏗 Constructor called");
    this.domNode = null;
    this.m_oControlHost = null;
    this.m_oDataStores = {};
    this.sessionData = {};
    this.sessionDataReady = false;
    this.history = [];
    this.maxHistory = 20;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.initialize = function (oControlHost, fnDoneInitializing) {
    console.log("[ApiFetcher] 🔧 initialize() called");
    this.m_oControlHost = oControlHost;
    this.domNode = document.createElement("div");
    this.domNode.className = "api-fetcher-container";
    fnDoneInitializing();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SET DATA — reads session DataStore by configured name
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.setData = function (oControlHost, oDataStore) {
    console.log("[ApiFetcher] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[ApiFetcher] 📊 setData() called");

    if (!oDataStore) {
      console.warn("[ApiFetcher] ⚠️ oDataStore is null");
      return;
    }

    this.m_oDataStores[oDataStore.name] = oDataStore;

    console.log("[ApiFetcher] 📦 DataStore name:", oDataStore.name);
    console.log("[ApiFetcher] 📦 DataStore index:", oDataStore.index);
    console.log("[ApiFetcher] 📊 Row count:", oDataStore.rowCount);
    console.log("[ApiFetcher] 📊 Column count:", oDataStore.columnCount);
    console.log("[ApiFetcher] 📊 Column names:", oDataStore.columnNames);

    var config = oControlHost.configuration || {};
    var sessionDSName = config.sessionDataStore || "Session_Data";

    console.log("[ApiFetcher] 🔍 Expected session DataStore:", sessionDSName);
    console.log("[ApiFetcher] 🔍 Received DataStore:", oDataStore.name);

    if (oDataStore.name === sessionDSName) {
      console.log("[ApiFetcher] ✅ SESSION DataStore matched!");
      this._extractSessionData(oDataStore);
    } else {
      console.log("[ApiFetcher] ── Not session DataStore, stored for later use");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT SESSION DATA — column names as keys, first row values
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._extractSessionData = function (oDataStore) {
    this.sessionData = {};

    if (oDataStore.rowCount === 0) {
      console.warn("[ApiFetcher] ⚠️ Session DataStore has 0 rows");
      return;
    }

    var colNames = oDataStore.columnNames;
    console.log("[ApiFetcher] 📋 Extracting " + colNames.length + " columns:");

    for (var c = 0; c < colNames.length; c++) {
      var colName = colNames[c];
      var rawValue = oDataStore.getCellValue(0, c);
      var formattedValue = oDataStore.getFormattedCellValue(0, c);

      this.sessionData[colName] = {
        raw: rawValue,
        formatted: formattedValue,
        index: c
      };

      console.log("[ApiFetcher]   [" + c + "] " + colName + " = \"" + rawValue + "\" (fmt: \"" + formattedValue + "\")");
    }

    this.sessionDataReady = true;
    console.log("[ApiFetcher] ✅ Session data extracted:", Object.keys(this.sessionData).length, "fields");

    // Update UI if already rendered
    if (this.domNode && this.domNode.querySelector("#af-session-panel")) {
      this._renderSessionInfo();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAW
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.draw = function (oControlHost) {
    console.log("[ApiFetcher] 🖼 draw() called");
    this.m_oControlHost = oControlHost;

    var container = oControlHost.container;
    container.innerHTML = "";

    this.domNode = document.createElement("div");
    this.domNode.className = "api-fetcher-container";
    this.domNode.innerHTML = this._buildHTML();
    container.appendChild(this.domNode);

    if (this.sessionDataReady) {
      this._renderSessionInfo();
    }

    this._bindEvents();
    console.log("[ApiFetcher] ✅ UI rendered");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD HTML
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._buildHTML = function () {
    return [
      '<div class="af-wrapper">',

      // ── SESSION INFO PANEL ──
      '<div id="af-session-panel" class="af-session-panel">',
      '  <div class="af-session-header" id="af-session-header-bar">',
      '    <h3 class="af-session-title">Session &amp; User Context</h3>',
      '    <span class="af-session-badge" id="af-session-badge">Waiting...</span>',
      '    <button class="af-session-toggle" id="af-session-toggle">\u25BC</button>',
      '  </div>',
      '  <div class="af-session-body" id="af-session-body">',
      '    <table class="af-session-table" id="af-session-table">',
      '      <thead><tr>',
      '        <th class="af-session-th">#</th>',
      '        <th class="af-session-th">Data Item</th>',
      '        <th class="af-session-th">Value</th>',
      '        <th class="af-session-th">Formatted Value</th>',
      '      </tr></thead>',
      '      <tbody id="af-session-tbody">',
      '        <tr><td colspan="4" class="af-session-empty">Waiting for Session DataStore...<br>Config: <code>"sessionDataStore": "Session_Data"</code></td></tr>',
      '      </tbody>',
      '    </table>',
      '    <div class="af-session-note" id="af-session-note"></div>',
      '  </div>',
      '</div>',

      // ── HEADER ──
      '<div class="af-header">',
      '  <h2 class="af-title">API Fetcher &amp; CORS Analyzer</h2>',
      '  <span class="af-subtitle">Paste URL, analyze response, headers &amp; CORS</span>',
      '</div>',

      // ── INPUT SECTION ──
      '<div class="af-input-section">',
      '<div class="af-input-row">',
      '  <label class="af-label">URL</label>',
      '  <input type="text" id="af-url" class="af-input" placeholder="https://api.example.com/endpoint?param=value" />',
      '</div>',
      '<div class="af-input-row">',
      '  <label class="af-label">Method</label>',
      '  <select id="af-method" class="af-select">',
      '    <option value="GET" selected>GET</option>',
      '    <option value="POST">POST</option>',
      '    <option value="PUT">PUT</option>',
      '    <option value="DELETE">DELETE</option>',
      '    <option value="PATCH">PATCH</option>',
      '  </select>',
      '</div>',
      '<div class="af-input-row">',
      '  <label class="af-label">Authorization</label>',
      '  <input type="text" id="af-auth" class="af-input" placeholder="Bearer eyJhbGciOi... (optional)" />',
      '</div>',
      '<div class="af-input-row">',
      '  <label class="af-label">Custom Headers</label>',
      '  <textarea id="af-headers" class="af-textarea" rows="2" placeholder="Header-Name: value (one per line, optional)"></textarea>',
      '</div>',
      '<div class="af-input-row">',
      '  <label class="af-label">Body</label>',
      '  <textarea id="af-body" class="af-textarea" rows="3" placeholder=\'{"key": "value"} (for POST/PUT/PATCH, optional)\'></textarea>',
      '</div>',
      '<div class="af-buttons">',
      '  <button id="af-btn-fetch" class="af-btn af-btn-primary">Fetch</button>',
      '  <button id="af-btn-preflight" class="af-btn af-btn-secondary">Preflight (OPTIONS)</button>',
      '  <button id="af-btn-oauth" class="af-btn af-btn-secondary">Discover OAuth2</button>',
      '  <button id="af-btn-clear" class="af-btn af-btn-neutral">Clear</button>',
      '</div>',
      '</div>',

      // ── STATUS BAR ──
      '<div id="af-status" class="af-status af-hidden"></div>',

      // ── RESULTS TABS ──
      '<div class="af-results">',
      '<div class="af-tabs">',
      '  <button class="af-tab af-tab-active" data-tab="cors">CORS Analysis</button>',
      '  <button class="af-tab" data-tab="headers">Response Headers</button>',
      '  <button class="af-tab" data-tab="body">Response Body</button>',
      '  <button class="af-tab" data-tab="history">History (<span id="af-history-count">0</span>)</button>',
      '</div>',
      '<div id="af-tab-cors" class="af-tab-content af-tab-visible">',
      '  <div id="af-cors-results" class="af-pre">Run a request to see CORS analysis...</div>',
      '</div>',
      '<div id="af-tab-headers" class="af-tab-content">',
      '  <div id="af-response-headers" class="af-pre">No response yet...</div>',
      '</div>',
      '<div id="af-tab-body" class="af-tab-content">',
      '  <div id="af-response-body" class="af-pre">No response yet...</div>',
      '</div>',
      '<div id="af-tab-history" class="af-tab-content">',
      '  <div id="af-history-list" class="af-pre">No requests yet...</div>',
      '</div>',
      '</div>',

      '</div>'
    ].join('\n');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER SESSION INFO TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._renderSessionInfo = function () {
    var tbody = this.domNode.querySelector("#af-session-tbody");
    var badge = this.domNode.querySelector("#af-session-badge");
    var note = this.domNode.querySelector("#af-session-note");
    if (!tbody) return;

    var keys = Object.keys(this.sessionData);

    if (keys.length === 0) {
      badge.textContent = "No Data";
      badge.className = "af-session-badge af-badge-warning";
      tbody.innerHTML = '<tr><td colspan="4" class="af-session-empty">DataStore matched but returned no data</td></tr>';
      return;
    }

    badge.textContent = keys.length + " fields loaded";
    badge.className = "af-session-badge af-badge-success";

    var rows = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var entry = this.sessionData[key];
      var rawStr = (entry.raw !== null && entry.raw !== undefined) ? String(entry.raw) : "(null)";
      var fmtStr = (entry.formatted !== null && entry.formatted !== undefined) ? String(entry.formatted) : "(null)";

      var rowClass = "";
      var keyLower = key.toLowerCase();
      if (keyLower.indexOf("user") !== -1 || keyLower.indexOf("name") !== -1 || keyLower.indexOf("locale") !== -1) {
        rowClass = ' class="af-session-highlight"';
      }

      rows.push(
        '<tr' + rowClass + '>' +
        '<td class="af-session-td af-session-idx">' + (i + 1) + '</td>' +
        '<td class="af-session-td af-session-key">' + this._escapeHtml(key) + '</td>' +
        '<td class="af-session-td af-session-val">' + this._escapeHtml(rawStr) + '</td>' +
        '<td class="af-session-td af-session-fmt">' + this._escapeHtml(fmtStr) + '</td>' +
        '</tr>'
      );
    }

    tbody.innerHTML = rows.join("");

    // Summary note — display only, no auto-injection
    var parts = [];
    if (this.sessionData["User_ID"]) parts.push("User: " + this.sessionData["User_ID"].raw);
    if (this.sessionData["NameConcat"]) parts.push("Name: " + this.sessionData["NameConcat"].raw);
    if (this.sessionData["runLocale"]) parts.push("Locale: " + this.sessionData["runLocale"].raw);

    if (parts.length > 0) {
      note.innerHTML = '<strong>Session:</strong> ' + this._escapeHtml(parts.join(" | ")) +
        '<br><em>These values are available for manual use in Custom Headers field above.</em>';
      note.className = "af-session-note af-session-note-active";
    }

    console.log("[ApiFetcher] \u2705 Session panel rendered:", keys.length, "fields");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BIND EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._bindEvents = function () {
    var self = this;
    var root = this.domNode;

    root.querySelector("#af-btn-fetch").addEventListener("click", function () { self._doFetch(); });
    root.querySelector("#af-btn-preflight").addEventListener("click", function () { self._doPreflight(); });
    root.querySelector("#af-btn-oauth").addEventListener("click", function () { self._doOAuthDiscovery(); });
    root.querySelector("#af-btn-clear").addEventListener("click", function () { self._clearResults(); });

    var tabs = root.querySelectorAll(".af-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (e) {
        self._switchTab(e.target.getAttribute("data-tab"));
      });
    }

    root.querySelector("#af-url").addEventListener("keydown", function (e) {
      if (e.key === "Enter") self._doFetch();
    });

    root.querySelector("#af-session-toggle").addEventListener("click", function () {
      var body = root.querySelector("#af-session-body");
      var btn = root.querySelector("#af-session-toggle");
      if (body.classList.contains("af-session-collapsed")) {
        body.classList.remove("af-session-collapsed");
        btn.textContent = "\u25BC";
      } else {
        body.classList.add("af-session-collapsed");
        btn.textContent = "\u25B6";
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FETCH — no auto-injection, only manual headers
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doFetch = function () {
    var self = this;
    var url = this._getVal("af-url").trim();
    if (!url) { this._setStatus("Please enter a URL", "error"); return; }

    var method = this._getVal("af-method");
    var authHeader = this._getVal("af-auth").trim();
    var customHeadersRaw = this._getVal("af-headers").trim();
    var bodyRaw = this._getVal("af-body").trim();

    var headers = { "Accept": "application/json" };

    if (authHeader) headers["Authorization"] = authHeader;

    // Parse custom headers — user controls what gets sent
    if (customHeadersRaw) {
      var lines = customHeadersRaw.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var colonIdx = lines[i].indexOf(":");
        if (colonIdx > 0) {
          headers[lines[i].substring(0, colonIdx).trim()] = lines[i].substring(colonIdx + 1).trim();
        }
      }
    }

    var fetchOptions = { method: method, headers: headers, mode: "cors" };
    if (method !== "GET" && method !== "DELETE" && bodyRaw) {
      fetchOptions.body = bodyRaw;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }

    this._setStatus("Fetching " + method + " " + url + " ...", "loading");
    console.log("[ApiFetcher] \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    console.log("[ApiFetcher] \uD83D\uDE80 FETCH REQUEST");
    console.log("[ApiFetcher] URL:", url);
    console.log("[ApiFetcher] Method:", method);
    console.log("[ApiFetcher] Headers:", JSON.stringify(headers, null, 2));
    if (fetchOptions.body) console.log("[ApiFetcher] Body:", fetchOptions.body);

    var startTime = performance.now();

    fetch(url, fetchOptions)
      .then(function (response) {
        var elapsed = Math.round(performance.now() - startTime);
        console.log("[ApiFetcher] \u2705 Response in " + elapsed + "ms — Status:", response.status, response.statusText);

        var responseHeaders = {};
        response.headers.forEach(function (value, key) {
          responseHeaders[key] = value;
          console.log("[ApiFetcher] Header: " + key + ": " + value);
        });

        var meta = {
          url: url, method: method, status: response.status, statusText: response.statusText,
          type: response.type, redirected: response.redirected, finalUrl: response.url,
          headers: responseHeaders, elapsed: elapsed, requestHeaders: headers,
          timestamp: new Date().toISOString()
        };

        return response.text().then(function (bodyText) {
          meta.bodyText = bodyText;
          meta.bodyLength = bodyText.length;
          try { meta.bodyJSON = JSON.parse(bodyText); meta.isJSON = true; }
          catch (e) { meta.isJSON = false; }
          return meta;
        });
      })
      .then(function (meta) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        self._displayResults(meta);
        self._addToHistory(meta);
        self._setStatus(meta.method + " " + meta.status + " " + meta.statusText + " \u2014 " + meta.elapsed + "ms \u2014 " + self._formatBytes(meta.bodyLength),
          meta.status >= 200 && meta.status < 300 ? "success" : "warning");
      })
      .catch(function (error) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        var elapsed = Math.round(performance.now() - startTime);
        console.error("[ApiFetcher] \u274C FETCH FAILED:", error.message);
        var errorMeta = { url: url, method: method, status: 0, statusText: "NETWORK ERROR",
          error: error.message, errorName: error.name, elapsed: elapsed,
          timestamp: new Date().toISOString(), requestHeaders: headers };
        self._displayError(errorMeta);
        self._addToHistory(errorMeta);
        self._setStatus("FAILED: " + error.message + " \u2014 " + elapsed + "ms", "error");
      });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFLIGHT (OPTIONS)
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doPreflight = function () {
    var self = this;
    var url = this._getVal("af-url").trim();
    if (!url) { this._setStatus("Enter a URL for preflight", "error"); return; }

    this._setStatus("OPTIONS preflight to " + url + " ...", "loading");
    console.log("[ApiFetcher] \uD83D\uDD0D PREFLIGHT (OPTIONS):", url);
    var startTime = performance.now();

    fetch(url, {
      method: "OPTIONS", mode: "cors",
      headers: { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "Authorization, Content-Type" }
    })
    .then(function (response) {
      var elapsed = Math.round(performance.now() - startTime);
      var rh = {}; response.headers.forEach(function (v, k) { rh[k] = v; });
      var meta = { url: url, method: "OPTIONS", status: response.status, statusText: response.statusText,
        type: response.type, headers: rh, elapsed: elapsed, timestamp: new Date().toISOString(), isPreflight: true };
      return response.text().then(function (t) { meta.bodyText = t; return meta; });
    })
    .then(function (meta) {
      if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
      self._displayResults(meta);
      self._addToHistory(meta);
      self._setStatus("OPTIONS " + meta.status + " " + meta.statusText + " \u2014 " + meta.elapsed + "ms", "success");
    })
    .catch(function (error) {
      if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
      var elapsed = Math.round(performance.now() - startTime);
      var em = { url: url, method: "OPTIONS", status: 0, error: error.message, elapsed: elapsed,
        timestamp: new Date().toISOString(), isPreflight: true };
      self._displayError(em);
      self._addToHistory(em);
      self._setStatus("PREFLIGHT FAILED: " + error.message, "error");
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OAUTH2 DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doOAuthDiscovery = function () {
    var self = this;
    var url = this._getVal("af-url").trim();
    if (!url) { this._setStatus("Enter a URL for OAuth2 discovery", "error"); return; }

    var baseUrl;
    try { baseUrl = new URL(url).origin; }
    catch (e) { this._setStatus("Invalid URL: " + e.message, "error"); return; }

    var discoveryUrls = [
      baseUrl + "/.well-known/openid-configuration",
      baseUrl + "/.well-known/oauth-authorization-server"
    ];

    this._setStatus("Discovering OAuth2 on " + baseUrl + " ...", "loading");
    console.log("[ApiFetcher] \uD83D\uDD11 OAUTH2 DISCOVERY:", discoveryUrls);

    var results = [], completed = 0;
    discoveryUrls.forEach(function (dUrl, idx) {
      fetch(dUrl, { mode: "cors" })
        .then(function (r) {
          console.log("[ApiFetcher] Discovery [" + idx + "] " + dUrl + " \u2192 " + r.status);
          return r.text().then(function (t) {
            var j = null; try { j = JSON.parse(t); } catch (e) {}
            results[idx] = { url: dUrl, status: r.status, found: r.status === 200 && j !== null, data: j, raw: t };
          });
        })
        .catch(function (err) {
          results[idx] = { url: dUrl, status: 0, found: false, error: err.message };
        })
        .finally(function () {
          completed++;
          if (completed === discoveryUrls.length) {
            if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
            self._displayOAuthResults(results);
          }
        });
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._displayResults = function (meta) {
    this._displayCORSAnalysis(meta);
    this._displayResponseHeaders(meta);
    this._displayResponseBody(meta);
    this._switchTab("cors");
  };

  CustomPromptPage.prototype._displayCORSAnalysis = function (meta) {
    var el = this.domNode.querySelector("#af-cors-results");
    var L = [];

    L.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    L.push("  CORS ANALYSIS \u2014 " + meta.method + " " + meta.url);
    L.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    L.push("");
    L.push("\u25B8 HTTP Status:     " + meta.status + " " + (meta.statusText || ""));
    L.push("\u25B8 Response Type:   " + (meta.type || "N/A"));
    if (meta.redirected) L.push("\u25B8 Redirected:      YES \u2192 " + meta.finalUrl);
    if (meta.elapsed !== undefined) L.push("\u25B8 Time:            " + meta.elapsed + "ms");
    L.push("");

    if (meta.error) {
      L.push("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
      L.push("\u2551  \u274C REQUEST FAILED \u2014 LIKELY CORS BLOCKED      \u2551");
      L.push("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
      L.push(""); L.push("Error: " + meta.error);
      L.push(""); L.push("Possible causes:");
      L.push("  1. No Access-Control-Allow-Origin header");
      L.push("  2. Origin not allowed"); L.push("  3. Server unreachable");
      L.push("  4. DNS failure"); L.push("  5. SSL/TLS issue");
    } else {
      L.push("\u2500\u2500 CORS Headers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      L.push("");
      var ch = [
        {k:"access-control-allow-origin",l:"Allow-Origin",c:true}, {k:"access-control-allow-methods",l:"Allow-Methods",c:true},
        {k:"access-control-allow-headers",l:"Allow-Headers",c:true}, {k:"access-control-allow-credentials",l:"Allow-Credentials",c:false},
        {k:"access-control-expose-headers",l:"Expose-Headers",c:false}, {k:"access-control-max-age",l:"Max-Age",c:false}
      ];
      var hasCors = false;
      for (var i = 0; i < ch.length; i++) {
        var v = meta.headers ? meta.headers[ch[i].k] : undefined;
        if (v !== undefined) { hasCors = true; L.push("  \u2705 " + ch[i].l + ": " + v); }
        else if (ch[i].c) L.push("  \u274C " + ch[i].l + ": NOT PRESENT");
        else L.push("  \u2500\u2500 " + ch[i].l + ": not set");
      }
      L.push("");
      L.push(hasCors ? "  \u2705 CORS HEADERS DETECTED" : "  \u26A0\uFE0F NO CORS HEADERS (may be same-origin)");

      L.push(""); L.push("\u2500\u2500 Authentication \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"); L.push("");
      var wa = meta.headers ? meta.headers["www-authenticate"] : undefined;
      if (wa) {
        L.push("  WWW-Authenticate: " + wa);
        if (wa.toLowerCase().indexOf("bearer") !== -1) L.push("  \u2192 OAuth2 Bearer token expected");
        if (wa.toLowerCase().indexOf("basic") !== -1) L.push("  \u2192 Basic auth accepted");
        if (wa.toLowerCase().indexOf("negotiate") !== -1) L.push("  \u2192 Kerberos/SPNEGO");
      } else if (meta.status === 401) L.push("  \u26A0\uFE0F 401 without WWW-Authenticate");
      else if (meta.status === 403) L.push("  \u26A0\uFE0F 403 Forbidden");
      else L.push("  No auth challenges in response.");

      L.push(""); L.push("\u2500\u2500 Content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"); L.push("");
      L.push("  Content-Type: " + (meta.headers ? (meta.headers["content-type"] || "N/A") : "N/A"));
      L.push("  Body size:    " + (meta.bodyLength !== undefined ? this._formatBytes(meta.bodyLength) : "N/A"));
      L.push("  Is JSON:      " + (meta.isJSON ? "YES" : "NO"));
    }

    el.textContent = L.join("\n");
    console.log("[ApiFetcher] CORS ANALYSIS:\n" + L.join("\n"));
  };

  CustomPromptPage.prototype._displayResponseHeaders = function (meta) {
    var el = this.domNode.querySelector("#af-response-headers");
    var L = ["HTTP " + meta.status + " " + (meta.statusText || ""), "Type: " + (meta.type || "N/A"), ""];
    if (meta.headers) {
      var ks = Object.keys(meta.headers).sort();
      for (var i = 0; i < ks.length; i++) {
        var pfx = ks[i].indexOf("access-control") === 0 ? "\u2605 " : "  ";
        L.push(pfx + ks[i] + ": " + meta.headers[ks[i]]);
      }
    }
    L.push(""); L.push("\u2500\u2500 REQUEST HEADERS SENT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"); L.push("");
    if (meta.requestHeaders) {
      var rk = Object.keys(meta.requestHeaders);
      for (var j = 0; j < rk.length; j++) L.push("  " + rk[j] + ": " + meta.requestHeaders[rk[j]]);
    }
    el.textContent = L.join("\n");
  };

  CustomPromptPage.prototype._displayResponseBody = function (meta) {
    var el = this.domNode.querySelector("#af-response-body");
    if (!meta.bodyText && !meta.error) { el.textContent = "(empty)"; return; }
    if (meta.error) { el.textContent = "Failed: " + meta.error; return; }
    if (meta.isJSON) { try { el.textContent = JSON.stringify(meta.bodyJSON, null, 2); } catch (e) { el.textContent = meta.bodyText; } }
    else { el.textContent = meta.bodyText; }
    if (meta.bodyLength > 50000) {
      el.textContent = "\u26A0\uFE0F Large (" + this._formatBytes(meta.bodyLength) + ") \u2014 first 50KB\n\n" + meta.bodyText.substring(0, 50000) + "\n\n...[TRUNCATED]";
    }
  };

  CustomPromptPage.prototype._displayError = function (errorMeta) {
    this._displayCORSAnalysis(errorMeta);
    this.domNode.querySelector("#af-response-headers").textContent = "Failed \u2014 " + errorMeta.error;
    this.domNode.querySelector("#af-response-body").textContent = "Failed \u2014 " + errorMeta.error;
    this._switchTab("cors");
  };

  CustomPromptPage.prototype._displayOAuthResults = function (results) {
    var el = this.domNode.querySelector("#af-cors-results");
    var L = ["OAUTH2 DISCOVERY RESULTS", ""];
    var foundAny = false;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      L.push("\u2500\u2500 " + r.url); L.push("");
      if (r.found && r.data) {
        foundAny = true; L.push("  \u2705 FOUND");
        var flds = ["issuer","authorization_endpoint","token_endpoint","userinfo_endpoint","jwks_uri"];
        for (var f = 0; f < flds.length; f++) { if (r.data[flds[f]]) L.push("  " + flds[f] + ": " + r.data[flds[f]]); }
        if (r.data.grant_types_supported) {
          L.push("  Grant types: " + r.data.grant_types_supported.join(", "));
        }
        if (r.data.scopes_supported) L.push("  Scopes: " + r.data.scopes_supported.join(", "));
        L.push(""); L.push("  Full response:"); L.push(JSON.stringify(r.data, null, 2));
      } else if (r.error) { L.push("  \u274C FAILED: " + r.error); }
      else { L.push("  \u274C HTTP " + r.status); }
      L.push("");
    }
    if (!foundAny) {
      L.push("No OAuth2 endpoints found."); L.push("Ask API team for token/auth endpoints.");
    }
    el.textContent = L.join("\n");
    this._switchTab("cors");
    this._setStatus("OAuth2 discovery complete", foundAny ? "success" : "warning");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._addToHistory = function (meta) {
    this.history.unshift({
      timestamp: meta.timestamp || new Date().toISOString(), method: meta.method || "GET",
      url: meta.url, status: meta.status, statusText: meta.statusText || "",
      elapsed: meta.elapsed, error: meta.error || null, isPreflight: meta.isPreflight || false
    });
    if (this.history.length > this.maxHistory) this.history = this.history.slice(0, this.maxHistory);
    this._renderHistory();
  };

  CustomPromptPage.prototype._renderHistory = function () {
    var el = this.domNode.querySelector("#af-history-list");
    this.domNode.querySelector("#af-history-count").textContent = this.history.length;
    if (!this.history.length) { el.textContent = "No requests yet..."; return; }
    var L = ["REQUEST HISTORY (" + this.history.length + ")", ""];
    for (var i = 0; i < this.history.length; i++) {
      var h = this.history[i];
      var icon = h.error ? "\u274C" : h.status >= 200 && h.status < 300 ? "\u2705" : "\u26A0\uFE0F";
      L.push((i+1) + ". " + icon + " " + h.method + (h.isPreflight ? " [PRE]" : "") + " \u2192 " + (h.error ? "FAIL" : h.status) + " (" + h.elapsed + "ms)");
      L.push("   " + h.url);
      L.push("   " + h.timestamp);
      if (h.error) L.push("   " + h.error);
      L.push("");
    }
    el.textContent = L.join("\n");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._switchTab = function (tabName) {
    var tabs = this.domNode.querySelectorAll(".af-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle("af-tab-active", tabs[i].getAttribute("data-tab") === tabName);
    }
    var contents = this.domNode.querySelectorAll(".af-tab-content");
    for (var j = 0; j < contents.length; j++) { contents[j].classList.remove("af-tab-visible"); }
    var t = this.domNode.querySelector("#af-tab-" + tabName);
    if (t) t.classList.add("af-tab-visible");
  };

  CustomPromptPage.prototype._setStatus = function (msg, type) {
    var el = this.domNode.querySelector("#af-status");
    el.textContent = msg;
    el.className = "af-status af-status-" + type;
    console.log("[ApiFetcher] Status [" + type + "]:", msg);
  };

  CustomPromptPage.prototype._clearResults = function () {
    this.domNode.querySelector("#af-cors-results").textContent = "Run a request...";
    this.domNode.querySelector("#af-response-headers").textContent = "No response yet...";
    this.domNode.querySelector("#af-response-body").textContent = "No response yet...";
    this.domNode.querySelector("#af-status").className = "af-status af-hidden";
  };

  CustomPromptPage.prototype._getVal = function (id) {
    var el = this.domNode.querySelector("#" + id); return el ? el.value : "";
  };

  CustomPromptPage.prototype._formatBytes = function (b) {
    if (b == null) return "N/A";
    if (b < 1024) return b + " B"; if (b < 1048576) return (b/1024).toFixed(1) + " KB";
    return (b/1048576).toFixed(2) + " MB";
  };

  CustomPromptPage.prototype._escapeHtml = function (s) {
    var d = document.createElement("div"); d.textContent = s; return d.innerHTML;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COGNOS LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.getParameters = function () { return null; };
  CustomPromptPage.prototype.isInValidState = function () { return true; };

  CustomPromptPage.prototype.destroy = function () {
    console.log("[ApiFetcher] destroy()");
    this.history = []; this.sessionData = {}; this.sessionDataReady = false; this.m_oDataStores = {};
    if (this.domNode && this.domNode.parentNode) this.domNode.parentNode.removeChild(this.domNode);
    this.domNode = null; this.m_oControlHost = null;
  };

  return CustomPromptPage;
});

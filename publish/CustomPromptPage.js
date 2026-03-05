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
  // DRAW
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.draw = function (oControlHost) {
    console.log("[ApiFetcher] 🖼 draw() called");
    this.m_oControlHost = oControlHost;

    var container = oControlHost.container;
    container.innerHTML = "";

    this.domNode = document.createElement("div");
    this.domNode.className = "api-fetcher-container";

    // ── BUILD UI ──────────────────────────────────────────────────────────
    this.domNode.innerHTML = this._buildHTML();
    container.appendChild(this.domNode);

    // ── BIND EVENTS ───────────────────────────────────────────────────────
    this._bindEvents();

    console.log("[ApiFetcher] ✅ UI rendered");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD HTML
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._buildHTML = function () {
    return [
      '<div class="af-wrapper">',

      // ── HEADER ──
      '<div class="af-header">',
      '  <h2 class="af-title">API Fetcher &amp; CORS Analyzer</h2>',
      '  <span class="af-subtitle">Paste URL, analyze response, headers &amp; CORS</span>',
      "</div>",

      // ── INPUT SECTION ──
      '<div class="af-input-section">',

      // URL row
      '<div class="af-input-row">',
      '  <label class="af-label">URL</label>',
      '  <input type="text" id="af-url" class="af-input" placeholder="https://api.example.com/endpoint?param=value" />',
      "</div>",

      // Method row
      '<div class="af-input-row">',
      '  <label class="af-label">Method</label>',
      '  <select id="af-method" class="af-select">',
      '    <option value="GET" selected>GET</option>',
      '    <option value="POST">POST</option>',
      '    <option value="PUT">PUT</option>',
      '    <option value="DELETE">DELETE</option>',
      '    <option value="PATCH">PATCH</option>',
      "  </select>",
      "</div>",

      // Auth header row
      '<div class="af-input-row">',
      '  <label class="af-label">Authorization</label>',
      '  <input type="text" id="af-auth" class="af-input" placeholder="Bearer eyJhbGciOi... (optional)" />',
      "</div>",

      // Custom headers row
      '<div class="af-input-row">',
      '  <label class="af-label">Custom Headers</label>',
      '  <textarea id="af-headers" class="af-textarea" rows="2" placeholder="Header-Name: value (one per line, optional)"></textarea>',
      "</div>",

      // Request body row
      '<div class="af-input-row">',
      '  <label class="af-label">Body</label>',
      '  <textarea id="af-body" class="af-textarea" rows="3" placeholder=\'{"key": "value"} (for POST/PUT/PATCH, optional)\'></textarea>',
      "</div>",

      // Buttons
      '<div class="af-buttons">',
      '  <button id="af-btn-fetch" class="af-btn af-btn-primary">Fetch</button>',
      '  <button id="af-btn-preflight" class="af-btn af-btn-secondary">Preflight (OPTIONS)</button>',
      '  <button id="af-btn-oauth" class="af-btn af-btn-secondary">Discover OAuth2</button>',
      '  <button id="af-btn-clear" class="af-btn af-btn-neutral">Clear</button>',
      "</div>",

      "</div>", // af-input-section

      // ── STATUS BAR ──
      '<div id="af-status" class="af-status af-hidden"></div>',

      // ── RESULTS TABS ──
      '<div class="af-results">',

      '<div class="af-tabs">',
      '  <button class="af-tab af-tab-active" data-tab="cors">CORS Analysis</button>',
      '  <button class="af-tab" data-tab="headers">Response Headers</button>',
      '  <button class="af-tab" data-tab="body">Response Body</button>',
      '  <button class="af-tab" data-tab="history">History (<span id="af-history-count">0</span>)</button>',
      "</div>",

      // Tab: CORS Analysis
      '<div id="af-tab-cors" class="af-tab-content af-tab-visible">',
      '  <div id="af-cors-results" class="af-pre">Run a request to see CORS analysis...</div>',
      "</div>",

      // Tab: Response Headers
      '<div id="af-tab-headers" class="af-tab-content">',
      '  <div id="af-response-headers" class="af-pre">No response yet...</div>',
      "</div>",

      // Tab: Response Body
      '<div id="af-tab-body" class="af-tab-content">',
      '  <div id="af-response-body" class="af-pre">No response yet...</div>',
      "</div>",

      // Tab: History
      '<div id="af-tab-history" class="af-tab-content">',
      '  <div id="af-history-list" class="af-pre">No requests yet...</div>',
      "</div>",

      "</div>", // af-results

      "</div>", // af-wrapper
    ].join("\n");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BIND EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._bindEvents = function () {
    var self = this;
    var root = this.domNode;

    // Fetch button
    root.querySelector("#af-btn-fetch").addEventListener("click", function () {
      self._doFetch();
    });

    // Preflight button
    root.querySelector("#af-btn-preflight").addEventListener("click", function () {
      self._doPreflight();
    });

    // OAuth2 discovery button
    root.querySelector("#af-btn-oauth").addEventListener("click", function () {
      self._doOAuthDiscovery();
    });

    // Clear button
    root.querySelector("#af-btn-clear").addEventListener("click", function () {
      self._clearResults();
    });

    // Tab switching
    var tabs = root.querySelectorAll(".af-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (e) {
        self._switchTab(e.target.getAttribute("data-tab"));
      });
    }

    // Enter key on URL input
    root.querySelector("#af-url").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        self._doFetch();
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FETCH
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doFetch = function () {
    var self = this;
    var url = this._getVal("af-url").trim();

    if (!url) {
      this._setStatus("Please enter a URL", "error");
      return;
    }

    var method = this._getVal("af-method");
    var authHeader = this._getVal("af-auth").trim();
    var customHeadersRaw = this._getVal("af-headers").trim();
    var bodyRaw = this._getVal("af-body").trim();

    // Build headers
    var headers = {};
    headers["Accept"] = "application/json";

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    if (customHeadersRaw) {
      var lines = customHeadersRaw.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var colonIdx = lines[i].indexOf(":");
        if (colonIdx > 0) {
          var key = lines[i].substring(0, colonIdx).trim();
          var val = lines[i].substring(colonIdx + 1).trim();
          if (key) headers[key] = val;
        }
      }
    }

    // Build fetch options
    var fetchOptions = {
      method: method,
      headers: headers,
      mode: "cors",
    };

    // Add body for non-GET methods
    if (method !== "GET" && method !== "DELETE" && bodyRaw) {
      fetchOptions.body = bodyRaw;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }

    this._setStatus("Fetching " + method + " " + url + " ...", "loading");

    console.log("[ApiFetcher] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[ApiFetcher] 🚀 FETCH REQUEST");
    console.log("[ApiFetcher] URL:", url);
    console.log("[ApiFetcher] Method:", method);
    console.log("[ApiFetcher] Headers:", JSON.stringify(headers, null, 2));
    if (fetchOptions.body) console.log("[ApiFetcher] Body:", fetchOptions.body);

    var startTime = performance.now();

    fetch(url, fetchOptions)
      .then(function (response) {
        var elapsed = Math.round(performance.now() - startTime);

        console.log("[ApiFetcher] ✅ Response received in " + elapsed + "ms");
        console.log("[ApiFetcher] Status:", response.status, response.statusText);
        console.log("[ApiFetcher] Response type:", response.type);

        // Extract ALL headers
        var responseHeaders = {};
        response.headers.forEach(function (value, key) {
          responseHeaders[key] = value;
          console.log("[ApiFetcher] Header: " + key + ": " + value);
        });

        // Store metadata before consuming body
        var meta = {
          url: url,
          method: method,
          status: response.status,
          statusText: response.statusText,
          type: response.type,
          redirected: response.redirected,
          finalUrl: response.url,
          headers: responseHeaders,
          elapsed: elapsed,
          requestHeaders: headers,
          timestamp: new Date().toISOString(),
        };

        // Read body as text first
        return response.text().then(function (bodyText) {
          meta.bodyText = bodyText;
          meta.bodyLength = bodyText.length;

          // Try parse as JSON
          try {
            meta.bodyJSON = JSON.parse(bodyText);
            meta.isJSON = true;
          } catch (e) {
            meta.isJSON = false;
          }

          return meta;
        });
      })
      .then(function (meta) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;

        console.log("[ApiFetcher] 📊 Full response metadata:", meta);

        self._displayResults(meta);
        self._addToHistory(meta);
        self._setStatus(
          meta.method + " " + meta.status + " " + meta.statusText + " — " + meta.elapsed + "ms — " + self._formatBytes(meta.bodyLength),
          meta.status >= 200 && meta.status < 300 ? "success" : "warning"
        );
      })
      .catch(function (error) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;

        var elapsed = Math.round(performance.now() - startTime);

        console.error("[ApiFetcher] ❌ FETCH FAILED");
        console.error("[ApiFetcher] Error:", error.message);
        console.error("[ApiFetcher] Error type:", error.name);
        console.error("[ApiFetcher] Full error:", error);

        var errorMeta = {
          url: url,
          method: method,
          status: 0,
          statusText: "NETWORK ERROR",
          error: error.message,
          errorName: error.name,
          elapsed: elapsed,
          timestamp: new Date().toISOString(),
          requestHeaders: headers,
        };

        self._displayError(errorMeta);
        self._addToHistory(errorMeta);
        self._setStatus("FAILED: " + error.message + " — " + elapsed + "ms", "error");
      });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFLIGHT (OPTIONS) TEST
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doPreflight = function () {
    var self = this;
    var url = this._getVal("af-url").trim();

    if (!url) {
      this._setStatus("Please enter a URL for preflight test", "error");
      return;
    }

    this._setStatus("Sending OPTIONS preflight to " + url + " ...", "loading");

    console.log("[ApiFetcher] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[ApiFetcher] 🔍 PREFLIGHT (OPTIONS) REQUEST");
    console.log("[ApiFetcher] URL:", url);

    var startTime = performance.now();

    fetch(url, {
      method: "OPTIONS",
      mode: "cors",
      headers: {
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    })
      .then(function (response) {
        var elapsed = Math.round(performance.now() - startTime);

        var responseHeaders = {};
        response.headers.forEach(function (value, key) {
          responseHeaders[key] = value;
        });

        var meta = {
          url: url,
          method: "OPTIONS",
          status: response.status,
          statusText: response.statusText,
          type: response.type,
          headers: responseHeaders,
          elapsed: elapsed,
          timestamp: new Date().toISOString(),
          isPreflight: true,
        };

        return response.text().then(function (bodyText) {
          meta.bodyText = bodyText;
          return meta;
        });
      })
      .then(function (meta) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        self._displayResults(meta);
        self._addToHistory(meta);
        self._setStatus("OPTIONS " + meta.status + " " + meta.statusText + " — " + meta.elapsed + "ms", "success");
      })
      .catch(function (error) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        var elapsed = Math.round(performance.now() - startTime);

        console.error("[ApiFetcher] ❌ PREFLIGHT FAILED:", error.message);

        var errorMeta = {
          url: url,
          method: "OPTIONS",
          status: 0,
          error: error.message,
          elapsed: elapsed,
          timestamp: new Date().toISOString(),
          isPreflight: true,
        };

        self._displayError(errorMeta);
        self._addToHistory(errorMeta);
        self._setStatus("PREFLIGHT FAILED: " + error.message, "error");
      });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OAUTH2 DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._doOAuthDiscovery = function () {
    var self = this;
    var url = this._getVal("af-url").trim();

    if (!url) {
      this._setStatus("Please enter a URL for OAuth2 discovery", "error");
      return;
    }

    // Extract base URL
    var baseUrl;
    try {
      var parsed = new URL(url);
      baseUrl = parsed.origin;
    } catch (e) {
      this._setStatus("Invalid URL: " + e.message, "error");
      return;
    }

    var discoveryUrls = [
      baseUrl + "/.well-known/openid-configuration",
      baseUrl + "/.well-known/oauth-authorization-server",
    ];

    this._setStatus("Discovering OAuth2 endpoints on " + baseUrl + " ...", "loading");

    console.log("[ApiFetcher] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[ApiFetcher] 🔑 OAUTH2 DISCOVERY");
    console.log("[ApiFetcher] Base URL:", baseUrl);
    console.log("[ApiFetcher] Trying:", discoveryUrls);

    var results = [];
    var completed = 0;

    discoveryUrls.forEach(function (discoveryUrl, idx) {
      fetch(discoveryUrl, { mode: "cors" })
        .then(function (response) {
          console.log("[ApiFetcher] Discovery [" + idx + "] " + discoveryUrl + " → " + response.status);
          return response.text().then(function (text) {
            var json = null;
            try {
              json = JSON.parse(text);
            } catch (e) {
              /* not JSON */
            }
            results[idx] = {
              url: discoveryUrl,
              status: response.status,
              found: response.status === 200 && json !== null,
              data: json,
              raw: text,
            };
          });
        })
        .catch(function (error) {
          console.log("[ApiFetcher] Discovery [" + idx + "] FAILED:", error.message);
          results[idx] = {
            url: discoveryUrl,
            status: 0,
            found: false,
            error: error.message,
          };
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
    // ── CORS Analysis ──
    this._displayCORSAnalysis(meta);

    // ── Response Headers ──
    this._displayResponseHeaders(meta);

    // ── Response Body ──
    this._displayResponseBody(meta);

    // Switch to CORS tab
    this._switchTab("cors");
  };

  // ── CORS ANALYSIS ──────────────────────────────────────────────────────
  CustomPromptPage.prototype._displayCORSAnalysis = function (meta) {
    var el = this.domNode.querySelector("#af-cors-results");
    var lines = [];

    lines.push("═══════════════════════════════════════════════════");
    lines.push("  CORS ANALYSIS — " + meta.method + " " + meta.url);
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");

    // Status overview
    lines.push("▸ HTTP Status:     " + meta.status + " " + (meta.statusText || ""));
    lines.push("▸ Response Type:   " + (meta.type || "N/A"));
    if (meta.redirected) {
      lines.push("▸ Redirected:      YES → " + meta.finalUrl);
    }
    if (meta.elapsed !== undefined) {
      lines.push("▸ Time:            " + meta.elapsed + "ms");
    }
    lines.push("");

    if (meta.error) {
      lines.push("╔═══════════════════════════════════════════════╗");
      lines.push("║  ❌ REQUEST FAILED — LIKELY CORS BLOCKED      ║");
      lines.push("╚═══════════════════════════════════════════════╝");
      lines.push("");
      lines.push("Error: " + meta.error);
      lines.push("");
      lines.push("This typically means:");
      lines.push("  1. Server has NO Access-Control-Allow-Origin header");
      lines.push("  2. Server does not allow this origin");
      lines.push("  3. Server is down or unreachable");
      lines.push("  4. DNS resolution failed");
      lines.push("  5. SSL/TLS certificate issue");
      lines.push("");
      lines.push("NEXT STEPS:");
      lines.push("  • Try the Preflight (OPTIONS) button");
      lines.push("  • Check browser DevTools → Network tab for more detail");
      lines.push("  • Test the URL directly in browser address bar");
      lines.push("  • Ask API team about CORS configuration");
    } else if (meta.type === "opaque") {
      lines.push("╔═══════════════════════════════════════════════╗");
      lines.push("║  ⚠️  OPAQUE RESPONSE (no-cors mode)           ║");
      lines.push("╚═══════════════════════════════════════════════╝");
      lines.push("");
      lines.push("Response was received but is not readable.");
      lines.push("This means CORS headers are missing/misconfigured.");
    } else {
      lines.push("── CORS Headers ─────────────────────────────────");
      lines.push("");

      var corsHeaders = [
        { key: "access-control-allow-origin", label: "Allow-Origin", critical: true },
        { key: "access-control-allow-methods", label: "Allow-Methods", critical: true },
        { key: "access-control-allow-headers", label: "Allow-Headers", critical: true },
        { key: "access-control-allow-credentials", label: "Allow-Credentials", critical: false },
        { key: "access-control-expose-headers", label: "Expose-Headers", critical: false },
        { key: "access-control-max-age", label: "Max-Age", critical: false },
      ];

      var hasCors = false;
      for (var i = 0; i < corsHeaders.length; i++) {
        var ch = corsHeaders[i];
        var value = meta.headers ? meta.headers[ch.key] : undefined;
        if (value !== undefined) {
          hasCors = true;
          lines.push("  ✅ " + ch.label + ": " + value);
        } else if (ch.critical) {
          lines.push("  ❌ " + ch.label + ": NOT PRESENT");
        } else {
          lines.push("  ── " + ch.label + ": not set");
        }
      }

      lines.push("");

      if (hasCors) {
        lines.push("╔═══════════════════════════════════════════════╗");
        lines.push("║  ✅ CORS HEADERS DETECTED                     ║");
        lines.push("╚═══════════════════════════════════════════════╝");
      } else {
        lines.push("╔═══════════════════════════════════════════════╗");
        lines.push("║  ⚠️  NO CORS HEADERS IN RESPONSE              ║");
        lines.push("╚═══════════════════════════════════════════════╝");
        lines.push("");
        lines.push("NOTE: If the request succeeded (2xx) without CORS headers,");
        lines.push("the API might be on the same origin as Cognos.");
      }

      // ── Auth Analysis ──
      lines.push("");
      lines.push("── Authentication Analysis ──────────────────────");
      lines.push("");

      var wwwAuth = meta.headers ? meta.headers["www-authenticate"] : undefined;
      if (wwwAuth) {
        lines.push("  WWW-Authenticate: " + wwwAuth);
        lines.push("");
        if (wwwAuth.toLowerCase().indexOf("bearer") !== -1) {
          lines.push("  → Server expects OAuth2 Bearer token");
          lines.push("  → Try the 'Discover OAuth2' button");
        }
        if (wwwAuth.toLowerCase().indexOf("basic") !== -1) {
          lines.push("  → Server accepts Basic authentication");
        }
        if (wwwAuth.toLowerCase().indexOf("negotiate") !== -1) {
          lines.push("  → Server uses Kerberos/SPNEGO (Windows auth)");
        }
      } else if (meta.status === 401) {
        lines.push("  ⚠️  401 Unauthorized but no WWW-Authenticate header");
        lines.push("  → Try adding Authorization header manually");
      } else if (meta.status === 403) {
        lines.push("  ⚠️  403 Forbidden — you authenticated but lack permissions");
      } else {
        lines.push("  No authentication challenges detected in response.");
      }

      // ── Content Analysis ──
      lines.push("");
      lines.push("── Content Analysis ────────────────────────────");
      lines.push("");
      var contentType = meta.headers ? meta.headers["content-type"] : undefined;
      lines.push("  Content-Type: " + (contentType || "not specified"));
      lines.push("  Body size:    " + (meta.bodyLength !== undefined ? this._formatBytes(meta.bodyLength) : "N/A"));
      lines.push("  Is JSON:      " + (meta.isJSON ? "YES" : "NO"));
    }

    el.textContent = lines.join("\n");

    // Also log full analysis to console
    console.log("[ApiFetcher] 📊 CORS ANALYSIS:");
    console.log(lines.join("\n"));
  };

  // ── RESPONSE HEADERS ──────────────────────────────────────────────────
  CustomPromptPage.prototype._displayResponseHeaders = function (meta) {
    var el = this.domNode.querySelector("#af-response-headers");
    var lines = [];

    lines.push("═══════════════════════════════════════════════════");
    lines.push("  RESPONSE HEADERS");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push("HTTP " + meta.status + " " + (meta.statusText || ""));
    lines.push("Response type: " + (meta.type || "N/A"));
    lines.push("");

    if (meta.headers) {
      var keys = Object.keys(meta.headers).sort();
      for (var i = 0; i < keys.length; i++) {
        var prefix = "  ";
        // Highlight CORS and auth headers
        if (keys[i].indexOf("access-control") === 0) {
          prefix = "★ ";
        } else if (keys[i] === "www-authenticate" || keys[i] === "authorization") {
          prefix = "🔑";
        }
        lines.push(prefix + keys[i] + ": " + meta.headers[keys[i]]);
      }
    } else {
      lines.push("  (no headers available — request may have failed)");
    }

    lines.push("");
    lines.push("── REQUEST HEADERS SENT ────────────────────────");
    lines.push("");
    if (meta.requestHeaders) {
      var reqKeys = Object.keys(meta.requestHeaders);
      for (var j = 0; j < reqKeys.length; j++) {
        lines.push("  " + reqKeys[j] + ": " + meta.requestHeaders[reqKeys[j]]);
      }
    }

    el.textContent = lines.join("\n");
  };

  // ── RESPONSE BODY ──────────────────────────────────────────────────────
  CustomPromptPage.prototype._displayResponseBody = function (meta) {
    var el = this.domNode.querySelector("#af-response-body");

    if (!meta.bodyText && !meta.error) {
      el.textContent = "(empty response body)";
      return;
    }

    if (meta.error) {
      el.textContent = "Request failed: " + meta.error;
      return;
    }

    if (meta.isJSON) {
      try {
        el.textContent = JSON.stringify(meta.bodyJSON, null, 2);
      } catch (e) {
        el.textContent = meta.bodyText;
      }
    } else {
      el.textContent = meta.bodyText;
    }

    // Truncation warning
    if (meta.bodyLength > 50000) {
      el.textContent = "⚠️ Large response (" + this._formatBytes(meta.bodyLength) + ") — showing first 50KB\n\n" + meta.bodyText.substring(0, 50000) + "\n\n... [TRUNCATED]";
    }

    console.log("[ApiFetcher] 📄 Response body length:", meta.bodyLength, "bytes");
    if (meta.isJSON) {
      console.log("[ApiFetcher] 📄 Parsed JSON:", meta.bodyJSON);
    }
  };

  // ── DISPLAY ERROR ──────────────────────────────────────────────────────
  CustomPromptPage.prototype._displayError = function (errorMeta) {
    this._displayCORSAnalysis(errorMeta);

    var headersEl = this.domNode.querySelector("#af-response-headers");
    headersEl.textContent = "Request failed — no response headers available.\n\nError: " + errorMeta.error + "\nError type: " + (errorMeta.errorName || "N/A");

    var bodyEl = this.domNode.querySelector("#af-response-body");
    bodyEl.textContent = "Request failed — no response body.\n\nError: " + errorMeta.error;

    this._switchTab("cors");
  };

  // ── DISPLAY OAUTH2 RESULTS ─────────────────────────────────────────────
  CustomPromptPage.prototype._displayOAuthResults = function (results) {
    var el = this.domNode.querySelector("#af-cors-results");
    var lines = [];

    lines.push("═══════════════════════════════════════════════════");
    lines.push("  OAUTH2 DISCOVERY RESULTS");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");

    var foundAny = false;

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      lines.push("── " + r.url);
      lines.push("");

      if (r.found && r.data) {
        foundAny = true;
        lines.push("  ✅ FOUND — OAuth2/OIDC Configuration");
        lines.push("");

        // Key endpoints
        var fields = [
          { key: "issuer", label: "Issuer" },
          { key: "authorization_endpoint", label: "Authorization Endpoint" },
          { key: "token_endpoint", label: "Token Endpoint" },
          { key: "userinfo_endpoint", label: "UserInfo Endpoint" },
          { key: "jwks_uri", label: "JWKS URI" },
          { key: "revocation_endpoint", label: "Revocation Endpoint" },
          { key: "introspection_endpoint", label: "Introspection Endpoint" },
        ];

        for (var f = 0; f < fields.length; f++) {
          if (r.data[fields[f].key]) {
            lines.push("  " + fields[f].label + ":");
            lines.push("    " + r.data[fields[f].key]);
          }
        }

        lines.push("");

        // Grant types
        if (r.data.grant_types_supported) {
          lines.push("  Supported Grant Types:");
          for (var g = 0; g < r.data.grant_types_supported.length; g++) {
            var grant = r.data.grant_types_supported[g];
            var note = "";
            if (grant === "authorization_code") note = " ← (browser-friendly with PKCE)";
            if (grant === "client_credentials") note = " ← (server-to-server only)";
            if (grant === "implicit") note = " ← (deprecated, avoid)";
            if (grant === "password") note = " ← (deprecated, avoid)";
            lines.push("    • " + grant + note);
          }
          lines.push("");
        }

        // Response types
        if (r.data.response_types_supported) {
          lines.push("  Supported Response Types:");
          lines.push("    " + r.data.response_types_supported.join(", "));
          lines.push("");
        }

        // Scopes
        if (r.data.scopes_supported) {
          lines.push("  Supported Scopes:");
          lines.push("    " + r.data.scopes_supported.join(", "));
          lines.push("");
        }

        // Full JSON dump
        lines.push("  ── Full Discovery Response ──");
        lines.push(JSON.stringify(r.data, null, 2));
      } else if (r.error) {
        lines.push("  ❌ FAILED — " + r.error);
        lines.push("  (CORS may be blocking this endpoint too)");
      } else {
        lines.push("  ❌ Not found (HTTP " + r.status + ")");
      }
      lines.push("");
    }

    if (!foundAny) {
      lines.push("╔═══════════════════════════════════════════════╗");
      lines.push("║  No OAuth2 discovery endpoints found          ║");
      lines.push("╚═══════════════════════════════════════════════╝");
      lines.push("");
      lines.push("This could mean:");
      lines.push("  1. OAuth2 server is on a different domain");
      lines.push("  2. Discovery endpoints are CORS-blocked");
      lines.push("  3. Custom OAuth2 implementation without standard endpoints");
      lines.push("");
      lines.push("Ask the API team for:");
      lines.push("  • Token endpoint URL");
      lines.push("  • Authorization endpoint URL");
      lines.push("  • Required grant type / flow");
      lines.push("  • Client ID (if applicable)");
    }

    el.textContent = lines.join("\n");
    this._switchTab("cors");
    this._setStatus("OAuth2 discovery complete", foundAny ? "success" : "warning");

    console.log("[ApiFetcher] 🔑 OAuth2 Discovery Results:", results);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._addToHistory = function (meta) {
    this.history.unshift({
      timestamp: meta.timestamp || new Date().toISOString(),
      method: meta.method || "GET",
      url: meta.url,
      status: meta.status,
      statusText: meta.statusText || "",
      elapsed: meta.elapsed,
      error: meta.error || null,
      type: meta.type || null,
      isPreflight: meta.isPreflight || false,
    });

    // Trim
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    this._renderHistory();
  };

  CustomPromptPage.prototype._renderHistory = function () {
    var el = this.domNode.querySelector("#af-history-list");
    var countEl = this.domNode.querySelector("#af-history-count");
    countEl.textContent = this.history.length;

    if (this.history.length === 0) {
      el.textContent = "No requests yet...";
      return;
    }

    var lines = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("  REQUEST HISTORY (" + this.history.length + " entries)");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");

    for (var i = 0; i < this.history.length; i++) {
      var h = this.history[i];
      var statusIcon = h.error ? "❌" : h.status >= 200 && h.status < 300 ? "✅" : "⚠️";
      var tag = h.isPreflight ? " [PREFLIGHT]" : "";

      lines.push(
        (i + 1) + ". " + statusIcon + " " + h.method + tag + " → " + (h.error ? "FAILED" : h.status + " " + h.statusText) + " (" + h.elapsed + "ms)"
      );
      lines.push("   " + h.url);
      lines.push("   " + h.timestamp);
      if (h.error) {
        lines.push("   Error: " + h.error);
      }
      lines.push("");
    }

    el.textContent = lines.join("\n");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype._switchTab = function (tabName) {
    var root = this.domNode;

    // Deactivate all tabs
    var tabs = root.querySelectorAll(".af-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove("af-tab-active");
      if (tabs[i].getAttribute("data-tab") === tabName) {
        tabs[i].classList.add("af-tab-active");
      }
    }

    // Hide all content
    var contents = root.querySelectorAll(".af-tab-content");
    for (var j = 0; j < contents.length; j++) {
      contents[j].classList.remove("af-tab-visible");
    }

    // Show target
    var target = root.querySelector("#af-tab-" + tabName);
    if (target) {
      target.classList.add("af-tab-visible");
    }
  };

  CustomPromptPage.prototype._setStatus = function (message, type) {
    var el = this.domNode.querySelector("#af-status");
    el.textContent = message;
    el.className = "af-status af-status-" + type;
    console.log("[ApiFetcher] Status [" + type + "]:", message);
  };

  CustomPromptPage.prototype._clearResults = function () {
    this.domNode.querySelector("#af-cors-results").textContent = "Run a request to see CORS analysis...";
    this.domNode.querySelector("#af-response-headers").textContent = "No response yet...";
    this.domNode.querySelector("#af-response-body").textContent = "No response yet...";
    this.domNode.querySelector("#af-status").className = "af-status af-hidden";
    console.log("[ApiFetcher] 🧹 Results cleared");
  };

  CustomPromptPage.prototype._getVal = function (id) {
    var el = this.domNode.querySelector("#" + id);
    return el ? el.value : "";
  };

  CustomPromptPage.prototype._formatBytes = function (bytes) {
    if (bytes === undefined || bytes === null) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COGNOS LIFECYCLE (passthrough for compatibility)
  // ═══════════════════════════════════════════════════════════════════════════
  CustomPromptPage.prototype.getParameters = function (oControlHost) {
    console.log("[ApiFetcher] getParameters() called — returning null (no params)");
    return null;
  };

  CustomPromptPage.prototype.isInValidState = function (oControlHost) {
    return true;
  };

  CustomPromptPage.prototype.setData = function (oControlHost, oDataStore) {
    console.log("[ApiFetcher] setData() called — ignored (no DataStores needed)");
  };

  CustomPromptPage.prototype.destroy = function (oControlHost) {
    console.log("[ApiFetcher] 🧨 destroy() called — cleaning up");
    this.history = [];
    if (this.domNode && this.domNode.parentNode) {
      this.domNode.parentNode.removeChild(this.domNode);
    }
    this.domNode = null;
    this.m_oControlHost = null;
  };

  return CustomPromptPage;
});

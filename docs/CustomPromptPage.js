define([], function () {
  "use strict";
  console.log("[ApiFetcher] === Module Loaded ===");

  function CustomPromptPage() {
    this.domNode = null;
    this.m_oControlHost = null;
    this.m_oDataStores = {};
    this.sessionData = {};
    this.sessionDataReady = false;
    this.history = [];
    this.maxHistory = 20;
    this.oauthToken = null;
    this.oauthTokenExpiry = null;
    this.oauthPopup = null;
    this.oauthState = null;
    this.codeVerifier = null;
    this.messageHandler = null;
    this.config = {};
  }

  // ═══════════════════════ LIFECYCLE ═══════════════════════
  CustomPromptPage.prototype.initialize = function (oControlHost, fnDoneInitializing) {
    this.m_oControlHost = oControlHost;
    this.config = oControlHost.configuration || {};
    this.domNode = document.createElement("div");
    this.domNode.className = "api-fetcher-container";
    fnDoneInitializing();
  };

  CustomPromptPage.prototype.setData = function (oControlHost, oDataStore) {
    if (!oDataStore) return;
    this.m_oDataStores[oDataStore.name] = oDataStore;
    var dsName = this.config.sessionDataStore || "Session_Data";
    if (oDataStore.name === dsName) this._extractSessionData(oDataStore);
  };

  CustomPromptPage.prototype._extractSessionData = function (ds) {
    this.sessionData = {};
    if (ds.rowCount === 0) return;
    for (var c = 0; c < ds.columnNames.length; c++) {
      this.sessionData[ds.columnNames[c]] = {
        raw: ds.getCellValue(0, c),
        formatted: ds.getFormattedCellValue(0, c),
        index: c,
      };
    }
    this.sessionDataReady = true;
    if (this.domNode && this.domNode.querySelector("#af-session-tbody")) this._renderSessionInfo();
  };

  CustomPromptPage.prototype.draw = function (oControlHost) {
    this.m_oControlHost = oControlHost;
    this.config = oControlHost.configuration || {};
    oControlHost.container.innerHTML = "";
    this.domNode = document.createElement("div");
    this.domNode.className = "api-fetcher-container";
    this.domNode.innerHTML = this._buildHTML();
    oControlHost.container.appendChild(this.domNode);
    if (this.sessionDataReady) this._renderSessionInfo();
    this._applyConfigDefaults();
    this._bindEvents();
  };

  // ═══════════════════════ APPLY CONFIG DEFAULTS ═══════════════════════
  CustomPromptPage.prototype._applyConfigDefaults = function () {
    // Callback URL from config
    if (this.config.callbackUrl) {
      this._setField("af-oauth-redirect", this.config.callbackUrl);
    }
    // OAuth preset from config
    var op = this.config.oauthPreset;
    if (op) {
      if (op.authorizeUrl) this._setField("af-oauth-auth-url", op.authorizeUrl);
      if (op.tokenUrl) this._setField("af-oauth-token-url", op.tokenUrl);
      if (op.clientId) this._setField("af-oauth-client-id", op.clientId);
      if (op.scope) this._setField("af-oauth-scope", op.scope);
    }
    // FFP preset — populate environment dropdown
    var fp = this.config.ffpPreset;
    if (fp && fp.baseUrls) {
      var sel = this.domNode.querySelector("#af-ffp-env");
      if (sel) {
        sel.innerHTML = "";
        var envs = Object.keys(fp.baseUrls);
        for (var i = 0; i < envs.length; i++) {
          var opt = document.createElement("option");
          opt.value = envs[i];
          opt.textContent = envs[i];
          sel.appendChild(opt);
        }
      }
    }
    console.log("[ApiFetcher] Config defaults applied");
  };

  // ═══════════════════════ BUILD HTML ═══════════════════════
  CustomPromptPage.prototype._buildHTML = function () {
    return [
      '<div class="af-wrapper">',

      // ══ PANEL 1: SESSION ══
      '<div id="af-session-panel" class="af-panel af-panel-blue">',
      '<div class="af-panel-header"><h3 class="af-panel-title">Session &amp; User Context</h3>',
      '  <span class="af-badge" id="af-session-badge">Waiting...</span>',
      '  <button class="af-toggle" id="af-session-toggle">\u25BC</button></div>',
      '<div class="af-panel-body" id="af-session-body">',
      '  <table class="af-session-table"><thead><tr>',
      '    <th class="af-th">#</th><th class="af-th">Data Item</th><th class="af-th">Value</th><th class="af-th">Formatted</th>',
      '  </tr></thead><tbody id="af-session-tbody">',
      '    <tr><td colspan="4" class="af-empty">Waiting for DataStore... <code>"sessionDataStore":"Session_Data"</code></td></tr>',
      "  </tbody></table>",
      '  <div class="af-note" id="af-session-note"></div>',
      "</div></div>",

      // ══ PANEL 2: OAUTH2 PKCE ══
      '<div id="af-oauth-panel" class="af-panel af-panel-orange">',
      '<div class="af-panel-header"><h3 class="af-panel-title">OAuth2 PKCE Authentication</h3>',
      '  <span class="af-badge" id="af-oauth-badge">No Token</span>',
      '  <button class="af-toggle" id="af-oauth-toggle">\u25BC</button></div>',
      '<div class="af-panel-body" id="af-oauth-body">',

      '<div class="af-row"><label class="af-lbl">Authorize URL</label><input type="text" id="af-oauth-auth-url" class="af-inp" placeholder="https://idp.example.com/.../auth" /></div>',
      '<div class="af-row"><label class="af-lbl">Token URL</label><input type="text" id="af-oauth-token-url" class="af-inp" placeholder="https://idp.example.com/.../token" /></div>',
      '<div class="af-row"><label class="af-lbl">Client ID</label><input type="text" id="af-oauth-client-id" class="af-inp" placeholder="your-client-id" /></div>',
      '<div class="af-row"><label class="af-lbl">Redirect URI</label><input type="text" id="af-oauth-redirect" class="af-inp" placeholder="https://your-site/callback.html" /></div>',
      '<div class="af-row"><label class="af-lbl">Scope</label><input type="text" id="af-oauth-scope" class="af-inp" value="openid" /></div>',
      '<div class="af-row"><label class="af-lbl">Challenge</label><select id="af-oauth-challenge" class="af-sel"><option value="S256" selected>S256</option><option value="plain">plain</option></select></div>',

      '<div class="af-btns" style="padding-left:108px;">',
      '  <button id="af-btn-popup-test" class="af-btn af-btn-n">1. Test Popup</button>',
      '  <button id="af-btn-oauth-login" class="af-btn af-btn-p">2. Start OAuth Login</button>',
      '  <button id="af-btn-oauth-clear" class="af-btn af-btn-n">Clear Token</button></div>',

      '<div id="af-oauth-status" class="af-status af-hidden"></div>',
      '<div id="af-oauth-token-box" class="af-token-box af-hidden">',
      '  <div class="af-token-hdr"><strong>Token</strong><span id="af-oauth-expiry"></span>',
      '    <button id="af-btn-use-token" class="af-btn af-btn-s" style="padding:3px 10px;font-size:11px;">Use in Fetcher \u2193</button></div>',
      '  <div id="af-oauth-token-preview" class="af-pre" style="max-height:80px;min-height:40px;font-size:11px;"></div>',
      "</div>",

      "</div></div>",

      // ══ PANEL 3: API FETCHER ══
      '<div class="af-panel af-panel-steel">',
      '<div class="af-panel-header">',
      '  <h3 class="af-panel-title">API Fetcher &amp; CORS Analyzer</h3>',
      '  <span class="af-subtitle">Paste URL, analyze response, headers &amp; CORS</span></div>',
      '<div class="af-panel-body">',

      // FFP preset row (only visible if config has ffpPreset)
      '<div class="af-row" id="af-ffp-row">',
      '  <label class="af-lbl">API Preset</label>',
      '  <select id="af-ffp-env" class="af-sel" style="min-width:80px;"><option value="">—</option></select>',
      '  <select id="af-ffp-auth-mode" class="af-sel" style="min-width:120px;"><option value="bearer">Bearer Token</option><option value="cookie">Cookie</option></select>',
      '  <button id="af-btn-ffp-fill" class="af-btn af-btn-s">Fill</button>',
      "</div>",

      '<div class="af-row"><label class="af-lbl">URL</label><input type="text" id="af-url" class="af-inp" placeholder="https://api.example.com/endpoint" /></div>',
      '<div class="af-row"><label class="af-lbl">Method</label><select id="af-method" class="af-sel"><option value="GET">GET</option><option value="POST" selected>POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option><option value="PATCH">PATCH</option></select></div>',

      // Auth method
      '<div class="af-row"><label class="af-lbl">Auth Type</label>',
      '  <select id="af-auth-type" class="af-sel" style="min-width:140px;"><option value="bearer">Bearer Token</option><option value="cookie">Cookie (name=value)</option><option value="none">None</option></select></div>',
      '<div class="af-row"><label class="af-lbl" id="af-auth-label">Authorization</label><input type="text" id="af-auth" class="af-inp" placeholder="Token or Cookie value" /></div>',

      '<div class="af-row"><label class="af-lbl">Custom Headers</label><textarea id="af-headers" class="af-ta" rows="2" placeholder="Header-Name: value (one per line)"></textarea></div>',
      '<div class="af-row"><label class="af-lbl">Body</label><textarea id="af-body" class="af-ta" rows="3" placeholder=\'{"key":"value"} (POST/PUT/PATCH)\'></textarea></div>',

      '<div class="af-btns">',
      '  <button id="af-btn-fetch" class="af-btn af-btn-p">Fetch</button>',
      '  <button id="af-btn-preflight" class="af-btn af-btn-s">Preflight (OPTIONS)</button>',
      '  <button id="af-btn-discover" class="af-btn af-btn-s">Discover OAuth2</button>',
      '  <button id="af-btn-clear" class="af-btn af-btn-n">Clear</button></div>',

      "</div></div>",

      // ══ STATUS + RESULTS ══
      '<div id="af-status" class="af-status af-hidden"></div>',
      '<div class="af-results"><div class="af-tabs">',
      '  <button class="af-tab af-tab-active" data-tab="cors">CORS Analysis</button>',
      '  <button class="af-tab" data-tab="headers">Response Headers</button>',
      '  <button class="af-tab" data-tab="body">Response Body</button>',
      '  <button class="af-tab" data-tab="history">History (<span id="af-history-count">0</span>)</button></div>',
      '<div id="af-tab-cors" class="af-tab-content af-tab-visible"><div id="af-cors-results" class="af-pre">Run a request...</div></div>',
      '<div id="af-tab-headers" class="af-tab-content"><div id="af-resp-headers" class="af-pre">No response yet...</div></div>',
      '<div id="af-tab-body" class="af-tab-content"><div id="af-resp-body" class="af-pre">No response yet...</div></div>',
      '<div id="af-tab-history" class="af-tab-content"><div id="af-hist-list" class="af-pre">No requests yet...</div></div>',
      "</div>",

      "</div>",
    ].join("\n");
  };

  // ═══════════════════════ RENDER SESSION ═══════════════════════
  CustomPromptPage.prototype._renderSessionInfo = function () {
    var tbody = this.domNode.querySelector("#af-session-tbody"),
      badge = this.domNode.querySelector("#af-session-badge"),
      note = this.domNode.querySelector("#af-session-note");
    if (!tbody) return;
    var keys = Object.keys(this.sessionData);
    if (!keys.length) {
      badge.textContent = "No Data";
      badge.className = "af-badge af-badge-warn";
      return;
    }
    badge.textContent = keys.length + " fields";
    badge.className = "af-badge af-badge-ok";
    var rows = [];
    for (var i = 0; i < keys.length; i++) {
      var e = this.sessionData[keys[i]],
        hl = /user|name|locale/i.test(keys[i]) ? ' class="af-hl"' : "";
      rows.push(
        "<tr" +
          hl +
          '><td class="af-td af-idx">' +
          (i + 1) +
          '</td><td class="af-td af-key">' +
          this._esc(keys[i]) +
          '</td><td class="af-td af-val">' +
          this._esc(String(e.raw != null ? e.raw : "")) +
          '</td><td class="af-td af-fmt">' +
          this._esc(String(e.formatted != null ? e.formatted : "")) +
          "</td></tr>",
      );
    }
    tbody.innerHTML = rows.join("");
    var parts = [];
    if (this.sessionData["User_ID"]) parts.push("User: " + this.sessionData["User_ID"].raw);
    if (this.sessionData["NameConcat"]) parts.push(this.sessionData["NameConcat"].raw);
    if (parts.length) {
      note.innerHTML = "<strong>" + this._esc(parts.join(" | ")) + "</strong>";
      note.className = "af-note af-note-active";
    }
  };

  // ═══════════════════════ BIND EVENTS ═══════════════════════
  CustomPromptPage.prototype._bindEvents = function () {
    var self = this,
      R = this.domNode;
    R.querySelector("#af-session-toggle").addEventListener("click", function () {
      self._tog("af-session-body", "af-session-toggle");
    });
    R.querySelector("#af-oauth-toggle").addEventListener("click", function () {
      self._tog("af-oauth-body", "af-oauth-toggle");
    });
    R.querySelector("#af-btn-popup-test").addEventListener("click", function () {
      self._testPopup();
    });
    R.querySelector("#af-btn-oauth-login").addEventListener("click", function () {
      self._startOAuth();
    });
    R.querySelector("#af-btn-oauth-clear").addEventListener("click", function () {
      self._clearToken();
    });
    R.querySelector("#af-btn-use-token").addEventListener("click", function () {
      self._useToken();
    });
    R.querySelector("#af-btn-ffp-fill").addEventListener("click", function () {
      self._ffpFill();
    });
    R.querySelector("#af-btn-fetch").addEventListener("click", function () {
      self._doFetch();
    });
    R.querySelector("#af-btn-preflight").addEventListener("click", function () {
      self._doPreflight();
    });
    R.querySelector("#af-btn-discover").addEventListener("click", function () {
      self._doDiscover();
    });
    R.querySelector("#af-btn-clear").addEventListener("click", function () {
      self._clearResults();
    });
    var tabs = R.querySelectorAll(".af-tab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].addEventListener("click", function (e) {
        self._switchTab(e.target.getAttribute("data-tab"));
      });
    R.querySelector("#af-url").addEventListener("keydown", function (e) {
      if (e.key === "Enter") self._doFetch();
    });
    // Auth type toggle
    R.querySelector("#af-auth-type").addEventListener("change", function () {
      var t = self._gv("af-auth-type"),
        lbl = R.querySelector("#af-auth-label"),
        inp = R.querySelector("#af-auth");
      if (t === "bearer") {
        lbl.textContent = "Bearer Token";
        inp.placeholder = "eyJhbGciOi... (paste token)";
      } else if (t === "cookie") {
        lbl.textContent = "Cookie";
        inp.placeholder = "COOKIE_NAME=VALUE";
      } else {
        lbl.textContent = "Auth";
        inp.placeholder = "(disabled)";
      }
    });
    // Listen for OAuth callback
    this.messageHandler = function (ev) {
      self._onOAuthMessage(ev);
    };
    window.addEventListener("message", this.messageHandler);
  };

  // ═══════════════════════ FFP PRESET FILL ═══════════════════════
  CustomPromptPage.prototype._ffpFill = function () {
    var fp = this.config.ffpPreset;
    if (!fp || !fp.baseUrls) {
      this._setSt("No ffpPreset in config", "error");
      return;
    }
    var env = this._gv("af-ffp-env");
    var authMode = this._gv("af-ffp-auth-mode");
    var base = fp.baseUrls[env];
    if (!base) {
      this._setSt("No URL for environment: " + env, "error");
      return;
    }
    var path = authMode === "cookie" ? fp.apiPathCookie || fp.apiPath || "/" : fp.apiPath || "/";
    var url = base + path + "?mis=1&mis=3&mis=6&mis=12&mis=24&query_date=2025-09-22&aggregation=production_month";
    this._setField("af-url", url);
    this._setField("af-method", "POST");
    // Set auth type
    var authType = (R = this.domNode.querySelector("#af-auth-type"));
    if (authMode === "cookie") {
      authType.value = "cookie";
    } else {
      authType.value = "bearer";
    }
    authType.dispatchEvent(new Event("change"));
    // Set accept header from config
    if (fp.acceptHeader) {
      this._setField("af-headers", "Accept: " + fp.acceptHeader);
    }
    this._setSt("Preset filled for " + env + " (" + authMode + ")", "success");
    console.log("[ApiFetcher] FFP preset filled:", url);
  };

  // ═══════════════════════ OAUTH2 PKCE ═══════════════════════
  CustomPromptPage.prototype._testPopup = function () {
    var st = this.domNode.querySelector("#af-oauth-status");
    try {
      var p = window.open("about:blank", "oauth_test", "width=500,height=400,scrollbars=yes");
      if (!p || p.closed) {
        st.textContent = "\u274C Popup BLOCKED!";
        st.className = "af-status af-status-error";
        return;
      }
      p.document.write(
        '<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#e8f5e9;"><div style="text-align:center;"><h1 style="color:#2e7d32;">\u2705 Popup Works!</h1><p>Closing in 3s...</p></div></body></html>',
      );
      p.document.close();
      setTimeout(function () {
        if (p && !p.closed) p.close();
      }, 3000);
      st.textContent = "\u2705 Popup works!";
      st.className = "af-status af-status-success";
    } catch (err) {
      st.textContent = "\u274C " + err.message;
      st.className = "af-status af-status-error";
    }
  };

  CustomPromptPage.prototype._startOAuth = function () {
    var self = this;
    var authUrl = this._gv("af-oauth-auth-url"),
      clientId = this._gv("af-oauth-client-id");
    var redirectUri = this._gv("af-oauth-redirect"),
      scope = this._gv("af-oauth-scope");
    var method = this._gv("af-oauth-challenge");
    var st = this.domNode.querySelector("#af-oauth-status");
    if (!authUrl || !clientId || !redirectUri) {
      st.textContent = "\u274C Fill Authorize URL, Client ID, Redirect URI";
      st.className = "af-status af-status-error";
      return;
    }

    st.textContent = "Generating PKCE...";
    st.className = "af-status af-status-loading";

    this._genPKCE(method)
      .then(function (pkce) {
        self.codeVerifier = pkce.verifier;
        self.oauthState = self._rnd(32);
        var url =
          authUrl +
          "?" +
          [
            "client_id=" + encodeURIComponent(clientId),
            "response_type=code",
            "redirect_uri=" + encodeURIComponent(redirectUri),
            "scope=" + encodeURIComponent(scope || "openid"),
            "state=" + encodeURIComponent(self.oauthState),
            "code_challenge=" + encodeURIComponent(pkce.challenge),
            "code_challenge_method=" + encodeURIComponent(method),
          ].join("&");

        console.log("[OAuth] Authorize:", url);
        try {
          self.oauthPopup = window.open(url, "oauth_login", "width=720,height=800,scrollbars=yes");
          if (!self.oauthPopup || self.oauthPopup.closed) {
            st.textContent = "\u274C Popup blocked!";
            st.className = "af-status af-status-error";
            return;
          }
          st.textContent = "Waiting for login in popup...";
          st.className = "af-status af-status-loading";
          var poll = setInterval(function () {
            if (self.oauthPopup && self.oauthPopup.closed) {
              clearInterval(poll);
              if (!self.oauthToken) {
                st.textContent = "\u26A0\uFE0F Popup closed without login.";
                st.className = "af-status af-status-warning";
              }
            }
          }, 1000);
        } catch (err) {
          st.textContent = "\u274C " + err.message;
          st.className = "af-status af-status-error";
        }
      })
      .catch(function (err) {
        st.textContent = "\u274C PKCE failed: " + err.message;
        st.className = "af-status af-status-error";
      });
  };

  CustomPromptPage.prototype._onOAuthMessage = function (ev) {
    if (!ev.data || ev.data.type !== "oauth2_callback") return;
    var st = this.domNode.querySelector("#af-oauth-status");
    if (ev.data.error) {
      st.textContent = "\u274C " + ev.data.error + (ev.data.error_description ? ": " + ev.data.error_description : "");
      st.className = "af-status af-status-error";
      return;
    }
    if (ev.data.code) {
      if (this.oauthState && ev.data.state && ev.data.state !== this.oauthState) {
        st.textContent = "\u274C State mismatch!";
        st.className = "af-status af-status-error";
        return;
      }
      st.textContent = "\u2705 Code received! Exchanging for token...";
      st.className = "af-status af-status-loading";
      this._exchangeToken(ev.data.code);
    }
  };

  CustomPromptPage.prototype._exchangeToken = function (code) {
    var self = this,
      tokenUrl = this._gv("af-oauth-token-url"),
      clientId = this._gv("af-oauth-client-id"),
      redirectUri = this._gv("af-oauth-redirect");
    var st = this.domNode.querySelector("#af-oauth-status");
    if (!tokenUrl) {
      st.textContent = "\u274C Token URL required!";
      st.className = "af-status af-status-error";
      return;
    }
    var body = [
      "grant_type=authorization_code",
      "client_id=" + encodeURIComponent(clientId),
      "code=" + encodeURIComponent(code),
      "redirect_uri=" + encodeURIComponent(redirectUri),
      "code_verifier=" + encodeURIComponent(this.codeVerifier),
    ].join("&");
    console.log("[OAuth] Token exchange:", tokenUrl);
    fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      mode: "cors",
      body: body,
    })
      .then(function (r) {
        return r.text().then(function (t) {
          return { status: r.status, text: t };
        });
      })
      .then(function (res) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        var j;
        try {
          j = JSON.parse(res.text);
        } catch (e) {
          j = null;
        }
        if (j && j.access_token) {
          self.oauthToken = j.access_token;
          self.oauthTokenExpiry = j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null;
          st.textContent =
            "\u2705 Token! Expires: " +
            (self.oauthTokenExpiry ? self.oauthTokenExpiry.toLocaleTimeString() : "unknown");
          st.className = "af-status af-status-success";
          self._showToken(j);
        } else if (j && j.error) {
          st.textContent = "\u274C " + j.error + (j.error_description ? " - " + j.error_description : "");
          st.className = "af-status af-status-error";
        } else {
          st.textContent = "\u274C HTTP " + res.status + " (check Response Body tab)";
          st.className = "af-status af-status-error";
          self.domNode.querySelector("#af-resp-body").textContent = res.text;
          self._switchTab("body");
        }
      })
      .catch(function (e) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        st.textContent = "\u274C Token exchange: " + e.message + " (CORS?)";
        st.className = "af-status af-status-error";
      });
  };

  CustomPromptPage.prototype._showToken = function (t) {
    var box = this.domNode.querySelector("#af-oauth-token-box"),
      prev = this.domNode.querySelector("#af-oauth-token-preview");
    var exp = this.domNode.querySelector("#af-oauth-expiry"),
      badge = this.domNode.querySelector("#af-oauth-badge");
    box.classList.remove("af-hidden");
    badge.textContent = "\u2705 Active";
    badge.className = "af-badge af-badge-ok";
    if (this.oauthTokenExpiry) exp.textContent = "Expires: " + this.oauthTokenExpiry.toLocaleTimeString();
    var d = {
      token_type: t.token_type,
      expires_in: t.expires_in,
      scope: t.scope,
      access_token: t.access_token ? t.access_token.substring(0, 50) + "..." : "N/A",
    };
    if (t.refresh_token) d.refresh_token = t.refresh_token.substring(0, 30) + "...";
    prev.textContent = JSON.stringify(d, null, 2);
  };

  CustomPromptPage.prototype._useToken = function () {
    if (!this.oauthToken) return;
    this._setField("af-auth-type", "bearer");
    this.domNode.querySelector("#af-auth-type").dispatchEvent(new Event("change"));
    this._setField("af-auth", this.oauthToken);
    this.domNode.querySelector("#af-oauth-status").textContent = "\u2705 Token copied to Fetcher!";
    this.domNode.querySelector("#af-oauth-status").className = "af-status af-status-success";
  };

  CustomPromptPage.prototype._clearToken = function () {
    this.oauthToken = null;
    this.oauthTokenExpiry = null;
    this.codeVerifier = null;
    this.oauthState = null;
    this.domNode.querySelector("#af-oauth-token-box").classList.add("af-hidden");
    this.domNode.querySelector("#af-oauth-badge").textContent = "No Token";
    this.domNode.querySelector("#af-oauth-badge").className = "af-badge";
    this.domNode.querySelector("#af-oauth-status").className = "af-status af-hidden";
  };

  // PKCE helpers
  CustomPromptPage.prototype._genPKCE = function (m) {
    var v = this._rnd(64);
    if (m === "plain") return Promise.resolve({ verifier: v, challenge: v });
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)).then(function (h) {
      var b = new Uint8Array(h),
        s = "";
      for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return { verifier: v, challenge: btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") };
    });
  };
  CustomPromptPage.prototype._rnd = function (n) {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~",
      a = new Uint8Array(n);
    crypto.getRandomValues(a);
    var r = "";
    for (var i = 0; i < n; i++) r += c[a[i] % c.length];
    return r;
  };

  // ═══════════════════════ FETCHER ═══════════════════════
  CustomPromptPage.prototype._doFetch = function () {
    var self = this,
      url = this._gv("af-url").trim();
    if (!url) {
      this._setSt("Enter a URL", "error");
      return;
    }
    var method = this._gv("af-method"),
      authType = this._gv("af-auth-type"),
      authVal = this._gv("af-auth").trim();
    var hdrsRaw = this._gv("af-headers").trim(),
      bodyRaw = this._gv("af-body").trim();

    var headers = {};
    // Set auth
    if (authType === "bearer" && authVal) {
      headers["Authorization"] = "Bearer " + authVal;
    } else if (authType === "cookie" && authVal) {
      headers["Cookie"] = authVal;
    }
    // Custom headers (can override anything)
    if (hdrsRaw) {
      hdrsRaw.split("\n").forEach(function (l) {
        var ci = l.indexOf(":");
        if (ci > 0) headers[l.substring(0, ci).trim()] = l.substring(ci + 1).trim();
      });
    }
    // Default Accept if not set
    if (!headers["Accept"]) headers["Accept"] = "application/json";

    var opts = { method: method, headers: headers, mode: "cors" };
    if (method !== "GET" && method !== "DELETE" && bodyRaw) {
      opts.body = bodyRaw;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }

    this._setSt("Fetching " + method + " " + url + " ...", "loading");
    console.log("[Fetch]", method, url, JSON.stringify(headers));
    var t0 = performance.now();

    fetch(url, opts)
      .then(function (r) {
        var ms = Math.round(performance.now() - t0),
          rh = {};
        r.headers.forEach(function (v, k) {
          rh[k] = v;
        });
        var meta = {
          url: url,
          method: method,
          status: r.status,
          statusText: r.statusText,
          type: r.type,
          redirected: r.redirected,
          finalUrl: r.url,
          headers: rh,
          elapsed: ms,
          requestHeaders: headers,
          timestamp: new Date().toISOString(),
        };
        return r.text().then(function (t) {
          meta.bodyText = t;
          meta.bodyLength = t.length;
          try {
            meta.bodyJSON = JSON.parse(t);
            meta.isJSON = true;
          } catch (e) {
            meta.isJSON = false;
          }
          return meta;
        });
      })
      .then(function (m) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        self._showResults(m);
        self._addHist(m);
        self._setSt(
          m.method +
            " " +
            m.status +
            " " +
            m.statusText +
            " \u2014 " +
            m.elapsed +
            "ms \u2014 " +
            self._fB(m.bodyLength),
          m.status >= 200 && m.status < 300 ? "success" : "warning",
        );
      })
      .catch(function (err) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        var ms = Math.round(performance.now() - t0);
        var em = {
          url: url,
          method: method,
          status: 0,
          statusText: "NETWORK ERROR",
          error: err.message,
          errorName: err.name,
          elapsed: ms,
          timestamp: new Date().toISOString(),
          requestHeaders: headers,
        };
        self._showErr(em);
        self._addHist(em);
        self._setSt("FAILED: " + err.message + " \u2014 " + ms + "ms", "error");
      });
  };

  CustomPromptPage.prototype._doPreflight = function () {
    var self = this,
      url = this._gv("af-url").trim();
    if (!url) {
      this._setSt("Enter URL", "error");
      return;
    }
    this._setSt("OPTIONS " + url, "loading");
    var t0 = performance.now();
    fetch(url, {
      method: "OPTIONS",
      mode: "cors",
      headers: {
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization,Content-Type,Cookie",
      },
    })
      .then(function (r) {
        var ms = Math.round(performance.now() - t0),
          rh = {};
        r.headers.forEach(function (v, k) {
          rh[k] = v;
        });
        var m = {
          url: url,
          method: "OPTIONS",
          status: r.status,
          statusText: r.statusText,
          type: r.type,
          headers: rh,
          elapsed: ms,
          timestamp: new Date().toISOString(),
          isPreflight: true,
        };
        return r.text().then(function (t) {
          m.bodyText = t;
          return m;
        });
      })
      .then(function (m) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        self._showResults(m);
        self._addHist(m);
        self._setSt("OPTIONS " + m.status + " \u2014 " + m.elapsed + "ms", "success");
      })
      .catch(function (e) {
        if (self.m_oControlHost && self.m_oControlHost.isDestroyed) return;
        var ms = Math.round(performance.now() - t0);
        var em = {
          url: url,
          method: "OPTIONS",
          status: 0,
          error: e.message,
          elapsed: ms,
          timestamp: new Date().toISOString(),
          isPreflight: true,
        };
        self._showErr(em);
        self._addHist(em);
        self._setSt("PREFLIGHT FAILED: " + e.message, "error");
      });
  };

  CustomPromptPage.prototype._doDiscover = function () {
    var self = this,
      url = this._gv("af-url").trim();
    if (!url) {
      this._setSt("Enter URL", "error");
      return;
    }
    var base;
    try {
      base = new URL(url).origin;
    } catch (e) {
      this._setSt("Invalid URL", "error");
      return;
    }
    var urls = [base + "/.well-known/openid-configuration", base + "/.well-known/oauth-authorization-server"];
    this._setSt("Discovering...", "loading");
    var results = [],
      done = 0;
    urls.forEach(function (dU, idx) {
      fetch(dU, { mode: "cors" })
        .then(function (r) {
          return r.text().then(function (t) {
            var j;
            try {
              j = JSON.parse(t);
            } catch (e) {}
            results[idx] = { url: dU, status: r.status, found: r.status === 200 && j !== null, data: j };
          });
        })
        .catch(function (e) {
          results[idx] = { url: dU, status: 0, found: false, error: e.message };
        })
        .finally(function () {
          done++;
          if (done === urls.length) {
            var el = self.domNode.querySelector("#af-cors-results"),
              L = ["OAUTH2 DISCOVERY", ""],
              any = false;
            for (var i = 0; i < results.length; i++) {
              var r = results[i];
              L.push("\u2500\u2500 " + r.url, "");
              if (r.found && r.data) {
                any = true;
                L.push("  \u2705 FOUND");
                ["issuer", "authorization_endpoint", "token_endpoint", "userinfo_endpoint"].forEach(function (f) {
                  if (r.data[f]) L.push("  " + f + ": " + r.data[f]);
                });
                if (r.data.grant_types_supported) L.push("  grants: " + r.data.grant_types_supported.join(", "));
                L.push("");
                L.push(JSON.stringify(r.data, null, 2));
              } else L.push(r.error ? "  \u274C " + r.error : "  \u274C HTTP " + r.status);
              L.push("");
            }
            if (!any) L.push("No endpoints found.");
            el.textContent = L.join("\n");
            self._switchTab("cors");
            self._setSt("Discovery done", any ? "success" : "warning");
          }
        });
    });
  };

  // ═══════════════════════ DISPLAY ═══════════════════════
  CustomPromptPage.prototype._showResults = function (m) {
    this._showCORS(m);
    this._showHdrs(m);
    this._showBody(m);
    this._switchTab("cors");
  };

  CustomPromptPage.prototype._showCORS = function (m) {
    var el = this.domNode.querySelector("#af-cors-results"),
      L = [];
    L.push(
      "CORS ANALYSIS \u2014 " + m.method + " " + m.url,
      "",
      "Status: " + m.status + " " + (m.statusText || ""),
      "Type: " + (m.type || "N/A"),
    );
    if (m.redirected) L.push("Redirected: " + m.finalUrl);
    if (m.elapsed != null) L.push("Time: " + m.elapsed + "ms");
    L.push("");
    if (m.error) {
      L.push("\u274C FAILED: " + m.error, "", "Possible: No CORS, unreachable, DNS, SSL");
    } else {
      var ch = [
        { k: "access-control-allow-origin", l: "Allow-Origin", c: 1 },
        { k: "access-control-allow-methods", l: "Allow-Methods", c: 1 },
        { k: "access-control-allow-headers", l: "Allow-Headers", c: 1 },
        { k: "access-control-allow-credentials", l: "Allow-Credentials" },
        { k: "access-control-max-age", l: "Max-Age" },
      ];
      var has = 0;
      ch.forEach(function (h) {
        var v = m.headers ? m.headers[h.k] : undefined;
        if (v !== undefined) {
          has = 1;
          L.push("  \u2705 " + h.l + ": " + v);
        } else if (h.c) L.push("  \u274C " + h.l + ": missing");
      });
      L.push("", has ? "\u2705 CORS detected" : "\u26A0\uFE0F No CORS headers", "");
      var wa = m.headers ? m.headers["www-authenticate"] : null;
      if (wa) L.push("WWW-Authenticate: " + wa);
      else if (m.status === 401) L.push("\u26A0\uFE0F 401 Unauthorized");
      else if (m.status === 403) L.push("\u26A0\uFE0F 403 Forbidden");
      L.push(
        "",
        "Content-Type: " + (m.headers ? m.headers["content-type"] || "N/A" : "N/A"),
        "Size: " + (m.bodyLength != null ? this._fB(m.bodyLength) : "N/A") + " | JSON: " + (m.isJSON ? "YES" : "NO"),
      );
    }
    el.textContent = L.join("\n");
  };

  CustomPromptPage.prototype._showHdrs = function (m) {
    var el = this.domNode.querySelector("#af-resp-headers"),
      L = ["HTTP " + m.status + " " + (m.statusText || ""), ""];
    if (m.headers)
      Object.keys(m.headers)
        .sort()
        .forEach(function (k) {
          L.push((k.indexOf("access-control") === 0 ? "\u2605 " : "  ") + k + ": " + m.headers[k]);
        });
    L.push("", "-- SENT --", "");
    if (m.requestHeaders)
      Object.keys(m.requestHeaders).forEach(function (k) {
        L.push("  " + k + ": " + m.requestHeaders[k]);
      });
    el.textContent = L.join("\n");
  };

  CustomPromptPage.prototype._showBody = function (m) {
    var el = this.domNode.querySelector("#af-resp-body");
    if (!m.bodyText && !m.error) {
      el.textContent = "(empty)";
      return;
    }
    if (m.error) {
      el.textContent = "Failed: " + m.error;
      return;
    }
    el.textContent = m.isJSON ? JSON.stringify(m.bodyJSON, null, 2) : m.bodyText;
    if (m.bodyLength > 50000) el.textContent = m.bodyText.substring(0, 50000) + "\n...[TRUNCATED]";
  };

  CustomPromptPage.prototype._showErr = function (m) {
    this._showCORS(m);
    this.domNode.querySelector("#af-resp-headers").textContent = "Failed: " + m.error;
    this.domNode.querySelector("#af-resp-body").textContent = "Failed: " + m.error;
    this._switchTab("cors");
  };

  // ═══════════════════════ HISTORY ═══════════════════════
  CustomPromptPage.prototype._addHist = function (m) {
    this.history.unshift({
      timestamp: m.timestamp,
      method: m.method || "GET",
      url: m.url,
      status: m.status,
      statusText: m.statusText || "",
      elapsed: m.elapsed,
      error: m.error || null,
      isPreflight: m.isPreflight || false,
    });
    if (this.history.length > this.maxHistory) this.history = this.history.slice(0, this.maxHistory);
    var el = this.domNode.querySelector("#af-hist-list");
    this.domNode.querySelector("#af-history-count").textContent = this.history.length;
    if (!this.history.length) {
      el.textContent = "No requests...";
      return;
    }
    var L = ["HISTORY (" + this.history.length + ")", ""];
    this.history.forEach(function (h, i) {
      var ic = h.error ? "\u274C" : h.status >= 200 && h.status < 300 ? "\u2705" : "\u26A0\uFE0F";
      L.push(
        i +
          1 +
          ". " +
          ic +
          " " +
          h.method +
          (h.isPreflight ? " [PRE]" : "") +
          " \u2192 " +
          (h.error ? "FAIL" : h.status) +
          " (" +
          h.elapsed +
          "ms)",
      );
      L.push("   " + h.url, "   " + h.timestamp);
      if (h.error) L.push("   " + h.error);
      L.push("");
    });
    el.textContent = L.join("\n");
  };

  // ═══════════════════════ HELPERS ═══════════════════════
  CustomPromptPage.prototype._tog = function (bId, tId) {
    var b = this.domNode.querySelector("#" + bId),
      t = this.domNode.querySelector("#" + tId);
    if (b.classList.contains("af-collapsed")) {
      b.classList.remove("af-collapsed");
      t.textContent = "\u25BC";
    } else {
      b.classList.add("af-collapsed");
      t.textContent = "\u25B6";
    }
  };
  CustomPromptPage.prototype._switchTab = function (t) {
    var ts = this.domNode.querySelectorAll(".af-tab");
    for (var i = 0; i < ts.length; i++) ts[i].classList.toggle("af-tab-active", ts[i].getAttribute("data-tab") === t);
    var cs = this.domNode.querySelectorAll(".af-tab-content");
    for (var j = 0; j < cs.length; j++) cs[j].classList.remove("af-tab-visible");
    var el = this.domNode.querySelector("#af-tab-" + t);
    if (el) el.classList.add("af-tab-visible");
  };
  CustomPromptPage.prototype._setSt = function (msg, type) {
    var el = this.domNode.querySelector("#af-status");
    el.textContent = msg;
    el.className = "af-status af-status-" + type;
  };
  CustomPromptPage.prototype._clearResults = function () {
    this.domNode.querySelector("#af-cors-results").textContent = "Run a request...";
    this.domNode.querySelector("#af-resp-headers").textContent = "No response...";
    this.domNode.querySelector("#af-resp-body").textContent = "No response...";
    this.domNode.querySelector("#af-status").className = "af-status af-hidden";
  };
  CustomPromptPage.prototype._gv = function (id) {
    var el = this.domNode.querySelector("#" + id);
    return el ? el.value : "";
  };
  CustomPromptPage.prototype._setField = function (id, val) {
    var el = this.domNode.querySelector("#" + id);
    if (el) el.value = val;
  };
  CustomPromptPage.prototype._fB = function (b) {
    if (b == null) return "N/A";
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  };
  CustomPromptPage.prototype._esc = function (s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  };

  // ═══════════════════════ COGNOS LIFECYCLE ═══════════════════════
  CustomPromptPage.prototype.getParameters = function () {
    return null;
  };
  CustomPromptPage.prototype.isInValidState = function () {
    return true;
  };
  CustomPromptPage.prototype.destroy = function () {
    if (this.messageHandler) window.removeEventListener("message", this.messageHandler);
    this.history = [];
    this.sessionData = {};
    this.oauthToken = null;
    this.m_oDataStores = {};
    if (this.domNode && this.domNode.parentNode) this.domNode.parentNode.removeChild(this.domNode);
    this.domNode = null;
    this.m_oControlHost = null;
  };

  return CustomPromptPage;
});

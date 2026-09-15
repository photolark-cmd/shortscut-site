/* 쇼츠컷 안내 챗(규칙형, 2026-09-15). 서버·키 없이 faq.json 의 문답을 낱말 점수로 골라 답한다.
   사람이 답해야 하는 것은 폼으로 넘긴다. 나중에 AI 답변으로 바꿀 때는 answer() 만 교체하면 된다. */
(function () {
  "use strict";
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/chat\.js.*$/, "") : "chat/"; })();
  var DATA = null, open = false, history = [];
  var norm = function (t) { return (t || "").toLowerCase().replace(/[\s　.,!?~·ㆍ\-_/()\[\]「」『』"'`:;]+/g, ""); };
  var grams = function (t) { var n = norm(t), out = {}; for (var i = 0; i < n.length - 1; i++) out[n.slice(i, i + 2)] = 1; return out; };

  function score(item, qn, qg) {
    var s = 0;
    for (var i = 0; i < item.k.length; i++) { var k = norm(item.k[i]); if (k && qn.indexOf(k) >= 0) s += 2 + Math.min(3, k.length); }
    var ig = grams(item.q), hit = 0, tot = 0; for (var g in ig) { tot++; if (qg[g]) hit++; }
    if (tot) s += 3 * hit / tot;
    return s;
  }
  function answer(text) {
    var qn = norm(text), qg = grams(text);
    var ranked = DATA.items.map(function (it) { return { it: it, s: score(it, qn, qg) }; }).sort(function (a, b) { return b.s - a.s; });
    var best = ranked[0];
    if (!best || best.s < 2.5) return { text: DATA.fallback, fallback: true, more: ranked.slice(0, 3).filter(function (r) { return r.s > 0.8; }).map(function (r) { return r.it; }) };
    return { text: best.it.a, link: best.it.link, more: ranked.slice(1, 3).filter(function (r) { return r.s >= 2.5; }).map(function (r) { return r.it; }) };
  }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(t) { return esc(t).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  var ui = {};
  function build() {
    var btn = el("button", "scc-fab", "💬 <span>물어보기</span>"); btn.type = "button"; btn.setAttribute("aria-label", "쇼츠컷 안내 챗 열기");
    var box = el("div", "scc-box"); box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "쇼츠컷 안내 챗");
    box.innerHTML = '<div class="scc-head"><b>쇼츠컷 안내 챗</b><span class="scc-sub">규칙형 · 즉시 답변</span><button type="button" class="scc-x" aria-label="닫기">✕</button></div>' +
      '<div class="scc-log" aria-live="polite"></div><div class="scc-chips"></div>' +
      '<form class="scc-form"><input type="text" class="scc-in" placeholder="궁금한 것을 적어 주세요 (예: 가격, 체험, 설치)" autocomplete="off" maxlength="200"><button type="submit" class="scc-send">보내기</button></form>' +
      '<div class="scc-foot"><a href="#trial" class="scc-form-link">✉ 폼으로 남기기</a><a href="guide/" class="scc-guide-link">📖 설명서</a></div>';
    document.body.appendChild(btn); document.body.appendChild(box);
    ui = { btn: btn, box: box, log: box.querySelector(".scc-log"), chips: box.querySelector(".scc-chips"), form: box.querySelector(".scc-form"), input: box.querySelector(".scc-in") };
    btn.onclick = function () { toggle(!open); };
    box.querySelector(".scc-x").onclick = function () { toggle(false); };
    box.querySelector(".scc-form-link").onclick = function () { toggle(false); };
    ui.form.onsubmit = function (e) { e.preventDefault(); var v = ui.input.value.trim(); if (!v) return; ui.input.value = ""; ask(v); };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
  }
  function toggle(on) {
    open = on; ui.box.hidden = !on; ui.btn.classList.toggle("on", on);
    if (on) { if (!history.length) greet(); setTimeout(function () { ui.input.focus(); }, 50); }
  }
  function bubble(kind, html) { var b = el("div", "scc-msg " + kind, html); ui.log.appendChild(b); ui.log.scrollTop = ui.log.scrollHeight; return b; }
  function chips(list) {
    ui.chips.innerHTML = "";
    list.forEach(function (q) { var c = el("button", "scc-chip", esc(q)); c.type = "button"; c.onclick = function () { ask(q); }; ui.chips.appendChild(c); });
  }
  function greet() {
    bubble("bot", fmt(DATA.intro)); chips(DATA.quick); history.push({ role: "bot", text: DATA.intro });
  }
  function ask(q) {
    bubble("me", esc(q)); history.push({ role: "me", text: q });
    var r = answer(q);
    var html = fmt(r.text);
    if (r.link) html += '<div class="scc-link"><a href="' + esc(r.link.href) + '"' + (/^https?:/.test(r.link.href) ? ' target="_blank" rel="noopener"' : "") + '>' + esc(r.link.label) + ' →</a></div>';
    if (r.fallback) html += '<div class="scc-link"><a href="#trial" class="scc-form-link2">✉ 폼으로 남기기 →</a> <a href="guide/">📖 설명서에서 찾기 →</a></div>';
    var b = bubble("bot", html);
    var f2 = b.querySelector(".scc-form-link2"); if (f2) f2.onclick = function () { toggle(false); };
    history.push({ role: "bot", text: r.text });
    chips((r.more || []).map(function (it) { return it.q; }).concat(DATA.quick.filter(function (q2) { return q2 !== q; })).slice(0, 4));
  }

  function init() {
    fetch(BASE + "faq.json?v=" + (window.SCC_VER || "1"), { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { DATA = d; build(); })
      .catch(function () { /* faq 못 읽으면 챗을 띄우지 않는다 — 폼은 그대로 있다 */ });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

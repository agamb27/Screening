(function () {
  const S = window.SCREENERS;
  const ORDER = ["aq10", "asrs", "vparent", "vteacher", "vpfu", "vtfu"];
  const app = document.getElementById("app");
  let st = null; // current session state (memory only)

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const focusTop = () => { window.scrollTo(0, 0); app.focus({ preventScroll: true }); };

  // ---------- build the step list for a screener ----------
  function steps(key) {
    const d = S[key], out = [];
    d.sections.forEach(sec => sec.items.forEach(it => out.push({ kind: "q", sec, it })));
    (d.side || []).forEach((t, i) => out.push({ kind: "side", t, i }));
    return out;
  }

  // ---------- views ----------
  function home() {
    st = null;
    app.innerHTML = `
      <h1>Screening Questionnaires</h1>
      <p class="muted">Please complete the questionnaire Dr. MacDonald asked you to fill out. Choose one answer for each question. It only takes a few minutes.</p>
      <ul class="list">
        ${ORDER.map(k => `<li><button data-open="${k}">
            <span class="name">${esc(S[k].title)}</span>
            <span class="who">${esc(S[k].who)}</span>
            <span class="time">about ${S[k].minutes} min</span></button></li>`).join("")}
      </ul>`;
    app.querySelectorAll("[data-open]").forEach(b => b.onclick = () => start(b.dataset.open));
    focusTop();
  }

  function start(key) {
    st = { key, d: S[key], steps: steps(key), i: 0, ans: {}, side: {}, info: {}, med: null, comments: "" };
    intro();
  }

  function intro() {
    const d = st.d;
    app.innerHTML = `
      <h1>${esc(d.title)}</h1>
      <p class="muted">${esc(d.subtitle)}</p>
      <div class="box">${esc(d.intro)}</div>
      <form id="f">
        <div class="grid2">
          ${d.fields.map(([id, label, type]) => `
            <div class="field" ${label.length > 40 ? 'style="grid-column:1/-1"' : ""}>
              <label class="label" for="i_${id}">${esc(label)}</label>
              <input id="i_${id}" type="${type}" value="${esc(st.info[id] || "")}" autocomplete="off">
            </div>`).join("")}
        </div>
        ${d.med ? `
          <div class="field"><span class="label">${esc(d.med.label)}</span>
            <div class="radio-row">${d.med.options.map(o => `
              <label class="pill"><input type="radio" name="med" value="${esc(o)}" ${st.med === o ? "checked" : ""}>${esc(o)}</label>`).join("")}
            </div></div>` : ""}
        <div class="nav">
          <button type="button" class="btn secondary" id="back">Back to list</button>
          <button type="submit" class="btn">Start questions</button>
        </div>
      </form>`;
    const save = () => {
      d.fields.forEach(([id]) => st.info[id] = document.getElementById("i_" + id).value.trim());
      const m = app.querySelector("input[name=med]:checked"); st.med = m ? m.value : st.med;
    };
    document.getElementById("back").onclick = () => { if (confirmLeave()) home(); };
    document.getElementById("f").onsubmit = e => { e.preventDefault(); save(); st.i = 0; question(); };
    focusTop();
  }

  function question() {
    const total = st.steps.length, s = st.steps[st.i];
    let title, prompt, options, current;
    if (s.kind === "q") {
      title = s.sec.title; prompt = `<span class="qnum">${s.it.n}.</span>${esc(s.it.t)}`;
      options = s.sec.scale.map((lab, j) => ({ lab, val: s.sec.values[j] })); current = st.ans[s.it.n];
    } else {
      title = "Side effects: are these currently a problem?";
      prompt = `Has your child experienced this in the past week?<br><strong>${esc(s.t)}</strong>`;
      if (st.key === "vtfu") prompt = `Has the child experienced this in the past week?<br><strong>${esc(s.t)}</strong>`;
      options = ["None", "Mild", "Moderate", "Severe"].map(lab => ({ lab, val: lab })); current = st.side[s.i];
    }
    app.innerHTML = `
      <div class="progress" aria-hidden="true"><div style="width:${(st.i / total) * 100}%"></div></div>
      <div class="progress-text"><span>${esc(st.d.title)}</span><span>Question ${st.i + 1} of ${total}</span></div>
      <div class="section-name">${esc(title)}</div>
      <p class="q" id="qtext">${prompt}</p>
      <div class="choices" role="radiogroup" aria-labelledby="qtext">
        ${options.map((o, j) => `<button class="choice ${current === o.val ? "selected" : ""}" role="radio" aria-checked="${current === o.val}" data-j="${j}">
            <span class="key">${j + 1}</span>${esc(o.lab)}</button>`).join("")}
      </div>
      <div class="nav">
        <button class="btn secondary" id="prev">Back</button>
        <button class="btn secondary" id="skip">${st.reviewing ? "Back to review" : (current != null ? "Next" : "Skip for now")}</button>
      </div>`;
    const pick = j => {
      const v = options[j].val;
      if (s.kind === "q") st.ans[s.it.n] = v; else st.side[s.i] = v;
      app.querySelectorAll(".choice").forEach((b, k) => { b.classList.toggle("selected", k === j); b.setAttribute("aria-checked", k === j); });
      setTimeout(next, 180);
    };
    app.querySelectorAll(".choice").forEach(b => b.onclick = () => pick(+b.dataset.j));
    document.getElementById("prev").onclick = prev;
    document.getElementById("skip").onclick = next;
    keyHandler = e => {
      if (e.target.matches("input, textarea")) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) { e.preventDefault(); pick(n - 1); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    focusTop();
  }

  function next() {
    if (st.reviewing) { st.reviewing = false; return review(); }
    if (st.i < st.steps.length - 1) { st.i++; question(); } else comments();
  }
  function prev() { if (st.i > 0) { st.i--; question(); } else intro(); }

  function comments() {
    keyHandler = null;
    app.innerHTML = `
      <h1>${esc(st.d.comments || "Comments")}</h1>
      <p class="muted">Optional. Add anything else you would like Dr. MacDonald to know.</p>
      <textarea id="c" aria-label="Comments">${esc(st.comments)}</textarea>
      <div class="nav">
        <button class="btn secondary" id="prev">Back</button>
        <button class="btn" id="go">Review answers</button>
      </div>`;
    const save = () => st.comments = document.getElementById("c").value.trim();
    document.getElementById("prev").onclick = () => { save(); st.i = st.steps.length - 1; question(); };
    document.getElementById("go").onclick = () => { save(); review(); };
    focusTop();
  }

  function labelFor(s) {
    if (s.kind === "q") { const v = st.ans[s.it.n]; return v == null ? null : s.sec.scale[s.sec.values.indexOf(v)]; }
    return st.side[s.i] ?? null;
  }

  function review() {
    keyHandler = null;
    const missing = st.steps.filter(s => labelFor(s) == null).length;
    app.innerHTML = `
      <h1>Review your answers</h1>
      ${missing ? `<p class="notice">${missing} question${missing > 1 ? "s are" : " is"} still unanswered. Tap <em>Change</em> to answer, or continue if you prefer to leave ${missing > 1 ? "them" : "it"} blank.</p>`
                : `<p class="muted">All questions answered. Check your answers, then download your PDF.</p>`}
      <table class="review">
        <thead><tr><th>#</th><th>Question</th><th>Answer</th><th></th></tr></thead>
        <tbody>${st.steps.map((s, k) => {
          const a = labelFor(s);
          return `<tr><td>${s.kind === "q" ? s.it.n : "SE"}</td><td>${esc(s.kind === "q" ? s.it.t : s.t)}</td>
            <td class="ans ${a == null ? "missing" : ""}">${a == null ? "Not answered" : esc(a)}</td>
            <td><a href="#" data-k="${k}">Change</a></td></tr>`;
        }).join("")}</tbody>
      </table>
      <div class="nav">
        <button class="btn secondary" id="edit">Edit details</button>
        <button class="btn" id="finish">Finish and download PDF</button>
      </div>`;
    app.querySelectorAll("[data-k]").forEach(a => a.onclick = e => { e.preventDefault(); st.i = +a.dataset.k; st.reviewing = true; question(); });
    document.getElementById("edit").onclick = intro;
    document.getElementById("finish").onclick = done;
    focusTop();
  }

  function done() {
    const file = makePdf();
    app.innerHTML = `
      <h1>Thank you</h1>
      <p>Your PDF has been downloaded. Please email it to Dr. MacDonald before your appointment.</p>
      <p class="muted">If the download didn't start, use the button below. Your answers are not saved anywhere, so download the PDF before closing this page.</p>
      <div class="nav">
        <button class="btn" id="again">Download PDF again</button>
        <button class="btn secondary" id="home">Start a different questionnaire</button>
      </div>`;
    document.getElementById("again").onclick = () => makePdf();
    document.getElementById("home").onclick = () => { st = null; home(); };
    st.finished = true;
    focusTop();
    return file;
  }

  // ---------- PDF ----------
  const plain = s => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/©/g, "(c)");

  function makePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const d = st.d, W = doc.internal.pageSize.getWidth(), M = 50;
    let y = 60;
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(plain(d.subtitle), M, y); y += 18;
    doc.setFont("times", "normal"); doc.setFontSize(10.5); doc.setTextColor(90);
    doc.text(`Completed ${new Date().toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" })}`, M, y); y += 14;
    doc.setTextColor(0);

    const tstyle = { font: "times", fontSize: 10, cellPadding: 4, lineColor: 170, lineWidth: 0.5, textColor: 20 };
    const head = { font: "helvetica", fontStyle: "bold", fillColor: 232, textColor: 0, fontSize: 9.5 };

    const det = d.fields.map(([id, label]) => [plain(label), plain(st.info[id] || "")]);
    if (d.med) det.push([plain(d.med.label), plain(st.med || "")]);
    doc.autoTable({ startY: y + 4, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
      head: [["Details", ""]], body: det, columnStyles: { 0: { cellWidth: 200, fontStyle: "bold" } } });

    const isAQ = ["aq10", "asrs"].includes(d.scoring);
    d.sections.forEach(sec => {
      const body = sec.items.map(it => {
        const v = st.ans[it.n];
        const row = [String(it.n), plain(it.t), v == null ? "Not answered" : plain(sec.scale[sec.values.indexOf(v)])];
        if (!isAQ) row.push(v == null ? "" : String(v));
        return row;
      });
      const h = ["#", plain(sec.title), "Answer"]; if (!isAQ) h.push("Score");
      const cs = { 0: { cellWidth: 24 }, 2: { cellWidth: 118 } }; if (!isAQ) cs[3] = { cellWidth: 38, halign: "center" };
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
        head: [h], body, columnStyles: cs });
    });

    if (d.side) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
        head: [["Side effects (past week)", "Currently a problem?"]], body: d.side.map((t, i) => [plain(t), st.side[i] || "Not answered"]),
        columnStyles: { 1: { cellWidth: 130 } } });
    }
    if (d.comments) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
        head: [[plain(d.comments)]], body: [[plain(st.comments) || "None"]] });
    }

    // clinician scoring page
    const sc = window.SCORE[d.scoring](st.ans);
    doc.addPage(); y = 60;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("Scoring summary (for clinician use)", M, y); y += 16;
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(90);
    doc.text(doc.splitTextToSize("Calculated automatically from the answers above using the official published scoring rules. This is a screening result, not a diagnosis.", W - 2 * M), M, y);
    doc.setTextColor(0);
    doc.autoTable({ startY: y + 22, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
      head: [["Measure", "Result"]], body: sc.rows.map(r => r.map(plain)), columnStyles: { 1: { cellWidth: 170 } } });
    if (sc.result) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 12, margin: { left: M, right: M }, theme: "grid", styles: tstyle, headStyles: head,
        head: [["Screen", "Result"]], body: sc.result.map(r => r.map(plain)), columnStyles: { 1: { cellWidth: 170 } } });
    }
    y = doc.lastAutoTable.finalY + 18;
    doc.setFont("times", "normal"); doc.setFontSize(10);
    const block = (txt, gap = 6) => { const lines = doc.splitTextToSize(plain(txt), W - 2 * M); doc.text(lines, M, y); y += lines.length * 12 + gap; };
    block("Scoring rule: " + sc.rule);
    doc.setTextColor(90); doc.setFontSize(9); block("Source: " + d.source, 0);

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(110);
      doc.text("Confidential", M, 772); doc.text(`Page ${p} of ${pages}`, W - M, 772, { align: "right" });
    }
    const who = plain(st.info.child || st.info.name || "").replace(/[^\w -]/g, "").trim();
    const fname = `${plain(d.title).replace(/[^\w -]/g, "").replace(/\s+/g, " ").trim()}${who ? " - " + who : ""}.pdf`;
    doc.save(fname);
    return fname;
  }

  // ---------- misc ----------
  let keyHandler = null;
  document.addEventListener("keydown", e => keyHandler && keyHandler(e));
  function confirmLeave() {
    return !st || st.finished || Object.keys(st.ans).length === 0 || confirm("Leave this questionnaire? Your answers will be lost.");
  }
  document.querySelector("[data-home]").onclick = e => { e.preventDefault(); if (confirmLeave()) home(); };
  window.addEventListener("beforeunload", e => { if (st && !st.finished && Object.keys(st.ans).length) { e.preventDefault(); e.returnValue = ""; } });

  window.__test = { start, get st() { return st; }, makePdf, review, done };
  home();
})();

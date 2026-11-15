// Official scoring rules, applied exactly as published. Returns rows for the clinician summary.
(function () {
  const pos = (a, lo, hi, set) => {
    let n = 0;
    for (let q = lo; q <= hi; q++) if (set.includes(a[q])) n++;
    return n;
  };
  const answered = (a, lo, hi) => { let n = 0; for (let q = lo; q <= hi; q++) if (a[q] != null) n++; return n; };
  const sum = (a, lo, hi) => { let s = 0; for (let q = lo; q <= hi; q++) if (a[q] != null) s += a[q]; return s; };
  const avg = (a, lo, hi) => { const n = answered(a, lo, hi); return n ? (sum(a, lo, hi) / n).toFixed(2) : "–"; };
  const meets = (b) => (b ? "Meets screening criteria" : "Does not meet screening criteria");

  function aq10(a) {
    // values: 1 Definitely Agree, 2 Slightly Agree, 3 Slightly Disagree, 4 Definitely Disagree
    const agreeItems = [1, 7, 8, 10];
    let score = 0;
    for (let q = 1; q <= 10; q++) {
      if (a[q] == null) continue;
      const agree = a[q] <= 2;
      if (agreeItems.includes(q) ? agree : !agree) score++;
    }
    return {
      rows: [["AQ-10 total score", `${score} / 10`], ["Referral threshold", "6 or more"],
             ["Result", score >= 6 ? "Score of 6 or above: consider referral for a specialist diagnostic assessment" : "Below referral threshold"]],
      rule: "1 point for Definitely or Slightly Agree on items 1, 7, 8 and 10; 1 point for Definitely or Slightly Disagree on items 2, 3, 4, 5, 6 and 9."
    };
  }

  function vInitial(a, cfg) {
    const P = [2, 3], perfPos = pos(a, cfg.perf[0], cfg.perf[1], [4, 5]);
    const impaired = perfPos >= 1;
    const ina = pos(a, 1, 9, P), hyp = pos(a, 10, 18, P);
    const rows = [
      ["Inattentive (Q1–9): number scored 2 or 3", `${ina} / 9`],
      ["Hyperactive/Impulsive (Q10–18): number scored 2 or 3", `${hyp} / 9`],
      ["Total Symptom Score (Q1–18)", `${sum(a, 1, 18)}`],
    ];
    cfg.screens.forEach(s => rows.push([`${s.name} (Q${s.lo}–${s.hi}): number scored 2 or 3`, `${pos(a, s.lo, s.hi, P)} / ${s.hi - s.lo + 1}`]));
    rows.push([`Performance (Q${cfg.perf[0]}–${cfg.perf[1]}): number scored 4 or 5`, `${perfPos}`]);
    rows.push(["Average Performance Score", `${avg(a, cfg.perf[0], cfg.perf[1])}`]);
    const inaOk = ina >= 6 && impaired, hypOk = hyp >= 6 && impaired;
    const res = [
      ["Predominantly Inattentive subtype", meets(inaOk && !hypOk)],
      ["Predominantly Hyperactive/Impulsive subtype", meets(hypOk && !inaOk)],
      ["ADHD Combined Inattention/Hyperactivity", meets(inaOk && hypOk)],
    ];
    cfg.screens.forEach(s => res.push([`${s.name} Screen`, meets(pos(a, s.lo, s.hi, P) >= s.need && impaired)]));
    return { rows, result: res,
      rule: `A positive symptom is a 2 or 3. Each screen also requires a 4 or 5 on at least one Performance item (Q${cfg.perf[0]}–${cfg.perf[1]}). ADHD subtypes need 6 of 9 positives on Q1–9 and/or Q10–18.` };
  }

  window.SCORE = {
    aq10,
    vparent: a => vInitial(a, { perf: [48, 55], screens: [
      { name: "Oppositional-Defiant Disorder", lo: 19, hi: 26, need: 4 },
      { name: "Conduct Disorder", lo: 27, hi: 40, need: 3 },
      { name: "Anxiety/Depression", lo: 41, hi: 47, need: 3 }] }),
    vteacher: a => vInitial(a, { perf: [36, 43], screens: [
      { name: "Oppositional-Defiant/Conduct Disorder", lo: 19, hi: 28, need: 3 },
      { name: "Anxiety/Depression", lo: 29, hi: 35, need: 3 }] }),
    vfu: a => ({
      rows: [["Total Symptom Score (Q1–18)", `${sum(a, 1, 18)}`],
             ["Inattentive (Q1–9): number scored 2 or 3", `${pos(a, 1, 9, [2, 3])} / 9`],
             ["Hyperactive/Impulsive (Q10–18): number scored 2 or 3", `${pos(a, 10, 18, [2, 3])} / 9`],
             ["Average Performance Score (Q19–26)", `${avg(a, 19, 26)}`]],
      rule: "Track the Total Symptom Score and Average Performance Score over time to measure improvement with treatment."
    })
  };
})();

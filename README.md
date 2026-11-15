# Screening Questionnaires — Dr. Susan MacDonald

A simple website where clients complete screening questionnaires and download a PDF of their answers.

- Runs entirely in the browser. Nothing is saved or sent to any server.
- Questionnaires: AQ-10 (Adult), NICHQ Vanderbilt (Parent, Teacher, and Follow-ups). ASRS to be added.
- The downloaded PDF lists every answer plus a scoring summary (for clinician use) calculated with the official published rules.

## Publish on GitHub Pages
1. Create a new repository on GitHub (e.g. `screening`).
2. Upload everything in this folder (keep the `js` folder) to the repository.
3. Go to **Settings → Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/screening/`.

## Files
- `index.html`, `style.css` — the page
- `js/data.js` — questionnaire wording (copied verbatim from the official forms)
- `js/scoring.js` — official scoring rules
- `js/app.js` — the question flow and PDF export
- `js/jspdf*.js` — PDF library (bundled so the site works without outside services)

# Lokale Bibliotheken – Lieferstand 26.11.2026

Proof of Concept zur fachlichen Prüfung, keine Freigabe für den Echtbetrieb. Keine Laufzeitinstallation, keine Bibliotheksabrufe von CDNs. Pfade beziehen sich auf `vendor/`. Die genannten Paketpfade sind relativ zur Wurzel des jeweiligen, exakt versionierten npm-Pakets.

| Bibliothek | Version | Lizenz | Bezugsquelle / ausgelieferte Dateien |
|---|---|---|---|
| Mozilla PDF.js | 6.5.438 | Apache-2.0 | `pdfjs-dist@6.5.438`: `build/pdf.min.mjs` und `build/pdf.worker.min.mjs`; Lizenz in `PDFJS-LICENSE.txt`. Lokale Zeichenmappings, Standardschriften, Farbprofil und Bilddecoder aus demselben Paket unter `pdfjs-assets/`, mit den jeweiligen Original-Lizenzen. Kein QuickJS-Scripting-Modul. |
| pdf-lib | 1.17.1 | MIT | `pdf-lib@1.17.1/dist/pdf-lib.min.js` (interner Stempel-/PDF-Export) |
| pdfmake | 0.2.7 | MIT | `pdfmake@0.2.7/build/pdfmake.min.js` (Formular-PDFs) |
| Roboto (Regular, Medium, Italic, MediumItalic) | 3.005 | Apache-2.0 | `https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js`, Schriftversion laut eingebettetem TTF. |
| Vue | 3.5.42 | MIT | `vue@3.5.42/dist/vue.global.prod.js` |
| Signature Pad | 4.1.7 | MIT | `signature_pad@4.1.7/dist/signature_pad.umd.min.js` |
| Leaflet | 1.9.4 | BSD-2-Clause | `leaflet@1.9.4/dist/leaflet.js` und `leaflet.css` |
| Driver.js | 1.3.1 | MIT | `driver.js@1.3.1/dist/driver.js.iife.js` (lokal `driver.js`) und `dist/driver.css`, beide bytegleich zum Paket. |
| Tailwind CSS | 3.4.17 | MIT | `https://github.com/tailwindlabs/tailwindcss/releases/tag/v3.4.17` (lokales Build-Werkzeug für `kultursh.css`); `tailwindcss.js` ist eine ungenutzte Kopie des Play-CDN-Bundles 3.4.17 und nicht Teil der Hosting-Positivliste. |

**Kein jsPDF eingebunden.** PDF.js liest und rendert, pdf-lib stempelt, pdfmake erzeugt die Formular-PDFs. Hinweise auf PDF.js in den Anleitungen meinen nicht pdf-lib.

## Update und Prüfung

`python3 update-pdfjs.py` prüft vor dem Entpacken die SHA-256-Summe des kompletten offiziellen npm-Archivs und kopiert nur die benötigten Dateien. API, Worker und Ressourcen gemeinsam ausrollen. Einzeldateien lassen sich mit `shasum -a 256 -c LIBRARIES.sha256` im Projektverzeichnis prüfen. Beim Update Referenzversion, Archiv- und Dateiprüfsummen nach Quellenabgleich aktualisieren, Import, signierten Export und Speicherverhalten erneut testen.

Die Wahl von 6.x ist beabsichtigt: Mozilla nennt 4.2.67 als Korrektur für CVE-2024-4367 (`GHSA-wgrm-67xf-hhpq`). Der letzte 5.x-Stand 5.7.284 fällt jedoch in den betroffenen Bereich der späteren Viewer-Meldung `GHSA-hq66-cqwq-w95j` (Korrektur ab 6.2.108). Der PoC verwendet nicht den vollständigen Viewer: Er rendert Seiten auf Canvas und startet keine PDF-Skripte. `isEvalSupported: false` wird explizit übergeben; es ist kein allgemeiner JavaScript-Filter und der Export ist keine Bereinigung fremder PDFs.

## Paketmanagement: Vorschlag für die fachliche Prüfung

Für den PoC die geprüften Dateien samt Inventar und Prüfsummen in Git lassen. So können Fachprüfende genau dieselben Dateien ohne Node.js, Build oder Netzverbindung zum Paketregister prüfen. Nachteil: Versionsabgleich, Sicherheitsmeldungen und Lizenzpflege sind Handarbeit.

Als nächsten Schritt wäre npm **nur auf dem Wartungsrechner oder in CI** sinnvoll: exakte Versionen in `package.json`, eingechecktes `package-lock.json`, `npm ci --ignore-scripts`, anschließende kontrollierte Kopie über eine Positivliste. Vorteile: reproduzierbare Auflösung, maschinell prüfbarer Abhängigkeitsbaum und leichterer Advisory-Abgleich. Nachteile: zusätzliche Werkzeugkette und Register-/Lieferkettenrisiken; transitive Meldungen müssen nach tatsächlicher Browser-Nutzung eingeordnet werden. Ein Paket-Audit ersetzt weder Funktionstests noch fachliche oder datenschutzrechtliche Abnahme. Kein `node_modules` auf den Webserver; keine automatischen Aktualisierungen des freigegebenen Lieferstands.
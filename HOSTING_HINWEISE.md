# Übergabe an das IT-Büro Adiwidjaja

## Veröffentlichung: Positivliste statt Projektkopie

Auf dem Zielhost `https://tools.kulturellebildung-sh.de` nur die folgenden öffentlichen Dateien bereitstellen. Die vorhandene CMS-Startseite und deren Serverkonfiguration **nicht überschreiben**. Verzeichnisstruktur und Groß-/Kleinschreibung beibehalten. Kein Build, Backend, Upload-Endpunkt oder CDN erforderlich.

| Ziel | Dateien |
|---|---|
| Portalverzeichnis | `index.html`, `fahrtkosten.html`, `honorar.html`, `verwendungsnachweis.html`, `changelog.html` (öffentlich verlinkt) |
| Bilder im selben Verzeichnis | `favicon-sh.png`, `Logo-SH.jpg`, `Ressort-Logo.jpg` |
| `vendor/` – Anwendung | `kultursh.css`, `fahrtkosten.js`, `honorar.js`, `verwendungsnachweis.js` |
| `vendor/` – Bibliotheken | `vue.global.prod.js`, `pdfmake.min.js`, `vfs_fonts.js`, `signature_pad.umd.min.js`, `leaflet.js`, `leaflet.css`, `driver.js`, `driver.css` |
| Apache | `.htaccess` ausschließlich im Suite-Verzeichnis; andernfalls Regeln im Virtual Host umsetzen |

**Nicht öffentlich:** `pruef-tool.html` und `intern.html`. Falls benötigt, in einem getrennten, serverseitig authentifizierten Bereich (auch direkte Dateiaufrufe schützen). Ebenso keine Backups, ZIPs, Vorlagen, Werkzeuge, Build-/Downloadskripte, internen Anleitungen oder `.DS_Store` hochladen. JSON-Entwürfe und ausgefüllte PDFs gehören nicht auf den Webspace.

## Vorschau und Livegang

Für die Vorschau auf `redlin.de/kultursh` bleibt `IS_DEMO_PREVIEW` auf `true`. Beim Deployment auf `kulturellebildung-sh.de` nach Freigabe in den vier öffentlichen Portal- und Formularseiten gemeinsam `const IS_DEMO_PREVIEW = true;` durch `const IS_DEMO_PREVIEW = false;` ersetzen. Das entfernt den Vorschauhinweis und aktiviert die drei offiziellen Footer-Links. Beide Varianten sind in den CSP-Hashes berücksichtigt; den übrigen Skriptblock einschließlich Leerzeichen unverändert lassen.

## HTTP-Header

Die lokale `.htaccess` enthält die vollständigen Werte **je HTML-Datei** und ist nicht im Git-Repository. Das IT-Büro muss sie separat bereitstellen oder die Regeln im Virtual Host setzen. Auf Apache `mod_headers`, erlaubte Overrides und `Options -Indexes` prüfen. HTTP auf HTTPS umleiten. HSTS erst nach Freigabe für den gesamten Host aktivieren. Für andere Server dieselben Response-Header setzen:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: geolocation=(), microphone=(), payment=(), usb=()
Referrer-Policy: no-referrer
X-DNS-Prefetch-Control: off
Strict-Transport-Security: max-age=31536000
```

**CSP für die Fahrtkostenseite** (eine Headerzeile); nur hier `Referrer-Policy: origin`, damit OSM die Anwendung erkennt, ohne Pfad und Parameter zu erhalten:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'sha256-3XcjeUie9WoQxhC1Zbd+11rYGv6/ttDFOeyW8YQAPas=' 'sha256-7NgESNpXGld4lylThMubgdD9zW6I0V4TC5BlEaBqAt8='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; font-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org https://router.project-osrm.org; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
```

Für Honorar **alle drei externen Origins entfernen**. Für Verwendungsnachweis zusätzlich `unsafe-eval` entfernen. Das Portal erlaubt nur die beiden Hashes des Umschaltblocks, das Änderungsprotokoll bleibt bei `script-src 'none'`. Keine pauschale Inline-Freigabe für Skripte: `unsafe-eval` dient nur dem Vue-Templatecompiler, `unsafe-inline` nur Styles. `frame-src blob:` erlaubt die lokale PDF-Vorschau. Die HTML-Meta-CSP und geerbte Server-/CMS-Policies wirken zusätzlich: auf widersprüchliche Header prüfen, nicht global lockern. Keine Analytics, Tag-Manager, Preconnects oder externen Fonts über das CMS injizieren. Bei gemeinsamen Origins können andere Skripte derselben Origin auf den Browserspeicher zugreifen: nur mit vertrauenswürdigen Anwendungen teilen.

## Ergebnis der URL-Prüfung und Betriebsgrenzen

- Alle HTML-/JS-Dateien einschließlich Backups und Vendor-Bundles nach URL-Literalen geprüft. Öffentliche Einstiegspunkte laden Skripte, CSS, Logos und PDF-Schriften lokal. Die Rechtslinks sind normale Navigation: in der Vorschau zu Redlin, im Livebetrieb zu `/impressum/`, `/datenschutz/` und `/barrierefreiheit/` auf der offiziellen Domain. SVG-/XML-Namensräume, Lizenztexte, Dokumentationslinks und Leaflet-Attribution sind keine CDN-Abhängigkeiten. Leaflet-CSS enthält relative Bilder für ungenutzte Standardmarker/Layer-Auswahl; die Anwendung zeichnet Linien und Kreise ohne diese Assets.
- Einzige externe **Datenabrufe**: Ortsnamen an Nominatim, Koordinaten an OSRM, beim Öffnen der Karte Kacheln von OpenStreetMap. Kein Esri-Fallback. Freigabe nur im Arbeitsspeicher der geöffneten Seite, keine Abfrage beim Tippen. Jeder Such-/Routingabruf bricht nach acht Sekunden ab. Internes Prüfwerkzeug enthält weitere Karten-/Google-Verweise; nicht Teil der Positivliste. Tailwind-Laufzeit und PDF-Prüfbibliotheken werden öffentlich nicht benötigt.
- Öffentliche Dienste ohne Verfügbarkeitsgarantie. Vor Freigabe Nutzungsbedingungen prüfen, insbesondere `https://operations.osmfoundation.org/policies/nominatim/`: keine personenbezogenen/vertraulichen Suchtexte, höchstens eine Anfrage pro Sekunde **für die gesamte Anwendung**. Browserseitige Pause und Zwischenspeicher koordinieren nicht mehrere Personen. Bei entsprechendem Aufkommen vorab geeigneten genehmigten Dienst vereinbaren oder Online-Funktion deaktivieren; manuelle Erfassung bleibt möglich. Ein Anbieterwechsel erfordert angepasste Hinweise, CSP und Prüfung der Empfänger.

## Textbausteine zur redaktionellen Freigabe

**Datenschutz:** „Abrechnungsdaten, Bankverbindung, Belege und Unterschrift werden im Browser verarbeitet. PDFs und JSON-Dateien werden lokal erzeugt, nicht automatisch eingereicht. Stammdaten werden nur auf Wunsch, Entwürfe des Verwendungsnachweises einschließlich vorhandener Unterschrift automatisch im lokalen Browserspeicher gespeichert. Gespeicherte Daten können im jeweiligen Formular oder über die Browser-Einstellungen gelöscht werden. Heruntergeladene Dateien sind gesondert zu löschen. Für den Aufruf des Portals gelten die allgemeinen Hinweise zum Webhosting. Nur wenn Sie die Online-Funktion nutzen, erhält Nominatim die gesuchten Orte, OSRM die Routenkoordinaten und OpenStreetMap beim Anzeigen der Karte den Kartenausschnitt. Bei diesen Abrufen werden IP-Adresse und Herkunftsdomain übertragen. Verwenden Sie keine personenbezogenen oder vertraulichen Adressen. Die Nutzung ist freiwillig; Sie können Kilometer ohne Online-Dienste eingeben. Nach einem Neuladen ist die Freigabe zurückgesetzt.“ Betreiber ergänzt vor Veröffentlichung konkrete Empfänger, Rechtsgrundlagen, mögliche Drittlandübermittlungen sowie tatsächliche Log-/Speicherfristen.

**Barrierefreiheit:** „Die Erklärung umfasst auch das Abrechnungsportal mit Fahrtkosten, Honorar und Verwendungsnachweis. Die Formulare haben verknüpfte Feldbeschriftungen, sichtbare Tastaturfokusse und Ansagen für Summen und Statusmeldungen. Kilometer lassen sich ohne Karte eintragen; anstelle der gezeichneten Unterschrift kann eine Bilddatei gewählt werden. Für erzeugte PDF-Dokumente ist vollständige Barrierefreiheit nicht nachgewiesen. Wenn Sie ein Dokument in zugänglicher Form benötigen oder eine Barriere melden möchten, nutzen Sie bitte die in dieser Erklärung genannte Feedbackstelle.“ Prüfdatum, Verfahren, tatsächliche Barrieren und Abhilfen nach der Abnahme ergänzen; bestehende Kontakt- und Beschwerdewege beibehalten. Keine pauschale Konformitätszusage.

## Wartung der lokalen Bibliotheken

Halbjährlich nach Updates und bei Sicherheitsmeldungen zeitnah nach betroffenen Versionen sehen. Änderungen einschließlich Versionssprüngen zuerst in einer Testumgebung prüfen; Version, Datum und SHA-256-Prüfsumme der übernommenen Dateien dokumentieren. Nach Änderungen an CSS-Klassen das statische Stylesheet lokal neu bauen und mitliefern. Neben der folgenden Abnahme auch Honorar-PDF mit Unterschrift, Fahrtkosten-PDF mit mehreren Fahrten und Belegen sowie das Speichern und Löschen von Stammdaten testen. Bei internem Betrieb zusätzlich ein Prüf-PDF öffnen, stempeln, signieren und herunterladen.

## Abnahme auf dem Zielhost

1. Alle Seiten und Assets direkt aufrufen, MIME-Typen und Response-Header (auch für die Verzeichnis-Startseite) prüfen; interne Dateien müssen 403/404 liefern.
2. Frisches Browserprofil, Netzwerkprotokoll: Öffnen, Tippen, Muster laden und manuelle Kilometer dürfen keine Fremdanfragen auslösen. Abbrechen der Freigabe und Neuladen testen. Erst nach Zustimmung mit nicht personenbezogenen Beispielorten Route und Karte testen. OSRM blockieren: manuelle Eingabe und bisheriger Wert bleiben erhalten.
3. Mit Tastatur und Screenreader dynamische Zeilen, Hilfen, Fehler, Zusammenfassungen, Dateiauswahl und Dialoge prüfen. Fokus, Kontraste bei Hover/Fokus sowie bei Vergrößerung kontrollieren. PDF-Download, Blob-Vorschau, Entwurfsexport/-import und lokale Löschung je Browser prüfen. Technische Stichproben ersetzen keine BITV-Abnahme oder PDF/UA-Prüfung.
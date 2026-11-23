# Änderungsprotokoll Kulturvermittlung SH

## 22.11.2026 – Vorschau und Livebetrieb
**Portal 1.4.0 · Fahrtkosten 1.12.0 · Honorar 1.6.0 · Verwendungsnachweis 1.2.0**

Die Vorschau auf redlin.de zeigt einen Hinweisbalken und verlinkt nur das dortige Impressum und den Datenschutz. Erst beim Livegang werden die drei offiziellen Rechtslinks einschließlich der Erklärung zur Barrierefreiheit aktiviert.

## 21.11.2026 – Vorbereitung auf das öffentliche Hosting
- **Portal 1.3.0:** Alle vier öffentlichen Seiten enthalten einen Datenschutzhinweis und Links zu Impressum, Datenschutzerklärung und Erklärung zur Barrierefreiheit. Die Hosting-Hinweise dokumentieren Upload-Dateien und HTTP-Sicherheitsheader.
- **Fahrtkosten 1.11.0:** Online-Ortssuche, Routing und Karte benötigen eine aktive Freigabe. Antwortet ein Dienst nicht innerhalb von acht Sekunden, bleibt die manuelle Kilometereingabe möglich. Der Esri-Fallback entfällt.
- **Honorar 1.5.0:** Eingabefelder und dynamische Stundenzeilen sind explizit beschriftet; Honorarsummen und IBAN-Fehler werden für Screenreader ausgezeichnet.
- **Verwendungsnachweis 1.1.0:** Auch nachträglich hinzugefügte Tabellenfelder haben eindeutige Beschriftungen. Summen und Vollständigkeitsstatus werden für Screenreader ausgezeichnet; die lokale PDF-Vorschau verwendet einen nativen Dialog.
- Sichtbare Tastaturfokusse und kontrastreichere Textfarben auf allen Formularseiten. Berechnungsformeln und gespeicherte Datenformate bleiben unverändert.

## Fahrtkosten – Version 1.10.2
- Die Kartenansicht wählt den Kachel-Anbieter automatisch nach dem Aufrufprotokoll: OpenStreetMap bei `http:` und `https:`, Esri World Street Map bei lokalem `file:`-Aufruf.
- CARTO wurde entfernt, damit lokal geöffnete Karten nicht mehr den Hinweis „API KEY REQUIRED“ anzeigen.
- Die Esri-Kacheladresse verwendet die erforderliche Reihenfolge `{z}/{y}/{x}`.

## 20.09.2026 – Fahrtkosten 1.10.1 · Honorar 1.4.1 · Prüf-Tool 3.7.1
- Vor- und Nachname bleiben getrennt, die zusätzliche Überschrift „Name“ entfällt. Straße und Hausnummer bilden ein Autofill-Feld; beim Laden älterer Profile wird eine separat gespeicherte Hausnummer übernommen.
- Wohnort und vollständiger Name lassen sich für den Erklärungsort bzw. den Kontoinhaber übernehmen.
- Die Plausibilitätsprüfung markiert ausschließlich absolute Abweichungen von mehr als 5 km als auffällig.

## Portal – Version 1.2.2
- Änderungsprotokoll direkt aus der Fußzeile verlinkt.
- Versions-Popup bleibt entfernt; das Portal benötigt kein Vue.
- Statisches CSS und lokale Programmbibliotheken bleiben erhalten.

## Fahrtkosten – Version 1.6.2
- Änderungsprotokoll direkt aus der Fußzeile verlinkt.
- Ausführlicher Datenschutzhinweis zur Online-Routenberechnung bleibt einmal zentral oberhalb der Fahrtentabelle.
- Pro Sitzung erfolgt höchstens eine kurze Bestätigung vor der ersten Online-Routenberechnung.
- Statisches CSS, lokale Bibliotheken und optionale lokale Stammdatenspeicherung bleiben erhalten.
- Kartenansicht verwendet CARTO Voyager statt der OpenStreetMap-Kachel-URL, damit Karten auch bei lokalem Öffnen über `file://` geladen werden.

## Honorar – Version 1.1.2
- Änderungsprotokoll direkt aus der Fußzeile verlinkt.
- Statisches CSS, lokale Bibliotheken und optionale lokale Stammdatenspeicherung bleiben erhalten.

## Prüf-Tool – Version 2.4.2
- Änderungsprotokoll direkt aus der Fußzeile verlinkt.
- Signatur-Einbettung repariert: Data-URLs werden lokal dekodiert und nicht mehr über `fetch(data:...)` verarbeitet.
- PNG- und JPG-Unterschriften werden korrekt über `embedPng()` bzw. `embedJpg()` in die PDF eingebettet.
- Freigabe-Download wird erst aktiviert, wenn die signierte Vorschau erfolgreich erzeugt wurde.

## Vorherige Datenschutz-/Sicherheitsänderungen
- Externe Programmbibliotheken auf lokale Auslieferung umgestellt.
- Tailwind-Laufzeit durch statische `vendor/kultursh.css` ersetzt.
- Content-Security-Policy und Referrer-Schutz ergänzt.
- Optionale lokale Speicherung von Stammdaten und Unterschrift.
- Bereits lokal gespeicherte Profile und Prüf-Unterschriften werden weiterhin erkannt.
- Hinweis auf vertrauenswürdige Endgeräte.
- Online-Routenberechnung transparent gekennzeichnet und nur nach einmaliger Bestätigung pro Sitzung genutzt.

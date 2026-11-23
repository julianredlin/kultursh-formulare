        const APP_VERSION = "1.12.0";
        const { createApp, ref, watch, onMounted, computed, nextTick } = Vue;

        createApp({
            setup() {
                const ansicht = ref('eingabe');
                const ibanKorrekt = ref(false);
                const ibanFehler = ref('');
                let signaturePadInstance = null;
                const version = APP_VERSION;
                const profilSpeichern = ref(false);
                const routeDatenschutzBestaetigt = ref(false);
                const routeModalFahrt = ref(null);
                const aktiveHilfe = ref('');
                let routeMapInstance = null;
                let routeLayerGroup = null;

                const getHeuteFormat = () => new Date().toISOString().split('T')[0];

                const profil = ref({ 
                    vorname: '', nachname: '', name: '', email: '', strasse: '', hausnummer: '', plz: '', wohnort: '', ort: '', antragsdatum: getHeuteFormat(), 
                    kontoinhaber: '', bankname: '', iban: '' 
                });

                const ladeBildAlsDataUrl = async (pfad) => {
                    try {
                        const response = await fetch(pfad, { cache: 'no-store' });
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        return await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.warn('Logo konnte nicht geladen werden:', pfad, e);
                        return null;
                    }
                };

                const vollerName = computed(() => [profil.value.vorname, profil.value.nachname].filter(Boolean).join(' ').trim());

                const wohnanschrift = computed(() => {
                    const strasse = (profil.value.strasse || '').trim();
                    const ort = [profil.value.plz, profil.value.wohnort].filter(Boolean).join(' ');
                    return [strasse, ort].filter(Boolean).join(', ');
                });

                const generiereId = () => Math.random().toString(36).substr(2, 9);
                const erstelleLeereFahrt = () => ({
                    id: generiereId(), datum: getHeuteFormat(), start: '', ziel: '', zwischenziele: [], art: 'pkw', streckenTyp: 'retour', zweck: '', hinweis: '', mitfahrerAnzahl: 0, mitfahrerNamen: '', km: 0, berechneteKm: 0, kmManuell: true, begruendung: '', kosten: 0, fahrzeitMinuten: 0, zeitVerguetungAktiv: false, belege: [], routenGeometrie: [], routenPunkte: [], kartenAbweichungen: []
                });
                
                const fahrten = ref([
                    erstelleLeereFahrt()
                ]);

                onMounted(() => {
                    const daten = localStorage.getItem('kultur_profil_v10');
                    profilSpeichern.value = !!daten;
                    if (daten) {
                        profil.value = { ...profil.value, ...JSON.parse(daten) };
                        if(!profil.value.antragsdatum) profil.value.antragsdatum = getHeuteFormat();
                        if (!profil.value.strasse && profil.value.anschrift) profil.value.strasse = profil.value.anschrift;
                        if (profil.value.hausnummer && profil.value.strasse && !profil.value.strasse.trim().endsWith(String(profil.value.hausnummer).trim())) {
                            profil.value.strasse = `${profil.value.strasse.trim()} ${String(profil.value.hausnummer).trim()}`.trim();
                        }
                        if ((!profil.value.vorname || !profil.value.nachname) && profil.value.name) {
                            const teile = profil.value.name.trim().split(/\s+/);
                            profil.value.vorname = profil.value.vorname || (teile.shift() || '');
                            profil.value.nachname = profil.value.nachname || teile.join(' ');
                        }
                        pruefeIBAN();
                    }
                    nextTick(() => {
                        const canvas = document.getElementById('signature-pad');
                        if (canvas && !signaturePadInstance) {
                            signaturePadInstance = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: 'rgb(0,0,128)' });
                        }
                    });
                });

                watch(profil, (neueWerte) => {
                    if (profilSpeichern.value) {
                        localStorage.setItem('kultur_profil_v10', JSON.stringify({ ...neueWerte, name: vollerName.value }));
                    }
                }, { deep: true });

                const zielHinzufuegen = (fahrt) => {
                    fahrt.zwischenziele.push('');
                    fahrt.streckenTyp = 'einfach';
                    updateKosten(fahrt);
                };

                const toggleHilfe = (hilfe) => {
                    aktiveHilfe.value = aktiveHilfe.value === hilfe ? '' : hilfe;
                };
                const hilfeSichtbar = (hilfe) => aktiveHilfe.value === hilfe;

                const musterFahrtkostenLaden = () => {
                    profil.value = {
                        vorname: 'Anna', nachname: 'Beispiel', name: '', email: 'anna.beispiel@kultursh.de', strasse: 'Musterstraße 12', hausnummer: '', plz: '24103', wohnort: 'Kiel', ort: 'Kiel', antragsdatum: getHeuteFormat(),
                        kontoinhaber: 'Anna Beispiel', bankname: 'Musterbank', iban: 'DE89370400440532013000'
                    };
                    pruefeIBAN();
                    const musterfahrt = {
                        ...erstelleLeereFahrt(),
                        start: 'Kiel', ziel: 'Rendsburg', art: 'pkw', streckenTyp: 'retour', zweck: 'Kulturvermittlung an der Schule', mitfahrerAnzahl: 1, mitfahrerNamen: 'Max Mustermann', km: 72, berechneteKm: 72, kmManuell: true,
                        begruendung: '', hinweis: 'Hin- und Rückfahrt zur Projektveranstaltung.', fahrzeitMinuten: 80, zeitVerguetungAktiv: true
                    };
                    updateKosten(musterfahrt);
                    fahrten.value = [musterfahrt];
                    aktiveHilfe.value = '';
                };

                const formularLeeren = () => {
                    profil.value = { vorname: '', nachname: '', name: '', email: '', strasse: '', hausnummer: '', plz: '', wohnort: '', ort: '', antragsdatum: getHeuteFormat(), kontoinhaber: '', bankname: '', iban: '' };
                    ibanKorrekt.value = false;
                    ibanFehler.value = '';
                    fahrten.value = [erstelleLeereFahrt()];
                    aktiveHilfe.value = '';
                    if (signaturePadInstance) signaturePadInstance.clear();
                };

                const uebernehmeWohnort = () => {
                    profil.value.ort = (profil.value.wohnort || '').trim();
                };

                const uebernehmeKontoinhaber = () => {
                    profil.value.kontoinhaber = vollerName.value;
                };

                const toggleProfilSpeicherung = () => {
                    if (profilSpeichern.value) {
                        localStorage.setItem('kultur_profil_v10', JSON.stringify(profil.value));
                    } else {
                        localStorage.removeItem('kultur_profil_v10');
                    }
                };

                const loescheLokaleProfildaten = () => {
                    localStorage.removeItem('kultur_profil_v10');
                    profilSpeichern.value = false;
                    alert('Die auf diesem Gerät gespeicherten Stammdaten wurden gelöscht. Die aktuell eingegebenen Werte bleiben bis zum Schließen oder Neuladen der Seite sichtbar.');
                };

                const formatCurrency = (value) => (Math.round((Number(value) || 0) * 100) / 100).toFixed(2).replace('.', ',');
                const formatDatum = (datumStr) => datumStr ? new Date(datumStr).toLocaleDateString('de-DE') : '';
                const sortiereNachDatum = () => fahrten.value.sort((a, b) => new Date(a.datum) - new Date(b.datum));
                const sortierteFahrten = computed(() => [...fahrten.value].sort((a, b) => new Date(a.datum) - new Date(b.datum)));

                const pruefeIBAN = () => {
                    profil.value.iban = profil.value.iban.toUpperCase();
                    let iban = profil.value.iban.replace(/\s+/g, '');
                    if(iban.length === 0) { ibanFehler.value = ''; ibanKorrekt.value = false; return; }
                    if(!iban.startsWith('DE')) { ibanFehler.value = 'Eine deutsche IBAN muss mit "DE" beginnen.'; ibanKorrekt.value = false; return; }
                    if(iban.length !== 22) { ibanFehler.value = `Die IBAN muss genau 22 Zeichen lang sein (aktuell: ${iban.length}).`; ibanKorrekt.value = false; return; }
                    if(!/^DE\d{20}$/.test(iban)) { ibanFehler.value = 'Die IBAN darf nach "DE" nur noch Zahlen enthalten.'; ibanKorrekt.value = false; return; }
                    
                    let rearranged = iban.substring(4) + iban.substring(0, 4);
                    let numericIban = Array.from(rearranged).map(c => {
                        let code = c.charCodeAt(0);
                        return (code >= 65 && code <= 90) ? (code - 55).toString() : c;
                    }).join('');
                    
                    try { 
                        if (BigInt(numericIban) % 97n === 1n) { ibanKorrekt.value = true; ibanFehler.value = ''; }
                        else { ibanKorrekt.value = false; ibanFehler.value = 'Prüfsumme fehlerhaft.'; }
                    } catch (e) { ibanKorrekt.value = false; ibanFehler.value = 'Fehler bei der Überprüfung.'; }
                };

                const updateKosten = (fahrt) => {
                    if (fahrt.art === 'pkw') {
                        let mitfahrerAnzahl = Math.max(0, Number(fahrt.mitfahrerAnzahl) || 0);
                        let kmSatz = 0.30 + (mitfahrerAnzahl * 0.02);
                        let rawKosten = (fahrt.km || 0) * kmSatz;
                        if (fahrt.zeitVerguetungAktiv) rawKosten += 25.00;
                        fahrt.kosten = Math.round(rawKosten * 100) / 100;
                    }
                };

                const gesamtKostenZahl = computed(() => fahrten.value.reduce((s, f) => s + (Number(f.kosten) || 0), 0));

                const neueFahrtHinzufuegen = () => {
                    fahrten.value.push(erstelleLeereFahrt());
                };

                const fahrtEntfernen = (f) => { fahrten.value = fahrten.value.filter(x => x.id !== f.id); };

                const onlineJson = async (url) => {
                    if (!routeDatenschutzBestaetigt.value) throw new Error('Nicht aktiviert');
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 8000);
                    try {
                        const response = await fetch(url, {signal: controller.signal, credentials: 'omit'});
                        if (!response.ok) throw new Error('Dienst nicht erreichbar');
                        return await response.json();
                    } finally { clearTimeout(timer); }
                };
                const manuellWeiter = (fahrt) => {
                    fahrt.kmManuell = true;
                    fahrt.routeFehler = 'Route nicht verfügbar. Der Kartendienst antwortet nicht rechtzeitig oder findet keine Strecke. Bitte Kilometer manuell eintragen.';
                };
                const ortCache = new Map();
                let naechsterStart = 0;
                const getCoords = async (ort) => {
                    if(!ort) return null;
                    if (ortCache.has(ort)) return ortCache.get(ort);
                    const start = Math.max(Date.now(), naechsterStart); naechsterStart = start + 1100;
                    await new Promise(resolve => setTimeout(resolve, start - Date.now()));
                    const d = await onlineJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ort)}&format=json&limit=1`);
                    const coords = d.length > 0 ? `${d[0].lon},${d[0].lat}` : null;
                    ortCache.set(ort, coords); return coords;
                };

                const berechneRoute = async (fahrt) => {
                    if (!fahrt.start || !fahrt.ziel) { fahrt.routeFehler = 'Bitte Start und Ziel eintragen.'; return; }
                    if (!aktiviereOnline()) return;
                    fahrt.routeFehler = '';
                    try {
                        let coordStart = await getCoords(fahrt.start);
                        let coordZiel = await getCoords(fahrt.ziel);
                        if (!coordStart || !coordZiel) { manuellWeiter(fahrt); return; }
                        
                        let waypoints = [coordStart];
                        for (let zz of fahrt.zwischenziele) {
                            if (zz.trim() !== '') {
                                let coordZz = await getCoords(zz);
                                if (!coordZz) throw new Error('Zwischenziel nicht gefunden');
                                waypoints.push(coordZz);
                            }
                        }
                        waypoints.push(coordZiel);
                        fahrt.routenPunkte = waypoints.map(p => p.split(',').map(Number));
                        if (!Array.isArray(fahrt.kartenAbweichungen)) fahrt.kartenAbweichungen = [];
                        const routeWaypoints = [
                            ...waypoints.slice(0, -1),
                            ...fahrt.kartenAbweichungen.map(p => `${p[0]},${p[1]}`),
                            waypoints[waypoints.length - 1]
                        ];

                        let urlStr = routeWaypoints.join(';');
                        const dRoute = await onlineJson(`https://router.project-osrm.org/route/v1/driving/${urlStr}?overview=full&geometries=geojson`);

                        if (!dRoute.routes?.length) throw new Error('Keine Route');
                        {
                            let dist = dRoute.routes[0].distance / 1000;
                            let dauerSekunden = dRoute.routes[0].duration;
                            fahrt.routenGeometrie = dRoute.routes[0].geometry?.coordinates || [];
                            if (fahrt.streckenTyp === 'retour') { dist *= 2; dauerSekunden *= 2; }
                            
                            fahrt.berechneteKm = Math.round(dist);
                            fahrt.fahrzeitMinuten = Math.round(dauerSekunden / 60);
                            fahrt.zeitVerguetungAktiv = (fahrt.fahrzeitMinuten > 60);
                            fahrt.kmManuell = false;
                            fahrt.km = fahrt.berechneteKm;
                            updateKosten(fahrt);
                        }
                    } catch (e) { manuellWeiter(fahrt); }
                };


                const zeichneLeafletRoute = () => {
                    if (!routeMapInstance || !routeModalFahrt.value) return;
                    if (routeLayerGroup) routeLayerGroup.clearLayers();
                    else routeLayerGroup = L.layerGroup().addTo(routeMapInstance);
                    const f = routeModalFahrt.value;
                    const coords = (f.routenGeometrie || []).map(c => [c[1], c[0]]);
                    if (coords.length > 1) {
                        L.polyline(coords, { color: '#00305e', weight: 6, opacity: 0.9 }).addTo(routeLayerGroup);
                        L.circleMarker(coords[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).bindTooltip('Start').addTo(routeLayerGroup);
                        L.circleMarker(coords[coords.length-1], { radius: 7, color: '#fff', weight: 2, fillColor: '#e2001a', fillOpacity: 1 }).bindTooltip('Ziel').addTo(routeLayerGroup);
                        routeMapInstance.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
                    }
                    (f.kartenAbweichungen || []).forEach((p, idx) => {
                        L.circleMarker([p[1], p[0]], { radius: 6, color: '#7c3aed', weight: 2, fillColor: '#c4b5fd', fillOpacity: 1 })
                            .bindTooltip(`Abweichung ${idx + 1}`).addTo(routeLayerGroup);
                    });
                };

                const aktiviereOnline = () => {
                    if (!routeDatenschutzBestaetigt.value) routeDatenschutzBestaetigt.value = confirm('Online-Dienste aktivieren? Nominatim (OpenStreetMap) erhält die Orte, OSRM die Koordinaten und OpenStreetMap bei Kartenanzeige den Kartenausschnitt. Dabei wird Ihre IP-Adresse übertragen. Abbrechen für manuelle Eingabe.');
                    return routeDatenschutzBestaetigt.value;
                };
                let leafletLaden;
                const ladeLeaflet = () => leafletLaden ||= new Promise((resolve, reject) => {
                    const script = document.createElement('script'); script.src = 'vendor/leaflet.js';
                    script.onload = resolve; script.onerror = () => { leafletLaden = null; script.remove(); reject(new Error('Leaflet fehlt')); };
                    document.head.append(script);
                });
                const initRouteMap = async () => {
                    await nextTick();
                    if (!window.L) {
                        alert('Für die Kartenansicht fehlt Leaflet im Ordner vendor (leaflet.js / leaflet.css).');
                        return;
                    }
                    const el = document.getElementById('route-map');
                    if (!el) return;
                    if (routeMapInstance) routeMapInstance.remove();
                    routeMapInstance = L.map(el, { scrollWheelZoom: true });
                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19,
                        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>'
                    }).addTo(routeMapInstance);
                    const punktSetzen = async (e) => {
                        if (!routeModalFahrt.value) return;
                        routeModalFahrt.value.kartenAbweichungen = routeModalFahrt.value.kartenAbweichungen || [];
                        routeModalFahrt.value.kartenAbweichungen.push([e.latlng.lng, e.latlng.lat]);
                        await berechneRouteMitGespeichertenPunkten(routeModalFahrt.value);
                    };
                    routeMapInstance.on('click', punktSetzen);
                    routeMapInstance.on('keydown', e => { if (e.originalEvent.key === 'Enter') punktSetzen({latlng: routeMapInstance.getCenter()}); });
                    zeichneLeafletRoute();
                    setTimeout(() => routeMapInstance?.invalidateSize(), 50);
                };

                const oeffneRouteModal = async (fahrt) => {
                    if (!aktiviereOnline()) return;
                    try { await ladeLeaflet(); } catch { fahrt.routeFehler = 'Karte konnte nicht geladen werden. Manuelle Eingabe bleibt möglich.'; return; }
                    routeModalFahrt.value = fahrt;
                    await nextTick(); document.getElementById('route-dialog').showModal();
                    await initRouteMap();
                };

                const schliesseRouteModal = () => {
                    document.getElementById('route-dialog')?.close();
                    routeModalFahrt.value = null;
                    if (routeMapInstance) { routeMapInstance.remove(); routeMapInstance = null; }
                    routeLayerGroup = null;
                };

                const berechneRouteMitGespeichertenPunkten = async (fahrt) => {
                    fahrt.routeFehler = '';
                    if (!fahrt?.routenPunkte?.length) return;
                    try {
                        const base = fahrt.routenPunkte;
                        const routeWaypoints = [
                            ...base.slice(0, -1).map(p => `${p[0]},${p[1]}`),
                            ...(fahrt.kartenAbweichungen || []).map(p => `${p[0]},${p[1]}`),
                            `${base[base.length-1][0]},${base[base.length-1][1]}`
                        ];
                        const d = await onlineJson(`https://router.project-osrm.org/route/v1/driving/${routeWaypoints.join(';')}?overview=full&geometries=geojson`);
                        if (!d.routes?.length) throw new Error('Keine Route gefunden');
                        let dist = d.routes[0].distance / 1000;
                        let dauer = d.routes[0].duration;
                        fahrt.routenGeometrie = d.routes[0].geometry?.coordinates || [];
                        if (fahrt.streckenTyp === 'retour') { dist *= 2; dauer *= 2; }
                        fahrt.berechneteKm = Math.round(dist);
                        fahrt.fahrzeitMinuten = Math.round(dauer / 60);
                        fahrt.zeitVerguetungAktiv = (fahrt.fahrzeitMinuten > 60);
                        if (!fahrt.kmManuell) fahrt.km = fahrt.berechneteKm;
                        updateKosten(fahrt);
                        zeichneLeafletRoute();
                    } catch (e) {
                        schliesseRouteModal();
                        manuellWeiter(fahrt);
                    }
                };

                const loescheKartenAbweichungen = async (fahrt) => {
                    fahrt.kartenAbweichungen = [];
                    await berechneRouteMitGespeichertenPunkten(fahrt);
                };

                const normalisiereRoute = (coords) => {
                    if (!coords || coords.length < 2) return [{x:40,y:210},{x:760,y:210}];
                    const lons = coords.map(c => Number(c[0]));
                    const lats = coords.map(c => Number(c[1]));
                    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
                    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                    const spanLon = Math.max(maxLon - minLon, 0.00001);
                    const spanLat = Math.max(maxLat - minLat, 0.00001);
                    const pad = 40, w = 720, h = 340;
                    return coords.map(c => ({
                        x: pad + ((c[0] - minLon) / spanLon) * w,
                        y: pad + (1 - ((c[1] - minLat) / spanLat)) * h
                    }));
                };
                const routeSvgPunkte = (coords) => normalisiereRoute(coords).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                const routeEndpunkt = (coords, ende) => {
                    const pts = normalisiereRoute(coords);
                    return ende ? pts[pts.length - 1] : pts[0];
                };

                const handleBelegUpload = (event, fahrt) => {
                    const files = event.target.files;
                    if (!fahrt.belege) fahrt.belege = [];
                    for(let file of files) {
                        if(file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    let width = img.width, height = img.height, max_dim = 1000;
                                    if (width > max_dim || height > max_dim) {
                                        if (width > height) { height = Math.round((height * max_dim) / width); width = max_dim; } 
                                        else { width = Math.round((width * max_dim) / height); height = max_dim; }
                                    }
                                    canvas.width = width; canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
                                    fahrt.belege.push(canvas.toDataURL('image/jpeg', 0.6));
                                };
                                img.src = e.target.result;
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                };

                const handleSignatureUpload = (e) => {
                    if (e.target.files[0] && signaturePadInstance) {
                        const r = new FileReader();
                        r.onload = (ev) => signaturePadInstance.fromDataURL(ev.target.result, {ratio: 1, width: 300, height: 150});
                        r.readAsDataURL(e.target.files[0]);
                    }
                };

                const clearSignature = () => { if (signaturePadInstance) signaturePadInstance.clear(); };

                const pruefeUndWeiter = () => {
                    pruefeIBAN();
                    if (!profil.value.vorname || !profil.value.nachname || !profil.value.email || !profil.value.strasse || !profil.value.plz || !profil.value.wohnort || !profil.value.ort || !profil.value.antragsdatum || !profil.value.kontoinhaber || !profil.value.bankname || !ibanKorrekt.value) {
                        alert("Bitte füllen Sie alle Pflichtfelder in Bereich 1 vollständig aus und prüfen Sie die IBAN.");
                        return;
                    }
                    if (fahrten.value.length === 0) {
                        alert("Bitte erfassen Sie mindestens eine Fahrt.");
                        return;
                    }
                    for (let f of fahrten.value) {
                        if (f.art === 'pkw' && f.kmManuell && f.berechneteKm > 0 && f.km !== f.berechneteKm && !f.begruendung.trim()) {
                            alert("Sie haben bei einer Fahrt abweichende km angegeben, aber keine Begründung eingetragen.");
                            return;
                        }
                    }
                    sortiereNachDatum();
                    ansicht.value = 'zusammenfassung';
                    window.scrollTo(0, 0);
                };

                const encodeRouteMeta = (obj) => {
                    const bytes = new TextEncoder().encode(JSON.stringify(obj));
                    let binary = '';
                    for (const b of bytes) binary += String.fromCharCode(b);
                    return btoa(binary);
                };

                const generiereNeuesPDF = async () => {
                    let sigImage = null;
                    if (signaturePadInstance && !signaturePadInstance.isEmpty()) {
                        sigImage = signaturePadInstance.toDataURL('image/png');
                    } else {
                        alert("Bitte fügen Sie eine Unterschrift hinzu, bevor Sie das PDF-Dokument erstellen.");
                        return;
                    }

                    const [ressortLogo, landLogo] = await Promise.all([
                        ladeBildAlsDataUrl('Ressort-Logo.jpg'),
                        ladeBildAlsDataUrl('Logo-SH.jpg')
                    ]);
                    const logoKopf = {
                        columns: [
                            ressortLogo ? { image: ressortLogo, width: 115, alignment: 'left' } : { text: '', width: 115 },
                            { text: '', width: '*' },
                            landLogo ? { image: landLogo, width: 82, alignment: 'right' } : { text: '', width: 82 }
                        ],
                        margin: [0, 0, 0, 12]
                    };

                    const fahrtenRows = [[
                        { text: 'Datum', style: 'tableHeader' },
                        { text: 'Route & Zweck', style: 'tableHeader' },
                        { text: 'Fahrzeug / ÖPNV', style: 'tableHeader' },
                        { text: 'km / Kosten', style: 'tableHeader', alignment: 'right' }
                    ]];

                    let gesamtBelege = [];
                    let sortedFahrten = [...fahrten.value].sort((a, b) => new Date(a.datum) - new Date(b.datum));
                    let gruppen = {};
                    sortedFahrten.forEach(f => {
                        let dateObj = new Date(f.datum);
                        let monthStr = dateObj.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
                        if(monthStr === 'Invalid Date') monthStr = 'Ohne Datum';
                        if(!gruppen[monthStr]) gruppen[monthStr] = [];
                        gruppen[monthStr].push(f);
                    });

                    Object.keys(gruppen).forEach(monat => {
                        fahrtenRows.push([{ text: monat, style: 'monthHeader', colSpan: 4 }, {}, {}, {}]);
                        gruppen[monat].forEach(f => {
                            let routeStr = `Von: ${f.start}`;
                            f.zwischenziele.filter(z => z).forEach(z => routeStr += `\nÜber: ${z}`);
                            routeStr += `\nNach: ${f.ziel} ${f.streckenTyp === 'retour' && f.art === 'pkw' ? '(Hin & Rück)' : ''}`;
                            routeStr += `\n\nZweck: ${f.zweck}`;
                            if (f.mitfahrerAnzahl > 0) routeStr += `\nMitfahrer: ${f.mitfahrerNamen} (${f.mitfahrerAnzahl} Person(en))`;
                            if (f.hinweis) routeStr += `\nHinweis: ${f.hinweis}`;
                            if (f.begruendung) routeStr += `\nBegründung Abweichung: ${f.begruendung}`;
                            if (f.kartenAbweichungen && f.kartenAbweichungen.length) routeStr += `\nKartenabweichung: ${f.kartenAbweichungen.length} zusätzlicher Routenpunkt(e)`;

                            let fahrzeugSatz = 0.30 + (f.mitfahrerAnzahl * 0.02);
                            let fahrzeugStr = f.art === 'pkw' ? `PKW (${fahrzeugSatz.toFixed(2).replace('.', ',')} €/km)` : 'ÖPNV (Beleg anbei)';
                            let kostenStr = f.art === 'pkw' ? `${f.km} km\n` + (f.zeitVerguetungAktiv ? `+ 25,00 € (Zeit)\n` : '') : '';
                            kostenStr += `${formatCurrency(f.kosten)} €`;

                            fahrtenRows.push([
                                { text: formatDatum(f.datum) || '-', fontSize: 10 },
                                { text: routeStr, fontSize: 10 },
                                { text: fahrzeugStr, fontSize: 10 },
                                { text: kostenStr, fontSize: 10, alignment: 'right' }
                            ]);

                            if (f.belege && f.belege.length > 0) {
                                f.belege.forEach(beleg => {
                                    gesamtBelege.push({ text: `Beleg für Fahrt am ${formatDatum(f.datum)} (${f.start} nach ${f.ziel})`, style: 'belegTitle', pageBreak: 'before' });
                                    gesamtBelege.push({ image: beleg, width: 500, margin: [0, 10, 0, 0] });
                                });
                            }
                        });
                    });

                    const docDefinition = {
                        info: {
                            title: `Fahrtkostenabrechnung_${vollerName.value.replace(/\s/g, '_')}`,
                            subject: 'KULTURSH_ROUTE_V1:' + encodeRouteMeta({
                                version: 1,
                                fahrten: sortedFahrten.map(f => ({
                                    datum: f.datum, start: f.start, ziel: f.ziel,
                                    zwischenziele: (f.zwischenziele || []).filter(Boolean),
                                    art: f.art, streckenTyp: f.streckenTyp,
                                    km: Number(f.km) || 0, berechneteKm: Number(f.berechneteKm) || 0,
                                    kmManuell: !!f.kmManuell,
                                    kartenAbweichungen: (f.kartenAbweichungen || []).map(p => [Number(p[0]), Number(p[1])])
                                }))
                            })
                        },
                        footer: (currentPage, pageCount) => ({
                            columns: [
                                { text: `Eingereicht von: ${vollerName.value} | Antragsdatum: ${formatDatum(profil.value.antragsdatum)}`, alignment: 'left' },
                                { text: `Version ${version} | Seite ${currentPage} von ${pageCount}`, alignment: 'right' }
                            ], fontSize: 8, color: '#999999', margin: [40, 10, 40, 0]
                        }),
                        content: [
                            logoKopf,
                            { text: 'Land Schleswig-Holstein', style: 'headerSub' },
                            { text: 'Abrechnungsbogen Fahrtkosten für Kulturvermittler/-innen', style: 'headerMain' },
                            { text: 'Projekt: "Schule trifft Kultur - Kultur trifft Schule"', style: 'headerSub', margin: [0, 0, 0, 20] },
                            {
                                style: 'infoBox',
                                table: {
                                    widths: ['*', '*'],
                                    body: [
                                        [
                                            { text: [{ text: 'Name:\n', bold: true }, vollerName.value, { text: '\n\nE-Mail:\n', bold: true }, profil.value.email], border: [false, false, false, false] },
                                            { text: [{ text: 'Anschrift:\n', bold: true }, wohnanschrift.value], border: [false, false, false, false] }
                                        ],
                                        [
                                            { text: [{ text: '\nKontoinhaber/-in:\n', bold: true }, profil.value.kontoinhaber || vollerName.value], border: [false, false, false, false] },
                                            { text: [{ text: '\nKonto (IBAN / Bank):\n', bold: true }, profil.value.iban + '\n' + profil.value.bankname], border: [false, false, false, false] }
                                        ]
                                    ]
                                }
                            },
                            { text: 'Erfasste Fahrten', style: 'sectionTitle' },
                            { style: 'dataTable', table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto'], body: fahrtenRows }, layout: 'lightHorizontalLines' },
                            { text: `Gesamtauslagen: ${formatCurrency(gesamtKostenZahl.value)} €`, style: 'totalSum' },
                            { text: 'Ich versichere pflichtgemäß die Richtigkeit aller Angaben.', margin: [0, 20, 0, 10], fontSize: 10 },
                            {
                                columns: [
                                    { width: '*', text: `Ort, Datum:\n\n${profil.value.ort}, den ${formatDatum(profil.value.antragsdatum)}` },
                                    { width: '*', stack: [{ text: 'Unterschrift Antragsteller/-in:' }, sigImage ? { image: sigImage, width: 120, margin: [0, 5, 0, 0] } : { text: '\n\n___________________________________' }] }
                                ], margin: [0, 10, 0, 40]
                            },
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, dash: { length: 5, space: 5 } }], margin: [0, 0, 0, 10], pageBreak: 'before' },
                            { text: 'Nicht vom Antragstellenden auszufüllen:', bold: true, fontSize: 10, color: '#e2001a', margin: [0, 0, 0, 8] },
                            {
                                table: {
                                    widths: ['*', 100, 180],
                                    body: [
                                        [
                                            { text: 'Sachlich richtig', bold: true, margin: [0, 10, 0, 10] },
                                            { stack: [
                                                { text: 'Zeichen', fontSize: 9, color: '#666666' },
                                                { text: 'III 3210', bold: true, margin: [0, 4, 0, 0] }
                                            ], margin: [0, 5, 0, 5] },
                                            { stack: [
                                                { text: 'Unterschrift', fontSize: 9, color: '#666666' },
                                                { text: '\n ', fontSize: 9, margin: [0, 4, 0, 8] }
                                            ], margin: [0, 5, 0, 5] }
                                        ],
                                        [
                                            { text: 'Rechnerisch richtig', bold: true, margin: [0, 10, 0, 10] },
                                            { stack: [
                                                { text: 'Zeichen', fontSize: 9, color: '#666666' },
                                                { text: '\n________________', fontSize: 9 }
                                            ], margin: [0, 5, 0, 5] },
                                            { stack: [
                                                { text: 'Unterschrift', fontSize: 9, color: '#666666' },
                                                { text: '\n ', fontSize: 9, margin: [0, 4, 0, 8] }
                                            ], margin: [0, 5, 0, 5] }
                                        ]
                                    ]
                                },
                                layout: {
                                    hLineWidth: () => 0.8,
                                    vLineWidth: () => 0.8,
                                    hLineColor: () => '#666666',
                                    vLineColor: () => '#666666',
                                    paddingLeft: () => 6,
                                    paddingRight: () => 6,
                                    paddingTop: () => 4,
                                    paddingBottom: () => 4
                                }
                            },
                            { text: 'Ort, Datum:', fontSize: 10, margin: [0, 38, 0, 0] },
                            { text: 'HHT: 0710-25-53325', bold: true, fontSize: 10, margin: [0, 8, 0, 0] },
                            ...gesamtBelege
                        ],
                        styles: {
                            headerMain: { fontSize: 16, bold: true, color: '#00305e', margin: [0, 5, 0, 2] },
                            headerSub: { fontSize: 10, color: '#666666' },
                            sectionTitle: { fontSize: 14, bold: true, color: '#00305e', margin: [0, 20, 0, 10] },
                            infoBox: { margin: [0, 0, 0, 15], fillColor: '#f8fafc', padding: 10 },
                            dataTable: { margin: [0, 0, 0, 15] },
                            tableHeader: { bold: true, fontSize: 11, color: '#00305e', fillColor: '#e2e8f0' },
                            monthHeader: { bold: true, fontSize: 11, color: '#00305e', fillColor: '#f1f5f9', margin: [0, 4, 0, 4] },
                            totalSum: { fontSize: 14, bold: true, alignment: 'right', color: '#00305e', margin: [0, 10, 0, 0] },
                            belegTitle: { fontSize: 12, bold: true, color: '#00305e', margin: [0, 20, 0, 10] }
                        },
                        defaultStyle: { columnGap: 20 }
                    };

                    pdfMake.createPdf(docDefinition).download(`Fahrtkosten_${vollerName.value.replace(/\s/g, '_')}_${profil.value.antragsdatum}.pdf`);
                };

                const starteAnleitung = () => {
                    const driverFactory = window.driver?.js?.driver;
                    if (!driverFactory) {
                        alert('Die Anleitung konnte nicht geladen werden. Bitte prüfen Sie die lokalen Dateien vendor/driver.js und vendor/driver.css.');
                        return;
                    }
                    const tour = driverFactory({
                        animate: true,
                        smoothScroll: true,
                        overlayColor: '#00305e',
                        overlayOpacity: 0.55,
                        showProgress: true,
                        progressText: 'Schritt {{current}} von {{total}}',
                        nextBtnText: 'Weiter',
                        prevBtnText: 'Zurück',
                        doneBtnText: 'Fertig',
                        steps: [
                            {
                                element: '#tour-stammdaten',
                                popover: { title: '1. Stammdaten & Anlass', description: 'Tragen Sie hier Ihre persönlichen Angaben, Anschrift und Bankverbindung ein. Pflichtfelder sind mit einem Sternchen markiert.', side: 'bottom', align: 'start' }
                            },
                            {
                                element: '#tour-fahrtstrecke',
                                popover: { title: '2. Fahrtstrecke & Kilometer', description: 'Geben Sie Start und Ziel ein. Bei PKW wählen Sie „Hin- & Rückfahrt“, wenn dieselbe Strecke zurückgefahren wurde. Kilometer können Sie manuell eintragen oder online prüfen.', side: 'bottom', align: 'start' }
                            },
                            {
                                element: '#tour-mitfahrer-zuschlaege',
                                popover: { title: '3. Mitfahrer & Sonderzuschläge', description: 'Hier erfassen Sie Anlass und Mitfahrer. Der Mitnahmezuschlag wird automatisch berechnet. Bei Fahrzeiten über einer Stunde kann der Zeit-Zuschlag ergänzt werden.', side: 'bottom', align: 'center' }
                            },
                            {
                                element: '#tour-pdf-freigabe',
                                popover: { title: '4. PDF-Export & Freigabe', description: 'Prüfen Sie die Eingaben über „Kontrolle & Dokument erstellen“. In der Übersicht unterschreiben Sie und erzeugen anschließend das PDF-Dokument.', side: 'top', align: 'end' }
                            }
                        ]
                    });
                    tour.drive();
                };

                return {
                    routeDatenschutzBestaetigt, ansicht, profil, vollerName, wohnanschrift, fahrten, sortierteFahrten, ibanKorrekt, ibanFehler, gesamtKostenZahl, formatCurrency, formatDatum, version, profilSpeichern, routeModalFahrt,
                    pruefeIBAN, sortiereNachDatum, berechneRoute, oeffneRouteModal, schliesseRouteModal, loescheKartenAbweichungen, routeSvgPunkte, routeEndpunkt, fahrtEntfernen, neueFahrtHinzufuegen, zielHinzufuegen, handleBelegUpload, toggleProfilSpeicherung, uebernehmeWohnort, uebernehmeKontoinhaber,
                    pruefeUndWeiter, updateKosten, clearSignature, handleSignatureUpload, generiereNeuesPDF, loescheLokaleProfildaten, toggleHilfe, hilfeSichtbar, musterFahrtkostenLaden, formularLeeren, starteAnleitung
                }
            }
        }).mount('#app');
        document.getElementById('startup-warning')?.remove();

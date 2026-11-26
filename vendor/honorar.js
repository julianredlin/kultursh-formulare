        // Version 1.2.0: Getrennter Prüfvermerk für sachliche und rechnerische Prüfung; HHT und Zeichen ergänzt.
        const APP_VERSION = "1.6.3";
        const { createApp, ref, watch, onMounted, computed, nextTick } = Vue;

        createApp({
            setup() {
                const ansicht = ref('eingabe');
                const ibanKorrekt = ref(false);
                const ibanFehler = ref('');
                let signaturePadInstance = null;
                const version = APP_VERSION;
                const stundenSatz = 35.00;
                const profilSpeichern = ref(false);

                const getHeuteFormat = () => new Date().toISOString().split('T')[0];

                const profil = ref({ 
                    vorname: '', nachname: '', name: '', email: '', strasse: '', hausnummer: '', plz: '', wohnort: '', ort: '', antragsdatum: getHeuteFormat(), 
                    abrechnungsmonat: '', kontoinhaber: '', bankname: '', iban: '' 
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
                
                const eintraege = ref([
                    { id: generiereId(), datum: getHeuteFormat(), inhalt: '', partner: '', ort: '', dauer: 0, kosten: 0 }
                ]);

                onMounted(() => {
                    const daten = profilSpeicher.laden();
                    profilSpeichern.value = !!daten;
                    if (daten) {
                        profil.value = { ...profil.value, ...daten };
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
                        profilSpeicher.speichern({ ...neueWerte, name: vollerName.value });
                    }
                }, { deep: true });

                const uebernehmeWohnort = () => {
                    profil.value.ort = (profil.value.wohnort || '').trim();
                };

                const uebernehmeKontoinhaber = () => {
                    profil.value.kontoinhaber = vollerName.value;
                };

                const toggleProfilSpeicherung = () => {
                    if (profilSpeichern.value) {
                        profilSpeicher.speichern(profil.value);
                    } else {
                        profilSpeicher.entfernen();
                    }
                };

                const loescheLokaleProfildaten = () => {
                    if (!confirm('Gespeicherte Stammdaten auf diesem Gerät löschen?')) return;
                    profilSpeichern.value = false;
                    profilSpeicher.entfernen();
                    alert('Die lokal gespeicherten Stammdaten wurden gelöscht. Die aktuell geöffneten Eingaben bleiben bis zum Schließen oder Neuladen dieser Seite sichtbar.');
                };

                const formatCurrency = (value) => {
                    return (Math.round((Number(value) || 0) * 100) / 100).toFixed(2).replace('.', ',');
                };

                const formatDatum = (datumStr) => {
                    if (!datumStr) return '';
                    const d = new Date(datumStr);
                    return d.toLocaleDateString('de-DE');
                };

                const sortiereNachDatum = () => {
                    eintraege.value.sort((a, b) => new Date(a.datum) - new Date(b.datum));
                };

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
                        if (BigInt(numericIban) % 97n === 1n) {
                            ibanKorrekt.value = true;
                            ibanFehler.value = '';
                        } else {
                            ibanKorrekt.value = false;
                            ibanFehler.value = 'Prüfsumme fehlerhaft. Bitte auf Zahlendreher kontrollieren.';
                        }
                    } catch (e) { 
                        ibanKorrekt.value = false; 
                        ibanFehler.value = 'Unbekannter Fehler bei der Überprüfung.';
                    }
                };

                const updateKosten = (eintrag) => {
                    let rawKosten = (eintrag.dauer || 0) * stundenSatz;
                    eintrag.kosten = Math.round(rawKosten * 100) / 100;
                };

                const gesamtKostenZahl = computed(() => {
                    return eintraege.value.reduce((s, e) => s + (Number(e.kosten) || 0), 0);
                });

                const neuenEintragHinzufuegen = () => {
                    eintraege.value.push({ id: generiereId(), datum: getHeuteFormat(), inhalt: '', partner: '', ort: '', dauer: 0, kosten: 0 });
                };

                const eintragEntfernen = (e) => eintraege.value.length > 1 ? eintraege.value = eintraege.value.filter(x => x.id !== e.id) : null;

                const handleSignatureUpload = (e) => {
                    if (e.target.files[0] && signaturePadInstance) {
                        const r = new FileReader();
                        r.onload = (ev) => {
                            signaturePadInstance.fromDataURL(ev.target.result, {ratio: 1, width: 300, height: 150});
                        };
                        r.readAsDataURL(e.target.files[0]);
                    }
                };

                const clearSignature = () => { if (signaturePadInstance) signaturePadInstance.clear(); };

                const pruefeUndWeiter = () => {
                    pruefeIBAN();
                    if (!profil.value.vorname || !profil.value.nachname || !profil.value.email || !profil.value.strasse || !profil.value.plz || !profil.value.wohnort || !profil.value.abrechnungsmonat || !profil.value.ort || !profil.value.antragsdatum || !profil.value.kontoinhaber || !profil.value.bankname || !ibanKorrekt.value) {
                        alert("Bitte füllen Sie alle Pflichtfelder in Bereich 1 vollständig aus und prüfen Sie die IBAN.");
                        return;
                    }
                    ansicht.value = 'zusammenfassung';
                    window.scrollTo(0, 0);
                };

                const generiereNeuesPDF = async () => {
                    let sigImage = null;
                    if (signaturePadInstance && !signaturePadInstance.isEmpty()) {
                        sigImage = signaturePadInstance.toDataURL('image/png');
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

                    const tabelleRows = [];
                    tabelleRows.push([
                        { text: 'Datum', style: 'tableHeader' },
                        { text: 'Inhalt', style: 'tableHeader' },
                        { text: 'Gesprächspartner/-in', style: 'tableHeader' },
                        { text: 'Ort', style: 'tableHeader' },
                        { text: 'Dauer (h)', style: 'tableHeader', alignment: 'center' },
                        { text: `Honorar (${formatCurrency(stundenSatz)} €/h)`, style: 'tableHeader', alignment: 'right' }
                    ]);

                    let sortedEintraege = [...eintraege.value].sort((a, b) => new Date(a.datum) - new Date(b.datum));
                    
                    sortedEintraege.forEach(e => {
                        tabelleRows.push([
                            { text: formatDatum(e.datum) || '-', fontSize: 10 },
                            { text: e.inhalt || '-', fontSize: 10 },
                            { text: e.partner || '-', fontSize: 10 },
                            { text: e.ort || '-', fontSize: 10 },
                            { text: e.dauer.toString(), fontSize: 10, alignment: 'center' },
                            { text: formatCurrency(e.kosten) + ' €', fontSize: 10, alignment: 'right' }
                        ]);
                    });

                    const docDefinition = {
                        info: { title: `Honorarabrechnung_${vollerName.value.replace(/\s/g, '_')}` },
                        footer: function(currentPage, pageCount) { 
                            return { 
                                columns: [
                                    { text: `Eingereicht von: ${vollerName.value} | Antragsdatum: ${formatDatum(profil.value.antragsdatum)}`, alignment: 'left' },
                                    { text: `Version ${version} | Seite ${currentPage} von ${pageCount}`, alignment: 'right' }
                                ],
                                fontSize: 8, color: '#999999', margin: [40, 10, 40, 0] 
                            }; 
                        },
                        content: [
                            logoKopf,
                            { text: 'Land Schleswig-Holstein', style: 'headerSub' },
                            { text: 'Abrechnungsbogen Honorar für Kulturvermittler/-innen', style: 'headerMain' },
                            { text: `Abrechnungszeitraum: ${profil.value.abrechnungsmonat}`, style: 'headerSub', margin: [0, 0, 0, 20] },
                            
                            {
                                style: 'infoBox',
                                table: {
                                    widths: ['*', '*'],
                                    body: [
                                        [
                                            { text: [ { text: 'Name:\n', bold: true }, vollerName.value, { text: '\n\nE-Mail:\n', bold: true }, profil.value.email ] , border: [false, false, false, false] },
                                            { text: [ { text: 'Anschrift:\n', bold: true }, wohnanschrift.value ], border: [false, false, false, false] }
                                        ],
                                        [
                                            { text: [ { text: '\nKontoinhaber/-in:\n', bold: true }, profil.value.kontoinhaber || vollerName.value ], border: [false, false, false, false] },
                                            { text: [ { text: '\nKonto (IBAN / Bank):\n', bold: true }, profil.value.iban + '\n' + profil.value.bankname ], border: [false, false, false, false] }
                                        ]
                                    ]
                                }
                            },

                            { text: 'Stundenabrechnung', style: 'sectionTitle' },
                            
                            {
                                style: 'dataTable',
                                table: { 
                                    headerRows: 1, 
                                    widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'], 
                                    body: tabelleRows 
                                },
                                layout: 'lightHorizontalLines'
                            },

                            { text: `Gesamtsumme Honorar: ${formatCurrency(gesamtKostenZahl.value)} €`, style: 'totalSum' },

                            { text: 'Ich versichere pflichtgemäß die Richtigkeit aller Angaben.', margin: [0, 20, 0, 10], fontSize: 10 },
                            
                            {
                                columns: [
                                    { width: '*', text: `Ort, Datum:\n\n${profil.value.ort}, den ${formatDatum(profil.value.antragsdatum)}` },
                                    {
                                        width: '*',
                                        stack: [
                                            { text: 'Unterschrift Antragsteller/-in:' },
                                            sigImage ? { image: sigImage, width: 120, margin: [0, 5, 0, 0] } : { text: '\n\n___________________________________' }
                                        ]
                                    }
                                ],
                                margin: [0, 10, 0, 40]
                            },

                            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, dash: { length: 5, space: 5 } } ], margin: [0, 0, 0, 10], pageBreak: 'before' },
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
                            { text: 'HHT: 0710-25-53325', bold: true, fontSize: 10, margin: [0, 8, 0, 0] }
                        ],
                        styles: {
                            headerMain: { fontSize: 16, bold: true, color: '#00305e', margin: [0, 5, 0, 2] },
                            headerSub: { fontSize: 10, color: '#666666' },
                            sectionTitle: { fontSize: 14, bold: true, color: '#00305e', margin: [0, 20, 0, 10] },
                            infoBox: { margin: [0, 0, 0, 15], fillColor: '#f8fafc', padding: 10 },
                            dataTable: { margin: [0, 0, 0, 15] },
                            tableHeader: { bold: true, fontSize: 10, color: '#00305e', fillColor: '#e2e8f0' },
                            totalSum: { fontSize: 14, bold: true, alignment: 'right', color: '#00305e', margin: [0, 10, 0, 0] }
                        },
                        defaultStyle: { columnGap: 10 }
                    };

                    pdfMake.createPdf(docDefinition).download(`Honorarabrechnung_${vollerName.value.replace(/\s/g, '_')}_${profil.value.antragsdatum}.pdf`);
                };

                return {
                    ansicht, profil, vollerName, wohnanschrift, eintraege, ibanKorrekt, ibanFehler, gesamtKostenZahl, formatCurrency, formatDatum, version, stundenSatz, profilSpeichern,
                    pruefeIBAN, sortiereNachDatum, eintragEntfernen, neuenEintragHinzufuegen, toggleProfilSpeicherung, loescheLokaleProfildaten, uebernehmeWohnort, uebernehmeKontoinhaber,
                    pruefeUndWeiter, updateKosten, clearSignature, handleSignatureUpload, generiereNeuesPDF
                }
            }
        }).mount('#app');
        document.getElementById('startup-warning')?.remove();

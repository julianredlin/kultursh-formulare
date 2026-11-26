// Gemeinsames Opt-in-Profil: Nur diese Kontaktfelder dürfen das Formular überdauern.
const profilSpeicher = (() => {
    const key = 'kultur_profil_v10';
    const felder = ['vorname', 'nachname', 'name', 'email', 'strasse', 'anschrift', 'hausnummer', 'plz', 'wohnort'];
    const kontakt = profil => Object.fromEntries(felder.filter(f => typeof profil?.[f] === 'string').map(f => [f, profil[f]]));
    const speichern = profil => localStorage.setItem(key, JSON.stringify(kontakt(profil)));
    const entfernen = () => localStorage.removeItem(key);
    function laden() {
        const alt = localStorage.getItem(key);
        if (!alt) return null;
        try {
            const daten = kontakt(JSON.parse(alt));
            if (JSON.stringify(daten) !== alt) speichern(daten);
            return daten;
        } catch {
            entfernen();
            return null;
        }
    }
    return { laden, speichern, entfernen };
})();
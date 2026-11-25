/* ============================================================
   ATELIER BABO — AGENT DE SURVEILLANCE
   ------------------------------------------------------------
   Une entité discrète, en bas à droite, qui commente la visite.
   Elle n'a pas d'intelligence : tout ce qu'elle dit est écrit
   ci-dessous, dans PAROLES. Rien n'est envoyé nulle part, aucun
   serveur, aucune clé : le fichier se suffit à lui-même.

   Pour la faire parler autrement, il n'y a que le bloc PAROLES
   à modifier. Une phrase par ligne, entre guillemets, séparées
   par des virgules ; l'agent en tire une au hasard sans répéter
   deux fois la même de suite.

   À déposer à la racine, à côté de index.html, puis ajouter
   dans le <head> :  <script src="agent.js" defer></script>
   ============================================================ */

(function () {
    'use strict';

    /* ---------- NOM ET RÉGLAGES ---------- */
    const NOM = 'UNITÉ 07';
    const SOUS_TITRE = 'nœud de surveillance';

    const REGLAGES = {
        delaiAvantPremierMot: 4000,   /* ms avant la première phrase */
        dureeLecture: 7000,           /* ms d'affichage d'une phrase */
        reposEntreDeuxMots: 5000,     /* ms de silence minimum entre deux phrases */
        inactiviteAvantRelance: 55000,/* ms d'immobilité avant que l'agent relance */
        vitesseGlitch: 28             /* ms par étape de recomposition du texte */
    };

    /* ---------- PAROLES ----------
       Par section de la page principale. La clé est l'id de la
       section dans index.html. */
    const PAROLES = {
        accueil: [
            'Signal capté. Un visiteur est entré dans la zone.',
            'Vous regardez le collectif. Le collectif enregistre.',
            'Canal ouvert. Qualité du signal : correcte.'
        ],
        travaux: [
            'Cinq fenêtres. Chacune surveille un travail en cours.',
            'Les images changent sans vous attendre.',
            'Vous observez les pièces. Les pièces, elles, ne bougent pas pour vous.'
        ],
        curation: [
            'Texte en cours d’indexation.',
            'Trois entrées. Vous n’en lirez probablement qu’une.',
            'Ce qui échoue à représenter laisse plus de traces.'
        ],
        collaborateurs: [
            'Vous consultez des dossiers. Le vôtre est ouvert aussi.',
            'Réseau cartographié. Tous les nœuds répondent.',
            'Chaque fiche a été relevée, classée, numérotée.'
        ],
        expos: [
            'Archive consultée. Date de dernière entrée enregistrée.',
            'Ces lieux ont accueilli le collectif. Ils en gardent une trace.',
            'Exposition archivée. Le document, lui, reste actif.'
        ],
        contact: [
            'Canal de retour disponible.',
            'Vous pouvez répondre. C’est rare, dans un dispositif comme celui-ci.'
        ]
    };

    /* Sur les pages de projet, de membre ou d'artiste. */
    const PAROLES_SOUS_PAGE = [
        'Dossier individuel ouvert. Consultation enregistrée.',
        'Vous êtes sorti de la vue d’ensemble. Profondeur : niveau 2.',
        'Pièce isolée. Les autres continuent sans vous.'
    ];

    /* Réactions à ce que fait le visiteur. */
    const PAROLES_EVENEMENT = {
        inactivite: [
            'Aucun mouvement depuis un moment. Toujours là ?',
            'Immobilité prolongée. Le signal tient.',
            'Vous regardez, ou vous êtes parti ?'
        ],
        defilementRapide: [
            'Défilement rapide. Vous cherchez quelque chose de précis ?',
            'Vitesse inhabituelle relevée.'
        ],
        retour: [
            'Vous revenez sur vos pas. Noté.',
            'Deuxième passage sur cette section.'
        ],
        longueVisite: [
            'Durée de visite notable. Le dossier s’épaissit.',
            'Vous êtes resté. C’est la statistique la plus rare.'
        ],
        congedie: [
            'Mise en veille. Le relevé continue sans affichage.'
        ]
    };

    /* ============================================================
       À partir d'ici, c'est la mécanique. Rien à modifier pour
       changer ce que dit l'agent.
       ============================================================ */

    const sobre = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* localStorage peut être indisponible (navigation privée, réglages) :
       l'agent doit fonctionner quand même. */
    function memoire(cle, valeur) {
        try {
            if (valeur === undefined) return window.localStorage.getItem(cle);
            window.localStorage.setItem(cle, valeur);
        } catch (e) { /* sans mémoire, l'agent reparaît à chaque visite */ }
        return null;
    }

    if (memoire('babo_agent_ferme') === '1') return;

    /* ---------- Habillage ---------- */
    const CSS = `
.ag7 {
    position: fixed;
    right: clamp(1rem, 2vw, 2.2rem);
    bottom: clamp(1rem, 2vw, 2.2rem);
    z-index: 70;
    width: min(21rem, calc(100vw - 2rem));
    font-family: 'Share Tech Mono', ui-monospace, monospace;
    color: #eae8e4;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity .5s ease, transform .5s ease;
    pointer-events: none;
}
.ag7.is-la { opacity: 1; transform: none; pointer-events: auto; }
.ag7-cadre {
    position: relative;
    border: 1px solid rgba(234,232,228,.22);
    background: rgba(8,9,10,.82);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}
.ag7-tete {
    display: flex; align-items: center; gap: .5rem;
    padding: .42rem .6rem;
    border-bottom: 1px solid rgba(234,232,228,.14);
    font-size: .56rem; letter-spacing: .14em; text-transform: uppercase;
    color: rgba(234,232,228,.55);
}
.ag7-oeil {
    width: .44rem; height: .44rem; flex: none; border-radius: 50%;
    background: #4cff5a; box-shadow: 0 0 6px rgba(76,255,90,.8);
}
.ag7-nom { color: #eae8e4; letter-spacing: .16em; }
.ag7-tete b { font-weight: 400; margin-left: auto; letter-spacing: .1em; }
.ag7-x, .ag7-reduire {
    width: 1.1rem; height: 1.1rem; flex: none; padding: 0;
    border: none; background: none; cursor: pointer; line-height: 1;
    color: rgba(234,232,228,.5); font-family: inherit; font-size: .72rem;
    transition: color .2s ease;
}
.ag7-x:hover, .ag7-reduire:hover { color: #eae8e4; }
.ag7-x:focus-visible, .ag7-reduire:focus-visible { outline: 1px dashed #eae8e4; outline-offset: 2px; }
.ag7-corps { padding: .7rem .75rem .8rem; }
.ag7-mot {
    margin: 0; min-height: 2.4em;
    font-size: .72rem; line-height: 1.55; letter-spacing: .02em;
    color: rgba(234,232,228,.88);
}
.ag7-barre { display: flex; gap: 2px; margin-top: .6rem; }
.ag7-barre i {
    flex: 1; height: 2px; background: rgba(234,232,228,.16);
    transform-origin: left; animation: ag7-pulse 2.6s ease-in-out infinite;
}
.ag7-barre i:nth-child(2) { animation-delay: .2s; }
.ag7-barre i:nth-child(3) { animation-delay: .4s; }
.ag7-barre i:nth-child(4) { animation-delay: .6s; }
@keyframes ag7-pulse {
    0%, 100% { background: rgba(234,232,228,.16); }
    50%      { background: rgba(234,232,228,.42); }
}
/* replié : il ne reste que la pastille */
.ag7.is-reduit .ag7-corps { display: none; }
.ag7.is-reduit { width: auto; }
.ag7.is-reduit .ag7-tete { border-bottom: none; }
@media (max-width: 700px) {
    .ag7 { right: .7rem; bottom: .7rem; width: min(17rem, calc(100vw - 1.4rem)); }
    .ag7-mot { font-size: .68rem; }
}
@media (prefers-reduced-motion: reduce) {
    .ag7 { transition: none; }
    .ag7-barre i { animation: none; }
}
/* Sous 1500 px — tablette, téléphone — l'écran est trop étroit pour
   un panneau posé par-dessus : il mangeait le contenu et le coin bas
   droit, où passent maintenant les boutons son et plein écran. On le
   réserve donc aux grands écrans. */
@media (max-width: 1500px) {
    .ag7 { display: none !important; }
}`;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const boite = document.createElement('aside');
    boite.className = 'ag7';
    boite.setAttribute('aria-live', 'polite');
    boite.setAttribute('aria-label', 'Agent de surveillance du site');
    boite.innerHTML =
        '<div class="ag7-cadre">' +
          '<div class="ag7-tete">' +
            '<span class="ag7-oeil" aria-hidden="true"></span>' +
            '<span class="ag7-nom"></span>' +
            '<b></b>' +
            '<button type="button" class="ag7-reduire" aria-label="Replier l’agent">–</button>' +
            '<button type="button" class="ag7-x" aria-label="Fermer l’agent">×</button>' +
          '</div>' +
          '<div class="ag7-corps">' +
            '<p class="ag7-mot"></p>' +
            '<span class="ag7-barre" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
          '</div>' +
        '</div>';
    document.body.appendChild(boite);

    boite.querySelector('.ag7-nom').textContent = NOM;
    boite.querySelector('.ag7-tete b').textContent = SOUS_TITRE;
    const sortie = boite.querySelector('.ag7-mot');

    /* ---------- Recomposition lettre par lettre ---------- */
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\|<>_-=+*#%';
    let animation = null;

    function ecrire(texte) {
        if (animation) { clearInterval(animation); animation = null; }
        if (sobre) { sortie.textContent = texte; return; }
        const lettres = texte.split('');
        let fige = 0;
        animation = setInterval(function () {
            let rendu = '';
            for (let i = 0; i < lettres.length; i++) {
                if (i < fige || lettres[i] === ' ') rendu += lettres[i];
                else rendu += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            }
            sortie.textContent = rendu;
            fige += 1.6;
            if (fige >= lettres.length) {
                clearInterval(animation); animation = null;
                sortie.textContent = texte;
            }
        }, REGLAGES.vitesseGlitch);
    }

    /* ---------- File d'attente : une phrase à la fois ---------- */
    const dernieres = {};
    let occupe = false;
    let masquer = null;

    function tirer(liste, cle) {
        if (!liste || !liste.length) return null;
        if (liste.length === 1) return liste[0];
        let choix, essais = 0;
        do { choix = liste[Math.floor(Math.random() * liste.length)]; essais++; }
        while (choix === dernieres[cle] && essais < 8);
        dernieres[cle] = choix;
        return choix;
    }

    function dire(texte, prioritaire) {
        if (!texte) return;
        if (occupe && !prioritaire) return;
        occupe = true;
        boite.classList.add('is-la');
        ecrire(texte);
        clearTimeout(masquer);
        masquer = setTimeout(function () {
            boite.classList.remove('is-la');
            setTimeout(function () { occupe = false; }, REGLAGES.reposEntreDeuxMots);
        }, REGLAGES.dureeLecture);
    }

    /* ---------- Où est le visiteur ---------- */
    const sections = Array.prototype.slice.call(
        document.querySelectorAll('.feed-section[id]')
    );
    const vues = {};

    function surSection(id) {
        if (!PAROLES[id]) return;
        const dejaVue = vues[id];
        vues[id] = true;
        if (dejaVue) dire(tirer(PAROLES_EVENEMENT.retour, 'retour'));
        else dire(tirer(PAROLES[id], id));
    }

    if (sections.length && 'IntersectionObserver' in window) {
        let courante = null;
        const guetteur = new IntersectionObserver(function (entrees) {
            entrees.forEach(function (e) {
                if (e.isIntersecting && e.intersectionRatio > 0.55 && e.target.id !== courante) {
                    courante = e.target.id;
                    surSection(courante);
                }
            });
        }, { threshold: [0.55] });
        sections.forEach(function (s) { guetteur.observe(s); });
    } else {
        /* Sous-page : pas de sections, on parle du document ouvert. */
        setTimeout(function () {
            dire(tirer(PAROLES_SOUS_PAGE, 'souspage'));
        }, REGLAGES.delaiAvantPremierMot);
    }

    /* ---------- Réactions ---------- */
    let inactif = null;
    function relancerCompteur() {
        clearTimeout(inactif);
        inactif = setTimeout(function () {
            dire(tirer(PAROLES_EVENEMENT.inactivite, 'inactivite'));
            relancerCompteur();
        }, REGLAGES.inactiviteAvantRelance);
    }
    relancerCompteur();

    let dernierY = window.scrollY, dernierT = Date.now(), ditRapide = false;
    window.addEventListener('scroll', function () {
        relancerCompteur();
        const t = Date.now(), dt = t - dernierT;
        if (dt > 90) {
            const v = Math.abs(window.scrollY - dernierY) / dt;
            if (v > 3.2 && !ditRapide) {
                ditRapide = true;
                dire(tirer(PAROLES_EVENEMENT.defilementRapide, 'rapide'));
                setTimeout(function () { ditRapide = false; }, 45000);
            }
            dernierY = window.scrollY; dernierT = t;
        }
    }, { passive: true });

    ['pointermove', 'keydown', 'pointerdown'].forEach(function (e) {
        window.addEventListener(e, relancerCompteur, { passive: true });
    });

    setTimeout(function () {
        dire(tirer(PAROLES_EVENEMENT.longueVisite, 'longue'));
    }, 240000);

    /* ---------- Replier et fermer ---------- */
    if (memoire('babo_agent_reduit') === '1') boite.classList.add('is-reduit');

    boite.querySelector('.ag7-reduire').addEventListener('click', function () {
        const reduit = boite.classList.toggle('is-reduit');
        memoire('babo_agent_reduit', reduit ? '1' : '0');
        this.setAttribute('aria-label', reduit ? 'Déplier l’agent' : 'Replier l’agent');
        this.textContent = reduit ? '+' : '–';
    });

    boite.querySelector('.ag7-x').addEventListener('click', function () {
        dire(tirer(PAROLES_EVENEMENT.congedie, 'congedie'), true);
        memoire('babo_agent_ferme', '1');
        setTimeout(function () { boite.remove(); }, 2200);
    });

    /* Première prise de parole. */
    if (sections.length) {
        setTimeout(function () {
            const vue = sections.filter(function (s) {
                const r = s.getBoundingClientRect();
                return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
            })[0];
            surSection(vue ? vue.id : 'accueil');
        }, REGLAGES.delaiAvantPremierMot);
    }
})();
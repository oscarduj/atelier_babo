/* ============================================================
   TRANSITION ENTRE PAGES — panneaux diagonaux décalés
   ------------------------------------------------------------
   Trois panneaux traversent l'écran en diagonale, décalés dans le
   temps : le balayage se lit comme un geste composé, pas comme un
   simple rideau. Chaque panneau garde sa place — seule sa forme de
   découpe (clip-path) change, ce qui reste composité par le GPU.

   Le panneau de tête porte un liseré d'accent et le mot-repère du
   collectif, qui apparaît au moment où l'écran est entièrement
   couvert, puis repart avec les panneaux.

   clip-path à formes simples : supporté depuis Chrome 55 / Safari 9.1
   / Firefox 54, aucune détection nécessaire, et disponible là où les
   View Transitions natives manquent encore (Firefox).
   ============================================================ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var OFF_RIGHT = 'polygon(100% 0, 136% 0, 136% 100%, 112% 100%)';
    var COVER     = 'polygon(-24% 0, 136% 0, 136% 100%, -24% 100%)';
    var OFF_LEFT  = 'polygon(-40% 0, -24% 0, -40% 100%, -40% 100%)';

    var EASE = 'cubic-bezier(0.72, 0, 0.18, 1)';
    var COVER_MS = 1500;   // course de couverture
    var REVEAL_MS = 1600;  // course de découverte
    var STAGGER = 180;     // décalage entre les trois panneaux
    var LAYERS = 3;

    var root = document.createElement('div');
    root.className = 'page-veil-root';
    root.setAttribute('aria-hidden', 'true');

    var panels = [];
    for (var i = 0; i < LAYERS; i++) {
        var p = document.createElement('div');
        p.className = 'page-veil-panel page-veil-panel-' + (i + 1);
        root.appendChild(p);
        panels.push(p);
    }
    var mark = document.createElement('span');
    mark.className = 'page-veil-mark';
    mark.textContent = 'ATELIER_BABO';
    root.appendChild(mark);

    // Porte d'entrée : une fois l'écran couvert, la navigation attend un clic,
    // dans le même esprit que le cube du portail d'accueil — on ne tombe pas
    // sur la page suivante, on choisit d'y entrer.
    var gate = document.createElement('button');
    gate.type = 'button';
    gate.className = 'page-veil-gate';
    gate.innerHTML = '<span class="page-veil-gate-square"></span>' +
                     '<span class="page-veil-gate-label">ENTRER</span>';
    root.appendChild(gate);

    function mount() {
        if (!document.body) return false;
        document.body.appendChild(root);
        return true;
    }
    if (!mount()) document.addEventListener('DOMContentLoaded', mount);

    if (reduced) {
        root.style.display = 'none';
        return;
    }

    function setClip(el, shape) {
        el.style.clipPath = shape;
        el.style.webkitClipPath = shape;
    }
    // Le panneau de tête mène la course ; les suivants traînent derrière lui.
    // L'ordre est inversé à la découverte pour que le geste reste continu.
    function run(shape, ms, reverse) {
        panels.forEach(function (p, idx) {
            var order = reverse ? (LAYERS - 1 - idx) : idx;
            p.style.transition = 'clip-path ' + ms + 'ms ' + EASE + ' ' + (order * STAGGER) + 'ms' +
                               ', -webkit-clip-path ' + ms + 'ms ' + EASE + ' ' + (order * STAGGER) + 'ms';
            setClip(p, shape);
        });
    }
    function resetTo(shape) {
        panels.forEach(function (p) {
            p.style.transition = 'none';
            setClip(p, shape);
        });
    }

    // --- Arrivée : l'écran est couvert, les panneaux sortent par la gauche ---
    resetTo(COVER);
    root.classList.add('is-covered');

    function reveal() {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                root.classList.remove('is-covered');
                run(OFF_LEFT, REVEAL_MS, true);
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', reveal);
    } else {
        reveal();
    }

    // --- Départ : les panneaux entrent par la droite ---
    var leaving = false;
    var pendingGo = null, pendingKey = null;

    // Annule un départ en cours : retire la porte, rend la main à la page.
    function cancelLeave() {
        leaving = false;
        root.classList.remove('is-gated');
        if (pendingGo) { gate.removeEventListener('click', pendingGo); pendingGo = null; }
        if (pendingKey) { document.removeEventListener('keydown', pendingKey); pendingKey = null; }
    }

    // Retour arrière : Safari restaure la page depuis son cache telle
    // qu'on l'a quittée, porte « ENTRER » comprise. On la retire et on
    // rejoue l'arrivée, sinon la porte reste affichée et bloque tout.
    window.addEventListener('pageshow', function (e) {
        cancelLeave();
        if (e.persisted) { resetTo(COVER); root.classList.add('is-covered'); reveal(); }
    });

    document.addEventListener('click', function (e) {
        if (leaving) return;
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a) return;

        var href = a.getAttribute('href');
        if (!href) return;
        if (href.charAt(0) === '#') return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download')) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (a.host && a.host !== location.host) return;

        e.preventDefault();
        leaving = true;
        if (window.BaboAmbient) window.BaboAmbient.stop();

        var dest = a.href;
        resetTo(OFF_RIGHT);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                run(COVER, COVER_MS, false);
                setTimeout(function () { root.classList.add('is-covered'); },
                           COVER_MS * 0.55);
                // Plus de porte « ENTRER » : on change de page dès que les
                // panneaux ont fini de couvrir l'écran. (Le son, qui exige un
                // geste du visiteur, reprend au premier toucher sur la page
                // suivante ; l'entrée du site a son propre bouton ENTRER.)
                setTimeout(function () { location.href = dest; },
                           COVER_MS + (LAYERS - 1) * STAGGER + 60);
            });
        });
    });
})();

/* ============================================================
   NAVIGATION PARTAGÉE — barre latérale sur toutes les pages
   ------------------------------------------------------------
   Construite en JS et injectée dans chaque page, pour que la barre
   ne disparaisse plus dès qu'on quitte l'accueil. Elle est volontairement
   logée dans ce fichier plutôt que dans un script supplémentaire :
   aucune page HTML n'a besoin d'être modifiée pour en bénéficier.

   L'arborescence se déplie : Travaux → les 4 artistes + le collectif,
   puis les travaux de chacun. La branche de la page courante est ouverte
   et surlignée.
   ============================================================ */
(function () {
    'use strict';

    // Préfixe relatif déduit du lien vers style.css déjà présent dans la page :
    // fiable quelle que soit la profondeur et quel que soit le nom du dépôt.
    function basePrefix() {
        var l = document.querySelector('link[href$="style.css"]');
        if (!l) return '';
        return l.getAttribute('href').replace(/style\.css$/, '');
    }
    var B = basePrefix();

    var OSCAR = [
        ['Rémanence', 'travaux/oscar/stase.html'],
        ["Le bruit de l'eau", 'travaux/oscar/bruit-eau.html'],
        ['Vivre à travers le flux', 'travaux/oscar/vivre-flux.html'],
        ['Transmutation', 'travaux/oscar/transmutation.html'],
        ['Dé-construction', 'travaux/oscar/deconstruction.html'],
        ['175 Zettaoctets', 'travaux/oscar/flux.html'],
        ['Livre blanc', 'travaux/oscar/livre-blanc.html'],
    ];
    var YOON = [
        ['Une pierre jetée…', 'travaux/yoon/pierre-jetee.html'],
        ['Est-ce un travail ?', 'travaux/yoon/est-ce-travail.html'],
        ["Santa's OFF-Season", 'travaux/yoon/santa-off-season.html'],
        ['Un cauchemar…', 'travaux/yoon/cauchemar.html'],
        ['Porte E3Ɛ', 'travaux/yoon/porte-e3e.html'],
        ["Parfums de l'Utopie", 'travaux/yoon/parfums-utopie.html'],
        ['Elephant Man', 'travaux/yoon/elephant-man.html'],
    ];
    var TOM = [
        ['Compagnon 1', 'travaux/tom/compagnon-1.html'],
        ['O.M.A', 'travaux/tom/oma.html'],
        ['U', 'travaux/tom/u.html'],
        ['PARASITE #1', 'travaux/tom/parasite.html'],
        ['Nature 404', 'travaux/tom/nature-404.html'],
        ['ALTERTOPIE', 'travaux/tom/altertopie.html'],
        ['COSSERAT', 'travaux/tom/cosserat.html'],
    ];

    var COLLAB = [
        ['g0she', 'artistes/goshe.html', null],
        ['Nino', 'artistes/nino.html', null],
        ['quideNovie', 'artistes/quidenovie.html', null],
        ['collectif naïf', 'artistes/collectif-naif.html', null],
        ['Hugo Denise', 'artistes/hugo-denise.html', null],
        ['Léon Chotard', 'artistes/leon-chotard.html', null],
    ];

    var TREE = [
        ['01. ACCUEIL', 'index.html#accueil', null],
        ['02. TRAVAUX', 'index.html#travaux', [
            ['Collectif', 'travaux/collectif.html', null],
            ['Oscar Dujarrier', 'travaux/oscar-dujarrier.html', OSCAR],
            ['Hyunseok Yoon', 'travaux/hyunseok-yoon.html', YOON],
            ['Tom Lecointre', 'travaux/tom-lecointre.html', TOM],
            ['Wenjie Tong', 'travaux/wenjie-tong.html', null],
        ]],
        ['03. CURATION', 'index.html#curation', null],
        ['04. COLLABORATEURS', 'index.html#collaborateurs', COLLAB],
        ['05. EXPOS', 'index.html#expos', null],
        ['06. SOUTIEN', 'index.html#soutien', null],
        ['07. CONTACT', 'index.html#contact', null],
    ];

    // Nom de fichier de la page courante. Un chemin sans fichier ("/", "/repo",
    // "/repo/") vaut index.html — c'est ce cas qui faisait échouer le test et
    // provoquait un rechargement complet sur les liens de section.
    function fileOf(path) {
        var last = path.split('?')[0].split('#')[0].split('/').pop();
        return last && last.indexOf('.') !== -1 ? last : 'index.html';
    }
    var hereFile = fileOf(location.pathname);
    function isCurrent(href) {
        var f = href.split('#')[0];
        if (!f) return false;
        return fileOf(f) === hereFile;
    }

    function buildList(items, depth) {
        var ul = document.createElement('ul');
        ul.className = 'nav-tree nav-tree-d' + depth;
        var anyOpen = false;

        items.forEach(function (it, idx) {
            var label = it[0], href = it[1], kids = it[2];
            var li = document.createElement('li');
            li.className = 'nav-tree-item';
            // Rang de l'élément : sert au décalage d'apparition, pour que les
            // sous-parties se révèlent l'une après l'autre plutôt qu'en bloc.
            li.style.setProperty('--i', idx);

            var a = document.createElement('a');
            a.className = depth === 0 ? 'nav-item' : 'nav-sub-item';
            // Si la cible est la page où l'on se trouve déjà, on ne garde que
            // l'ancre : le navigateur fait défiler au lieu de tout recharger.
            var parts = href.split('#');
            if (parts[1] && isCurrent(parts[0])) {
                a.href = '#' + parts[1];
                a.setAttribute('data-anchor', '1');
            } else {
                a.href = B + href;
            }
            a.textContent = label;
            li.appendChild(a);

            var open = isCurrent(href);
            if (open) { a.classList.add('is-current'); anyOpen = true; }

            if (kids) {
                var sub = buildList(kids, depth + 1);
                if (sub.open) { open = true; anyOpen = true; }

                // Bouton de dépliage distinct du lien : au doigt comme à la
                // souris, on peut ouvrir la branche sans quitter la page.
                var caret = document.createElement('button');
                caret.type = 'button';
                caret.className = 'nav-caret';
                caret.setAttribute('aria-label', 'Déplier ' + label);
                caret.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true">' +
                                  '<path d="M3 1.5 L6.5 5 L3 8.5" fill="none" ' +
                                  'stroke="currentColor" stroke-width="1.3"/></svg>';
                caret.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    li.classList.toggle('is-open');
                });
                li.insertBefore(caret, li.firstChild);

                li.appendChild(sub.el);
                li.classList.add('has-children');
                if (open) li.classList.add('is-open');
            }
            ul.appendChild(li);
        });
        return { el: ul, open: anyOpen };
    }

    function buildNav() {
        var existing = document.querySelector('.side-nav');
        var links = buildList(TREE, 0).el;

        if (existing) {
            // Accueil : on remplace la liste existante par l'arborescence.
            var old = existing.querySelector('.nav-links');
            if (old) old.parentNode.replaceChild(links, old);
            else existing.appendChild(links);
            links.classList.add('nav-links');
            return;
        }

        // Sous-pages : la barre n'existe pas encore, on la crée entière.
        var nav = document.createElement('header');
        nav.className = 'side-nav';
        nav.id = 'side-nav';

        var top = document.createElement('div');
        top.className = 'nav-top';
        var logo = document.createElement('a');
        logo.className = 'nav-logo';
        logo.href = B + 'index.html';
        logo.textContent = 'ATELIER_BABO';
        top.appendChild(logo);
        nav.appendChild(top);

        links.classList.add('nav-links');
        nav.appendChild(links);

        var status = document.createElement('div');
        status.className = 'nav-status';
        status.textContent = 'STATUS: ALL SYSTEMS OPERATIONAL';
        nav.appendChild(status);

        document.body.appendChild(nav);

        // Bouton hamburger, utile aussi sur tablette tactile.
        var burger = document.createElement('button');
        burger.className = 'hamburger-btn';
        burger.id = 'hamburger-btn';
        burger.setAttribute('aria-label', 'Menu');
        burger.innerHTML = '<span></span><span></span><span></span>';
        burger.addEventListener('click', function () {
            var o = nav.classList.toggle('menu-open');
            burger.classList.toggle('open', o);
        });
        document.body.appendChild(burger);
    }

    // Sans survol possible (tablette, mobile), la barre doit s'ouvrir au doigt :
    // on marque le document pour que le CSS bascule en mode hamburger, quelle
    // que soit la largeur de l'écran.
    if (!window.matchMedia('(hover: hover)').matches) {
        document.documentElement.classList.add('touch-device');
    }

    // Sur l'accueil, surligner l'entrée correspondant à la section visible.
    // L'observateur d'origine visait l'ancienne liste, que l'on vient de
    // remplacer : il faut donc le reposer sur les nouveaux liens.
    var obsRef = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var all = document.querySelectorAll('.side-nav a[data-anchor]');
            all.forEach(function (a) { a.classList.remove('is-current'); });
            var cur = document.querySelector('.side-nav a[data-anchor][href="#' + en.target.id + '"]');
            if (cur) cur.classList.add('is-current');
        });
    }, { threshold: 0.5 });

    function initNav() {
        buildNav();
        document.querySelectorAll('.feed-section').forEach(function (s) { obsRef.observe(s); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();

/* ============================================================
   MÉMOIRE DE LA POSITION DE DÉFILEMENT
   ------------------------------------------------------------
   Le site fait défiler .main-feed (accueil) ou body (pages projet),
   pas la fenêtre : le navigateur ne sait donc pas restaurer la
   position, et un retour arrière renvoyait tout en haut du site.
   On la mémorise par page avant de partir, et on la rétablit au retour.
   ============================================================ */
(function () {
    'use strict';

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    function scroller() {
        return document.querySelector('.main-feed') ||
               (document.body.scrollHeight > window.innerHeight ? document.body : null);
    }
    function key() { return 'babo_scroll:' + location.pathname; }

    function save() {
        var el = scroller();
        if (!el) return;
        try { sessionStorage.setItem(key(), String(el.scrollTop)); } catch (e) {}
    }

    function restore() {
        var el = scroller();
        if (!el) return;
        var v;
        try { v = sessionStorage.getItem(key()); } catch (e) { return; }
        if (v === null) return;
        var y = parseInt(v, 10);
        if (!y) return;
        // Le scroll-snap et les images en cours de chargement peuvent repousser
        // la position : on la repose sur plusieurs trames avant d'abandonner.
        var tries = 0;
        (function settle() {
            el.scrollTop = y;
            if (++tries < 12 && Math.abs(el.scrollTop - y) > 2) {
                setTimeout(settle, 60);
            }
        })();
    }

    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null;
        if (a) save();
    }, true);

    if (document.readyState === 'complete') restore();
    else window.addEventListener('load', restore);
})();



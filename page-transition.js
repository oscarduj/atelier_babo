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
    var COVER_MS = 980;    // course de couverture
    var REVEAL_MS = 1080;  // course de découverte
    var STAGGER = 110;     // décalage entre les trois panneaux
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

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) { resetTo(COVER); root.classList.add('is-covered'); reveal(); }
    });

    // --- Départ : les panneaux entrent par la droite ---
    var leaving = false;

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
                // Le mot-repère n'apparaît qu'une fois l'écran réellement couvert.
                setTimeout(function () { root.classList.add('is-covered'); },
                           COVER_MS * 0.55);
            });
        });

        // On part quand le dernier panneau a fini sa course.
        setTimeout(function () { location.href = dest; },
                   COVER_MS + (LAYERS - 1) * STAGGER - 60);
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
        ['04. COLLABORATEURS', 'index.html#collaborateurs', null],
        ['05. EXPOS', 'index.html#expos', null],
        ['06. SOUTIEN', 'index.html#soutien', null],
        ['07. CONTACT', 'index.html#contact', null],
    ];

    var here = location.pathname.replace(/\/$/, '/index.html');
    function isCurrent(href) {
        var f = href.split('#')[0];
        return f && here.indexOf('/' + f.replace(/^.*\//, '')) !== -1
            && here.slice(-f.split('/').pop().length) === f.split('/').pop();
    }

    function buildList(items, depth) {
        var ul = document.createElement('ul');
        ul.className = 'nav-tree nav-tree-d' + depth;
        var anyOpen = false;

        items.forEach(function (it) {
            var label = it[0], href = it[1], kids = it[2];
            var li = document.createElement('li');
            li.className = 'nav-tree-item';

            var a = document.createElement('a');
            a.className = depth === 0 ? 'nav-item' : 'nav-sub-item';
            a.href = B + href;
            a.textContent = label;
            li.appendChild(a);

            var open = isCurrent(href);
            if (open) { a.classList.add('is-current'); anyOpen = true; }

            if (kids) {
                var sub = buildList(kids, depth + 1);
                if (sub.open) { open = true; anyOpen = true; }
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

        // Bouton hamburger pour le mobile, comme sur l'accueil.
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildNav);
    } else {
        buildNav();
    }
})();


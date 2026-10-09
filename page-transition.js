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


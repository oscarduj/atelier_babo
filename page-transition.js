/* ============================================================
   TRANSITION ENTRE PAGES
   ------------------------------------------------------------
   Un voile sombre se ferme avant la navigation, puis s'ouvre à
   l'arrivée. Complète les View Transitions natives : celles-ci ne
   fonctionnent que sur Chrome/Edge/Safari, ce voile marche partout
   (Firefox compris) et donne le même geste sur tous les navigateurs.

   Ne s'applique qu'aux liens internes du site. Ignoré si
   prefers-reduced-motion : la navigation reste instantanée.
   ============================================================ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var veil = document.createElement('div');
    veil.className = 'page-veil';
    veil.innerHTML = '<span class="page-veil-mark"></span>';
    document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(veil);
        // Ouverture à l'arrivée sur la page
        requestAnimationFrame(function () { document.body.classList.add('page-ready'); });
    });

    // Retour arrière depuis le cache du navigateur : le voile doit être rouvert.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) document.body.classList.add('page-ready');
    });

    if (reduced) return;

    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a) return;

        var href = a.getAttribute('href');
        if (!href) return;

        // On laisse passer : ancres, liens externes, mailto/tel, nouvel onglet,
        // téléchargements et clics avec touche de modification.
        if (href.charAt(0) === '#') return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download')) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (a.host && a.host !== location.host) return;

        e.preventDefault();
        document.body.classList.remove('page-ready');
        if (window.BaboAmbient) window.BaboAmbient.stop();
        setTimeout(function () { location.href = a.href; }, 420);
    });
})();

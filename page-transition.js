/* ============================================================
   TRANSITION ENTRE PAGES — balayage diagonal (clip-path wipe)
   ------------------------------------------------------------
   Un panneau opaque traverse l'écran en diagonale : il entre par la
   droite pour couvrir la page qu'on quitte, puis poursuit sa course
   vers la gauche pour découvrir la page d'arrivée. Le panneau lui-même
   ne bouge jamais — seule sa forme de découpe change, ce qui est
   composité par le GPU et reste fluide même sur mobile.

   Technique retenue après comparaison : clip-path à formes simples
   (supporté depuis Chrome 55 / Safari 9.1 / Firefox 54, aucune
   détection nécessaire), plutôt que les View Transitions natives qui
   manquent encore à Firefox, et sans dépendance à une librairie.

   Les positions sont posées en style inline par JS : aucune bataille
   de spécificité CSS, et le sens du balayage reste le même d'une page
   à l'autre.
   ============================================================ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trois états de la découpe. Le bord d'attaque est incliné (les points
    // du haut et du bas sont décalés de 18%), d'où la diagonale.
    var OFF_RIGHT = 'polygon(100% 0, 130% 0, 130% 100%, 118% 100%)';
    var COVER     = 'polygon(-18% 0, 130% 0, 130% 100%, -18% 100%)';
    var OFF_LEFT  = 'polygon(-30% 0, -18% 0, -30% 100%, -30% 100%)';

    var EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
    var COVER_MS = 560;
    var REVEAL_MS = 620;

    var veil = document.createElement('div');
    veil.className = 'page-veil';
    veil.setAttribute('aria-hidden', 'true');

    // Le script est chargé en defer : le body existe déjà, on peut poser le
    // voile tout de suite — avant le premier rendu visible, donc sans
    // clignotement au chargement.
    function mount() {
        if (!document.body) return false;
        document.body.appendChild(veil);
        return true;
    }
    if (!mount()) document.addEventListener('DOMContentLoaded', mount);

    if (reduced) {
        // Mouvement réduit : pas de balayage du tout, le voile reste invisible.
        veil.style.display = 'none';
        return;
    }

    // --- Arrivée : le panneau couvre déjà, puis sort par la gauche ---
    veil.style.clipPath = COVER;
    veil.style.webkitClipPath = COVER;

    function reveal() {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                veil.style.transition = 'clip-path ' + REVEAL_MS + 'ms ' + EASE +
                                        ', -webkit-clip-path ' + REVEAL_MS + 'ms ' + EASE;
                veil.style.clipPath = OFF_LEFT;
                veil.style.webkitClipPath = OFF_LEFT;
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', reveal);
    } else {
        reveal();
    }

    // Retour arrière depuis le cache du navigateur : la page est restituée
    // telle quelle, il faut rouvrir le voile.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            veil.style.transition = 'none';
            veil.style.clipPath = COVER;
            veil.style.webkitClipPath = COVER;
            reveal();
        }
    });

    // --- Départ : le panneau entre par la droite et couvre ---
    var leaving = false;

    document.addEventListener('click', function (e) {
        if (leaving) return;
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a) return;

        var href = a.getAttribute('href');
        if (!href) return;

        // Laissés au navigateur : ancres, protocoles spéciaux, nouvel onglet,
        // téléchargements, clics modifiés, domaines externes.
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
        veil.style.transition = 'none';
        veil.style.clipPath = OFF_RIGHT;
        veil.style.webkitClipPath = OFF_RIGHT;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                veil.style.transition = 'clip-path ' + COVER_MS + 'ms ' + EASE +
                                        ', -webkit-clip-path ' + COVER_MS + 'ms ' + EASE;
                veil.style.clipPath = COVER;
                veil.style.webkitClipPath = COVER;
            });
        });

        setTimeout(function () { location.href = dest; }, COVER_MS - 40);
    });
})();

/* ============================================================
   AMBIANCE SONORE — une variation par page, même famille
   ------------------------------------------------------------
   Chaque page du site rejoue la même grammaire (nappe désaccordée +
   texture de bruit filtré + notes éparses + réverbération par delay),
   mais la graine est dérivée du nom de la page : accord, tempo et
   couleur changent d'une page à l'autre tout en restant reconnaissables.

   Le son ne peut pas survivre à un changement de page (chaque
   navigation recharge le document) : il redémarre donc à chaque fois,
   avec sa propre couleur.

   Les navigateurs interdisent de démarrer l'audio sans geste de
   l'utilisateur : on attend donc le premier clic / toucher.
   ============================================================ */
(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // --- Graine déterministe tirée du chemin de la page ---
    function seedFromPath() {
        var p = location.pathname.split('/').pop() || 'index';
        var h = 0;
        for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
        return h;
    }
    var SEED = seedFromPath();
    function rand(n) { // suite pseudo-aléatoire stable pour une page donnée
        var x = Math.sin(SEED + n * 97.3) * 10000;
        return x - Math.floor(x);
    }

    // Chaque page tire son accord dans une famille commune (quintes/quartes
    // ouvertes), sa hauteur de base et sa densité de notes.
    var CHORDS = [
        [65.41, 98.00, 130.81, 164.81],
        [61.74, 92.50, 123.47, 155.56],
        [73.42, 110.00, 146.83, 185.00],
        [55.00, 82.41, 110.00, 138.59],
        [69.30, 103.83, 138.59, 174.61],
    ];
    var SCALES = [
        [261.6, 293.7, 349.2, 392.0, 440.0, 523.2, 587.3],
        [261.6, 311.1, 349.2, 392.0, 466.2, 523.2, 622.3],
        [293.7, 329.6, 392.0, 440.0, 493.9, 587.3, 659.3],
    ];

    // Variation nettement audible d'une page à l'autre : transposition
    // continue (pas seulement un choix parmi N), forme d'onde, couleur du
    // filtre, taille de la réverbération et densité des notes — tout est
    // dérivé de la graine, donc stable pour une page et différent des autres.
    var transpose = Math.pow(2, (Math.floor(rand(1) * 12) - 5) / 12); // ±5 demi-tons
    var pad = CHORDS[Math.floor(rand(2) * CHORDS.length)].map(function (f) {
        return f * transpose;
    });
    var scale = SCALES[Math.floor(rand(3) * SCALES.length)].map(function (f) {
        return f * transpose;
    });
    var padWave = ['sine', 'triangle'][Math.floor(rand(4) * 2)];
    var noteWave = ['sine', 'triangle'][Math.floor(rand(5) * 2)];
    var noteGap = 1900 + rand(6) * 6000;      // densité des notes éparses
    var filterBase = 320 + rand(7) * 700;     // couleur de la texture de bruit
    var filterSwing = 180 + rand(8) * 420;    // amplitude de la dérive
    var delayTime = 0.22 + rand(9) * 0.48;    // taille de la réverbération
    var noiseLevel = 0.008 + rand(11) * 0.016;
    var padLevel = 0.026 + rand(12) * 0.018;

    var ctx = null, playing = false, nodes = null, noteTimer = null, raf = null;

    function getCtx() {
        if (!ctx) {
            var C = window.AudioContext || window.webkitAudioContext;
            if (!C) return null;
            ctx = new C();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function start() {
        if (playing) return;
        var c = getCtx();
        if (!c) return;
        // Garde-fou : tant que le navigateur n'a pas accordé l'audio (pas encore
        // de geste utilisateur), le contexte reste suspendu. Démarrer ici
        // marquerait playing=true sans produire de son, et tous les gestes
        // suivants seraient ignorés — c'était la cause du silence.
        if (c.state !== 'running') return;
        playing = true;
        try {
            var master = c.createGain();
            master.gain.setValueAtTime(0, c.currentTime);
            master.gain.linearRampToValueAtTime(0.14, c.currentTime + 3.5);
            master.connect(c.destination);

            // Réverbération maison : delay + feedback filtré (aucun fichier audio)
            var delay = c.createDelay(2);
            delay.delayTime.value = delayTime;
            var fb = c.createGain(); fb.gain.value = 0.38;
            var dFilter = c.createBiquadFilter();
            dFilter.type = 'lowpass'; dFilter.frequency.value = 2200;
            delay.connect(dFilter); dFilter.connect(fb); fb.connect(delay);
            delay.connect(master);

            // Nappe : 4 voix légèrement désaccordées
            var oscs = pad.map(function (f, i) {
                var o = c.createOscillator();
                o.type = padWave;
                o.frequency.value = f * (1 + (rand(20 + i) - 0.5) * 0.006);
                var g = c.createGain(); g.gain.value = padLevel;
                o.connect(g); g.connect(master); g.connect(delay);
                o.start();
                return { o: o, g: g };
            });

            // Texture de bruit filtré, coupure dérivant lentement
            var buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            var src = c.createBufferSource();
            src.buffer = buf; src.loop = true;
            var nf = c.createBiquadFilter();
            nf.type = 'bandpass'; nf.frequency.value = filterBase; nf.Q.value = 0.7;
            var ng = c.createGain(); ng.gain.value = noiseLevel;
            src.connect(nf); nf.connect(ng); ng.connect(master);
            src.start();

            var phase = rand(6) * 10;
            (function drift() {
                if (!playing) return;
                phase += 0.0025;
                nf.frequency.value = filterBase + Math.sin(phase) * filterSwing + Math.sin(phase * 0.37) * filterSwing * 0.5;
                raf = requestAnimationFrame(drift);
            })();

            // Notes éparses
            (function schedule() {
                if (!playing) return;
                noteTimer = setTimeout(function () {
                    if (!playing) return;
                    var f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 0.5 : 1);
                    var o = c.createOscillator(); o.type = noteWave; o.frequency.value = f;
                    var g = c.createGain();
                    g.gain.setValueAtTime(0, c.currentTime);
                    g.gain.linearRampToValueAtTime(0.042, c.currentTime + 0.6);
                    g.gain.linearRampToValueAtTime(0, c.currentTime + 3.4);
                    o.connect(g); g.connect(master); g.connect(delay);
                    o.start(); o.stop(c.currentTime + 3.5);
                    schedule();
                }, noteGap * (0.6 + Math.random() * 0.8));
            })();

            nodes = { master: master, oscs: oscs, src: src };
        } catch (e) { playing = false; }
    }

    function stop() {
        if (!playing || !nodes) return;
        playing = false;
        clearTimeout(noteTimer);
        if (raf) cancelAnimationFrame(raf);
        var c = ctx;
        try {
            nodes.master.gain.cancelScheduledValues(c.currentTime);
            nodes.master.gain.setValueAtTime(nodes.master.gain.value, c.currentTime);
            nodes.master.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
            var n = nodes;
            setTimeout(function () {
                n.oscs.forEach(function (p) { try { p.o.stop(); } catch (e) {} });
                try { n.src.stop(); } catch (e) {}
            }, 1600);
        } catch (e) {}
        nodes = null;
    }

    // Démarrage au premier geste. Les navigateurs refusent l'audio tant que
    // l'utilisateur n'a rien fait : on tente quand même tout de suite (certains
    // contextes l'autorisent), puis on guette un éventail large de gestes —
    // sur une page de lecture, le visiteur ne clique pas forcément un lien.
    var EVENTS = ['pointerdown', 'click', 'touchstart', 'keydown', 'wheel', 'scroll'];
    function unlock() {
        var c = getCtx();
        if (!c) return;
        if (c.state === 'running') {
            start();
        } else {
            // resume() est asynchrone : on attend sa résolution avant de démarrer.
            c.resume().then(function () {
                if (c.state === 'running') start();
            }).catch(function () { /* geste encore manquant */ });
        }
        if (playing) {
            EVENTS.forEach(function (ev) { document.removeEventListener(ev, unlock); });
        }
    }
    EVENTS.forEach(function (ev) {
        document.addEventListener(ev, unlock, { passive: true });
    });

    // Coupe proprement avant de quitter la page, pour éviter que le son
    // se superpose au démarrage de la page suivante.
    window.addEventListener('pagehide', stop);

    window.BaboAmbient = { start: start, stop: stop, isPlaying: function () { return playing; } };
})();



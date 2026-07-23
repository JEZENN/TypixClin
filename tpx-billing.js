/* ═══════════════════════════════════════════════════════════════════════
   TPX BILLING — interrupteur global de la facturation Stripe
   ───────────────────────────────────────────────────────────────────────
   À placer à la RACINE du site, à côté de index.html.
   À charger dans le <head> de TOUTES les pages, avant les autres scripts :

       <script src="tpx-billing.js"></script>

   ENABLED = false  (état actuel)
     • accès complet pour TOUS les utilisateurs, anciens comme nouveaux ;
     • aucune date d'expiration, aucun verrou lecture seule ;
     • aucun bouton, badge ou tarif lié au paiement n'est visible ;
     • aucun appel à Stripe n'est possible.

   ENABLED = true   (jour du lancement)
     • la logique d'essai et d'abonnement déjà présente reprend la main.

   Un seul booléen à changer. Rien d'autre.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.TPX_BILLING = {

        /* ═════════════ L'INTERRUPTEUR ═════════════ */
        ENABLED: false,

        /* Test en avance : ajouter ?billing=1 à l'URL (mémorisé le temps de la
           session du navigateur). ?billing=0 pour revenir en arrière.
           Passer à false avant l'ouverture publique des paiements. */
        ALLOW_URL_OVERRIDE: true,

        /* Comptes autorisés à voir la facturation malgré ENABLED = false.
           Renseigner votre propre UID Firebase pour tester en conditions réelles. */
        TESTER_UIDS: [
            // 'votreUidFirebase',
        ],

        /* ═══════════ DATES DE BASCULE — SOURCE UNIQUE ═══════════
           Ces deux dates pilotent tout le système. Elles sont lues par
           TableurECOS.html, TableurEnLigne.html et comptepremium.html.
           Ne les redéfinissez nulle part ailleurs.

           Exprimées en UTC pour rester identiques quel que soit le fuseau
           du visiteur ; l'équivalent Paris est indiqué en commentaire.

           • Comptes créés AVANT TRIAL_CUTOFF        -> grâce collective
             jusqu'à LEGACY_GRACE_END, sans compte à rebours affiché.
           • Comptes créés À PARTIR de TRIAL_CUTOFF  -> TRIAL_MONTHS mois
             gratuits à compter de la création, avec compte à rebours. */

        /* 29 août 2026, 00:00:00 heure de Paris (CEST = UTC+2) */
        TRIAL_CUTOFF: '2026-08-28T22:00:00.000Z',

        /* 26 octobre 2026, 23:59:59 heure de Paris (CET = UTC+1 depuis le 25/10) */
        LEGACY_GRACE_END: '2026-10-26T22:59:59.000Z',

        /* Durée de l'essai gratuit des nouveaux comptes, en mois */
        TRIAL_MONTHS: 1
    };

    /* ── Override par URL ─────────────────────────────────────────────── */
    var _urlOn = false;
    try {
        if (window.TPX_BILLING.ALLOW_URL_OVERRIDE) {
            var p = new URLSearchParams(location.search);
            if (p.get('billing') === '1') sessionStorage.setItem('tpxBilling', '1');
            if (p.get('billing') === '0') sessionStorage.removeItem('tpxBilling');
            _urlOn = sessionStorage.getItem('tpxBilling') === '1';
        }
    } catch (e) { /* mode privé, sessionStorage indisponible */ }

    var _uid = null;

    /* ── État effectif de la facturation ──────────────────────────────── */
    window.tpxBillingActive = function () {
        if (window.TPX_BILLING.ENABLED) return true;
        if (_urlOn) return true;
        if (_uid && window.TPX_BILLING.TESTER_UIDS.indexOf(_uid) !== -1) return true;
        return false;
    };

    /* ── À appeler depuis onAuthStateChanged ──────────────────────────── */
    window.tpxBillingSetUser = function (user) {
        _uid = user ? user.uid : null;
        apply();
    };

    function apply() {
        document.documentElement.classList.toggle('tpx-billing-off', !window.tpxBillingActive());
    }

    /* ═══════════════════════════════════════════════════════════════════
       HELPERS DE DATES
       Utilisés par les deux tableurs et par comptepremium.html pour que les
       trois pages annoncent toujours exactement la même échéance.
       ═══════════════════════════════════════════════════════════════════ */

    window.tpxTrialCutoff = function () {
        return new Date(window.TPX_BILLING.TRIAL_CUTOFF);
    };

    window.tpxLegacyGraceEnd = function () {
        return new Date(window.TPX_BILLING.LEGACY_GRACE_END);
    };

    /* Un compte est « ancien » s'il a été créé avant la date pivot. */
    window.tpxIsLegacyCreated = function (created) {
        if (!created) return false;
        return created < window.tpxTrialCutoff();
    };

    /* Fin de l'accès gratuit, calculée depuis la date de création du compte.
         ancien compte  -> LEGACY_GRACE_END
         nouveau compte -> création + TRIAL_MONTHS mois */
    window.tpxComputeTrialEnd = function (created) {
        if (!created) return null;
        if (window.tpxIsLegacyCreated(created)) return window.tpxLegacyGraceEnd();

        var months = window.TPX_BILLING.TRIAL_MONTHS || 1;
        var end = new Date(created.getTime());
        var day = end.getDate();

        /* setMonth() déborde sur les mois courts : le 31 janvier + 1 mois
           donnerait le 3 mars. On repasse au 1er, on ajoute les mois, puis on
           replace le jour en le bornant au dernier jour du mois d'arrivée. */
        end.setDate(1);
        end.setMonth(end.getMonth() + months);
        var lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        end.setDate(Math.min(day, lastDay));

        return end;
    };

    /* ── Masquage de toute l'interface liée au paiement ───────────────────
       #open-premium-btn / .premium-btn-menu  → entrée « Compte premium »
       #tpx-premium-fab / #tpx-trial-fab      → couronne et pastille d'essai
       #plans-section / #portal-btn           → tarifs et portail Stripe
       #grace-alert                           → bandeau de fin de gratuité
       [data-billing-ui]                      → tout élément marqué à la main
       Le CSS est injecté immédiatement, avant le rendu : aucun clignotement. */
    var st = document.createElement('style');
    st.textContent =
        '.tpx-billing-off #open-premium-btn,' +
        '.tpx-billing-off .premium-btn-menu,' +
        '.tpx-billing-off #tpx-premium-fab,' +
        '.tpx-billing-off #tpx-trial-fab,' +
        '.tpx-billing-off #plans-section,' +
        '.tpx-billing-off #portal-btn,' +
        '.tpx-billing-off #grace-alert,' +
        '.tpx-billing-off [data-billing-ui]' +
        '{ display: none !important; }' +
        /* Sécurité : le verrou lecture seule ne doit jamais s'appliquer */
        '.tpx-billing-off body.tpx-premium-locked .tpx-premium-fab { display: none !important; }';
    (document.head || document.documentElement).appendChild(st);

    apply();
})();
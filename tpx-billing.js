/* ═══════════════════════════════════════════════════════════════════════
   TPX BILLING — interrupteur global de la facturation Stripe
   ───────────────────────────────────────────────────────────────────────
   À placer à la RACINE du site, à côté de index.html.
   À charger dans le <head> de TOUTES les pages, avant les autres scripts :

       <script src="tpx-billing.js"></script>

   ENABLED = false
     • accès complet pour TOUS les utilisateurs, anciens comme nouveaux ;
     • aucune date d'expiration, aucun verrou lecture seule ;
     • aucun bouton, badge ou tarif lié au paiement n'est visible ;
     • aucun appel à Stripe n'est possible.

   ENABLED = true   (production)
     • la logique d'essai et d'abonnement ci-dessous reprend la main.

   Ce fichier est la SOURCE UNIQUE pour toute la logique Premium :
   dates de bascule, durée d'essai, et fonctions de calcul du statut
   d'accès (tpxIsLegacyAccount / tpxTrialEnd / tpxIsSubscribed /
   tpxHasPremiumAccess / tpxComputeAccessState). TableurEDN.html,
   TableurECOS.html et comptepremium.html appellent uniquement les
   fonctions `window.tpx*` définies ici : aucune de ces trois pages ne
   doit redéfinir sa propre copie de ces calculs, pour qu'il ne puisse
   plus exister de divergence de date entre les pages.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.TPX_BILLING = {

        /* ═════════════ L'INTERRUPTEUR ═════════════ */
        ENABLED: true,

        /* ═════════════ PAIEMENTS ═════════════
           Interrupteur SÉPARÉ de ENABLED. ENABLED pilote l'affichage du
           statut Premium (onglet, pastilles essai/legacy, verrou lecture
           seule à expiration). PAYMENTS_ENABLED pilote UNIQUEMENT la
           possibilité de payer : quand il est à false, TOUS les boutons
           Souscrire (Mensuel + les 5 formules) affichent « Bientôt
           disponible » et sont désactivés, pour TOUT LE MONDE — legacy,
           essai, peu importe. Utile pour lancer l'essai/la classification
           gratuite sans encore ouvrir les paiements réels. */
        PAYMENTS_ENABLED: false,

        /* Test en avance : ajouter ?billing=1 à l'URL (mémorisé le temps de la
           session du navigateur). DÉSACTIVÉ en production : aucun visiteur ne
           doit pouvoir activer/désactiver artificiellement la facturation. */
        ALLOW_URL_OVERRIDE: false,

        /* Comptes autorisés à voir la facturation malgré ENABLED = false.
           Renseigner votre propre UID Firebase pour tester en conditions réelles.
           Sans effet sur la sécurité réelle : les règles Firestore ne
           connaissent pas cette liste, elle ne pilote que l'UI cliente. */
        TESTER_UIDS: [
            'qa96i2bjyDaj22vqiBylshTsR243',
        ],

        /* ═══════════ DATES ET DURÉES — SOURCE UNIQUE ═══════════
           Lues par TableurECOS.html, TableurEnLigne.html et comptepremium.html.
           Ne les redéfinissez nulle part ailleurs.

           Exprimées en UTC pour rester identiques quel que soit le fuseau
           du visiteur ; l'équivalent Paris est indiqué en commentaire.
           Les MÊMES instants sont utilisés côté règles Firestore
           (voir hasActiveAccess() dans firestore.rules) — toute modification
           ici doit être reportée là-bas.

           • Comptes créés AVANT TRIAL_CUTOFF        -> grâce collective
             jusqu'à LEGACY_GRACE_END, pastille « Gratuit jusqu'au 26 octobre ».
           • Comptes créés À PARTIR de TRIAL_CUTOFF  -> TRIAL_DAYS jours
             gratuits EXACTS à compter de la création, pastille « Essai
             gratuit — X jours restants ». */

        /* 29 août 2026, 00:00:00 heure de Paris (CEST = UTC+2) */
        TRIAL_CUTOFF: '2026-08-28T22:00:00.000Z',

        /* 26 octobre 2026, 23:59:59 heure de Paris (CET = UTC+1, le
           changement d'heure d'été a lieu le 25/10/2026) */
        LEGACY_GRACE_END: '2026-10-26T22:59:59.000Z',

        /* Durée de l'essai gratuit des nouveaux comptes : 30 jours EXACTS
           (30 * 24h), et non un mois calendaire. */
        TRIAL_DAYS: 30
    };

    /* ── Override par URL (désactivé en production, cf. ALLOW_URL_OVERRIDE) ── */
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

    /* ── Paiements réellement ouverts ? Indépendant de tpxBillingActive() :
       même quand la facturation est active (essai/legacy visibles), les
       paiements peuvent rester bloqués tant que PAYMENTS_ENABLED = false.
       Les testeurs (TESTER_UIDS) peuvent quand même payer pour tester le
       parcours complet en conditions réelles. ────────────────────────── */
    window.tpxPaymentsEnabled = function () {
        if (window.TPX_BILLING.PAYMENTS_ENABLED) return true;
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
         nouveau compte -> création + TRIAL_DAYS jours EXACTS */
    window.tpxComputeTrialEnd = function (created) {
        if (!created) return null;
        if (window.tpxIsLegacyCreated(created)) return window.tpxLegacyGraceEnd();
        var days = window.TPX_BILLING.TRIAL_DAYS || 30;
        return new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
    };

    /* ═══════════════════════════════════════════════════════════════════
       CALCUL DU STATUT D'ACCÈS — source unique pour EDN, ECOS et
       comptepremium.html. Convertit n'importe quelle forme de date
       (Timestamp Firestore, string ISO, objet Date) de façon uniforme.
       ═══════════════════════════════════════════════════════════════════ */

    window.tpxToDate = function (v) {
        if (!v) return null;
        try {
            if (typeof v.toDate === 'function') return v.toDate();          // Timestamp Firestore
            if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
            var d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) { return null; }
    };

    /* Date de création EFFECTIVE du compte, par ordre de fiabilité décroissant :
         1. accountCreatedAt — posé par un backend Admin SDK (Cloud Function) à
            partir de la vraie date de création Firebase Auth. Immuable, non
            falsifiable par le client (interdit en écriture par les règles).
            PRIORITAIRE dès qu'il existe : un compte Auth ancien dont le doc
            Firestore est créé tardivement doit rester legacy.
         2. createdAt — date de création du DOCUMENT Firestore (peut être
            postérieure à la vraie création du compte si le doc a été créé
            tardivement). Utilisé pour tous les documents non encore backfillés.
         3. _authCreatedAt — repli UI TEMPORAIRE uniquement (posé côté client
            depuis user.metadata.creationTime), jamais une source de vérité
            serveur : sert seulement à éviter un mauvais affichage transitoire
            avant que le document Firestore n'existe. */
    window.tpxCreatedDate = function (u) {
        if (!u) return null;
        return window.tpxToDate(u.accountCreatedAt)
            || window.tpxToDate(u.createdAt)
            || window.tpxToDate(u._authCreatedAt);
    };

    /* Un doc SANS createdAt (très ancien) est traité comme pré-pivot,
       exactement comme le fait hasActiveAccess() côté règles Firestore. */
    window.tpxIsLegacyAccount = function (u) {
        var c = window.tpxCreatedDate(u);
        if (!c) return true;
        return window.tpxIsLegacyCreated(c);
    };

    window.tpxTrialEnd = function (u) {
        var c = window.tpxCreatedDate(u);
        if (!c) return window.tpxLegacyGraceEnd(); /* miroir des règles : pas de createdAt -> grâce légale */
        return window.tpxComputeTrialEnd(c);
    };

    /* ═══════════════════════════════════════════════════════════════════
       FORMULES LONGUE DURÉE EDN / ECOS — configuration centrale UI.
       Source unique des libellés, dates de fin ET du BARÈME utilisés par
       comptepremium.html (cartes tarifs, modale de consentement, affichage
       du plan actif). N'inclut VOLONTAIREMENT aucun Stripe Price ID : ces
       identifiants restent uniquement côté backend (Cloud Functions).

       PRIX DYNAMIQUE : contrairement à Mensuel (tarif fixe), les 5
       formules fixes n'ont plus de `priceEuros` figé. La date de fin
       (accessEnd) est ABSOLUE (ancrée sur l'examen), donc le prix est
       recalculé à partir du nombre de mois restants jusqu'à cette date,
       avec un tarif au mois qui BAISSE plus il reste de mois — pour
       inciter à acheter tôt sans jamais faire "perdre" de mois à
       l'utilisateur (il paie toujours exactement pour ce qui reste).
       accessEnd reste répété ici uniquement pour l'affichage — la valeur
       QUI COMPTE pour l'accès réel est toujours `subscriptionEndDate`
       écrite en base par le webhook Stripe via Admin SDK, jamais celle-ci.

       Le MÊME barème (RATE_TIERS) doit exister côté backend
       (premiumPlans.js) pour que le prix annoncé ici soit EXACTEMENT celui
       facturé par Stripe — toute modification doit être reportée des deux
       côtés. ═══════════════════════════════════════════════════════════ */
    window.TPX_BILLING.FIXED_PLAN_TYPES = [
        'ecos2027', 'edn2027', 'edn2027_ecos2028', 'edn2028', 'edn2028_ecos2029'
    ];

    /* Barème dégressif : plus il reste de mois jusqu'à accessEnd, moins le
       tarif au mois est cher. Triés par minMonths décroissant : on prend
       le premier palier dont le seuil est atteint. */
    window.TPX_BILLING.RATE_TIERS = [
        { minMonths: 10, ratePerMonth: 2.5 },   // >= 10 mois restants : tarif "2 mois offerts"
        { minMonths: 5,  ratePerMonth: 2.75 },  // 5 à 9 mois restants
        { minMonths: 0,  ratePerMonth: 3.0 }    // < 5 mois restants : aucun avantage (= tarif Mensuel)
    ];

    /* Nombre de mois restants jusqu'à `end`, arrondi à l'entier SUPÉRIEUR
       (jamais au détriment de l'utilisateur : un reliquat de quelques jours
       compte comme un mois plein). 30 jours par mois, cohérent avec le
       calcul de l'essai gratuit (30 jours exacts, pas un mois calendaire). */
    window.tpxMonthsRemaining = function (end, now) {
        now = now || new Date();
        var ms = end.getTime() - now.getTime();
        if (ms <= 0) return 0;
        return Math.ceil(ms / (30 * 24 * 60 * 60 * 1000));
    };

    window.tpxRatePerMonth = function (monthsRemaining) {
        var tiers = window.TPX_BILLING.RATE_TIERS;
        for (var i = 0; i < tiers.length; i++) {
            if (monthsRemaining >= tiers[i].minMonths) return tiers[i].ratePerMonth;
        }
        return tiers[tiers.length - 1].ratePerMonth;
    };

    /* Prix ESTIMÉ à afficher pour une formule fixe, à l'instant `now`.
       Uniquement pour l'AFFICHAGE : le prix réellement facturé est
       toujours recalculé indépendamment côté backend au moment du
       paiement (cf. premiumPlans.js) — jamais transmis par le navigateur. */
    window.tpxComputeFixedPlanPrice = function (planType, now) {
        var plan = window.TPX_PLAN_UI && window.TPX_PLAN_UI[planType];
        if (!plan || plan.type !== 'fixed') return null;
        var end = new Date(plan.accessEnd);
        var months = window.tpxMonthsRemaining(end, now);
        if (months <= 0) return null; // deadline déjà passée : plus achetable
        var rate = window.tpxRatePerMonth(months);
        return { months: months, ratePerMonth: rate, priceEuros: Math.round(months * rate) };
    };

    window.TPX_PLAN_UI = {
        monthly: {
            label: 'Mensuel', type: 'subscription',
            priceLabel: '3 € / mois', priceEuros: 3,
            accessEnd: null, isAvailable: true
        },
        annual: {
            /* Ancienne formule : plus proposée à l'achat (cf. isAvailable),
               conservée uniquement pour reconnaître/afficher les clients
               existants (point 20 du cahier des charges). */
            label: 'Annuel', type: 'subscription',
            priceLabel: '30 € / an', priceEuros: 30,
            accessEnd: null, isAvailable: false
        },
        ecos2027: {
            label: 'ECOS 2027', type: 'fixed',
            accessEnd: '2027-06-15T21:59:59.000Z', isAvailable: true
        },
        edn2027: {
            label: 'EDN 2027', type: 'fixed',
            accessEnd: '2027-10-31T22:59:59.000Z', isAvailable: true
        },
        edn2027_ecos2028: {
            label: 'EDN 2027 + ECOS 2028', type: 'fixed',
            accessEnd: '2028-06-15T21:59:59.000Z', isAvailable: true
        },
        edn2028: {
            label: 'EDN 2028', type: 'fixed',
            accessEnd: '2028-10-31T22:59:59.000Z', isAvailable: true
        },
        edn2028_ecos2029: {
            label: 'EDN 2028 + ECOS 2029', type: 'fixed',
            accessEnd: '2029-06-15T21:59:59.000Z', isAvailable: true
        }
    };

    /* Ordre d'affichage des cartes tarifs (formules fixes uniquement ;
       Mensuel a sa propre carte statique dans comptepremium.html). */
    window.TPX_FIXED_PLAN_ORDER = ['ecos2027', 'edn2027', 'edn2027_ecos2028', 'edn2028', 'edn2028_ecos2029'];

    window.tpxIsFixedPlan = function (u) {
        return !!(u && window.TPX_BILLING.FIXED_PLAN_TYPES.indexOf(u.premiumType) !== -1);
    };

    window.getPlanLabel = function (type) {
        return (window.TPX_PLAN_UI[type] && window.TPX_PLAN_UI[type].label) || 'Premium';
    };

    /* Abonné : dépend du TYPE de formule.
         • Formule FIXE (paiement unique, ecos2027/edn2027/...) : la seule
           chose qui compte est subscriptionEndDate > maintenant. Un
           `subscriptionStatus === 'active'` stocké ne suffit JAMAIS seul —
           sinon l'accès deviendrait permanent après l'échéance payée.
         • Mensuel / Annuel / historique (pas de premiumType reconnu comme
           fixe) : comportement inchangé — abonnement actif OU résilié mais
           période déjà payée pas encore terminée.
       Aligné EXACTEMENT sur hasActiveAccess() côté règles Firestore. */
    /* Abonné : dépend du TYPE de formule.
         • Formule FIXE (paiement unique, ecos2027/edn2027/...) : la seule
           chose qui compte est subscriptionEndDate > maintenant. Un
           `subscriptionStatus === 'active'` stocké ne suffit JAMAIS seul —
           sinon l'accès deviendrait permanent après l'échéance payée.
         • Mensuel / Annuel / historique : 'active' seul, OU 'canceled'/
           'trialing' avec subscriptionEndDate encore future. 'past_due'/
           'unpaid'/'incomplete' sont VOLONTAIREMENT exclus de ce second cas :
           Stripe peut avancer subscriptionEndDate (= current_period_end)
           même quand le prélèvement de la période a ÉCHOUÉ — leur faire
           confiance reviendrait à accorder un mois non payé le temps que
           Stripe tente le recouvrement (cf. audit sécurité).
       Aligné EXACTEMENT sur hasActiveAccess() côté règles Firestore. */
    window.tpxIsSubscribed = function (u) {
        if (!u) return false;
        var e = window.tpxToDate(u.subscriptionEndDate);
        if (window.tpxIsFixedPlan(u)) {
            return !!(e && e > new Date());
        }
        if (u.subscriptionStatus === 'active') return true;
        if (u.subscriptionStatus !== 'canceled' && u.subscriptionStatus !== 'trialing') return false;
        return !!(e && e > new Date()); // annulé (déjà payé) ou en essai Stripe, jusqu'à cette date
    };

    window.tpxHasPremiumAccess = function (u) {
        /* ── PHASE GRATUITE ──────────────────────────────────────────────
           Tant que tpx-billing.js n'est pas activé, tout le monde a l'accès
           complet, quelle que soit la date de création du compte. ────── */
        if (!window.tpxBillingActive()) return true;

        if (window.tpxIsSubscribed(u)) return true;
        var t = window.tpxTrialEnd(u);
        return !!(t && t > new Date());
    };

    /* ── Programmation générique d'une réévaluation à une date donnée ──────
       setTimeout() déborde silencieusement au-delà d'environ 24,8 jours
       (limite du entier 32 bits utilisé en interne) ; on plafonne donc
       chaque appel et on se reprogramme si l'échéance n'est pas encore
       atteinte. Réutilisé pour la fin d'essai/grâce ET pour la fin d'un
       abonnement résilié (subscriptionEndDate), afin qu'aucun accès ne
       reste actif après son terme sans rechargement de page. Retourne un
       id de timer utilisable avec clearTimeout(). */
    window.tpxScheduleRecheck = function (date, cb) {
        if (!date) return null;
        var wait = date.getTime() - Date.now() + 1500;
        if (wait <= 0) { cb(); return null; }
        wait = Math.min(wait, 2147000000);
        return setTimeout(function () {
            if (date.getTime() - Date.now() <= 0) cb();
            else window.tpxScheduleRecheck(date, cb);
        }, wait);
    };

    /* État explicite pour l'affichage : 'subscriber' | 'trial' | 'legacy' |
       'locked'. Une seule pastille/CTA à la fois, jamais deux ensemble. */
    window.tpxComputeAccessState = function (u) {
        if (!window.tpxBillingActive()) return { state: 'off', end: null };
        if (window.tpxIsSubscribed(u)) return { state: 'subscriber', end: null };
        var end = window.tpxTrialEnd(u);
        if (end && end > new Date()) {
            return { state: window.tpxIsLegacyAccount(u) ? 'legacy' : 'trial', end: end };
        }
        return { state: 'locked', end: end };
    };

    /* ── Masquage de toute l'interface liée au paiement ───────────────────
       #open-premium-btn / .premium-btn-menu  → entrée « Compte premium »
       #tpx-premium-fab / #tpx-trial-fab      → couronne et pastille d'essai/grâce
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
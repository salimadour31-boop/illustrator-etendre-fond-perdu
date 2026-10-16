//@target illustrator
/*
 * EtendreFondPerdu.jsx  —  v1.0.0
 * ----------------------------------------------------------------------------
 * FR : Étend automatiquement jusque dans le fond perdu les tracés qui touchent
 *      le bord d'un plan de travail (fonds, aplats, bandeaux, filets, tracés
 *      de masque d'écrêtage). Seuls les points posés sur le bord sont décalés
 *      vers l'extérieur de la valeur de fond perdu : la forme intérieure reste
 *      intacte. Les contacts ponctuels (cercle tangent au bord) sont ignorés.
 *      Les objets qu'on ne peut pas étendre (images, textes, symboles…) sont
 *      listés et peuvent être sélectionnés. Bouton « Analyser » sans
 *      modification.
 * EN : Automatically extends paths that touch an artboard edge into the bleed
 *      (backgrounds, solid areas, banners, rules, clipping paths). Only the
 *      points lying on the edge are pushed outward by the bleed amount: the
 *      inner shape is left untouched. Single-point contacts (a circle tangent
 *      to the edge) are ignored. Objects that cannot be extended (images,
 *      text, symbols…) are listed and can be selected. "Analyze" button
 *      previews without changing anything.
 *
 * Cible / Target : Illustrator CC (2018+) jusqu'aux versions récentes.
 * Statut / Status : NON TESTÉ DANS ILLUSTRATOR — syntaxe ES3 vérifiée (acorn).
 *                   NOT TESTED IN ILLUSTRATOR — ES3 syntax checked (acorn).
 * Annulation / Undo : Ctrl+Z / Cmd+Z. ExtendScript ne permet pas de forcer
 *      une seule étape d'annulation : il peut en falloir plusieurs.
 *      ExtendScript cannot force a single undo step: several may be needed.
 * Conseil : travaillez sur une copie de votre fichier.
 * Tip     : work on a copy of your file.
 * Aucune connexion réseau, aucune collecte de données, aucun fichier écrit.
 * No network access, no data collection, no file written.
 *
 * Licence MIT — (c) 2026 Amirouche Amwanes. Code original.
 */

(function () {

    var VERSION = "1.0.0";
    var TITLE = "Étendre au fond perdu / Extend to bleed " + VERSION;

    // ------------------------------------------------------------------
    // Langue / UI language (français si Illustrator est en français)
    // ------------------------------------------------------------------
    var FR = String(app.locale || "").toLowerCase().indexOf("fr") === 0;
    function L(fr, en) { return FR ? fr : en; }

    function fmt(n, d) {
        var p = Math.pow(10, d);
        var s = (Math.round(n * p) / p).toFixed(d);
        return FR ? s.replace(".", ",") : s;
    }
    function parseNum(s, def) {
        var v = parseFloat(String(s).replace(",", "."));
        return isNaN(v) ? def : v;
    }

    // Unités -> points / Units -> points
    var UNITS = [
        { label: "mm", k: 72 / 25.4 },
        { label: "cm", k: 72 / 2.54 },
        { label: "pt", k: 1 },
        { label: "px", k: 1 },
        { label: "in", k: 72 }
    ];

    // ------------------------------------------------------------------
    // Vérifications de départ / Preconditions
    // ------------------------------------------------------------------
    if (app.documents.length === 0) {
        alert(L("Aucun document ouvert.\nOuvrez un document puis relancez le script.",
                "No document is open.\nOpen a document and run the script again."), TITLE);
        return;
    }
    var doc = app.activeDocument;

    // Sélection d'objets (un texte en cours d'édition renvoie un TextRange)
    // Object selection (text being edited returns a TextRange)
    var sel = [];
    try {
        var rawSel = doc.selection;
        if (rawSel && rawSel.typename !== "TextRange" && rawSel.length > 0) {
            for (var si = 0; si < rawSel.length; si++) { sel.push(rawSel[si]); }
        }
    } catch (eSel) { sel = []; }
    var hasSelection = sel.length > 0;

    if (!hasSelection) {
        var goDoc = confirm(L("Rien n'est sélectionné.\n\nTraiter tout le document (calques visibles et déverrouillés) ?",
                              "Nothing is selected.\n\nProcess the whole document (visible, unlocked layers)?"),
                            false, TITLE);
        if (!goDoc) { return; }
    }

    // ------------------------------------------------------------------
    // Dialogue / Dialog
    // ------------------------------------------------------------------
    var w = new Window("dialog", TITLE);
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    var pBleed = w.add("panel", undefined, L("Fond perdu", "Bleed"));
    pBleed.orientation = "row";
    pBleed.alignChildren = ["left", "center"];
    pBleed.add("statictext", undefined, L("Valeur :", "Amount:"));
    var eBleed = pBleed.add("edittext", undefined, "3");
    eBleed.characters = 6;
    var ddUnit = pBleed.add("dropdownlist", undefined, ["mm", "cm", "pt", "px", "in"]);
    ddUnit.selection = 0;
    pBleed.add("statictext", undefined, L("Tolérance :", "Tolerance:"));
    var eTol = pBleed.add("edittext", undefined, "0,1");
    if (!FR) { eTol.text = "0.1"; }
    eTol.characters = 5;
    eTol.helpTip = L("Distance maximale entre un point et le bord pour le considérer « sur le bord ».",
                     "Maximum distance between a point and the edge for it to count as \"on the edge\".");

    var pEdges = w.add("panel", undefined, L("Bords à étendre", "Edges to extend"));
    pEdges.orientation = "row";
    var cTop = pEdges.add("checkbox", undefined, L("Haut", "Top"));
    var cBottom = pEdges.add("checkbox", undefined, L("Bas", "Bottom"));
    var cLeft = pEdges.add("checkbox", undefined, L("Gauche", "Left"));
    var cRight = pEdges.add("checkbox", undefined, L("Droite", "Right"));
    cTop.value = cBottom.value = cLeft.value = cRight.value = true;

    var pScope = w.add("panel", undefined, L("Portée", "Scope"));
    pScope.orientation = "column";
    pScope.alignChildren = ["left", "top"];
    var gObj = pScope.add("group");
    var rSel = gObj.add("radiobutton", undefined, L("Sélection", "Selection"));
    var rDoc = gObj.add("radiobutton", undefined, L("Tout le document", "Whole document"));
    rSel.enabled = hasSelection;
    rSel.value = hasSelection;
    rDoc.value = !hasSelection;
    var gAb = pScope.add("group");
    var rAbActive = gAb.add("radiobutton", undefined, L("Plan de travail actif", "Active artboard"));
    var rAbAll = gAb.add("radiobutton", undefined, L("Tous les plans de travail", "All artboards"));
    rAbAll.value = true;

    var pOpt = w.add("panel", undefined, L("Options", "Options"));
    pOpt.orientation = "column";
    pOpt.alignChildren = ["left", "top"];
    var cTangent = pOpt.add("checkbox", undefined,
        L("Ignorer les contacts ponctuels (cercle ou courbe tangente au bord)",
          "Ignore single-point contacts (circle or curve tangent to the edge)"));
    cTangent.value = true;
    var cShared = pOpt.add("checkbox", undefined,
        L("Ne pas étendre les bords collés à un autre plan de travail",
          "Do not extend edges shared with another artboard"));
    cShared.value = true;
    var cClip = pOpt.add("checkbox", undefined,
        L("Étendre aussi les tracés de masque d'écrêtage", "Also extend clipping paths"));
    cClip.value = true;
    var gFinal = pOpt.add("group");
    gFinal.add("statictext", undefined, L("Sélection finale :", "Select afterwards:"));
    var ddFinal = gFinal.add("dropdownlist", undefined, [
        L("Objets non étendus touchant le bord (à vérifier)", "Non-extended objects touching the edge (to check)"),
        L("Objets étendus", "Extended objects"),
        L("Rien", "Nothing")
    ]);
    ddFinal.selection = 0;

    var stInfo = w.add("statictext", undefined,
        L("Cliquez sur « Analyser » pour voir ce qui serait modifié.\nConseil : travaillez sur une copie du fichier.",
          "Click \"Analyze\" to preview what would change.\nTip: work on a copy of the file."),
        { multiline: true });
    stInfo.preferredSize = [460, 90];

    var gBtn = w.add("group");
    gBtn.alignment = ["right", "top"];
    var bAnalyze = gBtn.add("button", undefined, L("Analyser", "Analyze"));
    var bCancel = gBtn.add("button", undefined, L("Annuler", "Cancel"), { name: "cancel" });
    var bOk = gBtn.add("button", undefined, L("Appliquer", "Apply"), { name: "ok" });

    function readConfig() {
        var u = UNITS[ddUnit.selection ? ddUnit.selection.index : 0];
        var bleed = parseNum(eBleed.text, NaN);
        var tol = parseNum(eTol.text, NaN);
        if (isNaN(bleed) || bleed <= 0) {
            alert(L("Valeur de fond perdu invalide (nombre positif attendu).",
                    "Invalid bleed amount (positive number expected)."), TITLE);
            return null;
        }
        if (isNaN(tol) || tol < 0) {
            alert(L("Tolérance invalide (nombre positif ou nul attendu).",
                    "Invalid tolerance (zero or positive number expected)."), TITLE);
            return null;
        }
        var cfg = {
            bleed: bleed * u.k,
            tol: tol * u.k,
            unitLabel: u.label,
            unitK: u.k,
            top: cTop.value, bottom: cBottom.value, left: cLeft.value, right: cRight.value,
            useSelection: rSel.value && hasSelection,
            allArtboards: rAbAll.value,
            skipTangent: cTangent.value,
            skipShared: cShared.value,
            clipPaths: cClip.value,
            finalSel: ddFinal.selection ? ddFinal.selection.index : 0
        };
        if (!cfg.top && !cfg.bottom && !cfg.left && !cfg.right) {
            alert(L("Cochez au moins un bord.", "Tick at least one edge."), TITLE);
            return null;
        }
        if (cfg.tol >= cfg.bleed) {
            alert(L("La tolérance doit être plus petite que le fond perdu.",
                    "Tolerance must be smaller than the bleed."), TITLE);
            return null;
        }
        return cfg;
    }

    // ------------------------------------------------------------------
    // Plans de travail / Artboards
    // rect = [gauche, haut, droite, bas] (y vers le haut / y up)
    // ------------------------------------------------------------------
    function getArtboards(cfg) {
        var list = [], i, j;
        var all = [];
        for (i = 0; i < doc.artboards.length; i++) {
            all.push({ index: i, rect: doc.artboards[i].artboardRect });
        }
        var activeIdx = doc.artboards.getActiveArtboardIndex();
        for (i = 0; i < all.length; i++) {
            if (!cfg.allArtboards && i !== activeIdx) { continue; }
            var r = all[i].rect;
            var ab = {
                index: i, L: r[0], T: r[1], R: r[2], B: r[3],
                top: cfg.top, bottom: cfg.bottom, left: cfg.left, right: cfg.right,
                shared: 0
            };
            if (cfg.skipShared) {
                // Bord collé à un autre plan de travail ? / Edge touching another artboard?
                for (j = 0; j < all.length; j++) {
                    if (j === i) { continue; }
                    var o = all[j].rect;
                    var overlapY = (o[3] < ab.T - cfg.tol) && (o[1] > ab.B + cfg.tol);
                    var overlapX = (o[0] < ab.R - cfg.tol) && (o[2] > ab.L + cfg.tol);
                    if (ab.left && overlapY && Math.abs(o[2] - ab.L) <= cfg.bleed) { ab.left = false; ab.shared++; }
                    if (ab.right && overlapY && Math.abs(o[0] - ab.R) <= cfg.bleed) { ab.right = false; ab.shared++; }
                    if (ab.top && overlapX && Math.abs(o[3] - ab.T) <= cfg.bleed) { ab.top = false; ab.shared++; }
                    if (ab.bottom && overlapX && Math.abs(o[1] - ab.B) <= cfg.bleed) { ab.bottom = false; ab.shared++; }
                }
            }
            list.push(ab);
        }
        return list;
    }

    // ------------------------------------------------------------------
    // Collecte des objets / Item collection
    // ------------------------------------------------------------------
    function isUsable(it) {
        try { if (it.locked || it.hidden) { return false; } } catch (e) { return false; }
        return true;
    }

    function collect(it, out, insideClip) {
        if (!isUsable(it)) { out.skippedLocked++; return; }
        var t = it.typename, k;
        if (t === "PathItem") {
            if (it.clipping && !out.cfg.clipPaths) { return; }
            out.paths.push({ item: it, owner: it });
            if (it.clipping) { out.clipCount++; }
        } else if (t === "CompoundPathItem") {
            for (k = 0; k < it.pathItems.length; k++) {
                if (it.pathItems[k].clipping && !out.cfg.clipPaths) { continue; }
                out.paths.push({ item: it.pathItems[k], owner: it });
            }
        } else if (t === "GroupItem") {
            for (k = 0; k < it.pageItems.length; k++) {
                collect(it.pageItems[k], out, insideClip || it.clipped);
            }
        } else {
            // Texte, image, symbole, maillage, plug-in, graphe…
            // Text, image, symbol, mesh, plug-in, graph…
            out.others.push(it);
        }
    }

    function collectLayer(lay, out) {
        if (!lay.visible || lay.locked) { out.skippedLayers++; return; }
        var k;
        for (k = 0; k < lay.pageItems.length; k++) { collect(lay.pageItems[k], out, false); }
        for (k = 0; k < lay.layers.length; k++) { collectLayer(lay.layers[k], out); }
    }

    // ------------------------------------------------------------------
    // Géométrie / Geometry
    // ------------------------------------------------------------------
    // Bords d'un point pour le premier plan de travail concerné.
    // Edges of a point for the first matching artboard.
    function pointEdges(x, y, abs, tol) {
        for (var a = 0; a < abs.length; a++) {
            var ab = abs[a];
            var inY = y >= ab.B - tol && y <= ab.T + tol;
            var inX = x >= ab.L - tol && x <= ab.R + tol;
            if (!inX || !inY) { continue; }
            var e = { ab: a, left: false, right: false, top: false, bottom: false, any: false };
            if (ab.left && Math.abs(x - ab.L) <= tol) { e.left = true; }
            if (ab.right && Math.abs(x - ab.R) <= tol) { e.right = true; }
            if (ab.top && Math.abs(y - ab.T) <= tol) { e.top = true; }
            if (ab.bottom && Math.abs(y - ab.B) <= tol) { e.bottom = true; }
            e.any = e.left || e.right || e.top || e.bottom;
            if (e.any) { return e; }
        }
        return null;
    }

    function sameEdge(a, b, name) {
        return a !== null && b !== null && a.ab === b.ab && a[name] && b[name];
    }

    // Calcule les déplacements des points d'un tracé (sans modifier).
    // Computes point moves for one path (no change).
    function planPath(p, abs, cfg) {
        var pts = p.pathPoints, n = pts.length, i;
        if (n === 0) { return []; }
        var data = [], edges = [];
        for (i = 0; i < n; i++) {
            var pp = pts[i];
            var d = { a: pp.anchor, l: pp.leftDirection, r: pp.rightDirection };
            data.push(d);
            edges.push(pointEdges(d.a[0], d.a[1], abs, cfg.tol));
        }
        var closed = p.closed;
        var moves = [];
        var names = ["left", "right", "top", "bottom"];
        for (i = 0; i < n; i++) {
            var e = edges[i];
            if (e === null) { continue; }
            var prev = (i > 0) ? i - 1 : (closed ? n - 1 : -1);
            var next = (i < n - 1) ? i + 1 : (closed ? 0 : -1);
            var isEndpoint = !closed && (prev === -1 || next === -1);
            var dx = 0, dy = 0;
            for (var k = 0; k < names.length; k++) {
                var nm = names[k];
                if (!e[nm]) { continue; }
                var ok = true;
                if (cfg.skipTangent && !isEndpoint) {
                    // Il faut un segment voisin qui longe le même bord.
                    // A neighbouring segment must run along the same edge.
                    ok = (prev !== -1 && prev !== i && sameEdge(e, edges[prev], nm)) ||
                         (next !== -1 && next !== i && sameEdge(e, edges[next], nm));
                }
                if (!ok) { continue; }
                if (nm === "left") { dx = -cfg.bleed; }
                if (nm === "right") { dx = cfg.bleed; }
                if (nm === "top") { dy = cfg.bleed; }
                if (nm === "bottom") { dy = -cfg.bleed; }
            }
            if (dx !== 0 || dy !== 0) {
                moves.push({ i: i, dx: dx, dy: dy, d: data[i] });
            }
        }
        return moves;
    }

    function applyMoves(p, moves) {
        var pts = p.pathPoints;
        for (var m = 0; m < moves.length; m++) {
            var mv = moves[m], d = mv.d, pp = pts[mv.i];
            pp.anchor = [d.a[0] + mv.dx, d.a[1] + mv.dy];
            pp.leftDirection = [d.l[0] + mv.dx, d.l[1] + mv.dy];
            pp.rightDirection = [d.r[0] + mv.dx, d.r[1] + mv.dy];
        }
    }

    // Un objet non extensible touche-t-il un bord actif ?
    // Does a non-extendable object touch an active edge?
    function touchesEdge(it, abs, tol) {
        var b;
        try { b = it.geometricBounds; } catch (e) { return false; }
        for (var a = 0; a < abs.length; a++) {
            var ab = abs[a];
            if (b[2] < ab.L - tol || b[0] > ab.R + tol || b[3] > ab.T + tol || b[1] < ab.B - tol) { continue; }
            if (ab.left && b[0] <= ab.L + tol && b[0] > ab.L - cfgBleedNow + tol) { return true; }
            if (ab.right && b[2] >= ab.R - tol && b[2] < ab.R + cfgBleedNow - tol) { return true; }
            if (ab.top && b[1] >= ab.T - tol && b[1] < ab.T + cfgBleedNow - tol) { return true; }
            if (ab.bottom && b[3] <= ab.B + tol && b[3] > ab.B - cfgBleedNow + tol) { return true; }
        }
        return false;
    }
    var cfgBleedNow = 0;

    // ------------------------------------------------------------------
    // Traitement / Processing (dryRun = analyse sans modification)
    // ------------------------------------------------------------------
    function run(cfg, dryRun) {
        cfgBleedNow = cfg.bleed;
        var abs = getArtboards(cfg);
        var out = { cfg: cfg, paths: [], others: [], clipCount: 0, skippedLocked: 0, skippedLayers: 0 };
        var k;
        if (cfg.useSelection) {
            for (k = 0; k < sel.length; k++) { collect(sel[k], out, false); }
        } else {
            for (k = 0; k < doc.layers.length; k++) { collectLayer(doc.layers[k], out); }
        }
        var res = { paths: 0, points: 0, extended: [], clips: 0, others: [], shared: 0,
                    skipped: out.skippedLocked + out.skippedLayers, errors: 0, artboards: abs.length };
        for (k = 0; k < abs.length; k++) { res.shared += abs[k].shared; }

        for (k = 0; k < out.paths.length; k++) {
            var entry = out.paths[k];
            var moves;
            try { moves = planPath(entry.item, abs, cfg); } catch (e1) { res.errors++; continue; }
            if (moves.length === 0) { continue; }
            res.paths++;
            res.points += moves.length;
            if (entry.item.clipping) { res.clips++; }
            if (!dryRun) {
                try { applyMoves(entry.item, moves); } catch (e2) { res.errors++; continue; }
            }
            res.extended.push(entry.owner);
        }
        for (k = 0; k < out.others.length; k++) {
            if (touchesEdge(out.others[k], abs, cfg.tol)) { res.others.push(out.others[k]); }
        }
        return res;
    }

    function summary(res, cfg, dryRun) {
        var s = [];
        s.push((dryRun ? L("Analyse : ", "Analysis: ") : L("Terminé : ", "Done: ")) +
               res.paths + L(" tracé(s), ", " path(s), ") + res.points + L(" point(s) ", " point(s) ") +
               (dryRun ? L("à déplacer", "to move") : L("déplacé(s)", "moved")) +
               L(" de ", " by ") + fmt(cfg.bleed / cfg.unitK, 2) + " " + cfg.unitLabel +
               L(" sur ", " on ") + res.artboards + L(" plan(s) de travail.", " artboard(s)."));
        if (res.clips > 0) {
            s.push(res.clips + L(" masque(s) d'écrêtage étendu(s) : vérifiez que l'image couvre le fond perdu.",
                                 " clipping path(s) extended: check that the image covers the bleed."));
        }
        if (res.others.length > 0) {
            s.push(res.others.length + L(" objet(s) non extensible(s) touchent le bord (images, textes, symboles…).",
                                         " non-extendable object(s) touch the edge (images, text, symbols…)."));
        }
        if (res.shared > 0) {
            s.push(res.shared + L(" bord(s) collé(s) à un autre plan de travail ignoré(s).",
                                  " edge(s) shared with another artboard skipped."));
        }
        if (res.skipped > 0) {
            s.push(res.skipped + L(" objet(s)/calque(s) verrouillé(s) ou masqué(s) ignoré(s).",
                                   " locked or hidden object(s)/layer(s) skipped."));
        }
        if (res.errors > 0) {
            s.push(res.errors + L(" erreur(s) ignorée(s).", " error(s) skipped."));
        }
        return s.join("\n");
    }

    var oldCS = app.coordinateSystem;

    bAnalyze.onClick = function () {
        var cfg = readConfig();
        if (!cfg) { return; }
        app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        try {
            stInfo.text = summary(run(cfg, true), cfg, true);
        } catch (e) {
            stInfo.text = L("Erreur pendant l'analyse : ", "Error during analysis: ") + e.message;
        }
        app.coordinateSystem = oldCS;
    };

    var finalCfg = null;
    bOk.onClick = function () {
        finalCfg = readConfig();
        if (finalCfg) { w.close(1); }
    };

    if (w.show() !== 1 || !finalCfg) { return; }

    // ------------------------------------------------------------------
    // Application / Apply
    // ------------------------------------------------------------------
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var result;
    try {
        result = run(finalCfg, false);
    } catch (eRun) {
        app.coordinateSystem = oldCS;
        alert(L("Erreur : ", "Error: ") + eRun.message + "\n" +
              L("Utilisez Ctrl+Z / Cmd+Z pour annuler les changements partiels.",
                "Use Ctrl+Z / Cmd+Z to undo partial changes."), TITLE);
        return;
    }
    app.coordinateSystem = oldCS;

    // Sélection finale / Final selection
    try {
        var toSelect = null;
        if (finalCfg.finalSel === 0) { toSelect = result.others; }
        if (finalCfg.finalSel === 1) { toSelect = result.extended; }
        if (toSelect !== null) {
            doc.selection = null;
            for (var q = 0; q < toSelect.length; q++) {
                try { toSelect[q].selected = true; } catch (eS) { }
            }
        }
    } catch (eSel2) { }

    app.redraw();
    alert(summary(result, finalCfg, false) + "\n\n" +
          L("Pensez à régler le même fond perdu dans Fichier > Format du document.\nAnnuler : Ctrl+Z / Cmd+Z.",
            "Remember to set the same bleed in File > Document Setup.\nUndo: Ctrl+Z / Cmd+Z."), TITLE);
}());

# illustrator-etendre-fond-perdu

**EtendreFondPerdu.jsx** — étend automatiquement jusque dans le fond perdu les tracés qui touchent le bord d'un plan de travail, pour Adobe Illustrator (ExtendScript, FR/EN).
*Automatically extend paths that touch an artboard edge into the bleed in Adobe Illustrator.*

> **Statut : non testé dans Illustrator.** La syntaxe ES3 a été vérifiée automatiquement (acorn) et la logique a été relue. Le script n'a pas encore été exécuté dans Illustrator. Travaillez sur une **copie** de votre fichier.
> *Status: not tested in Illustrator. ES3 syntax checked (acorn), logic reviewed. Work on a copy of your file.*

## Pourquoi / Why

Un fichier client arrive « au format fini » : les fonds, bandeaux et aplats s'arrêtent pile au bord du plan de travail, sans fond perdu. Il faut alors étirer chaque objet de 3 mm (ou 5 mm) vers l'extérieur, bord par bord, plan de travail par plan de travail. Illustrator ne propose aucune commande pour cela, et les scripts gratuits existants redimensionnent ou dupliquent l'objet entier (ce qui déforme ou décale le contenu).

Ce script fait autrement : il ne déplace **que les points posés sur le bord**, vers l'extérieur, de la valeur du fond perdu. Le reste de la forme ne bouge pas.

- **Bords au choix** : haut, bas, gauche, droite.
- **Plan de travail actif ou tous les plans de travail** ; les bords **collés à un autre plan de travail** peuvent être ignorés (pour ne pas déborder sur la page voisine).
- **Contacts ponctuels ignorés** (option par défaut) : un cercle ou une courbe qui touche le bord en un seul point n'est pas déformé ; seul un tracé dont un segment longe le bord est étendu. Les extrémités des tracés ouverts (filets qui vont jusqu'au bord) sont étendues.
- **Masques d'écrêtage** : le tracé de masque est étendu (option), avec un rappel de vérifier que l'image en dessous couvre bien le fond perdu.
- **Objets non extensibles** (images, textes, symboles, maillages, objets de plug-in) qui touchent le bord : comptés et **sélectionnés à la fin** pour que vous les traitiez à la main.
- **Tolérance** réglable pour les points « presque » sur le bord.
- Bouton **Analyser** : nombre de tracés et de points concernés, sans rien modifier.
- Unités : mm, cm, pt, px, in. Calques et objets verrouillés ou masqués ignorés.

## Installation

- **Ponctuelle** : dans Illustrator, *Fichier > Scripts > Autre script…* (Ctrl+F12 / Cmd+F12), puis choisir `EtendreFondPerdu.jsx`.
- **Permanente** : copier `EtendreFondPerdu.jsx` dans le dossier `Presets/<langue>/Scripts` d'Illustrator, puis redémarrer Illustrator :
  - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\fr_FR\Scripts`
  - macOS : `/Applications/Adobe Illustrator <version>/Presets.localized/fr_FR/Scripts`

  Le script apparaît alors dans *Fichier > Scripts*.

Le fichier est en UTF-8. Si les accents s'affichent mal (surtout sous Windows), réenregistrez-le en « UTF-8 avec BOM » dans votre éditeur de texte.

## Utilisation / Usage

1. Ouvrez votre document (un message s'affiche si aucun document n'est ouvert) et faites-en une copie.
2. Sélectionnez les objets à étendre, ou rien du tout : le script propose alors de traiter tout le document (calques visibles et déverrouillés).
3. Lancez le script, indiquez le fond perdu (3 mm par défaut), les bords et les plans de travail.
4. Cliquez sur **Analyser**, puis sur **Appliquer**.
5. Vérifiez les objets sélectionnés à la fin (images, textes… qui touchent le bord sans pouvoir être étendus).
6. Réglez le même fond perdu dans *Fichier > Format du document* (le script ne peut pas le faire : l'API ExtendScript ne l'expose pas).
7. Pour revenir en arrière : Ctrl+Z / Cmd+Z, éventuellement plusieurs fois (ExtendScript ne permet pas de forcer une seule étape d'annulation dans Illustrator).

L'interface est en français si Illustrator est en français, sinon en anglais.

## Version ciblée / Target

Illustrator CC 2018 et versions plus récentes (ExtendScript ES3, ScriptUI). Pas d'UXP nécessaire.

## Limites connues / Known limits

- Non testé dans Illustrator : signalez tout problème dans les *Issues*.
- Les images, textes, symboles et maillages ne sont pas étirés (ils seraient déformés) : ils sont seulement signalés.
- Les effets (Aspect) et les formes dynamiques ne sont pas recalculés ; un rectangle « Forme dynamique » peut perdre ce statut après déplacement de ses points.
- Les motifs et dégradés de remplissage ne sont pas recalés : un dégradé linéaire peut légèrement changer d'aspect sur la zone étendue.
- Un objet déjà étendu n'est plus sur le bord : relancer le script ne l'étend pas une deuxième fois.

## Projets similaires / Similar projects

Code 100 % original. Des scripts libres redimensionnent un objet entier pour couvrir le plan de travail (par ex. *FitSelectionToArtboards* de Sergey Osokin) ou créent des copies décalées pour le fond perdu de découpes (Mars Premedia *Cut And Bleed*). Ce script-ci étend en place uniquement les bords qui touchent le plan de travail, sans dupliquer ni redimensionner.

## Confidentialité / Privacy

Aucun appel réseau, aucune collecte de données, aucun fichier écrit.

## Licence

MIT — © 2026 Amirouche Amwanes. Voir `LICENSE`.

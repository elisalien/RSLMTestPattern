# Mires Resolume

Générateur de mires de test pour Resolume Arena : importe l’Advanced Output, génère une mire par slice, vérifie la sortie de chaque écran (warp compris) et exporte en PNG ou en vidéo DXV / HAP / ProRes prête à jouer.

## Lancer

**En local (recommandé)** — export DXV, HAP, HAP Q, HAP Alpha, ProRes 4444 et H.264 via ffmpeg :

- Windows : double-clic sur `Lancer Mires Resolume.bat`
- ou en ligne de commande :

```bash
npm install
npm run local
```

L’app s’ouvre sur http://127.0.0.1:4777. Les vidéos sont enregistrées dans `Vidéos\Mires Resolume` (modifiable avec la variable `RSLM_OUT`). ffmpeg doit être dans le PATH (`winget install ffmpeg`).

**En ligne / sans ffmpeg** : tout marche sauf DXV / HAP / ProRes ; l’export vidéo se fait en MP4 dans le navigateur (Chrome ou Edge).

**Développement** : `npm run dev` (Vite, port 3000) + `npm start` dans un autre terminal pour l’API d’encodage.

## Ce que fait l’app

### Setup
- Import du XML Advanced Output (Arena 6 → 7.x) par bouton ou glisser-déposer n’importe où.
- Lit tous les types de sortie : Display, Virtual, Spout, NDI. Les écrans DMX (pixel mapping lumière) sont ignorés.
- Slices, polygones (contours d’entrée et de sortie), slices tournées, warp Bezier et corner pin (homographie).
- Slices partagées entre plusieurs écrans : dessinées une seule fois.
- Setup manuel (taille + grille de slices) quand il n’y a pas de XML.
- Chaque slice peut être coupée ; chaque écran peut être masqué de la composition.

### Deux vues
- **Composition** : ce que Resolume joue (le clip à charger).
- **Sortie écran** : ce que reçoit chaque écran, avec la déformation appliquée et les contours des slices.

### Mires (20)
Identification, Mire complète, Carte UV · Barres SMPTE, Barres EBU, Aplat, Dégradés RVB, Spectre · Échelle de gris, Noirs et blancs (PLUGE), Contrôle gamma · Quadrillage, Damier, Convergence, Cabinets LED (numérotation serpentin + câblage) · Zone plate, Étoile de Siemens, Résolution, Pixels alternés · Fond seul.
Chaque mire se dessine dans chaque slice ou une seule fois sur toute la composition.

### Repères pro (cumulables)
Contour de slice, bords au pixel (overscan), étiquette (nom, taille, ratio, position, écran), centre et diagonales, cercle de ratio, grille pixel alignée composition, zones de sécurité, règles, coordonnées des coins, chevauchements entre slices, carte d’info, cadre de composition.

### Animations (boucles parfaites)
Chaque mouvement fait un nombre entier de cycles par boucle : la vidéo boucle sans saut.
Barre de balayage, compteur d’images + timecode + carré pair/impair, flash de synchro, chenillard de slices, horloge de boucle, défilement de la mire, carré rebondissant, texte défilant, cycle de couleurs, cadre pulsé.

### Petites étoiles et décor (onglet Style)
12 formes à semer sur chaque slice : étoiles, étincelles, cœurs, notes, fleurs, diamants, nuages, pixels, bulles, croix, flèches, éclairs. Fixes ou animées (flottent, scintillent, tournent, montent), quantité, taille, opacité, couleurs du thème ou de la slice. Les thèmes Kawaii Core et Frutiger Aero retrouvent leurs étoiles de coin et leurs bulles.

### Logos
- PNG, SVG, WebP… gardés dans le navigateur (IndexedDB) : plus perdus au rechargement.
- Autant de calques que voulu : sur chaque slice, sur des slices choisies ou une fois sur la composition.
- Position 9 points + décalage + marge, taille relative (petit côté, largeur ou hauteur), rotation, miroir, opacité, mode de fusion.
- Couleur : d’origine, blanc, noir, couleur de la slice, teinte au choix, inversé.
- Plaque de fond arrondie, ombre portée, mosaïque (filigrane) avec angle et décalage.
- Animations : pulsation, flottement, rotation, retournement, rebond, orbite, fondu, DVD, glitch.

### Export
- PNG : vue, composition, chaque écran ou chaque slice (ZIP), échelle 25 → 200 %.
- Vidéo : DXV 3, HAP, HAP Q, HAP Alpha, ProRes 4444, H.264 (ffmpeg local) ou MP4 navigateur.
- Fond transparent possible (PNG, HAP Alpha, ProRes 4444) pour poser repères et logos en couche.

### Presets
Sauvegarde de la mire, des repères, des animations et des logos. Export / import en JSON avec les logos embarqués.

## Raccourcis
- `Espace` lecture / pause · `←` `→` image par image en pause
- `F` ajuster · `1` pixels réels · `Ctrl` + molette zoom

## Structure
```
server/serve.mjs      serveur local : app + encodage ffmpeg
src/core/             types, géométrie (homographie, warp), parser XML
src/render/           moteur (cache par couche), mires, repères, animations, logos, thèmes
src/export/           PNG, ZIP, vidéo (WebCodecs + ffmpeg)
src/state/            store (persistance), bibliothèque de logos (IndexedDB)
src/ui/               interface
```

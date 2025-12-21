# 🚀 Démarrage Rapide

## Installation

```bash
npm install
```

## Lancer l'application

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

## Build pour production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`

## Utilisation Rapide

### 1. Importer votre XML
- Cliquez sur "Import Resolume XML"
- Sélectionnez votre fichier export Resolume (Advanced Output)

### 2. Choisir un pattern
- **Resolume** : Pattern par défaut avec grille et texte
- **SMPTE 75%** : Standard broadcast américain
- **EBU 75%** : Standard broadcast européen
- **Crosshatch** : Test de convergence
- **Monoscope** : Pattern complet avec cercles
- **Zone Plate** : Test de focus (UFO)
- **Gradient** : Calibration luminance
- **Pixel Grid** : Numérotation LED
- **SMPTE 100%** : Barres pleine intensité

### 3. Personnaliser (optionnel)
- Couleurs (fond, grille, texte)
- Taille de grille
- Affichage (texte, UFOs, diagonale)

### 4. Sélectionner les slices
- **Clic** : Sélectionner une slice
- **Ctrl+Clic** : Sélection multiple
- Par défaut toutes les slices sont sélectionnées

### 5. Exporter
- **Par slice** : Bouton download sur chaque preview
- **Batch** : "Exporter tout" pour toutes les sélectionnées

## 🎨 Mode Windows XP
Cliquez sur "💿 Windows XP" pour activer le mode nostalgique !

## 🎯 Formats de patterns

### Broadcast Standards
- **SMPTE 75%** - Barres couleur 75% intensité (standard NTSC)
  - Top 2/3 : 7 barres (White, Yellow, Cyan, Green, Magenta, Red, Blue)
  - Middle : Reverse bars
  - Bottom : -I, White, +Q, Black (3.5%, 7.5%, 11.5%)

- **SMPTE 100%** - Barres couleur pleine intensité
  - 8 barres incluant Black

- **EBU 75%** - Standard européen
  - 8 barres avec 100% White en premier

### Test Patterns
- **Crosshatch** - Grille + cercles de convergence aux coins
- **Monoscope** - Grille fine + cercles concentriques + carrés rouges
- **Zone Plate** - Pattern circulaire pour focus/résolution
- **Gradient Ramp** - Dégradés horizontal + RGB + step wedge
- **Pixel Grid** - Grille avec numérotation des cells
- **Resolume** - Grille + cross central + UFOs + diagonale

## 📐 Responsive Design
Tous les patterns s'adaptent automatiquement aux dimensions de chaque slice :
- Grille proportionnelle à la taille
- Texte et éléments scalables
- Optimisé de SD à 4K

## ⚡ Performance
- Génération instantanée
- Preview temps réel
- Export PNG haute qualité
- Support de centaines de slices

## 🐛 Troubleshooting

**Le XML ne se charge pas**
→ Vérifiez que c'est bien un export Resolume Arena (Advanced Output)

**Les patterns sont flous**
→ Assurez-vous d'exporter en PNG (pas JPEG)

**L'application est lente**
→ Désélectionnez les slices que vous n'utilisez pas

**Les couleurs sont différentes**
→ Vérifiez les paramètres de couleur dans la section Configuration

## 💡 Tips
- Utilisez **Ctrl+Clic** pour comparer plusieurs patterns
- Le mode XP est parfait pour les screenshots nostalgiques
- Exportez en batch pour gagner du temps
- Les patterns SMPTE/EBU sont calibrés selon les standards officiels

---

Bon VJing ! 🎬✨

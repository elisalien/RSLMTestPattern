# 🎬 Resolume Test Pattern Generator

Générateur de mires de test professionnelles pour Resolume Arena avec support complet de tous les standards broadcast.

## ✨ Fonctionnalités

### Patterns Professionnels
- **SMPTE Color Bars 75%** - Standard broadcast américain (NTSC)
- **SMPTE Color Bars 100%** - Barres pleine intensité
- **EBU Bars 75%** - Standard broadcast européen (PAL/SECAM)
- **Crosshatch** - Grille pour tests de convergence
- **Monoscope** - Pattern complet avec cercles et convergence
- **Zone Plate / UFO** - Test de focus et résolution
- **Gradient Ramp** - Calibration de luminance et gamma
- **Pixel Grid** - Numérotation des panels LED
- **Resolume Pattern** - Mire style Resolume avec grille et marqueurs

### Fonctionnalités Principales
✅ **Import XML Resolume** - Parse automatiquement les slices et dimensions avec gestion d'erreurs avancée
✅ **Navigation Advanced Input/Output** - Basculez entre l'input et l'output avancé de Resolume pour visualiser et exporter selon votre besoin
✅ **Compatibilité Améliorée** - Support robuste de différentes versions de Resolume Arena (6, 7, 8+)
✅ **Génération Responsive** - Les patterns s'adaptent automatiquement aux dimensions de chaque slice
✅ **Personnalisation Complète** - Couleurs, grille, texte, UFOs, diagonale
✅ **Interface Moderne** - UI/UX professionnelle avec animations fluides et design épuré
✅ **États de Chargement** - Feedback visuel lors des opérations
✅ **Design Responsive** - Optimisé pour tous les écrans
✅ **Gestion des Slices**
   - Vue composition complète
   - Preview temps réel
   - Validation automatique
   - Couleurs personnalisables par slice
✅ **Export PNG** - Export haute qualité jusqu'à 4K

## 🚀 Installation

```bash
# Installation des dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour production
npm run build
```

## 📖 Utilisation

### 1. Importer votre XML Resolume
Cliquez sur "Import Resolume XML" et sélectionnez votre fichier d'export Resolume Arena.

**Nouveau !** Après l'import, vous pouvez choisir entre :
- **Advanced Output** (par défaut) - Visualise et exporte selon la sortie configurée dans Resolume
- **Advanced Input** - Visualise et exporte selon l'entrée source de la composition

Basculez entre les deux modes avec les boutons sous l'import pour mieux comprendre votre mapping.

### 2. Sélectionner un Pattern
Choisissez parmi les 9 patterns professionnels disponibles :
- **Resolume** : Mire par défaut avec grille et marqueurs
- **SMPTE 75%** : Standard broadcast pour calibration couleur
- **SMPTE 100%** : Barres pleine intensité
- **EBU 75%** : Standard européen
- **Crosshatch** : Pour tester la convergence
- **Monoscope** : Pattern complet avec cercles
- **Zone Plate** : Test de focus et résolution (UFO)
- **Gradient** : Calibration luminance
- **Pixel Grid** : Numérotation LED panels

### 3. Configurer les Options
- **Couleurs** : Fond, grille, texte
- **Dimensions** : Taille de grille, taille de texte
- **Options** : Afficher texte, UFOs, diagonale

### 4. Sélectionner les Slices
- **Clic simple** : Sélectionner une slice
- **Ctrl+Clic** : Sélection multiple
- Toutes les slices sont sélectionnées par défaut

### 5. Exporter
- **Export individuel** : Bouton download sur chaque slice
- **Export batch** : "Exporter tout" pour toutes les slices sélectionnées
- Format : PNG haute qualité

## 🔧 Stack Technique
- **React 18** + **TypeScript** - Framework moderne et type-safe
- **Vite** - Build ultra-rapide
- **Tailwind CSS** - Styling utilitaire avec classes personnalisées
- **fast-xml-parser** - Parsing XML Resolume robuste
- **Chroma.js** - Manipulation des couleurs
- **Canvas API** - Génération des patterns
- **Lucide React** - Icônes modernes et optimisées
- **CSS Animations** - Transitions fluides et professionnelles

## 📐 Formats Supportés
- **Résolutions** : De SD à 4K (3840×2160)
- **Aspect Ratios** : Tous ratios supportés (16:9, 4:3, custom)
- **XML** : Resolume Arena 6, 7, 8+
  - Gestion automatique des écrans multiples
  - Validation robuste des données
  - Messages d'erreur détaillés pour le debugging

## 🎯 Cas d'Usage
- **VJing Live** : Tester les outputs LED avant les shows
- **Installation** : Calibration d'écrans et projecteurs
- **Broadcast** : Vérification signal vidéo
- **Mapping** : Alignement de projections
- **LED Walls** : Configuration de panels LED

## 📝 Structure XML Resolume
Le parser extrait automatiquement avec validation :
- **Nom des slices** - Identifiant de chaque zone
- **Dimensions** - Width × Height en pixels (arrondis automatiquement)
- **Position** - Coordonnées X, Y (validation des valeurs)
- **InputRect** - Zone dans la composition source
- **OutputRect** - Zone de sortie réelle sur l'écran
- **Gestion d'erreurs** - Logs détaillés pour identifier les problèmes
- **Fallback intelligent** - Valeurs par défaut si données manquantes

## 🌟 Inspirations
Basé sur les standards professionnels :
- **SMPTE** (Society of Motion Picture & Television Engineers)
- **EBU** (European Broadcasting Union)
- **ITU-R BT.601/709** - Standards de colorimétrie
- Générateurs professionnels (DVS, VIOSO, Pixera, Smode)

## 🚧 Roadmap Future
- [ ] Export PDF multi-pages
- [ ] Export XML modifié
- [ ] Templates de patterns personnalisés
- [ ] Génération de palettes automatiques
- [ ] Support multi-résolutions batch (1080p, 4K, 8K)
- [ ] Naming pattern intelligent avec variables
- [ ] Auto-save toutes les 30s
- [ ] Animation de la ligne diagonale
- [ ] Mode copier-coller paramètres
- [ ] Lock/unlock slices

## 📄 Licence
MIT License - Libre d'utilisation pour vos projets VJ/LED !

## 🙏 Crédits
Créé pour la communauté VJ 🎥✨
Testé avec Resolume Arena 7+ sur des setups LED complexes

---

**Made with ❤️ for VJs, by VJs**

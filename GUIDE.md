# Z Development — Application de gestion (web)

Vraie interface (devis, factures, contrats) qui fonctionne **dans le navigateur**.
Tes données restent **privées sur ton appareil** (rien n'est envoyé en ligne), avec
**export/import** pour sauvegarder ou passer d'un appareil à l'autre.

---

## ▶️ Lancer l'application sur ton PC

**Méthode recommandée :** double-clic sur **`Lancer l'application.bat`**.
Ça démarre un petit serveur local et ouvre `http://localhost:8123` dans ton navigateur.
Laisse la fenêtre noire ouverte pendant que tu travailles ; ferme-la pour arrêter.

> Tu peux aussi simplement ouvrir `index.html` dans Chrome, mais le lanceur est plus fiable
> (certains navigateurs limitent le stockage en mode « fichier »).

---

## 🌍 Mettre l'app en ligne (Vercel) — pour y accéder depuis le téléphone / un autre PC

L'app est 100 % statique : aucun serveur, aucune base à configurer.

**Option A — Glisser-déposer (le plus simple, sans compte technique) :**
1. Va sur **https://vercel.com** et connecte-toi (compte gratuit).
2. Clique **Add New… → Project → Deploy** (ou utilise https://vercel.com/new).
3. **Glisse le dossier `web/`** dans la zone de dépôt.
4. Vercel te donne une URL type `https://zdev-xxx.vercel.app` → c'est ton app, accessible partout.

**Option B — En ligne de commande :**
```bash
npm i -g vercel
cd web
vercel        # suis les instructions, puis "vercel --prod"
```

> ⚠️ Important : mettre l'**app** en ligne ne met pas tes **données** en ligne.
> Chaque appareil garde ses propres données dans son navigateur. Pour transférer
> tes clients/documents d'un appareil à l'autre, utilise l'**export/import** (ci-dessous).

---

## 💾 Sauvegarde & transfert entre appareils

Dans **⚙️ Réglages → Sauvegarde** :
- **Exporter** : télécharge un fichier `zdev-sauvegarde-AAAA-MM-JJ.json` (toutes tes données).
- **Importer** : recharge ce fichier sur un autre appareil / navigateur pour y retrouver tout.

👉 Fais un export de temps en temps (et garde-le sur une clé USB ou ton cloud perso).
C'est ta seule sauvegarde : si tu vides le cache du navigateur sans export, les données sont perdues.

---

## 🧭 Utilisation

- **Tableau de bord** : vue d'ensemble, documents groupés par client, totaux, statut des factures.
- **Nouveau document** : choisis le type → le client (ou « ➕ Nouveau client ») → les lignes → génère.
- **Vue document** : aperçu fidèle + **Imprimer / Exporter PDF** + **Télécharger .html** + marquer une facture **payée**.
- **Clients** : ajouter / modifier / supprimer (impossible si le client a des documents).
- **Réglages** : modifier tes infos (SIRET, IBAN, adresse…) qui apparaissent sur tous les documents.

### Numérotation
Automatique et séquentielle par année et par type : `DEV-2026-001`, `FAC-2026-001`, `CTR-2026-001`.
Repart à `001` chaque nouvelle année.

---

## 🗂️ Structure du code

```
web/
├── index.html          Page unique de l'app
├── css/style.css        Style de l'interface
├── js/
│   ├── templates.js     Génération du HTML imprimable (devis/facture/contrat)
│   ├── store.js         Données locales + compteurs + export/import
│   └── app.js           Interface, navigation, formulaires
├── Lancer l'application.bat
└── GUIDE.md
```

> L'ancien système en ligne de commande (`scripts/nouveau.py`, `templates/`, `generes/`)
> reste dans le dossier parent `zdev-admin/` mais n'est plus nécessaire : cette app le remplace.

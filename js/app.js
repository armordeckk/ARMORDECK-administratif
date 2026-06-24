/* ============================================================
   app.js — Interface (SPA) : navigation, vues, formulaires.
   ============================================================ */
const S = window.ZStore;
const T = window.ZTemplates;

const TYPE_LABEL = { devis: "Devis", facture: "Facture", contrat: "Contrat" };
const TYPE_COLOR = { devis: "#3B82F6", facture: "#10B981", contrat: "#8B5CF6" };

// ---------- Utilitaires ----------
function el(id) { return document.getElementById(id); }
function parseNum(v) {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/\s/g, "").replace("€", "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function toast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
function navigate(hash) { location.hash = hash; }

// ============================================================
//  ROUTEUR
// ============================================================
function router() {
  const hash = location.hash || "#/";
  const [, route, param] = hash.split("/");
  // surbrillance nav
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#/" + (route || ""));
  });
  closeSidebar();
  if (route === "nouveau") return renderNouveau();
  if (route === "clients") return renderClients();
  if (route === "reglages") return renderReglages();
  if (route === "doc") return renderDocView(param);
  return renderDashboard();
}

// ============================================================
//  TABLEAU DE BORD
// ============================================================
function renderDashboard() {
  const st = S.stats();
  const docs = S.getDocuments();
  const clients = S.getClients();

  // Regrouper par client
  const byClient = {};
  docs.forEach((d) => {
    (byClient[d.clientId] = byClient[d.clientId] || []).push(d);
  });

  let cartes = "";
  const clientIds = Object.keys(byClient).sort((a, b) => {
    const na = (S.getClient(a) || { nom: "?" }).nom;
    const nb = (S.getClient(b) || { nom: "?" }).nom;
    return na.localeCompare(nb, "fr");
  });

  if (clientIds.length === 0) {
    cartes = `<div class="empty">
      <div class="empty-icon">📄</div>
      <h3>Aucun document pour l'instant</h3>
      <p>Crée ton premier devis, facture ou contrat.</p>
      <a class="btn primary" href="#/nouveau">+ Nouveau document</a>
    </div>`;
  } else {
    clientIds.forEach((cid) => {
      const cdocs = byClient[cid].slice().sort((a, b) => b.numero.localeCompare(a.numero));
      const client = S.getClient(cid) || { nom: cdocs[0].clientSnapshot.nom };
      const caClient = cdocs.filter((d) => d.type === "facture").reduce((t, d) => t + (d.montant || 0), 0);
      const rows = cdocs
        .map((d) => {
          const color = TYPE_COLOR[d.type];
          const montant = d.type === "contrat" ? "—" : T.fmtEur(d.montant || 0);
          const statut =
            d.type === "facture"
              ? `<span class="pill ${d.statut === "payee" ? "paid" : "pending"}">${d.statut === "payee" ? "Payée" : "En attente"}</span>`
              : "";
          return `<tr>
            <td><span class="badge" style="--c:${color}">${TYPE_LABEL[d.type]}</span></td>
            <td class="mono">${d.numero}</td>
            <td>${T.fmtDate(d.dateISO)}</td>
            <td class="right">${montant}</td>
            <td>${statut}</td>
            <td class="right"><a class="link" href="#/doc/${d.id}">Ouvrir →</a></td>
          </tr>`;
        })
        .join("");
      cartes += `<div class="card client-card">
        <div class="client-head">
          <div><div class="client-name">${T.esc(client.nom)}</div>
          <div class="client-sub">${cdocs.length} document(s) · CA facturé ${T.fmtEur(caClient)}</div></div>
        </div>
        <div class="table-wrap"><table class="docs">
          <thead><tr><th>Type</th><th>Numéro</th><th>Date</th><th class="right">Montant</th><th>Statut</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
    });
  }

  el("view").innerHTML = `
    <div class="page-head">
      <div><h1>Tableau de bord</h1><p class="muted">Vue d'ensemble de ton activité</p></div>
      <a class="btn primary" href="#/nouveau">+ Nouveau document</a>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Documents</div><div class="stat-value">${st.nb}</div></div>
      <div class="stat accent"><div class="stat-label">Total devis</div><div class="stat-value">${T.fmtEur(st.totalDevis)}</div></div>
      <div class="stat green"><div class="stat-label">Total facturé</div><div class="stat-value">${T.fmtEur(st.totalFacture)}</div></div>
      <div class="stat amber"><div class="stat-label">En attente</div><div class="stat-value">${T.fmtEur(st.enAttente)}</div></div>
    </div>
    ${cartes}`;
}

// ============================================================
//  NOUVEAU DOCUMENT
// ============================================================
let draftType = "devis";
let draftLignes = [{ designation: "", description: "", quantite: 1, prix: 0 }];

function lignesDraftRows() {
  return draftLignes
    .map(
      (l, i) => `<tr>
      <td><input type="text" data-f="designation" data-i="${i}" value="${T.esc(l.designation)}" placeholder="Création site vitrine"></td>
      <td><input type="text" data-f="description" data-i="${i}" value="${T.esc(l.description)}" placeholder="Optionnel : détails…"></td>
      <td><input type="text" inputmode="decimal" data-f="quantite" data-i="${i}" value="${l.quantite}" class="num"></td>
      <td><input type="text" inputmode="decimal" data-f="prix" data-i="${i}" value="${l.prix}" class="num" placeholder="0"></td>
      <td class="right mono ln-total">${T.fmtEur((parseNum(l.quantite)) * (parseNum(l.prix)))}</td>
      <td><button class="icon-btn" data-act="del-ligne" data-i="${i}" title="Supprimer">✕</button></td>
    </tr>`
    )
    .join("");
}

function readLignesFromDOM() {
  document.querySelectorAll("#lignes-body tr").forEach((tr, i) => {
    if (!draftLignes[i]) return;
    tr.querySelectorAll("input[data-f]").forEach((inp) => {
      const f = inp.dataset.f;
      draftLignes[i][f] = f === "quantite" || f === "prix" ? inp.value : inp.value;
    });
  });
}

function clientOptions(selectedId) {
  const opts = S.getClients()
    .map((c) => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${T.esc(c.nom)}</option>`)
    .join("");
  return `<option value="">— Choisir un client —</option>${opts}<option value="__new">➕ Nouveau client…</option>`;
}

function renderNouveau() {
  const besoinLignes = draftType !== "contrat";
  const typeBtns = ["devis", "facture", "contrat"]
    .map(
      (t) =>
        `<button class="type-btn ${draftType === t ? "active" : ""}" data-act="set-type" data-type="${t}" style="--c:${TYPE_COLOR[t]}">${TYPE_LABEL[t]}</button>`
    )
    .join("");

  // Champs spécifiques par type
  let specifique = "";
  if (draftType === "devis") {
    specifique = `<div class="field"><label>Remise éventuelle (€)</label>
      <input type="text" inputmode="decimal" id="f-remise" class="num" value="0"></div>`;
  } else if (draftType === "facture") {
    specifique = `
      <div class="grid-2">
        <div class="field"><label>Référence du devis</label><input type="text" id="f-refdevis" placeholder="DEV-2026-001"></div>
        <div class="field"><label>Échéance (jours)</label><input type="text" inputmode="numeric" id="f-echeance" class="num" value="30"></div>
        <div class="field"><label>Acompte déjà versé (€)</label><input type="text" inputmode="decimal" id="f-acompte" class="num" value="0"></div>
        <div class="field"><label>Statut</label><select id="f-statut"><option value="en_attente">En attente</option><option value="payee">Payée</option></select></div>
      </div>`;
  } else {
    specifique = `
      <div class="grid-2">
        <div class="field"><label>Référence du devis associé</label><input type="text" id="f-refdevis" placeholder="DEV-2026-001"></div>
        <div class="field"><label>Date du devis (JJ/MM/AAAA)</label><input type="text" id="f-datedevis" placeholder="${T.fmtDate(new Date())}"></div>
      </div>`;
  }

  const lignesBloc = besoinLignes
    ? `<div class="card">
        <div class="card-title">Lignes de prestations</div>
        <div class="table-wrap"><table class="form-table">
          <thead><tr><th>Désignation</th><th>Description</th><th class="num-col">Quantité</th><th class="num-col">Prix unit.</th><th class="num-col">Total</th><th></th></tr></thead>
          <tbody id="lignes-body">${lignesDraftRows()}</tbody>
        </table></div>
        <button class="btn ghost" data-act="add-ligne">+ Ajouter une ligne</button>
        <div class="grand-total">Sous-total : <strong id="sous-total">${T.fmtEur(0)}</strong></div>
      </div>`
    : "";

  el("view").innerHTML = `
    <div class="page-head"><div><h1>Nouveau document</h1><p class="muted">Devis, facture ou contrat</p></div></div>

    <div class="card">
      <div class="card-title">Type de document</div>
      <div class="type-row">${typeBtns}</div>
    </div>

    <div class="card">
      <div class="card-title">Client</div>
      <div class="field"><label>Client existant</label>
        <select id="f-client">${clientOptions("")}</select>
      </div>
      <div id="new-client" class="new-client hidden">
        <div class="grid-2">
          <div class="field"><label>Nom / Société *</label><input type="text" id="nc-nom"></div>
          <div class="field"><label>SIRET (si entreprise)</label><input type="text" id="nc-siret"></div>
          <div class="field"><label>Adresse</label><input type="text" id="nc-adresse"></div>
          <div class="field"><label>Code postal + Ville</label><input type="text" id="nc-cpville"></div>
          <div class="field"><label>Email</label><input type="text" id="nc-email"></div>
          <div class="field"><label>Téléphone</label><input type="text" id="nc-tel"></div>
        </div>
      </div>
    </div>

    ${lignesBloc}

    <div class="card">
      <div class="card-title">Détails</div>
      ${specifique}
    </div>

    <div class="actions-bar">
      <a class="btn ghost" href="#/">Annuler</a>
      <button class="btn primary" data-act="generer">Générer le document</button>
    </div>`;

  wireNouveau();
}

function wireNouveau() {
  const view = el("view");

  view.onclick = (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "set-type") {
      readLignesFromDOM();
      draftType = btn.dataset.type;
      renderNouveau();
    } else if (act === "add-ligne") {
      readLignesFromDOM();
      draftLignes.push({ designation: "", description: "", quantite: 1, prix: 0 });
      renderNouveau();
    } else if (act === "del-ligne") {
      readLignesFromDOM();
      draftLignes.splice(Number(btn.dataset.i), 1);
      if (draftLignes.length === 0) draftLignes.push({ designation: "", description: "", quantite: 1, prix: 0 });
      renderNouveau();
    } else if (act === "generer") {
      genererDocument();
    }
  };

  // Recalcul des totaux en direct
  view.oninput = (e) => {
    if (e.target.matches("#lignes-body input")) {
      recalcTotaux();
    }
  };

  // Affichage du bloc "nouveau client"
  const sel = el("f-client");
  if (sel) {
    sel.onchange = () => {
      el("new-client").classList.toggle("hidden", sel.value !== "__new");
    };
  }
}

function recalcTotaux() {
  let sous = 0;
  document.querySelectorAll("#lignes-body tr").forEach((tr) => {
    const q = parseNum(tr.querySelector('[data-f="quantite"]').value);
    const p = parseNum(tr.querySelector('[data-f="prix"]').value);
    const t = q * p;
    sous += t;
    tr.querySelector(".ln-total").textContent = T.fmtEur(t);
  });
  if (el("sous-total")) el("sous-total").textContent = T.fmtEur(sous);
}

function genererDocument() {
  // 1. Client
  const sel = el("f-client");
  let clientId = sel.value;
  let client;
  if (clientId === "__new") {
    const nom = el("nc-nom").value.trim();
    if (!nom) { toast("Le nom du client est obligatoire."); return; }
    client = S.saveClient({
      nom,
      siret: el("nc-siret").value.trim(),
      adresse: el("nc-adresse").value.trim(),
      cp_ville: el("nc-cpville").value.trim(),
      email: el("nc-email").value.trim(),
      tel: el("nc-tel").value.trim(),
    });
    clientId = client.id;
  } else if (clientId) {
    client = S.getClient(clientId);
  } else {
    toast("Choisis ou crée un client."); return;
  }

  // 2. Lignes (devis / facture)
  let lignes = [];
  if (draftType !== "contrat") {
    readLignesFromDOM();
    lignes = draftLignes
      .filter((l) => l.designation.trim())
      .map((l) => ({
        designation: l.designation.trim(),
        description: (l.description || "").trim(),
        quantite: parseNum(l.quantite),
        prix: parseNum(l.prix),
      }));
    if (lignes.length === 0) { toast("Ajoute au moins une ligne de prestation."); return; }
  }

  // 3. Construction du document
  const now = new Date();
  const doc = {
    type: draftType,
    numero: S.nextNumero(draftType),
    clientId,
    clientSnapshot: {
      nom: client.nom, siret: client.siret, adresse: client.adresse,
      cp_ville: client.cp_ville, email: client.email, tel: client.tel,
    },
    dateISO: now.toISOString(),
    lignes,
  };

  if (draftType === "devis") {
    doc.remise = parseNum(el("f-remise").value);
    const sous = lignes.reduce((t, l) => t + l.quantite * l.prix, 0);
    doc.montant = sous - doc.remise;
  } else if (draftType === "facture") {
    doc.refDevis = el("f-refdevis").value.trim();
    doc.acompte = parseNum(el("f-acompte").value);
    doc.statut = el("f-statut").value;
    const jours = parseInt(parseNum(el("f-echeance").value)) || 30;
    const ech = new Date(now.getTime());
    ech.setDate(ech.getDate() + jours);
    doc.echeanceISO = ech.toISOString();
    const sous = lignes.reduce((t, l) => t + l.quantite * l.prix, 0);
    doc.montant = sous - doc.acompte;
  } else {
    doc.refDevis = el("f-refdevis").value.trim();
    doc.dateDevis = el("f-datedevis").value.trim();
    doc.montant = 0;
  }

  S.addDocument(doc);
  // Réinitialise le brouillon
  draftLignes = [{ designation: "", description: "", quantite: 1, prix: 0 }];
  draftType = "devis";
  toast("Document généré ✓");
  navigate("#/doc/" + doc.id);
}

// ============================================================
//  VUE DOCUMENT (aperçu + actions)
// ============================================================
function renderDocView(id) {
  const doc = S.getDocument(id);
  if (!doc) { el("view").innerHTML = `<div class="empty"><p>Document introuvable.</p><a class="btn" href="#/">Retour</a></div>`; return; }
  const s = S.getSettings();
  const isFacture = doc.type === "facture";
  const statutBtn = isFacture
    ? `<button class="btn ghost" data-act="toggle-statut">${doc.statut === "payee" ? "Marquer en attente" : "✓ Marquer payée"}</button>`
    : "";

  const preview = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>${T.DOC_CSS}</style></head><body>${T.renderDocBody(doc, s)}</body></html>`;

  el("view").innerHTML = `
    <div class="page-head">
      <div><a class="link" href="#/">← Tableau de bord</a>
      <h1>${TYPE_LABEL[doc.type]} ${doc.numero}</h1>
      <p class="muted">${T.esc(doc.clientSnapshot.nom)} · ${T.fmtDate(doc.dateISO)}</p></div>
    </div>
    <div class="actions-bar left">
      <button class="btn primary" data-act="imprimer">🖨 Imprimer / PDF</button>
      <button class="btn" data-act="telecharger">⬇ Télécharger .html</button>
      ${statutBtn}
      <button class="btn danger ghost" data-act="supprimer">Supprimer</button>
    </div>
    <div class="doc-preview"><iframe id="doc-frame" title="Aperçu"></iframe></div>`;

  const frame = el("doc-frame");
  frame.srcdoc = preview;

  el("view").onclick = (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "imprimer") {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } else if (act === "telecharger") {
      const full = T.renderFullDocument(doc, s);
      const blob = new Blob([full], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = doc.numero + ".html";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === "toggle-statut") {
      doc.statut = doc.statut === "payee" ? "en_attente" : "payee";
      S.updateDocument(doc);
      toast(doc.statut === "payee" ? "Facture marquée payée ✓" : "Facture en attente");
      renderDocView(id);
    } else if (act === "supprimer") {
      if (confirm("Supprimer définitivement ce document ?")) {
        S.deleteDocument(id);
        toast("Document supprimé");
        navigate("#/");
      }
    }
  };
}

// ============================================================
//  CLIENTS
// ============================================================
function renderClients() {
  const clients = S.getClients();
  const rows = clients
    .map((c) => {
      const nbDocs = S.getDocuments().filter((d) => d.clientId === c.id).length;
      return `<tr>
        <td><strong>${T.esc(c.nom)}</strong></td>
        <td>${T.esc(c.cp_ville || "—")}</td>
        <td>${T.esc(c.email || "—")}</td>
        <td>${T.esc(c.tel || "—")}</td>
        <td class="center">${nbDocs}</td>
        <td class="right">
          <button class="btn small" data-act="edit-client" data-id="${c.id}">Modifier</button>
          <button class="btn small danger ghost" data-act="del-client" data-id="${c.id}">Suppr.</button>
        </td>
      </tr>`;
    })
    .join("");

  el("view").innerHTML = `
    <div class="page-head"><div><h1>Clients</h1><p class="muted">${clients.length} client(s) enregistré(s)</p></div>
      <button class="btn primary" data-act="new-client">+ Nouveau client</button></div>
    ${clients.length
      ? `<div class="card"><div class="table-wrap"><table class="docs">
          <thead><tr><th>Nom</th><th>Ville</th><th>Email</th><th>Tél</th><th class="center">Docs</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div></div>`
      : `<div class="empty"><div class="empty-icon">👥</div><h3>Aucun client</h3><p>Ajoute ton premier client.</p>
         <button class="btn primary" data-act="new-client">+ Nouveau client</button></div>`}
    <div id="modal-root"></div>`;

  el("view").onclick = (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "new-client") openClientModal(null);
    else if (act === "edit-client") openClientModal(S.getClient(btn.dataset.id));
    else if (act === "del-client") {
      const id = btn.dataset.id;
      if (S.clientHasDocs(id)) { toast("Impossible : ce client a des documents."); return; }
      if (confirm("Supprimer ce client ?")) { S.deleteClient(id); renderClients(); toast("Client supprimé"); }
    }
  };
}

function openClientModal(client) {
  const c = client || { nom: "", siret: "", adresse: "", cp_ville: "", email: "", tel: "" };
  el("modal-root").innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>${client ? "Modifier le client" : "Nouveau client"}</h2>
        <div class="grid-2">
          <div class="field"><label>Nom / Société *</label><input type="text" id="m-nom" value="${T.esc(c.nom)}"></div>
          <div class="field"><label>SIRET</label><input type="text" id="m-siret" value="${T.esc(c.siret)}"></div>
          <div class="field"><label>Adresse</label><input type="text" id="m-adresse" value="${T.esc(c.adresse)}"></div>
          <div class="field"><label>Code postal + Ville</label><input type="text" id="m-cpville" value="${T.esc(c.cp_ville)}"></div>
          <div class="field"><label>Email</label><input type="text" id="m-email" value="${T.esc(c.email)}"></div>
          <div class="field"><label>Téléphone</label><input type="text" id="m-tel" value="${T.esc(c.tel)}"></div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" data-act="close-modal">Annuler</button>
          <button class="btn primary" data-act="save-client">Enregistrer</button>
        </div>
      </div>
    </div>`;

  el("modal-root").onclick = (e) => {
    // Clic sur le fond (hors de la fenêtre) = fermer
    if (e.target.classList.contains("modal-overlay")) { el("modal-root").innerHTML = ""; return; }
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "close-modal") el("modal-root").innerHTML = "";
    else if (btn.dataset.act === "save-client") {
      const nom = el("m-nom").value.trim();
      if (!nom) { toast("Le nom est obligatoire."); return; }
      S.saveClient({
        id: c.id, nom,
        siret: el("m-siret").value.trim(),
        adresse: el("m-adresse").value.trim(),
        cp_ville: el("m-cpville").value.trim(),
        email: el("m-email").value.trim(),
        tel: el("m-tel").value.trim(),
      });
      el("modal-root").innerHTML = "";
      renderClients();
      toast("Client enregistré ✓");
    }
  };
}

// ============================================================
//  RÉGLAGES (infos émetteur + sauvegarde)
// ============================================================
function renderReglages() {
  const e = S.getSettings().emetteur;
  const f = (id, label, val) => `<div class="field"><label>${label}</label><input type="text" id="${id}" value="${T.esc(val)}"></div>`;
  el("view").innerHTML = `
    <div class="page-head"><div><h1>Réglages</h1><p class="muted">Tes informations (apparaissent sur chaque document)</p></div></div>
    <div class="card">
      <div class="card-title">Identité émetteur</div>
      <div class="grid-2">
        ${f("s-nom", "Nom complet", e.nom)}
        ${f("s-entreprise", "Nom de l'entreprise", e.entreprise)}
        ${f("s-slogan", "Slogan (sous le logo)", e.slogan)}
        ${f("s-adresse", "Adresse", e.adresse)}
        ${f("s-cpville", "Code postal + Ville + Pays", e.cp_ville)}
        ${f("s-siret", "SIRET", e.siret)}
        ${f("s-email", "Email", e.email)}
        ${f("s-tel", "Téléphone", e.tel)}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Coordonnées bancaires</div>
      <div class="grid-2">
        ${f("s-iban", "IBAN", e.iban)}
        ${f("s-bic", "BIC", e.bic)}
        ${f("s-banque", "Banque (adresse)", e.banque)}
      </div>
    </div>
    <div class="actions-bar left"><button class="btn primary" data-act="save-settings">Enregistrer les réglages</button></div>

    <div class="card">
      <div class="card-title">Sauvegarde & synchronisation</div>
      <p class="muted" style="margin-bottom:14px">Tes données sont stockées dans ce navigateur. Exporte un fichier pour les sauvegarder ou les transférer sur un autre appareil.</p>
      <div class="actions-bar left" style="margin:0">
        <button class="btn" data-act="export">⬇ Exporter mes données (.json)</button>
        <button class="btn" data-act="import">⬆ Importer un fichier</button>
        <button class="btn danger ghost" data-act="reset">Tout effacer</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" class="hidden">
    </div>`;

  el("view").onclick = (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "save-settings") {
      S.saveSettings({
        ...e,
        nom: el("s-nom").value.trim(),
        entreprise: el("s-entreprise").value.trim(),
        slogan: el("s-slogan").value.trim(),
        adresse: el("s-adresse").value.trim(),
        cp_ville: el("s-cpville").value.trim(),
        siret: el("s-siret").value.trim(),
        email: el("s-email").value.trim(),
        tel: el("s-tel").value.trim(),
        iban: el("s-iban").value.trim(),
        bic: el("s-bic").value.trim(),
        banque: el("s-banque").value.trim(),
      });
      toast("Réglages enregistrés ✓");
    } else if (act === "export") {
      const blob = new Blob([S.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "zdev-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("Sauvegarde exportée ✓");
    } else if (act === "import") {
      el("import-file").click();
    } else if (act === "reset") {
      if (confirm("Effacer TOUTES les données (clients, documents, compteurs) ? Cette action est irréversible.")) {
        S.resetAll();
        toast("Données effacées");
        navigate("#/");
      }
    }
  };

  el("import-file").onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        S.importJSON(reader.result);
        toast("Données importées ✓");
        renderReglages();
      } catch (err) {
        toast("Fichier invalide : " + err.message);
      }
    };
    reader.readAsText(file);
  };
}

// ============================================================
//  Sidebar mobile
// ============================================================
function closeSidebar() { document.body.classList.remove("sidebar-open"); }
function toggleSidebar() { document.body.classList.toggle("sidebar-open"); }

// ============================================================
//  Démarrage
// ============================================================
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  S.load();
  el("menu-btn").onclick = toggleSidebar;
  el("overlay").onclick = closeSidebar;
  router();
});

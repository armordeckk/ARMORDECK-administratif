/* ============================================================
   app.js — Interface (SPA) : navigation, vues, formulaires.
   ============================================================ */
const S = window.ZStore;
const T = window.ZTemplates;

const TYPE_LABEL = { devis: "Devis", facture: "Facture", avoir: "Avoir", contrat: "Contrat" };
const TYPE_COLOR = { devis: "#3B82F6", facture: "#10B981", avoir: "#EF4444", contrat: "#8B5CF6" };
const PRESTATIONS_CONTRAT = [
  "Développement web sur-mesure",
  "Intégration API",
  "Backend / Authentification",
  "Multilingue",
  "Design UI sur-mesure",
  "Optimisation SEO",
  "Déploiement & mise en ligne",
];

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

// ---------- Empreinte d'intégrité (verrouillage) ----------
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
async function computeHash(doc) {
  const { locked, hash, lockedAt, ...rest } = doc;
  const payload = JSON.stringify(rest);
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) { /* fallback */ }
  return "fnv1a-" + fnv1a(payload);
}

// ---------- Code d'accès (empreinte, le code n'est pas en clair) ----------
const AUTH_HASHES = [
  "b597bb43328aa3dbc45fdf1704a0aec48f945a4f745494fe6fc15d48977e21a1",
  "fnv1a-c9220cfa",
];
async function hashStr(str) {
  try {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) { /* fallback */ }
  return "fnv1a-" + fnv1a(str);
}
async function tryAuth() {
  const h = await hashStr(el("auth-input").value);
  if (AUTH_HASHES.includes(h)) {
    sessionStorage.setItem("zdev-auth", "ok");
    document.body.classList.remove("gated");
    el("auth-error").textContent = "";
  } else {
    el("auth-error").textContent = "Code incorrect.";
    el("auth-input").value = "";
    el("auth-input").focus();
  }
}
function initAuth() {
  if (sessionStorage.getItem("zdev-auth") === "ok") { document.body.classList.remove("gated"); return; }
  el("auth-btn").onclick = tryAuth;
  el("auth-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tryAuth(); } });
  setTimeout(() => el("auth-input").focus(), 50);
}

// ============================================================
//  ROUTEUR
// ============================================================
function router() {
  const hash = location.hash || "#/";
  const [, route, param] = hash.split("/");
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#/" + (route || ""));
  });
  closeSidebar();
  if (route === "nouveau") { startNewDraft(); return renderNouveau(); }
  if (route === "edit") return openEditDraft(param);
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

  const byClient = {};
  docs.forEach((d) => { (byClient[d.clientId] = byClient[d.clientId] || []).push(d); });

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
      const caClient = cdocs.filter((d) => d.type === "facture").reduce((t, d) => t + (d.montant || 0), 0)
        - cdocs.filter((d) => d.type === "avoir").reduce((t, d) => t + (d.montant || 0), 0);
      const rows = cdocs.map((d) => {
        const color = TYPE_COLOR[d.type];
        let montant;
        if (d.type === "contrat") montant = d.montantTotal ? T.fmtEur(d.montantTotal) : "—";
        else if (d.type === "avoir") montant = "– " + T.fmtEur(d.montant || 0);
        else montant = T.fmtEur(d.montant || 0);
        const lock = d.locked ? ' <span title="Verrouillé">🔒</span>' : "";
        const statut = d.type === "facture"
          ? `<span class="pill ${d.statut === "payee" ? "paid" : "pending"}">${d.statut === "payee" ? "Payée" : "En attente"}</span>`
          : "";
        return `<tr>
          <td><span class="badge" style="--c:${color}">${TYPE_LABEL[d.type]}</span></td>
          <td class="mono">${d.numero}${lock}</td>
          <td>${T.fmtDate(d.dateISO)}</td>
          <td class="right">${montant}</td>
          <td>${statut}</td>
          <td class="right"><a class="link" href="#/doc/${d.id}">Ouvrir →</a></td>
        </tr>`;
      }).join("");
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
//  BROUILLON (création / édition)
// ============================================================
let editingId = null;
let draftType = "devis";
let draftLignes = [{ designation: "", description: "", quantite: 1, prix: 0 }];
let draft = {};

function defaultDraftFields() {
  return {
    numero: "", clientId: "",
    remise: 0,
    refDevis: "", echeanceJours: "", acompte: 0, statut: "en_attente",
    refFacture: "", motif: "",
    clientType: "pro", prestations: [], montantTotal: 0, acomptePct: 50, delaiJours: 21,
    maint_enabled: false, maint_tarif: 25, maint_duree: 12, maint_offerts: 2,
    refDevisC: "", dateDevis: "", lieuSignature: "", dateSignature: "",
  };
}

function startNewDraft() {
  editingId = null;
  draftType = "devis";
  draftLignes = [{ designation: "", description: "", quantite: 1, prix: 0 }];
  draft = defaultDraftFields();
  draft.numero = S.nextNumero("devis");
}

function openEditDraft(id) {
  const doc = S.getDocument(id);
  if (!doc) return renderDashboard();
  if (doc.locked) { toast("Document verrouillé : non modifiable."); return renderDocView(id); }
  editingId = id;
  draftType = doc.type;
  draftLignes = (doc.lignes && doc.lignes.length) ? doc.lignes.map((l) => ({ ...l })) : [{ designation: "", description: "", quantite: 1, prix: 0 }];
  draft = defaultDraftFields();
  draft.numero = doc.numero;
  draft.clientId = doc.clientId;
  if (doc.type === "devis") draft.remise = doc.remise || 0;
  if (doc.type === "facture") {
    draft.refDevis = doc.refDevis || "";
    draft.acompte = doc.acompte || 0;
    draft.statut = doc.statut || "en_attente";
    draft.echeanceJours = doc.echeanceISO
      ? Math.round((new Date(doc.echeanceISO) - new Date(doc.dateISO)) / 864e5)
      : "";
  }
  if (doc.type === "avoir") {
    draft.refFacture = doc.refFacture || "";
    draft.motif = doc.motif || "";
  }
  if (doc.type === "contrat") {
    draft.clientType = doc.clientType || "pro";
    draft.prestations = doc.prestations ? doc.prestations.slice() : [];
    draft.montantTotal = doc.montantTotal || 0;
    draft.acomptePct = doc.acomptePct == null ? 50 : doc.acomptePct;
    draft.delaiJours = doc.delaiJours || 21;
    const m = doc.maintenance || {};
    draft.maint_enabled = !!m.enabled;
    draft.maint_tarif = m.tarif || 25;
    draft.maint_duree = m.duree || 12;
    draft.maint_offerts = m.moisOfferts || 2;
    draft.refDevisC = doc.refDevis || "";
    draft.dateDevis = doc.dateDevis || "";
    draft.lieuSignature = doc.lieuSignature || "";
    draft.dateSignature = doc.dateSignature || "";
  }
  renderNouveau();
}

function lignesDraftRows() {
  return draftLignes.map((l, i) => `<tr>
      <td><input type="text" data-f="designation" data-i="${i}" value="${T.esc(l.designation)}" placeholder="Création site vitrine"></td>
      <td><input type="text" data-f="description" data-i="${i}" value="${T.esc(l.description)}" placeholder="Optionnel : détails…"></td>
      <td><input type="text" inputmode="decimal" data-f="quantite" data-i="${i}" value="${l.quantite}" class="num"></td>
      <td><input type="text" inputmode="decimal" data-f="prix" data-i="${i}" value="${l.prix}" class="num" placeholder="0"></td>
      <td class="right mono ln-total">${T.fmtEur(parseNum(l.quantite) * parseNum(l.prix))}</td>
      <td><button class="icon-btn" data-act="del-ligne" data-i="${i}" title="Supprimer">✕</button></td>
    </tr>`).join("");
}

function readLignesFromDOM() {
  document.querySelectorAll("#lignes-body tr").forEach((tr, i) => {
    if (!draftLignes[i]) return;
    tr.querySelectorAll("input[data-f]").forEach((inp) => { draftLignes[i][inp.dataset.f] = inp.value; });
  });
}

function readFormIntoDraft() {
  if (el("f-numero")) draft.numero = el("f-numero").value.trim();
  if (el("f-client")) draft.clientId = el("f-client").value;
  if (draftType !== "contrat") readLignesFromDOM();
  if (draftType === "devis" && el("f-remise")) draft.remise = el("f-remise").value;
  if (draftType === "facture") {
    if (el("f-refdevis")) draft.refDevis = el("f-refdevis").value;
    if (el("f-echeance")) draft.echeanceJours = el("f-echeance").value;
    if (el("f-acompte")) draft.acompte = el("f-acompte").value;
    if (el("f-statut")) draft.statut = el("f-statut").value;
  }
  if (draftType === "avoir") {
    if (el("f-reffacture")) draft.refFacture = el("f-reffacture").value;
    if (el("f-motif")) draft.motif = el("f-motif").value;
  }
  if (draftType === "contrat") {
    const ctype = document.querySelector('input[name="ctype"]:checked');
    if (ctype) draft.clientType = ctype.value;
    const cbs = document.querySelectorAll(".presta-cb:checked");
    if (document.querySelector(".presta-cb")) draft.prestations = [...cbs].map((c) => c.value);
    if (el("c-total")) draft.montantTotal = el("c-total").value;
    if (el("c-acpct")) draft.acomptePct = el("c-acpct").value;
    if (el("c-maint")) draft.maint_enabled = el("c-maint").checked;
    if (el("c-mtarif")) draft.maint_tarif = el("c-mtarif").value;
    if (el("c-mduree")) draft.maint_duree = el("c-mduree").value;
    if (el("c-moff")) draft.maint_offerts = el("c-moff").value;
    if (el("c-delai")) draft.delaiJours = el("c-delai").value;
    if (el("c-refdevis")) draft.refDevisC = el("c-refdevis").value;
    if (el("c-datedevis")) draft.dateDevis = el("c-datedevis").value;
    if (el("c-lieu")) draft.lieuSignature = el("c-lieu").value;
    if (el("c-datesig")) draft.dateSignature = el("c-datesig").value;
  }
}

function clientOptions(selectedId) {
  const opts = S.getClients()
    .map((c) => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${T.esc(c.nom)}</option>`)
    .join("");
  return `<option value="">— Choisir un client —</option>${opts}<option value="__new">➕ Nouveau client…</option>`;
}

function contratFieldsHTML() {
  const d = draft;
  const presta = PRESTATIONS_CONTRAT.map((p) =>
    `<label class="check"><input type="checkbox" class="presta-cb" value="${T.esc(p)}" ${d.prestations.includes(p) ? "checked" : ""}> ${T.esc(p)}</label>`
  ).join("");
  const total = parseNum(d.montantTotal);
  const pct = parseNum(d.acomptePct);
  const billed = Math.max(0, parseNum(d.maint_duree) - parseNum(d.maint_offerts));
  return `
  <div class="card">
    <div class="card-title">Type de client</div>
    <div class="radio-row">
      <label class="radio"><input type="radio" name="ctype" value="pro" ${d.clientType !== "particulier" ? "checked" : ""}> Professionnel (B2B)</label>
      <label class="radio"><input type="radio" name="ctype" value="particulier" ${d.clientType === "particulier" ? "checked" : ""}> Particulier (B2C)</label>
    </div>
    <p class="muted" style="margin-top:8px">B2C : les pénalités de retard (art. L441-10) sont automatiquement retirées du contrat.</p>
  </div>
  <div class="card">
    <div class="card-title">Prestations incluses</div>
    <div class="checks">${presta}</div>
  </div>
  <div class="card">
    <div class="card-title">Conditions financières</div>
    <div class="grid-2">
      <div class="field"><label>Montant total (€)</label><input type="text" inputmode="decimal" id="c-total" class="num" value="${total}"></div>
      <div class="field"><label>Acompte (%)</label><input type="text" inputmode="numeric" id="c-acpct" class="num" value="${pct}"></div>
    </div>
    <div class="calc-row"><span>Acompte : <strong id="c-acmt">${T.fmtEur(total * pct / 100)}</strong></span><span>Solde : <strong id="c-solde">${T.fmtEur(total - total * pct / 100)}</strong></span></div>
  </div>
  <div class="card">
    <div class="card-title">Maintenance</div>
    <label class="switch"><input type="checkbox" id="c-maint" ${d.maint_enabled ? "checked" : ""}> Inclure un forfait de maintenance</label>
    <div id="maint-fields" class="grid-3 ${d.maint_enabled ? "" : "hidden"}" style="margin-top:14px">
      <div class="field"><label>Tarif mensuel (€)</label><input type="text" inputmode="decimal" id="c-mtarif" class="num" value="${parseNum(d.maint_tarif)}"></div>
      <div class="field"><label>Durée (mois)</label><input type="text" inputmode="numeric" id="c-mduree" class="num" value="${parseNum(d.maint_duree)}"></div>
      <div class="field"><label>Mois offerts</label><input type="text" inputmode="numeric" id="c-moff" class="num" value="${parseNum(d.maint_offerts)}"></div>
    </div>
    <div id="maint-calc" class="calc-row ${d.maint_enabled ? "" : "hidden"}"><span>Total facturé : <strong id="c-mtot">${T.fmtEur(billed * parseNum(d.maint_tarif))}</strong> (${billed} mois)</span></div>
  </div>
  <div class="card">
    <div class="card-title">Délai & devis</div>
    <div class="grid-2">
      <div class="field"><label>Délai de livraison (jours ouvrés)</label><input type="text" inputmode="numeric" id="c-delai" class="num" value="${parseNum(d.delaiJours)}"></div>
      <div class="field"><label>Référence du devis (optionnel)</label><input type="text" id="c-refdevis" value="${T.esc(d.refDevisC)}" placeholder="laisser vide si aucun"></div>
      <div class="field"><label>Date du devis (optionnel)</label><input type="text" id="c-datedevis" value="${T.esc(d.dateDevis)}" placeholder="JJ/MM/AAAA"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Signature</div>
    <div class="grid-2">
      <div class="field"><label>Lieu de signature (client)</label><input type="text" id="c-lieu" value="${T.esc(d.lieuSignature)}" placeholder="ex : Gassin"></div>
      <div class="field"><label>Date de signature (optionnel)</label><input type="text" id="c-datesig" value="${T.esc(d.dateSignature)}" placeholder="laisser vide = à remplir à la main"></div>
    </div>
  </div>`;
}

function renderNouveau() {
  const enEdition = !!editingId;
  const typeBtns = ["devis", "facture", "avoir", "contrat"].map((t) =>
    `<button class="type-btn ${draftType === t ? "active" : ""}" data-act="set-type" data-type="${t}" style="--c:${TYPE_COLOR[t]}" ${enEdition ? "disabled" : ""}>${TYPE_LABEL[t]}</button>`
  ).join("");

  let typeContent = "";
  if (draftType === "contrat") {
    typeContent = contratFieldsHTML();
  } else {
    let specifique = "";
    if (draftType === "devis") {
      specifique = `<div class="field"><label>Remise éventuelle (€)</label><input type="text" inputmode="decimal" id="f-remise" class="num" value="${parseNum(draft.remise)}"></div>`;
    } else if (draftType === "avoir") {
      const factOpts = S.getDocuments()
        .filter((d) => d.type === "facture")
        .sort((a, b) => b.numero.localeCompare(a.numero))
        .map((f) => `<option value="${T.esc(f.numero)}" ${draft.refFacture === f.numero ? "selected" : ""}>${T.esc(f.numero)} — ${T.esc(f.clientSnapshot.nom)}</option>`)
        .join("");
      specifique = `
        <div class="field"><label>Facture concernée</label>
          <select id="f-reffacture"><option value="">— Aucune —</option>${factOpts}</select>
        </div>
        <div class="field"><label>Motif de l'avoir</label>
          <textarea id="f-motif" rows="3" placeholder="ex : Annulation de la prestation, geste commercial, erreur de facturation…">${T.esc(draft.motif)}</textarea>
        </div>`;
    } else {
      specifique = `
        <div class="grid-2">
          <div class="field"><label>Référence du devis (optionnel)</label><input type="text" id="f-refdevis" value="${T.esc(draft.refDevis)}" placeholder="laisser vide si aucun"></div>
          <div class="field"><label>Échéance en jours (optionnel)</label><input type="text" inputmode="numeric" id="f-echeance" class="num" value="${T.esc(draft.echeanceJours)}" placeholder="laisser vide si aucune"></div>
          <div class="field"><label>Acompte déjà versé (€)</label><input type="text" inputmode="decimal" id="f-acompte" class="num" value="${parseNum(draft.acompte)}"></div>
          <div class="field"><label>Statut</label><select id="f-statut"><option value="en_attente" ${draft.statut !== "payee" ? "selected" : ""}>En attente</option><option value="payee" ${draft.statut === "payee" ? "selected" : ""}>Payée</option></select></div>
        </div>`;
    }
    typeContent = `
      <div class="card">
        <div class="card-title">Lignes de prestations</div>
        <div class="table-wrap"><table class="form-table">
          <thead><tr><th>Désignation</th><th>Description</th><th class="num-col">Quantité</th><th class="num-col">Prix unit.</th><th class="num-col">Total</th><th></th></tr></thead>
          <tbody id="lignes-body">${lignesDraftRows()}</tbody>
        </table></div>
        <button class="btn ghost" data-act="add-ligne">+ Ajouter une ligne</button>
        <div class="grand-total">Sous-total : <strong id="sous-total">${T.fmtEur(0)}</strong></div>
      </div>
      <div class="card"><div class="card-title">Détails</div>${specifique}</div>`;
  }

  el("view").innerHTML = `
    <div class="page-head"><div><h1>${enEdition ? "Modifier le document" : "Nouveau document"}</h1><p class="muted">${enEdition ? draft.numero : "Devis, facture ou contrat"}</p></div></div>

    <div class="card">
      <div class="card-title">Type de document</div>
      <div class="type-row">${typeBtns}</div>
      ${enEdition ? '<p class="muted" style="margin-top:8px">Le type ne peut pas être changé en cours d\'édition.</p>' : ""}
    </div>

    <div class="card">
      <div class="card-title">Client</div>
      <div class="field"><label>Client existant</label><select id="f-client">${clientOptions(draft.clientId)}</select></div>
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

    <div class="card"><div class="card-title">Numéro</div>
      <div class="field"><label>Numéro du document</label><input type="text" id="f-numero" value="${T.esc(draft.numero)}"></div>
    </div>

    ${typeContent}

    <div class="actions-bar">
      <a class="btn ghost" href="${enEdition ? "#/doc/" + editingId : "#/"}">Annuler</a>
      <button class="btn primary" data-act="generer">${enEdition ? "Enregistrer les modifications" : "Générer le document"}</button>
    </div>`;

  wireNouveau();
  if (draftType !== "contrat") recalcTotaux();
}

function wireNouveau() {
  const view = el("view");
  view.onclick = (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "set-type") {
      if (editingId) return;
      readFormIntoDraft();
      draftType = btn.dataset.type;
      draft.numero = S.nextNumero(draftType);
      renderNouveau();
    } else if (act === "add-ligne") {
      readFormIntoDraft();
      draftLignes.push({ designation: "", description: "", quantite: 1, prix: 0 });
      renderNouveau();
    } else if (act === "del-ligne") {
      readFormIntoDraft();
      draftLignes.splice(Number(btn.dataset.i), 1);
      if (draftLignes.length === 0) draftLignes.push({ designation: "", description: "", quantite: 1, prix: 0 });
      renderNouveau();
    } else if (act === "generer") {
      genererDocument();
    }
  };

  view.oninput = (e) => {
    if (e.target.matches("#lignes-body input")) recalcTotaux();
    if (e.target.matches("#c-total, #c-acpct")) recalcContrat();
    if (e.target.matches("#c-mtarif, #c-mduree, #c-moff")) recalcMaintenance();
  };

  view.onchange = (e) => {
    if (e.target.id === "f-client") el("new-client").classList.toggle("hidden", e.target.value !== "__new");
    if (e.target.id === "c-maint") {
      const on = e.target.checked;
      el("maint-fields").classList.toggle("hidden", !on);
      el("maint-calc").classList.toggle("hidden", !on);
    }
  };
}

function recalcTotaux() {
  let sous = 0;
  document.querySelectorAll("#lignes-body tr").forEach((tr) => {
    const q = parseNum(tr.querySelector('[data-f="quantite"]').value);
    const p = parseNum(tr.querySelector('[data-f="prix"]').value);
    sous += q * p;
    tr.querySelector(".ln-total").textContent = T.fmtEur(q * p);
  });
  if (el("sous-total")) el("sous-total").textContent = T.fmtEur(sous);
}

function recalcContrat() {
  const total = parseNum(el("c-total").value);
  const pct = parseNum(el("c-acpct").value);
  el("c-acmt").textContent = T.fmtEur(total * pct / 100);
  el("c-solde").textContent = T.fmtEur(total - total * pct / 100);
}

function recalcMaintenance() {
  const tarif = parseNum(el("c-mtarif").value);
  const billed = Math.max(0, parseNum(el("c-mduree").value) - parseNum(el("c-moff").value));
  el("c-mtot").textContent = `${T.fmtEur(billed * tarif)} (${billed} mois)`;
}

function genererDocument() {
  readFormIntoDraft();

  // 1. Numéro (anti-doublon, en excluant le document en cours d'édition)
  const numero = draft.numero.trim() || S.nextNumero(draftType);
  if (S.getDocuments().some((d) => d.numero === numero && d.id !== editingId)) {
    toast("Le numéro " + numero + " existe déjà. Choisis-en un autre.");
    return;
  }

  // 2. Client
  let clientId = draft.clientId, client;
  if (clientId === "__new") {
    const nom = el("nc-nom").value.trim();
    if (!nom) { toast("Le nom du client est obligatoire."); return; }
    client = S.saveClient({
      nom, siret: el("nc-siret").value.trim(), adresse: el("nc-adresse").value.trim(),
      cp_ville: el("nc-cpville").value.trim(), email: el("nc-email").value.trim(), tel: el("nc-tel").value.trim(),
    });
    clientId = client.id;
  } else if (clientId) {
    client = S.getClient(clientId);
  } else {
    toast("Choisis ou crée un client."); return;
  }

  // 3. Lignes (devis / facture)
  let lignes = [];
  if (draftType !== "contrat") {
    lignes = draftLignes.filter((l) => l.designation.trim()).map((l) => ({
      designation: l.designation.trim(), description: (l.description || "").trim(),
      quantite: parseNum(l.quantite), prix: parseNum(l.prix),
    }));
    if (lignes.length === 0) { toast("Ajoute au moins une ligne de prestation."); return; }
  }

  // 4. Date : conservée si édition, sinon maintenant
  const existing = editingId ? S.getDocument(editingId) : null;
  const dateISO = existing ? existing.dateISO : new Date().toISOString();
  const now = new Date(dateISO);

  const doc = {
    id: editingId || undefined,
    type: draftType, numero, clientId,
    clientSnapshot: {
      nom: client.nom, siret: client.siret, adresse: client.adresse,
      cp_ville: client.cp_ville, email: client.email, tel: client.tel,
    },
    dateISO, lignes,
  };

  if (draftType === "devis") {
    doc.remise = parseNum(draft.remise);
    doc.montant = lignes.reduce((t, l) => t + l.quantite * l.prix, 0) - doc.remise;
  } else if (draftType === "facture") {
    doc.refDevis = (draft.refDevis || "").trim();
    doc.acompte = parseNum(draft.acompte);
    doc.statut = draft.statut;
    const echRaw = String(draft.echeanceJours || "").trim();
    if (echRaw) {
      const jours = parseInt(parseNum(echRaw)) || 0;
      if (jours > 0) { const ech = new Date(now.getTime()); ech.setDate(ech.getDate() + jours); doc.echeanceISO = ech.toISOString(); }
    }
    doc.montant = lignes.reduce((t, l) => t + l.quantite * l.prix, 0) - doc.acompte;
  } else if (draftType === "avoir") {
    doc.refFacture = (draft.refFacture || "").trim();
    doc.motif = (draft.motif || "").trim();
    doc.montant = lignes.reduce((t, l) => t + l.quantite * l.prix, 0);
  } else {
    doc.clientType = draft.clientType;
    doc.prestations = draft.prestations.slice();
    doc.montantTotal = parseNum(draft.montantTotal);
    doc.acomptePct = parseNum(draft.acomptePct);
    doc.delaiJours = parseNum(draft.delaiJours);
    doc.maintenance = {
      enabled: !!draft.maint_enabled, tarif: parseNum(draft.maint_tarif),
      duree: parseNum(draft.maint_duree), moisOfferts: parseNum(draft.maint_offerts),
    };
    doc.refDevis = (draft.refDevisC || "").trim();
    doc.dateDevis = (draft.dateDevis || "").trim();
    doc.lieuSignature = (draft.lieuSignature || "").trim();
    doc.dateSignature = (draft.dateSignature || "").trim();
    doc.montant = 0;
  }

  if (editingId) {
    S.updateDocument(doc);
    toast("Document modifié ✓");
  } else {
    S.addDocument(doc);
    toast("Document généré ✓");
  }
  const savedId = doc.id;
  startNewDraft();
  navigate("#/doc/" + savedId);
}

// ============================================================
//  VUE DOCUMENT
// ============================================================
function renderDocView(id) {
  const doc = S.getDocument(id);
  if (!doc) { el("view").innerHTML = `<div class="empty"><p>Document introuvable.</p><a class="btn" href="#/">Retour</a></div>`; return; }
  const s = S.getSettings();
  const isFacture = doc.type === "facture";

  const preview = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>${T.DOC_CSS}</style></head><body>${T.renderDocBody(doc, s)}</body></html>`;

  let actions = `<button class="btn primary" data-act="imprimer">🖨 Imprimer / PDF</button>
    <button class="btn" data-act="telecharger">⬇ Télécharger .html</button>`;
  if (!doc.locked) {
    actions += `<button class="btn" data-act="modifier">✏ Modifier</button>`;
    if (isFacture) actions += `<button class="btn ghost" data-act="toggle-statut">${doc.statut === "payee" ? "Marquer en attente" : "✓ Marquer payée"}</button>`;
    actions += `<button class="btn" data-act="verrouiller">🔒 Verrouiller</button>`;
    actions += `<button class="btn danger ghost" data-act="supprimer">Supprimer</button>`;
  } else {
    actions += `<button class="btn danger ghost" data-act="supprimer">Supprimer</button>`;
  }

  const lockBanner = doc.locked
    ? `<div class="lock-banner">🔒 <strong>Document verrouillé</strong> le ${T.esc(doc.lockedAt)} — non modifiable. Empreinte SHA-256 : <span class="mono">${T.esc(doc.hash)}</span></div>`
    : `<div class="info-banner">📝 Brouillon modifiable. Clique <strong>Verrouiller</strong> une fois le document finalisé/envoyé pour le rendre inaltérable (recommandé pour les factures).</div>`;

  el("view").innerHTML = `
    <div class="page-head">
      <div><a class="link" href="#/">← Tableau de bord</a>
      <h1>${TYPE_LABEL[doc.type]} ${doc.numero}</h1>
      <p class="muted">${T.esc(doc.clientSnapshot.nom)} · ${T.fmtDate(doc.dateISO)}</p></div>
    </div>
    <div class="actions-bar left">${actions}</div>
    ${lockBanner}
    <div class="doc-preview"><iframe id="doc-frame" title="Aperçu"></iframe></div>`;

  el("doc-frame").srcdoc = preview;

  el("view").onclick = async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const frame = el("doc-frame");
    if (act === "imprimer") {
      frame.contentWindow.focus(); frame.contentWindow.print();
    } else if (act === "telecharger") {
      const blob = new Blob([T.renderFullDocument(doc, s)], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = doc.numero + ".html"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === "modifier") {
      navigate("#/edit/" + id);
    } else if (act === "toggle-statut") {
      doc.statut = doc.statut === "payee" ? "en_attente" : "payee";
      S.updateDocument(doc);
      toast(doc.statut === "payee" ? "Facture marquée payée ✓" : "Facture en attente");
      renderDocView(id);
    } else if (act === "verrouiller") {
      if (!confirm("Une fois verrouillé, ce document ne pourra plus être modifié (obligation légale d'inaltérabilité). Continuer ?")) return;
      doc.hash = await computeHash(doc);
      doc.locked = true;
      doc.lockedAt = T.fmtDate(new Date());
      S.updateDocument(doc);
      toast("Document verrouillé 🔒");
      renderDocView(id);
    } else if (act === "supprimer") {
      const msg = doc.locked
        ? "Ce document est VERROUILLÉ. Le supprimer va à l'encontre de l'obligation de conservation. Supprimer quand même ?"
        : "Supprimer définitivement ce document ?";
      if (confirm(msg)) { S.deleteDocument(id); toast("Document supprimé"); navigate("#/"); }
    }
  };
}

// ============================================================
//  CLIENTS
// ============================================================
function renderClients() {
  const clients = S.getClients();
  const rows = clients.map((c) => {
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
  }).join("");

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
    if (e.target.classList.contains("modal-overlay")) { el("modal-root").innerHTML = ""; return; }
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "close-modal") el("modal-root").innerHTML = "";
    else if (btn.dataset.act === "save-client") {
      const nom = el("m-nom").value.trim();
      if (!nom) { toast("Le nom est obligatoire."); return; }
      S.saveClient({
        id: c.id, nom, siret: el("m-siret").value.trim(), adresse: el("m-adresse").value.trim(),
        cp_ville: el("m-cpville").value.trim(), email: el("m-email").value.trim(), tel: el("m-tel").value.trim(),
      });
      el("modal-root").innerHTML = "";
      renderClients();
      toast("Client enregistré ✓");
    }
  };
}

// ============================================================
//  RÉGLAGES
// ============================================================
function renderReglages() {
  const e = S.getSettings().emetteur;
  const f = (id, label, val) => `<div class="field"><label>${label}</label><input type="text" id="${id}" value="${T.esc(val)}"></div>`;
  el("view").innerHTML = `
    <div class="page-head"><div><h1>Réglages</h1><p class="muted">Tes informations (apparaissent sur chaque document)</p></div></div>
    <div class="card"><div class="card-title">Identité émetteur</div>
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
    <div class="card"><div class="card-title">Coordonnées bancaires</div>
      <div class="grid-2">
        ${f("s-iban", "IBAN", e.iban)}
        ${f("s-bic", "BIC", e.bic)}
        ${f("s-banque", "Banque (adresse)", e.banque)}
      </div>
    </div>
    <div class="actions-bar left"><button class="btn primary" data-act="save-settings">Enregistrer les réglages</button></div>

    <div class="card"><div class="card-title">Sauvegarde & synchronisation</div>
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
        nom: el("s-nom").value.trim(), entreprise: el("s-entreprise").value.trim(), slogan: el("s-slogan").value.trim(),
        adresse: el("s-adresse").value.trim(), cp_ville: el("s-cpville").value.trim(), siret: el("s-siret").value.trim(),
        email: el("s-email").value.trim(), tel: el("s-tel").value.trim(),
        iban: el("s-iban").value.trim(), bic: el("s-bic").value.trim(), banque: el("s-banque").value.trim(),
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
      if (confirm("Effacer TOUTES les données (clients, documents) ? Cette action est irréversible.")) {
        S.resetAll(); toast("Données effacées"); navigate("#/");
      }
    }
  };

  el("import-file").onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { S.importJSON(reader.result); toast("Données importées ✓"); renderReglages(); }
      catch (err) { toast("Fichier invalide : " + err.message); }
    };
    reader.readAsText(file);
  };
}

// ============================================================
//  Sidebar mobile + démarrage
// ============================================================
function closeSidebar() { document.body.classList.remove("sidebar-open"); }
function toggleSidebar() { document.body.classList.toggle("sidebar-open"); }

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  S.load();
  el("menu-btn").onclick = toggleSidebar;
  el("overlay").onclick = closeSidebar;
  router();
  initAuth();
});

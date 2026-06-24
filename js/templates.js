/* ============================================================
   templates.js — Génération du HTML imprimable des documents
   (devis / facture / contrat), repris du design Z Development.
   ============================================================ */

// ---------- Helpers de formatage ----------
function fmtEur(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtQte(q) {
  const n = Number(q) || 0;
  return Number.isInteger(n) ? String(n) : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
function fmtDate(d) {
  // d : objet Date ou chaîne ISO
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function nl2br(s) {
  return esc(s).replace(/\n/g, "<br>");
}

// ---------- Bloc "infos émetteur" / "infos client" ----------
function emetteurInfoHTML(s) {
  const e = s.emetteur;
  const lignes = [
    esc(e.entreprise),
    esc(e.adresse),
    esc(e.cp_ville),
    e.siret ? "SIRET : " + esc(e.siret) : "",
    e.email ? "Email : " + esc(e.email) : "",
    e.tel ? "Tél : " + esc(e.tel) : "",
  ].filter(Boolean);
  return lignes.join("<br>");
}
function clientInfoHTML(c) {
  const lignes = [
    esc(c.adresse),
    esc(c.cp_ville),
    c.siret ? "SIRET : " + esc(c.siret) : "",
    c.email ? "Email : " + esc(c.email) : "",
    c.tel ? "Tél : " + esc(c.tel) : "",
  ].filter(Boolean);
  return lignes.length ? lignes.join("<br>") : "—";
}

// ---------- Lignes de prestations (devis & facture) ----------
function lignesHTML(lignes) {
  return lignes
    .map((l) => {
      const total = (Number(l.quantite) || 0) * (Number(l.prix) || 0);
      const desc = l.description
        ? `<div class="item-desc">${nl2br(l.description)}</div>`
        : "";
      return `<tr>
        <td>
          <div class="item-name">${esc(l.designation)}</div>${desc}
        </td>
        <td class="center">${fmtQte(l.quantite)}</td>
        <td class="right">${fmtEur(l.prix)}</td>
        <td class="right amount">${fmtEur(total)}</td>
      </tr>`;
    })
    .join("\n");
}

// ============================================================
//  CSS partagé des documents (identique aux templates HTML)
// ============================================================
const DOC_CSS = `
  :root{--primary:#0F172A;--accent:#3B82F6;--success:#10B981;--text:#334155;--text-light:#64748B;--text-muted:#94A3B8;--border:#E2E8F0;--bg-soft:#F8FAFC;}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',-apple-system,sans-serif;color:var(--text);background:#E2E8F0;padding:40px 20px;-webkit-font-smoothing:antialiased;}
  .page{max-width:820px;margin:0 auto;background:#fff;padding:56px 64px;box-shadow:0 4px 30px rgba(0,0,0,.06);border-radius:6px;position:relative;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:32px;border-bottom:2px solid var(--primary);margin-bottom:40px;}
  .brand{font-size:1.6rem;font-weight:800;color:var(--primary);letter-spacing:-.5px;}
  .brand span{color:var(--accent);}
  .brand-tag{font-size:.75rem;color:var(--text-light);margin-top:4px;letter-spacing:.5px;}
  .doc-meta{text-align:right;}
  .doc-title{font-size:2rem;font-weight:800;color:var(--primary);line-height:1;margin-bottom:6px;letter-spacing:-1px;}
  .doc-title.small{font-size:1.6rem;line-height:1.1;letter-spacing:-.5px;text-transform:uppercase;}
  .doc-number{font-size:.95rem;color:var(--accent);font-weight:600;margin-bottom:12px;}
  .doc-info{font-size:.8rem;color:var(--text-light);line-height:1.6;}
  .doc-info strong{color:var(--primary);}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px;}
  .party{padding:20px 24px;background:var(--bg-soft);border-radius:8px;border-left:3px solid var(--accent);}
  .party-label{font-size:.7rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:10px;}
  .party-name{font-size:1.05rem;font-weight:700;color:var(--primary);margin-bottom:6px;}
  .party-info{font-size:.82rem;color:var(--text-light);line-height:1.6;}
  .called-as{margin-top:8px;font-size:.75rem;color:var(--text-muted);font-style:italic;}
  .items{width:100%;border-collapse:collapse;margin-bottom:32px;}
  .items thead{background:var(--primary);color:#fff;}
  .items th{padding:14px 16px;text-align:left;font-size:.78rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;}
  .items th.right{text-align:right;}.items th.center{text-align:center;}
  .items td{padding:18px 16px;border-bottom:1px solid var(--border);font-size:.88rem;vertical-align:top;}
  .items td.right{text-align:right;}.items td.center{text-align:center;}
  .item-name{font-weight:600;color:var(--primary);margin-bottom:4px;}
  .item-desc{font-size:.78rem;color:var(--text-muted);line-height:1.6;}
  .totals{display:flex;justify-content:flex-end;margin-bottom:40px;}
  .totals-box{min-width:320px;}
  .totals-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:.88rem;color:var(--text);}
  .totals-row.total{background:var(--primary);color:#fff;font-size:1.1rem;font-weight:700;padding:16px;border-radius:6px;margin-top:8px;}
  .totals-row.total .amount{color:#fff;}
  .amount{font-weight:600;color:var(--primary);}
  .payment-section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
  .section-block{padding:20px 24px;background:var(--bg-soft);border-radius:8px;margin-bottom:24px;}
  .section-block.highlight{background:rgba(59,130,246,.05);border-left:3px solid var(--accent);}
  .section-block h3{font-size:.78rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--primary);margin-bottom:10px;}
  .section-block p,.section-block li{font-size:.82rem;color:var(--text-light);line-height:1.7;}
  .section-block ul{list-style:none;padding:0;}
  .section-block li::before{content:'•';color:var(--accent);margin-right:8px;font-weight:700;}
  .iban{font-family:monospace;font-size:.85rem;color:var(--primary);background:#fff;padding:8px 12px;border-radius:4px;border:1px solid var(--border);margin-top:6px;display:inline-block;}
  .status-badge{position:absolute;top:56px;right:64px;transform:rotate(-8deg);background:rgba(16,185,129,.1);color:var(--success);border:2px solid var(--success);padding:6px 18px;border-radius:6px;font-size:.85rem;font-weight:800;letter-spacing:2px;}
  .thanks{text-align:center;padding:24px;background:var(--primary);color:#fff;border-radius:8px;margin-bottom:24px;}
  .thanks-title{font-size:1.05rem;font-weight:700;margin-bottom:6px;}
  .thanks-text{font-size:.85rem;opacity:.7;line-height:1.6;}
  .preamble{padding:24px 28px;background:var(--bg-soft);border-radius:8px;border-left:3px solid var(--accent);margin-bottom:32px;}
  .preamble h2{font-size:.78rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
  .preamble p{font-size:.88rem;color:var(--text);line-height:1.7;margin-bottom:12px;}
  .preamble p:last-child{margin-bottom:0;}
  .article{margin-bottom:24px;}
  .article-title{display:flex;align-items:baseline;gap:12px;font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);}
  .article-num{font-size:.8rem;color:var(--accent);letter-spacing:1px;}
  .article-content{font-size:.85rem;color:var(--text);line-height:1.75;}
  .article-content p{margin-bottom:8px;}.article-content p:last-child{margin-bottom:0;}
  .article-content ul{list-style:none;padding-left:0;margin-bottom:8px;}
  .article-content li{padding-left:18px;position:relative;margin-bottom:6px;}
  .article-content li::before{content:'•';position:absolute;left:0;color:var(--accent);font-weight:700;}
  .article-content strong{color:var(--primary);font-weight:600;}
  .signature,.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:32px;border-top:1px solid var(--border);}
  .signatures{margin-top:48px;border-top:2px solid var(--primary);}
  .sig-box{font-size:.82rem;color:var(--text-light);}
  .signatures .sig-box{padding:20px 24px;background:var(--bg-soft);border-radius:8px;}
  .sig-box strong{display:block;color:var(--primary);margin-bottom:8px;font-weight:700;}
  .sig-line{margin-top:60px;border-bottom:1px solid var(--border);}
  .signatures .sig-line{margin-top:80px;border-color:var(--text-muted);}
  .sig-mention{font-size:.75rem;color:var(--text-muted);font-style:italic;margin-top:6px;}
  .sig-place-date{margin-top:12px;font-size:.78rem;color:var(--text-muted);}
  .doc-footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--border);text-align:center;font-size:.72rem;color:var(--text-muted);line-height:1.7;}
  .print-bar{max-width:820px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:8px;}
  .print-btn{background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}
  .print-btn:hover{background:#2563EB;}
  .print-btn.outline{background:#fff;color:var(--primary);border:1px solid var(--border);}
  @media print{body{background:#fff;padding:0;}.page{box-shadow:none;padding:24mm 18mm;max-width:100%;border-radius:0;}.no-print{display:none;}.article,.signatures{page-break-inside:avoid;break-inside:avoid;}}
  @media (max-width:640px){body{padding:16px 8px;}.page{padding:32px 24px;}.parties,.payment-section,.signature,.signatures{grid-template-columns:1fr;gap:16px;}.header{flex-direction:column;gap:16px;}.doc-meta{text-align:left;}.status-badge{position:static;transform:none;margin-bottom:16px;display:inline-block;}}
`;

// ---------- En-tête commun ----------
function headerHTML(s, titre, numero, infoLines, titleSmall) {
  return `<div class="header">
    <div>
      <div class="brand">${esc(s.emetteur.marque_avant || "Z")}<span>.</span>${esc(s.emetteur.marque_apres || "Development")}</div>
      <div class="brand-tag">${esc(s.emetteur.slogan || "Création de sites web professionnels")}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title${titleSmall ? " small" : ""}">${titre}</div>
      <div class="doc-number">N° ${esc(numero)}</div>
      <div class="doc-info">${infoLines}</div>
    </div>
  </div>`;
}

function partiesHTML(s, client, labelEmetteur, labelClient, calledAs) {
  const calledEm = calledAs ? `<div class="called-as">Ci-après dénommé « le Prestataire »</div>` : "";
  const calledCl = calledAs ? `<div class="called-as">Ci-après dénommé « le Client »</div>` : "";
  const entrepreneurLine = calledAs ? "Entrepreneur individuel<br>" : "";
  return `<div class="parties">
    <div class="party">
      <div class="party-label">${labelEmetteur}</div>
      <div class="party-name">${esc(s.emetteur.nom)}</div>
      <div class="party-info">${entrepreneurLine}${emetteurInfoHTML(s)}</div>
      ${calledEm}
    </div>
    <div class="party">
      <div class="party-label">${labelClient}</div>
      <div class="party-name">${esc(client.nom)}</div>
      <div class="party-info">${clientInfoHTML(client)}</div>
      ${calledCl}
    </div>
  </div>`;
}

function footerHTML(s, extra) {
  return `<div class="doc-footer">
    ${esc(s.emetteur.entreprise)} — ${esc(s.emetteur.nom)} — SIRET ${esc(s.emetteur.siret)} — Cogolin (83), France<br>
    ${extra}
  </div>`;
}

// ============================================================
//  DEVIS
// ============================================================
function renderDevis(doc, s) {
  const sousTotal = doc.lignes.reduce((t, l) => t + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0);
  const remise = Number(doc.remise) || 0;
  const total = sousTotal - remise;
  const remiseRow = remise
    ? `<div class="totals-row"><span>Remise</span><span class="amount">– ${fmtEur(remise)}</span></div>`
    : "";
  const info = `<strong>Date d'émission :</strong> ${fmtDate(doc.dateISO)}<br><strong>Validité :</strong> 30 jours`;
  return `<div class="page">
    ${headerHTML(s, "DEVIS", doc.numero, info)}
    ${partiesHTML(s, doc.clientSnapshot, "Émetteur", "Client")}
    <table class="items">
      <thead><tr><th>Désignation</th><th class="center">Quantité</th><th class="right">Prix unitaire</th><th class="right">Total</th></tr></thead>
      <tbody>${lignesHTML(doc.lignes)}</tbody>
    </table>
    <div class="totals"><div class="totals-box">
      <div class="totals-row"><span>Sous-total</span><span class="amount">${fmtEur(sousTotal)}</span></div>
      ${remiseRow}
      <div class="totals-row total"><span>TOTAL À PAYER</span><span class="amount">${fmtEur(total)}</span></div>
    </div></div>
    <div class="section-block"><h3>Modalités de règlement</h3><ul>
      <li>Acompte de 50 % à la signature du devis</li>
      <li>Solde de 50 % à la livraison du site</li>
      <li>Paiement par virement bancaire</li>
      <li>IBAN : ${esc(s.emetteur.iban)} — BIC : ${esc(s.emetteur.bic)} (${esc(s.emetteur.banque)})</li>
    </ul></div>
    <div class="section-block"><h3>Conditions particulières</h3>
      <p>Délai de livraison estimé : <strong>7 jours ouvrés</strong> à compter de la réception de l'acompte et des contenus du client (textes, photos, logos).</p>
    </div>
    <div class="section-block"><h3>Mentions légales</h3>
      <p>TVA non applicable, art. 293 B du CGI (auto-entrepreneur). En cas de retard de paiement, des pénalités de retard au taux annuel de 10 % seront appliquées, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L441-10 et D441-5 du Code de commerce).</p>
    </div>
    <div class="signature">
      <div class="sig-box"><strong>Bon pour accord</strong>Date :<br>Signature précédée de la mention « Lu et approuvé »<div class="sig-line"></div></div>
      <div class="sig-box"><strong>L'émetteur</strong>${esc(s.emetteur.nom)}<br>${esc(s.emetteur.entreprise)}<div class="sig-line"></div></div>
    </div>
    ${footerHTML(s, "Document généré le " + fmtDate(doc.dateISO) + " · " + esc(s.emetteur.email))}
  </div>`;
}

// ============================================================
//  FACTURE
// ============================================================
function renderFacture(doc, s) {
  const sousTotal = doc.lignes.reduce((t, l) => t + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0);
  const acompte = Number(doc.acompte) || 0;
  const net = sousTotal - acompte;
  const acompteRow = acompte
    ? `<div class="totals-row"><span>Acompte versé</span><span class="amount">– ${fmtEur(acompte)}</span></div>`
    : "";
  const badge = doc.statut === "payee" ? `<div class="status-badge">PAYÉE</div>` : "";
  let info = `<strong>Date :</strong> ${fmtDate(doc.dateISO)}`;
  if (doc.echeanceISO) info += `<br><strong>Échéance :</strong> ${fmtDate(doc.echeanceISO)}`;
  if (doc.refDevis) info += `<br><strong>Réf. devis :</strong> ${esc(doc.refDevis)}`;
  return `<div class="page">
    ${badge}
    ${headerHTML(s, "FACTURE", doc.numero, info)}
    ${partiesHTML(s, doc.clientSnapshot, "Émetteur", "Facturé à")}
    <table class="items">
      <thead><tr><th>Désignation</th><th class="center">Quantité</th><th class="right">Prix unitaire</th><th class="right">Total</th></tr></thead>
      <tbody>${lignesHTML(doc.lignes)}</tbody>
    </table>
    <div class="totals"><div class="totals-box">
      <div class="totals-row"><span>Sous-total</span><span class="amount">${fmtEur(sousTotal)}</span></div>
      ${acompteRow}
      <div class="totals-row total"><span>NET À PAYER</span><span class="amount">${fmtEur(net)}</span></div>
    </div></div>
    <div class="section-block highlight"><h3>Coordonnées bancaires</h3>
      <p>Virement à l'ordre de <strong>${esc(s.emetteur.nom)}</strong></p>
      <div class="iban">${esc(s.emetteur.iban)}</div><br>
      <p style="margin-top:6px;">BIC : ${esc(s.emetteur.bic)} (${esc(s.emetteur.banque)})</p>
    </div>
    <div class="section-block"><h3>Mentions légales</h3>
      <p>TVA non applicable, art. 293 B du CGI (auto-entrepreneur). En cas de retard de paiement, conformément aux articles L441-10 et D441-5 du Code de commerce, des pénalités de retard au taux annuel de 10 % seront appliquées, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.</p>
    </div>
    <div class="thanks"><div class="thanks-title">Merci pour votre confiance 🙏</div>
      <div class="thanks-text">N'hésitez pas à me contacter pour toute question concernant cette facture.<br>${esc(s.emetteur.email)}</div>
    </div>
    ${footerHTML(s, "Document généré le " + fmtDate(doc.dateISO))}
  </div>`;
}

// ============================================================
//  CONTRAT
// ============================================================
function renderContrat(doc, s) {
  const info = `<strong>Date :</strong> ${fmtDate(doc.dateISO)}<br><strong>Lieu :</strong> Cogolin (83)`;
  const A = (num, titre, contenu) =>
    `<div class="article"><div class="article-title"><span class="article-num">ARTICLE ${num}</span><span>${titre}</span></div><div class="article-content">${contenu}</div></div>`;
  return `<div class="page">
    ${headerHTML(s, "Contrat de<br>prestation", doc.numero, info, true)}
    ${partiesHTML(s, doc.clientSnapshot, "Le Prestataire", "Le Client", true)}
    <div class="preamble"><h2>Préambule</h2>
      <p>Le Prestataire exerce une activité de création de sites web professionnels (sites vitrines, sites avec réservation, sites e-commerce) ainsi que de maintenance et d'hébergement de sites internet.</p>
      <p>Le Client souhaite confier au Prestataire la réalisation d'un site web décrit ci-après, ainsi qu'éventuellement les services de maintenance associés.</p>
      <p>Les Parties ont, suite à des échanges préalables et acceptation du devis n° <strong>${esc(doc.refDevis || "—")}</strong> en date du ${esc(doc.dateDevis || fmtDate(doc.dateISO))}, décidé de formaliser leurs engagements par le présent contrat.</p>
    </div>
    ${A(1, "Objet du contrat", `<p>Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire réalisera, pour le compte du Client, la <strong>création d'un site internet</strong> ainsi que, le cas échéant, les services connexes de mise en ligne, hébergement et maintenance.</p><p>Le détail des prestations, livrables et tarifs est annexé au devis accepté par le Client, qui fait partie intégrante du présent contrat.</p>`)}
    ${A(2, "Description des prestations", `<p>Le Prestataire s'engage à fournir les prestations suivantes :</p><ul><li><strong>Conception et développement</strong> du site selon le cahier des charges convenu</li><li><strong>Design graphique</strong> sur mesure, adapté à l'identité du Client</li><li><strong>Intégration responsive</strong> (compatibilité mobile, tablette, desktop)</li><li><strong>Mise en ligne</strong> sur le nom de domaine choisi par le Client</li><li><strong>Configuration</strong> de l'hébergement et du certificat SSL</li><li><strong>Optimisation SEO</strong> de base (balises, structure, vitesse)</li><li><strong>Formation à l'utilisation</strong> si nécessaire (modifications simples)</li></ul><p>Toute prestation supplémentaire non prévue au devis fera l'objet d'un avenant ou d'un devis complémentaire.</p>`)}
    ${A(3, "Durée du contrat", `<p>Le présent contrat prend effet à compter de la signature et de la réception de l'acompte. Il prend fin à la livraison du site, sauf souscription d'un forfait de maintenance qui le prolongera selon les modalités convenues.</p><p>Le forfait de maintenance, s'il est souscrit, est conclu pour une durée initiale d'un (1) mois, reconductible tacitement, et résiliable à tout moment avec un préavis de <strong>30 jours</strong>.</p>`)}
    ${A(4, "Conditions financières", `<p>Le prix total des prestations est défini dans le devis accepté. Sauf accord contraire, les modalités de paiement sont les suivantes :</p><ul><li><strong>50 %</strong> à la signature du contrat (acompte)</li><li><strong>50 %</strong> à la livraison du site</li></ul><p>Le paiement s'effectue par virement bancaire sur le compte indiqué sur la facture. <strong>TVA non applicable</strong>, art. 293 B du CGI (auto-entrepreneur).</p><p>En cas de retard de paiement, des pénalités de retard au taux annuel de <strong>10 %</strong> seront appliquées de plein droit, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de <strong>40 €</strong> (articles L441-10 et D441-5 du Code de commerce).</p>`)}
    ${A(5, "Délai de livraison", `<p>Le Prestataire s'engage à livrer le site dans un délai de <strong>[7 à 21] jours ouvrés</strong> à compter de la réception de l'acompte et de l'ensemble des contenus du Client (textes, photos, logos, accès).</p><p>Tout retard imputable au Client (retard dans la fourniture des contenus, retard de validation) prolonge le délai de livraison de la durée correspondante.</p>`)}
    ${A(6, "Obligations du Client", `<p>Le Client s'engage à :</p><ul><li>Fournir l'ensemble des contenus nécessaires (textes, images, logos) dans des délais raisonnables</li><li>Garantir qu'il dispose des droits sur les contenus fournis</li><li>Valider chaque étape du projet dans un délai de 7 jours</li><li>Respecter les conditions de paiement convenues</li><li>Ne pas tenir le Prestataire responsable de l'exactitude des contenus fournis</li></ul>`)}
    ${A(7, "Recette et validation", `<p>À la livraison, le Client dispose d'un délai de <strong>7 jours</strong> pour vérifier la conformité du site et formuler ses observations par écrit.</p><p>Passé ce délai sans observation, le site est réputé accepté définitivement et le solde devient exigible.</p><p>Toute demande de modification après acceptation fera l'objet d'une facturation complémentaire ou sera intégrée au forfait de maintenance.</p>`)}
    ${A(8, "Propriété intellectuelle", `<p>Sous réserve du <strong>paiement intégral</strong> du prix, le Prestataire cède au Client les droits d'utilisation, de reproduction et de modification du site livré, pour une durée illimitée et pour un usage commercial.</p><p>Le Prestataire conserve néanmoins le droit de mentionner la réalisation dans son portfolio et ses supports de communication, sauf demande contraire écrite du Client.</p><p>Les outils, frameworks et bibliothèques tierces utilisés restent la propriété de leurs auteurs respectifs et sont soumis à leurs propres licences.</p>`)}
    ${A(9, "Confidentialité", `<p>Chacune des Parties s'engage à conserver confidentielles toutes informations, documents ou données dont elle aurait connaissance dans le cadre de l'exécution du présent contrat.</p><p>Cette obligation perdure pendant toute la durée du contrat et pour une durée de <strong>2 ans</strong> après son terme.</p>`)}
    ${A(10, "Données personnelles & RGPD", `<p>Le Prestataire s'engage à respecter le Règlement Général sur la Protection des Données (RGPD) dans le cadre de ses prestations.</p><p>Les données personnelles éventuellement collectées via le site (formulaire de contact, espace client) sont traitées sous la responsabilité du <strong>Client</strong>, qui agit en qualité de responsable de traitement. Le Prestataire intervient comme sous-traitant au sens du RGPD.</p><p>Le Prestataire met en œuvre les mesures techniques et organisationnelles appropriées (HTTPS, hébergement sécurisé, sauvegardes) pour garantir la sécurité des données.</p>`)}
    ${A(11, "Hébergement et maintenance", `<p>Si le Client souscrit au forfait maintenance, le Prestataire assure :</p><ul><li>L'hébergement du site sur une infrastructure sécurisée</li><li>Le renouvellement du nom de domaine et du certificat SSL</li><li>Les mises à jour techniques et correctifs de sécurité</li><li>Les sauvegardes régulières (hebdomadaires minimum)</li><li>Les modifications mineures selon le forfait choisi</li></ul><p>Le Prestataire ne peut garantir une disponibilité de 100 % en raison d'opérations de maintenance ou de causes extérieures (panne du fournisseur d'hébergement, attaque, etc.).</p>`)}
    ${A(12, "Responsabilité", `<p>Le Prestataire est tenu d'une obligation de moyens et non de résultat. Il s'engage à apporter tout le soin et la diligence nécessaires à l'exécution des prestations.</p><p>La responsabilité du Prestataire ne pourra en aucun cas excéder le montant total des sommes versées par le Client au titre du contrat.</p><p>Le Prestataire ne peut être tenu responsable des dommages indirects (perte d'exploitation, perte de chiffre d'affaires, atteinte à l'image).</p>`)}
    ${A(13, "Résiliation", `<p><strong>Résiliation pour faute :</strong> en cas de manquement grave de l'une des Parties, l'autre Partie pourra résilier le contrat de plein droit après mise en demeure restée sans effet pendant <strong>15 jours</strong>.</p><p><strong>Résiliation du forfait maintenance :</strong> chacune des Parties peut résilier à tout moment, par écrit, avec un préavis de <strong>30 jours</strong>. Aucun remboursement ne sera dû pour le mois en cours.</p><p>En cas de résiliation avant livraison du site, l'acompte versé reste acquis au Prestataire à titre de dédommagement pour le travail réalisé.</p>`)}
    ${A(14, "Force majeure", `<p>Aucune des Parties ne pourra être tenue responsable de l'inexécution de ses obligations en cas de force majeure au sens de l'article 1218 du Code civil (catastrophe naturelle, panne d'infrastructure majeure, décision gouvernementale, etc.).</p>`)}
    ${A(15, "Droit applicable & juridiction", `<p>Le présent contrat est soumis au <strong>droit français</strong>.</p><p>En cas de litige, les Parties s'efforceront de trouver une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents du ressort de <strong>Toulon (83)</strong>, sauf disposition légale impérative contraire (notamment lorsque le Client est un consommateur).</p>`)}
    <div class="signatures">
      <div class="sig-box"><strong>Le Prestataire</strong>${esc(s.emetteur.nom)}<br>${esc(s.emetteur.entreprise)}<div class="sig-line"></div><div class="sig-mention">Bon pour accord</div><div class="sig-place-date">Fait à Cogolin, le ___/___/______</div></div>
      <div class="sig-box"><strong>Le Client</strong>${esc(doc.clientSnapshot.nom)}<div class="sig-line"></div><div class="sig-mention">Mention manuscrite : « Lu et approuvé »</div><div class="sig-place-date">Fait à __________, le ___/___/______</div></div>
    </div>
    ${footerHTML(s, "Contrat établi en deux (2) exemplaires originaux, un pour chacune des Parties.")}
  </div>`;
}

// ---------- Aiguillage + document complet autonome ----------
function renderDocBody(doc, s) {
  if (doc.type === "devis") return renderDevis(doc, s);
  if (doc.type === "facture") return renderFacture(doc, s);
  return renderContrat(doc, s);
}

// Document HTML complet et autonome (pour aperçu / impression / téléchargement)
function renderFullDocument(doc, s) {
  const titres = { devis: "Devis", facture: "Facture", contrat: "Contrat" };
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titres[doc.type]} ${esc(doc.numero)} – ${esc(s.emetteur.entreprise)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${DOC_CSS}</style></head><body>
<div class="print-bar no-print">
  <button class="print-btn" onclick="window.print()">Imprimer / Exporter PDF</button>
</div>
${renderDocBody(doc, s)}
</body></html>`;
}

window.ZTemplates = { renderDocBody, renderFullDocument, fmtEur, fmtDate, fmtQte, esc, DOC_CSS };

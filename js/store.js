/* ============================================================
   store.js — Persistance locale (localStorage) + compteurs +
   export/import. Aucune donnée n'est envoyée en ligne.
   ============================================================ */

const STORAGE_KEY = "zdev-admin-v1";

// ---------- Réglages par défaut (tes informations) ----------
const DEFAULT_SETTINGS = {
  emetteur: {
    nom: "Zine-Eddine Abalou",
    entreprise: "Z Development",
    marque_avant: "Z",
    marque_apres: "Development",
    slogan: "Création de sites web professionnels",
    adresse: "21 Rue",
    cp_ville: "83310 Cogolin, France",
    siret: "104 577 440 00019",
    email: "qop.pro@gmail.com",
    tel: "07 45 27 66 14",
    iban: "FR76 2823 3000 0124 6031 0063 805",
    bic: "REVOFRP2",
    banque: "Revolut Bank UAB, 10 avenue Kléber, 75116 Paris",
  },
};

const PREFIXES = { devis: "DEV", facture: "FAC", contrat: "CTR" };

// ---------- État en mémoire ----------
let state = null;

function blankState() {
  return {
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    clients: [],
    documents: [],
    counters: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : blankState();
  } catch (e) {
    state = blankState();
  }
  // Complète les champs manquants (migrations douces)
  if (!state.settings) state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!state.settings.emetteur) state.settings.emetteur = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.emetteur));
  for (const k in DEFAULT_SETTINGS.emetteur) {
    if (state.settings.emetteur[k] === undefined) state.settings.emetteur[k] = DEFAULT_SETTINGS.emetteur[k];
  }
  if (!Array.isArray(state.clients)) state.clients = [];
  if (!Array.isArray(state.documents)) state.documents = [];
  if (!state.counters) state.counters = {};
  return state;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState() {
  if (!state) load();
  return state;
}

// ---------- Identifiants ----------
function uid() {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// ---------- Réglages ----------
function getSettings() {
  return getState().settings;
}
function saveSettings(emetteur) {
  getState().settings.emetteur = emetteur;
  save();
}

// ---------- Clients ----------
function getClients() {
  return getState().clients.slice().sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
function getClient(id) {
  return getState().clients.find((c) => c.id === id) || null;
}
function saveClient(client) {
  const s = getState();
  if (client.id) {
    const i = s.clients.findIndex((c) => c.id === client.id);
    if (i >= 0) s.clients[i] = client;
    else s.clients.push(client);
  } else {
    client.id = uid();
    s.clients.push(client);
  }
  save();
  return client;
}
function deleteClient(id) {
  const s = getState();
  s.clients = s.clients.filter((c) => c.id !== id);
  save();
}
function clientHasDocs(id) {
  return getState().documents.some((d) => d.clientId === id);
}

// ---------- Compteurs / numérotation ----------
function nextNumero(type) {
  const s = getState();
  const annee = String(new Date().getFullYear());
  const prefixe = PREFIXES[type];
  if (!s.counters[annee]) s.counters[annee] = {};
  const n = (s.counters[annee][prefixe] || 0) + 1;
  s.counters[annee][prefixe] = n;
  save();
  return `${prefixe}-${annee}-${String(n).padStart(3, "0")}`;
}

// ---------- Documents ----------
function getDocuments() {
  return getState().documents;
}
function getDocument(id) {
  return getState().documents.find((d) => d.id === id) || null;
}
function addDocument(doc) {
  doc.id = uid();
  getState().documents.push(doc);
  save();
  return doc;
}
function updateDocument(doc) {
  const s = getState();
  const i = s.documents.findIndex((d) => d.id === doc.id);
  if (i >= 0) s.documents[i] = doc;
  save();
  return doc;
}
function deleteDocument(id) {
  const s = getState();
  s.documents = s.documents.filter((d) => d.id !== id);
  save();
}

// ---------- Statistiques ----------
function stats() {
  const docs = getState().documents;
  const totalDevis = docs.filter((d) => d.type === "devis").reduce((t, d) => t + (d.montant || 0), 0);
  const totalFacture = docs.filter((d) => d.type === "facture").reduce((t, d) => t + (d.montant || 0), 0);
  const totalEncaisse = docs
    .filter((d) => d.type === "facture" && d.statut === "payee")
    .reduce((t, d) => t + (d.montant || 0), 0);
  const enAttente = docs
    .filter((d) => d.type === "facture" && d.statut !== "payee")
    .reduce((t, d) => t + (d.montant || 0), 0);
  return { nb: docs.length, totalDevis, totalFacture, totalEncaisse, enAttente };
}

// ---------- Export / Import (sauvegarde) ----------
function exportJSON() {
  return JSON.stringify(getState(), null, 2);
}
function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Fichier invalide");
  state = {
    settings: data.settings || blankState().settings,
    clients: Array.isArray(data.clients) ? data.clients : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    counters: data.counters || {},
  };
  load(); // ré-applique les migrations douces sur le state importé
  state.settings = data.settings && data.settings.emetteur ? data.settings : state.settings;
  state.clients = Array.isArray(data.clients) ? data.clients : [];
  state.documents = Array.isArray(data.documents) ? data.documents : [];
  state.counters = data.counters || {};
  save();
}
function resetAll() {
  state = blankState();
  save();
}

window.ZStore = {
  load, getState, getSettings, saveSettings,
  getClients, getClient, saveClient, deleteClient, clientHasDocs,
  nextNumero, getDocuments, getDocument, addDocument, updateDocument, deleteDocument,
  stats, exportJSON, importJSON, resetAll, uid,
  DEFAULT_SETTINGS,
};

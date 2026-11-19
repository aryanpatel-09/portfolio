import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safe = (u) => (/^https?:\/\//i.test(u) ? u : "#");
const PAGE = 6;
let last = null;

async function loadProfile() {
  const s = await getDoc(doc(db, "profile", "main"));
  if (!s.exists()) return;
  const p = s.data();
  if (p.about) $("aboutText").textContent = p.about;
  if (p.intro) $("intro").textContent = p.intro;
  const links = [];
  if (p.email) links.push(`<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`);
  if (p.linkedin) links.push(`<a href="${esc(safe(p.linkedin))}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`);
  if (p.github) links.push(`<a href="${esc(safe(p.github))}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
  $("links").innerHTML = links.join("");
}

async function loadSkills() {
  const s = await getDocs(query(collection(db, "skills"), orderBy("createdAt")));
  const groups = { "Languages": [], "AI & Data": [], "Fundamentals": [] };
  s.docs.forEach((d) => { const k = d.data(); (groups[k.category] ||= []).push(k.name); });
  $("skillsGrid").innerHTML = Object.entries(groups).filter(([, v]) => v.length).map(([g, v]) =>
    `<div><div class="label" style="margin-bottom:16px">${esc(g)}</div>${v.map((n) => `<div class="skill">${esc(n)}</div>`).join("")}</div>`).join("");
}

function card(c) {
  const img = c.imageUrl ? `<img src="${esc(safe(c.imageUrl))}" alt="${esc(c.name)} certificate" loading="lazy">` : `<span class="label">Certificate</span>`;
  return `<article class="card"><div class="img">${img}</div><div class="body"><h3>${esc(c.name)}</h3><div class="muted">${esc(c.issuer)} · ${esc(c.year)}</div><a href="${esc(safe(c.certificateUrl))}" target="_blank" rel="noopener noreferrer">View certificate →</a></div></article>`;
}

async function loadCerts() {
  const q = last
    ? query(collection(db, "certificates"), orderBy("createdAt", "desc"), startAfter(last), limit(PAGE))
    : query(collection(db, "certificates"), orderBy("createdAt", "desc"), limit(PAGE));
  const s = await getDocs(q);
  if (!last && s.empty) $("certGrid").innerHTML = '<p class="empty">Certificates will appear here soon.</p>';
  else $("certGrid").insertAdjacentHTML("beforeend", s.docs.map((d) => card(d.data())).join(""));
  last = s.docs[s.docs.length - 1] || last;
  $("loadMore").hidden = s.size < PAGE;
}

$("loadMore").onclick = () => loadCerts().catch(console.error);
loadProfile().catch(console.error);
loadSkills().catch(console.error);
loadCerts().catch(console.error);

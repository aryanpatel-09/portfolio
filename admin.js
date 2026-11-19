import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isUrl = (u) => /^https?:\/\//i.test(u);
let timer;
function msg(text, ok = true) {
  const m = $("msg"); m.textContent = text; m.className = ok ? "" : "err";
  clearTimeout(timer); timer = setTimeout(() => (m.textContent = ""), 4000);
}

onAuthStateChanged(auth, (u) => {
  $("login").hidden = !!u; $("app").hidden = !u;
  if (u) Promise.all([loadCerts(), loadSkills(), loadProfile()]).catch(() => msg("Could not load data. Check your Firestore rules.", false));
});
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  try { await signInWithEmailAndPassword(auth, $("email").value, $("password").value); $("loginErr").textContent = ""; }
  catch { $("loginErr").textContent = "Login failed. Check your email and password."; }
};
$("logout").onclick = () => signOut(auth);
document.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "v-" + b.dataset.view));
  document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("active", x === b));
}));

/* Certificates */
const PER = 10;
let certs = [], page = 0, editC = null;
async function loadCerts() {
  const s = await getDocs(query(collection(db, "certificates"), orderBy("createdAt", "desc")));
  certs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderCerts();
}
function renderCerts() {
  const q = $("cSearch").value.toLowerCase();
  const f = certs.filter((c) => `${c.name} ${c.issuer} ${c.year}`.toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(f.length / PER));
  page = Math.min(page, pages - 1);
  const part = f.slice(page * PER, page * PER + PER);
  $("cCount").textContent = `${certs.length} certificates published`;
  $("cRows").innerHTML = part.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.issuer)}</td><td>${esc(c.year)}</td><td><button class="btn sm" data-edit="${c.id}">Edit</button> <button class="btn sm solid" data-del="${c.id}">Delete</button></td></tr>`).join("") || '<tr><td colspan="4">No certificates yet. Add your first one above.</td></tr>';
  $("cInfo").textContent = f.length ? `Showing ${page * PER + 1}–${page * PER + part.length} of ${f.length}` : "Showing 0 of 0";
  $("cPrev").disabled = page === 0; $("cNext").disabled = page >= pages - 1;
}
$("cSearch").oninput = () => { page = 0; renderCerts(); };
$("cPrev").onclick = () => { page--; renderCerts(); };
$("cNext").onclick = () => { page++; renderCerts(); };
function resetC() { editC = null; $("cForm").reset(); $("cSubmit").textContent = "Add certificate"; $("cCancel").hidden = true; }
$("cCancel").onclick = resetC;
$("cRows").onclick = async (e) => {
  const ed = e.target.dataset.edit, del = e.target.dataset.del;
  if (ed) {
    const c = certs.find((x) => x.id === ed); editC = ed;
    $("cName").value = c.name; $("cIssuer").value = c.issuer; $("cYear").value = c.year; $("cUrl").value = c.certificateUrl; $("cImg").value = c.imageUrl || "";
    $("cSubmit").textContent = "Save changes"; $("cCancel").hidden = false; scrollTo({ top: 0, behavior: "smooth" });
  }
  if (del && confirm("Delete this certificate?")) {
    try { await deleteDoc(doc(db, "certificates", del)); msg("Certificate deleted."); await loadCerts(); } catch { msg("Could not delete. Check your login and Firestore rules.", false); }
  }
};
$("cForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = { name: $("cName").value.trim(), issuer: $("cIssuer").value.trim(), year: $("cYear").value.trim(), certificateUrl: $("cUrl").value.trim(), imageUrl: $("cImg").value.trim() };
  if (!isUrl(data.certificateUrl) || (data.imageUrl && !isUrl(data.imageUrl))) return msg("Links must start with http:// or https://", false);
  try {
    if (editC) await updateDoc(doc(db, "certificates", editC), data);
    else await addDoc(collection(db, "certificates"), { ...data, createdAt: serverTimestamp() });
    msg(editC ? "Certificate updated." : "Certificate added."); resetC(); await loadCerts();
  } catch { msg("Could not save. Check your login and Firestore rules.", false); }
};

/* Skills */
let skills = [], editS = null;
async function loadSkills() {
  const s = await getDocs(query(collection(db, "skills"), orderBy("createdAt", "desc")));
  skills = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  $("sRows").innerHTML = skills.map((k) => `<tr><td>${esc(k.name)}</td><td>${esc(k.category)}</td><td><button class="btn sm" data-edit="${k.id}">Edit</button> <button class="btn sm solid" data-del="${k.id}">Delete</button></td></tr>`).join("") || '<tr><td colspan="3">No skills yet. Add your first one above.</td></tr>';
}
function resetS() { editS = null; $("sForm").reset(); $("sSubmit").textContent = "Add skill"; $("sCancel").hidden = true; }
$("sCancel").onclick = resetS;
$("sRows").onclick = async (e) => {
  const ed = e.target.dataset.edit, del = e.target.dataset.del;
  if (ed) { const k = skills.find((x) => x.id === ed); editS = ed; $("sName").value = k.name; $("sCat").value = k.category; $("sSubmit").textContent = "Save changes"; $("sCancel").hidden = false; }
  if (del && confirm("Delete this skill?")) {
    try { await deleteDoc(doc(db, "skills", del)); msg("Skill deleted."); await loadSkills(); } catch { msg("Could not delete. Check your login and Firestore rules.", false); }
  }
};
$("sForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = { name: $("sName").value.trim(), category: $("sCat").value };
  try {
    if (editS) await updateDoc(doc(db, "skills", editS), data);
    else await addDoc(collection(db, "skills"), { ...data, createdAt: serverTimestamp() });
    msg(editS ? "Skill updated." : "Skill added."); resetS(); await loadSkills();
  } catch { msg("Could not save. Check your login and Firestore rules.", false); }
};

/* Profile */
async function loadProfile() {
  const s = await getDoc(doc(db, "profile", "main")); if (!s.exists()) return;
  const p = s.data();
  $("pAbout").value = p.about || ""; $("pIntro").value = p.intro || ""; $("pEmail").value = p.email || ""; $("pLinkedin").value = p.linkedin || ""; $("pGithub").value = p.github || "";
}
$("pForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = { about: $("pAbout").value.trim(), intro: $("pIntro").value.trim(), email: $("pEmail").value.trim(), linkedin: $("pLinkedin").value.trim(), github: $("pGithub").value.trim() };
  if ((data.linkedin && !isUrl(data.linkedin)) || (data.github && !isUrl(data.github))) return msg("Links must start with http:// or https://", false);
  try { await setDoc(doc(db, "profile", "main"), data, { merge: true }); msg("Profile saved."); } catch { msg("Could not save. Check your login and Firestore rules.", false); }
};

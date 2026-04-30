const USE_FIREBASE = false;

// ===== FIREBASE =====
const firebaseConfig = {
apiKey:"TU_API_KEY",
projectId:"TU_PROJECT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== APP =====
const app = {

db:{
weights:[],
sessions:[],
plans:[],
goalWeight:95
},

charts:{},

// ===== INIT =====
async init(){

if(USE_FIREBASE) await this.loadCloud();
else this.loadLocal();

this.ensurePlan();
this.renderAll();

},

// ===== NAV =====
go(id){
document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
document.getElementById(id).classList.add("active");

if(id==="progreso") setTimeout(()=>this.renderCharts(),100);
},

// ===== RENDER ALL =====
renderAll(){
this.renderInicio();
this.renderPlan();
this.renderProgreso();
this.renderEntreno();
},

// ===== DASHBOARD =====
renderInicio(){

const el = document.getElementById("inicio");

const weekSessions = this.sessionsThisWeek();
const total = this.db.sessions.length;
const streak = this.calculateStreak();

const weight = this.getLastWeight();

el.innerHTML = `
<div class="card">
<div>${new Date().toLocaleDateString("es-CL")}</div>
<h2>Hola, Diego 👋</h2>
</div>

<div class="card">
<b>PLAN ACTIVO</b>
<div style="height:6px;background:#eee;margin-top:8px;">
<div style="width:${this.getAdherence()}%;height:6px;background:#2563EB;"></div>
</div>
</div>

<div class="card stats">
<div><b>${weekSessions}</b><br>Semana</div>
<div><b>${streak}</b><br>Racha</div>
<div><b>${total}</b><br>Total</div>
</div>

<div class="card">
<b>PESO</b>
<h2>${weight || "--"} kg</h2>
<button onclick="app.openWeight()">+ Peso</button>
</div>

<div class="card">
<b>ÚLTIMOS ENTRENOS</b>
${this.renderLastSessions()}
</div>
`;

},

renderLastSessions(){
return this.db.sessions.slice(-5).reverse().map(s=>{
const pace = (s.time/s.km).toFixed(2);
return `<div>${s.km} km - ${pace} min/km</div>`;
}).join("");
},

// ===== PLAN =====
renderPlan(){

const el = document.getElementById("plan");

el.innerHTML = `
<div class="card">
<h3>Plan semanal</h3>
${this.db.plans[0].days.map(d=>`
<div class="plan-card">
<div>${d.day}</div>
<div class="plan-km">${d.km}</div>
</div>
`).join("")}
</div>
`;

},

// ===== PROGRESO =====
renderProgreso(){

const el = document.getElementById("progreso");

el.innerHTML = `
<div class="card"><canvas id="chartWeight"></canvas></div>
<div class="card"><canvas id="chartKM"></canvas></div>
<div class="card"><canvas id="chartPace"></canvas></div>
`;

},

// ===== ENTRENAMIENTO =====
renderEntreno(){

const el = document.getElementById("entreno");

el.innerHTML = `
<div class="card">
<input id="km" placeholder="km">
<input id="time" placeholder="min">
<button onclick="app.saveSession()">Guardar</button>
</div>
`;

},

// ===== LOGIC =====
saveSession(){

const km = parseFloat(document.getElementById("km").value);
const time = parseFloat(document.getElementById("time").value);

this.db.sessions.push({
km,time,date:new Date()
});

this.save();
this.renderAll();

},

getLastWeight(){
return this.db.weights.length ? this.db.weights.slice(-1)[0].val : null;
},

sessionsThisWeek(){
return this.db.sessions.length;
},

calculateStreak(){
return this.db.sessions.length ? 1 : 0;
},

getAdherence(){
return Math.min(100,this.db.sessions.length*20);
},

// ===== PESO MODAL =====
openWeight(){

const modal = document.getElementById("weightModal");
modal.classList.remove("hidden");

modal.innerHTML = `
<div style="display:flex;gap:20px;">
<div id="kgWheel" class="wheel"></div>
<div id="decWheel" class="wheel"></div>
</div>
<button onclick="app.confirmWeight()">Guardar</button>
<button onclick="app.closeWeight()">Cancelar</button>
`;

this.buildWheels();

},

closeWeight(){
document.getElementById("weightModal").classList.add("hidden");
},

buildWheels(){

let kg = document.getElementById("kgWheel");
let dec = document.getElementById("decWheel");

for(let i=80;i<=150;i++) kg.innerHTML+=`<div>${i}</div>`;
for(let i=0;i<=9;i++) dec.innerHTML+=`<div>.${i}</div>`;

},

confirmWeight(){

let kg = Math.round(document.getElementById("kgWheel").scrollTop/40)+80;
let dec = Math.round(document.getElementById("decWheel").scrollTop/40);

const val = parseFloat(`${kg}.${dec}`);

this.db.weights.push({val,date:new Date()});

this.save();
this.renderAll();
this.closeWeight();

},

// ===== CHARTS =====
renderCharts(){

this.renderWeightChart();

},

renderWeightChart(){

const ctx = document.getElementById("chartWeight");

const data = this.db.weights.map(w=>({x:new Date(w.date),y:w.val}));

if(this.charts.w) this.charts.w.destroy();

this.charts.w = new Chart(ctx,{
type:"line",
data:{datasets:[{data}]},
options:{parsing:false}
});

},

// ===== STORAGE =====
loadLocal(){
this.db={
weights:JSON.parse(localStorage.getItem("w"))||[],
sessions:JSON.parse(localStorage.getItem("s"))||[],
plans:JSON.parse(localStorage.getItem("p"))||[],
goalWeight:95
};
},

saveLocal(){
localStorage.setItem("w",JSON.stringify(this.db.weights));
localStorage.setItem("s",JSON.stringify(this.db.sessions));
localStorage.setItem("p",JSON.stringify(this.db.plans));
},

async loadCloud(){
const doc = await db.collection("sergei").doc("user_main").get();
if(doc.exists) this.db = doc.data();
},

async saveCloud(){
await db.collection("sergei").doc("user_main").set(this.db);
},

save(){
this.saveLocal();
if(USE_FIREBASE) this.saveCloud();
},

// ===== INIT PLAN =====
ensurePlan(){
if(this.db.plans.length) return;

this.db.plans=[{
days:[
{day:"Lunes",km:5},
{day:"Martes",km:3},
{day:"Jueves",km:7},
{day:"Sábado",km:5},
{day:"Domingo",km:10}
]
}];
}

};

window.onload=()=>app.init();

window.addEventListener("beforeunload",()=>{
app.save();
});

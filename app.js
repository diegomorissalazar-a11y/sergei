const app = {

db:{
weights:[],
sessions:[],
plans:[],
goalWeight:95,
userName:"Sergei"
},

init(){
this.load();
this.renderAll();
},

go(id, el){

document.querySelectorAll(".page")
.forEach(p=>p.classList.remove("active"));

document.getElementById(id).classList.add("active");

document.querySelectorAll(".tab")
.forEach(t=>t.classList.remove("active"));

if(el) el.classList.add("active");

},

renderAll(){
this.renderInicio();
this.renderPlan();
this.renderEntreno();
},

/* ================= DASHBOARD ================= */

renderInicio(){

const weight=this.getLastWeight();

const sesiones=this.db.sessions.length;

const plan=this.db.plans[0]?.days?.length||0;

const adherence=plan?Math.round((sesiones/plan)*100):0;

const km=this.db.sessions.reduce((a,s)=>a+(parseFloat(s.km)||0),0);

document.getElementById("inicio").innerHTML=`

<div class="card">
<div>${new Date().toLocaleDateString("es-CL")}</div>
<h1>Hola ${this.db.userName} 👋</h1>
</div>

<div class="stats">
<div><b>${sesiones}</b><div>Semana</div></div>
<div><b>${this.calculateStreak()}</b><div>Racha</div></div>
<div><b>${this.db.sessions.length}</b><div>Total</div></div>
</div>

<div class="card">
<div class="label">Plan activo</div>
<div class="progress">
<div style="width:${adherence}%"></div>
</div>
</div>

<div class="card">
<div class="label">KM semana</div>
<h2>${km}</h2>
</div>

<div class="card">
<div class="label">Peso</div>
<h2>${weight||"--"} kg</h2>
<button onclick="app.openWeight()">Editar</button>
</div>

<div class="card">
${this.renderRuns()}
</div>

`;

},

renderRuns(){

return this.db.sessions.slice(-4).reverse().map(s=>`

<div class="run-card-pro">
<div class="day">${new Date(s.date).toLocaleDateString("es-CL",{weekday:"long"})}</div>
<div class="km">${s.km||"-"}</div>
<div class="pace">${s.time||"-"} min</div>
</div>

`).join("");

},

/* ================= PLAN ================= */

renderPlan(){

const days=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const planned=this.db.plans[0]?.days||[];

document.getElementById("plan").innerHTML=`

<div class="card">

<div class="plan-container">

<div class="plan-source">
${days.map(d=>`
<div class="draggable" draggable="true"
ondragstart="app.drag(event)"
data-day="${d}">${d}</div>
`).join("")}
</div>

<div class="plan-drop"
ondrop="app.drop(event)"
ondragover="app.allowDrop(event)">

${planned.map((d,i)=>`
<div class="plan-item">
${d.day}
<input value="${d.km||""}"
onchange="app.updateKM(${i},this.value)">
<button onclick="app.removeDay(${i})">✕</button>
</div>
`).join("")}

</div>

</div>

</div>

`;

},

drag(ev){
ev.dataTransfer.setData("day",ev.target.dataset.day);
},

allowDrop(ev){
ev.preventDefault();
},

drop(ev){
ev.preventDefault();

const day=ev.dataTransfer.getData("day");

if(!this.db.plans.length) this.db.plans=[{days:[]}];

if(this.db.plans[0].days.find(d=>d.day===day)) return;

this.db.plans[0].days.push({day,km:null});

this.renderPlan();
},

updateKM(i,v){
this.db.plans[0].days[i].km=parseFloat(v);
},

removeDay(i){
this.db.plans[0].days.splice(i,1);
this.renderPlan();
},

/* ================= ENTRENAMIENTO ================= */

renderEntreno(){

document.getElementById("entrenamiento").innerHTML=`

<div class="card">

<input id="km" placeholder="km">
<input id="time" placeholder="min">

<button onclick="app.saveTraining()">Guardar</button>

</div>

`;

},

saveTraining(){

this.db.sessions.push({
km:document.getElementById("km").value,
time:document.getElementById("time").value,
date:new Date().toISOString()
});

this.save();
this.renderAll();

},

/* ================= PESO ================= */

openWeight(){
const w=prompt("Peso actual");
const g=prompt("Peso objetivo");

if(w) this.db.weights.push({val:parseFloat(w)});
if(g) this.db.goalWeight=parseFloat(g);

this.save();
this.renderAll();
},

getLastWeight(){
return this.db.weights.slice(-1)[0]?.val;
},

/* ================= MÉTRICAS ================= */

calculateStreak(){
return this.db.sessions.length>0?1:0;
},

/* ================= STORAGE ================= */

load(){
this.db=JSON.parse(localStorage.getItem("db"))||this.db;
},

save(){
localStorage.setItem("db",JSON.stringify(this.db));
}

};

window.onload=()=>app.init();

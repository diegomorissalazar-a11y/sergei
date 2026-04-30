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
document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
document.getElementById(id).classList.add("active");

document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
if(el) el.classList.add("active");
},

renderAll(){
this.renderInicio();
this.renderPlan();
this.renderEntreno();
},

// DASHBOARD
renderInicio(){

const weight=this.getLastWeight();

document.getElementById("inicio").innerHTML=`

<div class="card">
<div>${new Date().toLocaleDateString("es-CL")}</div>
<h1>Hola ${this.db.userName} 👋</h1>
</div>

<div class="stats">
<div><b>${this.db.sessions.length}</b><span>Total</span></div>
<div><b>${this.db.plans[0]?.days?.length||0}</b><span>Plan</span></div>
<div><b>${this.getAdherence()}%</b><span>Adherencia</span></div>
</div>

<div class="card blue">
<div>KM: ${this.getKMComparison().real}</div>
</div>

<div class="card">
<div class="label">Peso</div>
<h2>${weight||"--"} kg</h2>
<button onclick="app.openWeight()">Editar</button>
</div>

<div class="card">
${this.db.sessions.slice(-3).map(s=>`
<div class="run-card">
<div class="day">${new Date(s.date).toLocaleDateString("es-CL",{weekday:"long"})}</div>
<div class="km">${s.km||"-"}</div>
</div>
`).join("")}
</div>
`;
},

// PLAN
renderPlan(){

const days=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const planned=this.db.plans[0]?.days||[];

document.getElementById("plan").innerHTML=`

<div class="card">

<div class="plan-container">

<div class="plan-source">
${days.map(d=>`<div class="draggable" draggable="true" ondragstart="app.drag(event)" data-day="${d}">${d}</div>`).join("")}
</div>

<div class="plan-drop" ondrop="app.drop(event)" ondragover="app.allowDrop(event)">
${planned.map((d,i)=>`
<div class="plan-item">
${d.day}
<input value="${d.km||""}" onchange="app.updateKM(${i},this.value)">
<button onclick="app.removeDay(${i})">✕</button>
</div>`).join("")}
</div>

</div>

<button onclick="app.save()">Guardar</button>

</div>
`;
},

drag(ev){ev.dataTransfer.setData("day", ev.target.dataset.day);},
allowDrop(ev){ev.preventDefault();},

drop(ev){
ev.preventDefault();
const day=ev.dataTransfer.getData("day");

if(!this.db.plans.length) this.db.plans=[{days:[]}];

if(this.db.plans[0].days.find(d=>d.day===day)) return;

this.db.plans[0].days.push({day,km:null});
this.renderPlan();
},

updateKM(i,v){this.db.plans[0].days[i].km=parseFloat(v);},
removeDay(i){this.db.plans[0].days.splice(i,1);this.renderPlan();},

// ENTRENAMIENTO
renderEntreno(){

document.getElementById("entrenamiento").innerHTML=`

<div class="card">

<select id="type">
<option value="run">Carrera</option>
<option value="gym">Fuerza</option>
</select>

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

// PESO
openWeight(){
document.getElementById("weightModal").classList.remove("hidden");
document.getElementById("weightModal").innerHTML=`
<input id="wcur" placeholder="Peso actual">
<input id="wgoal" placeholder="Peso objetivo">
<button onclick="app.saveWeight()">Guardar</button>
`;
},

saveWeight(){
const c=parseFloat(document.getElementById("wcur").value);
const g=parseFloat(document.getElementById("wgoal").value);

if(c) this.db.weights.push({val:c,date:new Date()});
if(g) this.db.goalWeight=g;

this.save();
this.renderAll();
},

// MÉTRICAS
getLastWeight(){
return this.db.weights.length?this.db.weights.slice(-1)[0].val:null;
},

getAdherence(){
const plan=this.db.plans[0]?.days?.length||0;
const done=this.db.sessions.length;
return plan?Math.round((done/plan)*100):0;
},

getKMComparison(){
const real=this.db.sessions.reduce((a,s)=>a+(parseFloat(s.km)||0),0);
return {real};
},

// STORAGE
load(){
this.db=JSON.parse(localStorage.getItem("db"))||this.db;
},

save(){
localStorage.setItem("db",JSON.stringify(this.db));
}

};

window.onload=()=>app.init();

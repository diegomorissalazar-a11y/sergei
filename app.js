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
this.ensurePlan();
this.renderAll();
},

go(id){
document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
document.getElementById(id).classList.add("active");
},

renderAll(){
this.renderInicio();
this.renderPlan();
this.renderEntreno();
},

// ===== DASHBOARD =====
renderInicio(){

const weight = this.getLastWeight();
const goal = this.db.goalWeight;
const progress = weight ? Math.min(100, ((goal-weight)/(goal-80))*100) : 0;

const km = this.getKMComparison();

document.getElementById("inicio").innerHTML = `

<div class="card">
<div>${new Date().toLocaleDateString("es-CL")}</div>
<h1>Hola ${this.db.userName} 👋</h1>
</div>

<div class="card">
<div class="label">PLAN ACTIVO</div>
<div class="progress"><div style="width:${this.getAdherence()}%"></div></div>
</div>

<div class="stats">
<div><b>${this.sessionsThisWeek()}</b><span>SEMANA</span></div>
<div><b>${this.calculateStreak()}</b><span>RACHA</span></div>
<div><b>${this.db.sessions.length}</b><span>TOTAL</span></div>
</div>

<div class="card blue">
<div>🏅 Plan: ${km.plan} km</div>
<div>⚡ Racha: ${this.calculateStreak()}</div>
<div>Semana: ${km.real} km</div>
<div>Diferencia: ${km.diff}</div>
</div>

<div class="card">
<div class="label">PESO</div>
<h2>${weight||"--"} kg</h2>
<button onclick="app.openWeight()">Editar</button>
<div class="progress"><div style="width:${progress}%"></div></div>
</div>

<div class="card">
${this.renderTrainingCards()}
</div>

`;

},

renderTrainingCards(){
return this.db.sessions.slice(-4).reverse().map(s=>{
return `<div class="run-card">
<div class="day">${new Date(s.date).toLocaleDateString("es-CL",{weekday:"long"})}</div>
<div class="km">${s.km||"-"}</div>
<div>${s.time||"-"} min</div>
</div>`;
}).join("");
},

// ===== PLAN DRAG =====
renderPlan(){

const allDays=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const planned=this.db.plans[0]?.days||[];

document.getElementById("plan").innerHTML=`

<div class="card">

<div class="plan-container">

<div class="plan-source">
${allDays.map(d=>`<div class="draggable" draggable="true" ondragstart="app.drag(event)" data-day="${d}">${d}</div>`).join("")}
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

<button onclick="app.savePlan()">Guardar</button>

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

savePlan(){this.save();alert("Plan guardado");},

// ===== ENTRENAMIENTO =====
renderEntreno(){

document.getElementById("entrenamiento").innerHTML=`

<div class="card">

<select id="type" onchange="app.renderEntreno()">
<option value="run">Carrera</option>
<option value="gym">Fuerza</option>
</select>

<div id="fields"></div>

<button onclick="app.saveTraining()">Guardar</button>

</div>
`;

this.renderFields();

},

renderFields(){

const type=document.getElementById("type").value;
const f=document.getElementById("fields");

if(type==="run"){
f.innerHTML=`
<input id="km" placeholder="km">
<input id="time" placeholder="min">
<input id="steps" placeholder="pasos">
<input id="kcal" placeholder="kcal">
<input id="fc" placeholder="fc">`;
}else{
f.innerHTML=`
<input id="time" placeholder="min">
<input id="kcal" placeholder="kcal">
<input id="fc" placeholder="fc">`;
}

},

saveTraining(){

const type=document.getElementById("type").value;

const data={
type,
date:new Date().toISOString(),
time:document.getElementById("time").value,
kcal:document.getElementById("kcal").value,
fc:document.getElementById("fc").value
};

if(type==="run"){
data.km=document.getElementById("km").value;
data.steps=document.getElementById("steps").value;
}

this.db.sessions.push(data);

this.save();
this.renderAll();

},

// ===== PESO =====
openWeight(){
document.getElementById("weightModal").classList.remove("hidden");
document.getElementById("weightModal").innerHTML=`
<input id="wcur" placeholder="Actual">
<input id="wgoal" placeholder="Objetivo">
<button onclick="app.saveWeight()">Guardar</button>
`;
},

saveWeight(){
const c=parseFloat(document.getElementById("wcur").value);
const g=parseFloat(document.getElementById("wgoal").value);
if(c) this.db.weights.push({val:c,date:new Date()});
if(g) this.db.goalWeight=g;
this.save();this.renderAll();
},

// ===== MÉTRICAS =====
getLastWeight(){
return this.db.weights.length?this.db.weights.slice(-1)[0].val:null;
},

getSessionsThisWeek(){
return this.db.sessions;
},

sessionsThisWeek(){return this.getSessionsThisWeek().length;},

getAdherence(){

if(!this.db.plans.length) return 0;

const plan=this.db.plans[0].days.length;
const done=this.sessionsThisWeek();

return Math.round((done/plan)*100)||0;
},

getKMComparison(){

const real=this.db.sessions.reduce((a,s)=>a+(parseFloat(s.km)||0),0);
const plan=this.db.plans[0]?.days.reduce((a,d)=>a+(d.km||0),0)||0;

return {plan,real,diff:real-plan};
},

calculateStreak(){
return this.sessionsThisWeek()>0?1:0;
},

// ===== STORAGE =====
load(){
this.db=JSON.parse(localStorage.getItem("db"))||this.db;
},
save(){
localStorage.setItem("db",JSON.stringify(this.db));
},

ensurePlan(){
if(!this.db.plans.length)this.db.plans=[];
}

};

window.onload=()=>app.init();

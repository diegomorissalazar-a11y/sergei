const app = {
  db:{
    userName:"Sergei",
    goalWeight:95,
    startWeight:null,
    weights:[],
    sessions:[],
    plans:[]
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

    if(id==="progreso") this.renderProgress();
  },

  save(){
    localStorage.setItem("sergei_pwa", JSON.stringify(this.db));
  },

  load(){
    const saved = localStorage.getItem("sergei_pwa");
    if(saved) this.db = {...this.db, ...JSON.parse(saved)};
  },

  renderAll(){
    this.renderInicio();
    this.renderEntrenamiento();
    this.renderPlan();
    this.renderProgress();
  },

  today(){
    return new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});
  },

  lastWeight(){
    return this.db.weights.length ? this.db.weights[this.db.weights.length-1].value : null;
  },

  weekSessions(){
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0,0,0,0);

    return this.db.sessions.filter(s => new Date(s.date) >= monday);
  },

  totalKmWeek(){
    return this.weekSessions().reduce((a,s)=>a+(Number(s.km)||0),0);
  },

  adherence(){
    const planDays = this.db.plans.length;
    if(!planDays) return 0;

    const trainedDays = new Set(
      this.weekSessions().map(s =>
        new Date(s.date).toLocaleDateString("es-CL",{weekday:"long"}).toLowerCase()
      )
    );

    const done = this.db.plans.filter(p=>trainedDays.has(p.day.toLowerCase())).length;
    return Math.round((done / planDays) * 100);
  },

  streak(){
    return this.weekSessions().length ? 1 : 0;
  },

  bestWeek(){
    return Math.max(this.weekSessions().length, this.db.sessions.length ? 1 : 0);
  },

  weightProgress(){
    const current = this.lastWeight();
    const goal = this.db.goalWeight;
    const start = this.db.startWeight || current;

    if(!current || !goal || !start || start===goal) return 0;

    const pct = ((start - current) / (start - goal)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  },

  renderInicio(){
    const current = this.lastWeight();
    const goal = this.db.goalWeight;
    const lost = current && this.db.startWeight ? (this.db.startWeight-current).toFixed(1) : "0.0";
    const missing = current ? Math.max(0,current-goal).toFixed(1) : "0.0";

    document.getElementById("inicio").innerHTML = `
      <header class="app-header">
        <div>
          <span class="brand">SERGEI <span>RUN</span></span>
          <span class="version">v01</span>
        </div>
        <div class="avatar">SR</div>
      </header>

      <div class="date">${this.today()}</div>
      <h1>Hola, ${this.db.userName} 👋</h1>

      <section class="card plan-active">
        <div class="label">Plan activo · Sem 1/16</div>
        <div class="card-title">Ciclo Fuerza + 10K</div>
        <div class="sub">Bloque actual: Transmutación (Fuerza)</div>
        <div class="progress"><div style="width:${this.adherence()}%"></div></div>
      </section>

      <section class="stats">
        <div class="stat"><b>${this.weekSessions().length}</b><span>Esta semana</span></div>
        <div class="stat"><b>${this.streak()}</b><span>Racha semanas</span></div>
        <div class="stat"><b>${this.db.sessions.length}</b><span>Total</span></div>
      </section>

      <section class="card blue-card">
        <div class="label">Seguimiento semanal · 2026</div>
        <div>🥇 Mejor semana del año: <b>${this.bestWeek()} sesiones</b></div>
        <div>⚡ Racha actual: <b>${this.streak()} semanas seguidas</b></div>
        <div>Esta semana: <b>${this.weekSessions().length} sesiones</b></div>
      </section>

      <section class="card">
        <div class="weight-head">
          <div class="label">Objetivo de peso</div>
          <div class="actions">
            <button class="pill" onclick="app.openWeightModal()">+ Peso</button>
            <button class="icon-btn" onclick="app.openWeightModal()">✏️</button>
          </div>
        </div>

        <div class="weight-main">
          <div>
            <div class="weight-current">${current ? current+"kg actual" : "-- kg actual"} <span class="weight-percent">${this.weightProgress()}%</span></div>
            <div class="progress"><div style="width:${this.weightProgress()}%"></div></div>

            <div class="weight-values">
              <div><b class="green">${lost}kg</b><br><small>Perdidos</small></div>
              <div><b class="blue">${missing}kg</b><br><small>Faltan</small></div>
            </div>
          </div>

          <div class="goal-box">
            <small>Objetivo</small>
            <b>${goal}</b>
            <small>kg</small>
          </div>
        </div>
      </section>

      <div class="section-head">
        <div class="label">Últimos entrenamientos</div>
        <button class="pill" onclick="app.exportCSV()">Exportar</button>
      </div>

      ${this.renderLastSessions()}
    `;
  },

  renderLastSessions(){
    if(!this.db.sessions.length){
      return `<div class="card empty">Aún no hay entrenamientos registrados.</div>`;
    }

    return this.db.sessions.slice(-5).reverse().map(s=>`
      <section class="card train-card">
        <div class="train-icon">${s.type==="run" ? "⚡" : "💪"}</div>
        <div>
          <div class="train-title">${s.type==="run" ? "Carrera" : "Fuerza"}</div>
          <div class="sub">${this.relativeDate(s.date)}</div>
        </div>

        <div class="metrics">
          <div class="metric"><b>${s.time || "-"} min</b><small>Tiempo</small></div>
          <div class="metric"><b>${s.km || "-"} km</b><small>Distancia</small></div>
          <div class="metric"><b>${s.steps || "-"} </b><small>Pasos</small></div>
          <div class="metric"><b>${s.fc || "-"} bpm</b><small>FC media</small></div>
          <div class="metric"><b>${s.kcal || "-"} kcal</b><small>Calorías</small></div>
          <div class="metric"><b>${s.pace || "-"}</b><small>Ritmo</small></div>
        </div>
      </section>
    `).join("");
  },

  relativeDate(date){
    const d = new Date(date).toDateString();
    const t = new Date().toDateString();
    return d===t ? "Hoy" : new Date(date).toLocaleDateString("es-CL");
  },

  openWeightModal(){
    const current = this.lastWeight() || 98.7;
    const goal = this.db.goalWeight || 95;

    document.getElementById("modal").classList.remove("hidden");
    document.getElementById("modal").innerHTML = `
      <div class="modal-box">
        <div class="modal-title">Actualizar peso</div>
        <input id="weight-current" type="number" step="0.1" value="${current}" placeholder="Peso actual">
        <input id="weight-goal" type="number" step="0.1" value="${goal}" placeholder="Peso objetivo">
        <button class="btn" onclick="app.saveWeight()">Guardar</button>
        <button class="btn" style="background:#8E8E93" onclick="app.closeModal()">Cancelar</button>
      </div>
    `;
  },

  saveWeight(){
    const current = Number(document.getElementById("weight-current").value);
    const goal = Number(document.getElementById("weight-goal").value);

    if(current){
      if(!this.db.startWeight) this.db.startWeight = current;
      this.db.weights.push({value:current,date:new Date().toISOString()});
    }

    if(goal) this.db.goalWeight = goal;

    this.save();
    this.closeModal();
    this.renderAll();
  },

  closeModal(){
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("modal").innerHTML="";
  },

  renderEntrenamiento(){
    document.getElementById("entrenamiento").innerHTML = `
      <header class="app-header">
        <div class="brand">Entrenamiento</div>
        <div class="avatar">SR</div>
      </header>

      <section class="card">
        <div class="label">Añadir entrenamiento</div>
        <select id="train-type" onchange="app.renderTrainingFields()">
          <option value="run">Carrera</option>
          <option value="strength">Fuerza</option>
        </select>
        <div id="training-fields"></div>
        <button class="btn" onclick="app.saveTraining()">Guardar entrenamiento</button>
      </section>
    `;

    this.renderTrainingFields();
  },

  renderTrainingFields(){
    const type = document.getElementById("train-type")?.value;
    const box = document.getElementById("training-fields");
    if(!box) return;

    box.innerHTML = type==="run" ? `
      <input id="km" type="number" step="0.1" placeholder="Distancia km">
      <input id="steps" type="number" placeholder="Pasos">
      <input id="time" type="number" placeholder="Tiempo total min">
      <input id="kcal" type="number" placeholder="Kcal">
      <input id="fc" type="number" placeholder="Frecuencia cardíaca media">
      <input id="date" type="date">
    ` : `
      <input id="time" type="number" placeholder="Tiempo total min">
      <input id="kcal" type="number" placeholder="Kcal">
      <input id="fc" type="number" placeholder="Frecuencia cardíaca media">
      <input id="date" type="date">
    `;
  },

  saveTraining(){
    const type = document.getElementById("train-type").value;
    const date = document.getElementById("date").value || new Date().toISOString();

    const data = {
      type,
      date:new Date(date).toISOString(),
      time:document.getElementById("time").value,
      kcal:document.getElementById("kcal").value,
      fc:document.getElementById("fc").value
    };

    if(type==="run"){
      data.km = document.getElementById("km").value;
      data.steps = document.getElementById("steps").value;
      data.pace = data.km && data.time ? (Number(data.time)/Number(data.km)).toFixed(2) : "";
    }

    this.db.sessions.push(data);
    this.save();
    this.renderAll();
    this.go("inicio", document.querySelector(".tab"));
  },

  renderPlan(){
    document.getElementById("plan").innerHTML = `
      <header class="app-header">
        <div class="brand">Plan semanal</div>
        <div class="avatar">SR</div>
      </header>

      <section class="card">
        <div class="label">Días de entrenamiento</div>
        <div class="plan-grid">
          ${["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(day=>{
            const p = this.db.plans.find(x=>x.day===day) || {};
            return `
              <div class="plan-day">
                <span>${day}</span>
                <input type="number" step="0.1" placeholder="km" value="${p.km || ""}" onchange="app.setPlanDay('${day}', this.value)">
                <button onclick="app.removePlanDay('${day}')">×</button>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  },

  setPlanDay(day, km){
    const existing = this.db.plans.find(x=>x.day===day);
    if(existing) existing.km = Number(km);
    else this.db.plans.push({day, km:Number(km)});
    this.save();
    this.renderInicio();
  },

  removePlanDay(day){
    this.db.plans = this.db.plans.filter(x=>x.day!==day);
    this.save();
    this.renderPlan();
    this.renderInicio();
  },

  renderProgress(){
    document.getElementById("progreso").innerHTML = `
      <header class="app-header">
        <div class="brand">Progreso</div>
        <div class="avatar">SR</div>
      </header>

      <section class="card">
        <div class="label">Resumen</div>
        <div class="metrics">
          <div class="metric"><b>${this.db.weights.length}</b><small>Pesos</small></div>
          <div class="metric"><b>${this.db.sessions.length}</b><small>Entrenos</small></div>
          <div class="metric"><b>${this.totalKmWeek().toFixed(1)}</b><small>Km semana</small></div>
        </div>
      </section>
    `;
  },

  exportCSV(){
    let csv = "tipo,fecha,km,tiempo,pasos,kcal,fc,ritmo\n";
    this.db.sessions.forEach(s=>{
      csv += `${s.type},${s.date},${s.km||""},${s.time||""},${s.steps||""},${s.kcal||""},${s.fc||""},${s.pace||""}\n`;
    });

    csv += "\nfecha,peso\n";
    this.db.weights.forEach(w=>csv += `${w.date},${w.value}\n`);

    navigator.clipboard.writeText(csv);
    alert("CSV copiado");
  }
};

window.onload = () => app.init();

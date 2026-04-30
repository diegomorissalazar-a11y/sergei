const app = {
  db:{
    profile:{
      userName:"Sergei",
      birthDate:"",
      height:""
    },
    goalWeight:95,
    startWeight:null,
    weights:[],
    sessions:[],
    plans:[],
    race:null
  },

  init(){
    this.load();
    this.renderAll();
  },

  save(){
    localStorage.setItem("sergei_pwa", JSON.stringify(this.db));
  },

  load(){
    const saved = localStorage.getItem("sergei_pwa");
    if(saved){
      const parsed = JSON.parse(saved);
      this.db = {
        ...this.db,
        ...parsed,
        profile:{...this.db.profile, ...(parsed.profile || {})}
      };
    }
  },

  go(id, el){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    if(el) el.classList.add("active");

    if(id === "progreso") this.renderProgress();
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
    const activePlan = this.activePlan();
    if(!activePlan || !activePlan.days.length) return 0;

    const trainedDays = new Set(
      this.weekSessions().map(s =>
        new Date(s.date).toLocaleDateString("es-CL",{weekday:"long"}).toLowerCase()
      )
    );

    const done = activePlan.days.filter(p=>trainedDays.has(p.day.toLowerCase())).length;
    return Math.round((done / activePlan.days.length) * 100);
  },

  streak(){
    return this.weekSessions().length ? 1 : 0;
  },

  bestWeek(){
    return Math.max(this.weekSessions().length, this.db.sessions.length ? 1 : 0);
  },

  activePlan(){
    if(!this.db.plans.length) return null;
    return this.db.plans[this.db.plans.length - 1];
  },

  weightProgress(){
    const current = this.lastWeight();
    const goal = this.db.goalWeight;
    const start = this.db.startWeight || current;

    if(!current || !goal || !start || start === goal) return 0;

    const pct = ((start - current) / (start - goal)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  },

  raceDaysLeft(){
    if(!this.db.race?.date) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [y,m,d] = this.db.race.date.split("-").map(Number);
    const raceDate = new Date(y, m - 1, d);

    const diff = Math.ceil((raceDate - today) / 86400000);
    return Math.max(0, diff);
  },

  renderInicio(){
    const current = this.lastWeight();
    const goal = this.db.goalWeight;
    const lost = current && this.db.startWeight ? (this.db.startWeight-current).toFixed(1) : "0.0";
    const missing = current ? Math.max(0,current-goal).toFixed(1) : "0.0";
    const activePlan = this.activePlan();

    document.getElementById("inicio").innerHTML = `
      <header class="app-header">
        <div>
          <div class="logo-word">SERGEI <span class="run">RUN</span><span class="version">v01</span></div>
        </div>
        <button class="avatar" onclick="app.openProfileModal()">S</button>
      </header>

      <div class="date">${this.today()}</div>
      <h1>Hola, ${this.db.profile.userName || "Sergei"} 👋</h1>

      ${activePlan ? `
        <section class="card">
          <div class="card-head">
            <div>
              <div class="label">Plan activo · ${activePlan.name}</div>
              <div class="card-title">${activePlan.days.length} días de entrenamiento</div>
              <div class="sub">${activePlan.days.map(d=>`${d.day} ${d.km}km`).join(" · ")}</div>
            </div>
            <button class="pill light" onclick="app.go('plan', document.querySelectorAll('.tab')[2])">Editar</button>
          </div>
          <div class="progress"><div style="width:${this.adherence()}%"></div></div>
        </section>
      ` : `
        <section class="card">
          <div class="label">Plan activo</div>
          <div class="card-title">Sin plan activo</div>
          <div class="sub">Crea tu planificación semanal para medir adherencia.</div>
          <button class="btn" onclick="app.openPlanModal()">Crear plan</button>
        </section>
      `}

      <section class="stats">
        <div class="stat"><b>${this.weekSessions().length}</b><span>Esta semana</span></div>
        <div class="stat"><b>${this.streak()}</b><span>Racha</span></div>
        <div class="stat"><b>${this.db.sessions.length}</b><span>Total</span></div>
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

      ${this.renderRaceCard()}

      <section class="card blue-card">
        <div class="label">Seguimiento semanal · ${new Date().getFullYear()}</div>
        <div>🥇 Mejor semana del año: <b>${this.bestWeek()} sesiones</b></div>
        <div>⚡ Racha actual: <b>${this.streak()} semanas seguidas</b></div>
        <div>Esta semana: <b>${this.weekSessions().length} sesiones</b></div>
      </section>

      <div class="section-head">
        <div class="label">Últimos entrenamientos</div>
        <button class="pill light" onclick="app.exportCSV()">Exportar</button>
      </div>

      ${this.renderLastSessions()}
    `;
  },

  renderRaceCard(){
    if(!this.db.race){
      return `
        <section class="card">
          <div class="card-head">
            <div>
              <div class="label">Carrera objetivo</div>
              <div class="card-title">Sin carrera cargada</div>
              <div class="sub">Agrega tu evento para activar la cuenta regresiva.</div>
            </div>
          </div>
          <button class="btn" onclick="app.openRaceModal()">Agregar carrera</button>
        </section>
      `;
    }

    const days = this.raceDaysLeft();

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <div class="label">Carrera objetivo</div>
            <div class="card-title">${this.db.race.name}</div>
            <div class="sub">${this.db.race.distance} km · ${this.formatDate(this.db.race.date)}</div>
          </div>
          <button class="pill light" onclick="app.openRaceModal()">Editar</button>
        </div>

        <div class="race-box" style="margin-top:12px">
          <div>
            <div class="sub">Cuenta regresiva a tu evento objetivo.</div>
            <div class="progress"><div style="width:${days !== null ? Math.max(5, Math.min(100, 100 - days)) : 0}%"></div></div>
          </div>
          <div class="days-counter">
            <b>${days}</b>
            <small>días</small>
          </div>
        </div>
      </section>
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
    return d === t ? "Hoy" : new Date(date).toLocaleDateString("es-CL");
  },

  formatDate(dateString){
    if(!dateString) return "";
    const [y,m,d] = dateString.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"});
  },

  openWeightModal(){
    const current = this.lastWeight() || 98.7;
    const goal = this.db.goalWeight || 95;

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Actualizar peso</div>
        <div class="modal-subtitle">Usa las ruedas para evitar escribir puntos o comas.</div>

        <div class="weight-picker-block">
          <div class="weight-picker-label">Peso actual</div>
          <div class="weight-picker">
            <div class="wheel" id="currentKgWheel"></div>
            <div class="wheel-unit">.</div>
            <div class="wheel" id="currentDecWheel"></div>
            <div class="wheel-unit">kg</div>
          </div>
        </div>

        <div class="weight-picker-block">
          <div class="weight-picker-label">Peso objetivo</div>
          <div class="weight-picker">
            <div class="wheel" id="goalKgWheel"></div>
            <div class="wheel-unit">.</div>
            <div class="wheel" id="goalDecWheel"></div>
            <div class="wheel-unit">kg</div>
          </div>
        </div>

        <button class="btn" onclick="app.saveWeightFromWheels()">Guardar peso</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);

    this.buildWeightWheel("currentKgWheel", 80, 150, Math.floor(current));
    this.buildWeightWheel("currentDecWheel", 0, 9, Math.round((current - Math.floor(current)) * 10));
    this.buildWeightWheel("goalKgWheel", 80, 150, Math.floor(goal));
    this.buildWeightWheel("goalDecWheel", 0, 9, Math.round((goal - Math.floor(goal)) * 10));
  },

  buildWeightWheel(id, min, max, selected){
    const el = document.getElementById(id);
    el.innerHTML = "";

    for(let i=min; i<=max; i++){
      const item = document.createElement("div");
      item.className = "wheel-item";
      item.textContent = i;
      el.appendChild(item);
    }

    setTimeout(()=>{
      el.scrollTop = (selected - min) * 42;
    }, 30);
  },

  getWheelValue(id, min){
    const el = document.getElementById(id);
    return min + Math.round(el.scrollTop / 42);
  },

  saveWeightFromWheels(){
    const currentKg = this.getWheelValue("currentKgWheel",80);
    const currentDec = this.getWheelValue("currentDecWheel",0);
    const goalKg = this.getWheelValue("goalKgWheel",80);
    const goalDec = this.getWheelValue("goalDecWheel",0);

    const current = Number(`${currentKg}.${currentDec}`);
    const goal = Number(`${goalKg}.${goalDec}`);

    if(!this.db.startWeight) this.db.startWeight = current;

    this.db.weights.push({
      value:current,
      date:new Date().toISOString()
    });

    this.db.goalWeight = goal;

    this.save();
    this.closeModal();
    this.renderAll();
  },

  openRaceModal(){
    const race = this.db.race || {name:"",date:"",distance:""};

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Carrera objetivo</div>
        <div class="modal-subtitle">Carga tu evento para activar la cuenta regresiva.</div>

        <input id="race-name" placeholder="Nombre del evento" value="${race.name || ""}">
        <input id="race-date" type="date" value="${race.date || ""}">
        <input id="race-distance" type="number" step="0.1" placeholder="Distancia km" value="${race.distance || ""}">

        <button class="btn" onclick="app.saveRace()">Guardar carrera</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },

  saveRace(){
    const name = document.getElementById("race-name").value.trim();
    const date = document.getElementById("race-date").value;
    const distance = document.getElementById("race-distance").value;

    if(!name || !date || !distance){
      alert("Completa nombre, fecha y distancia.");
      return;
    }

    this.db.race = {
      name,
      date,
      distance:Number(distance)
    };

    this.save();
    this.closeModal();
    this.renderAll();
  },

  openProfileModal(){
    const p = this.db.profile;

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Perfil</div>
        <div class="modal-subtitle">Configura tus datos personales y exporta tu información.</div>

        <input id="profile-name" placeholder="Nombre visible" value="${p.userName || "Sergei"}">
        <input id="profile-birth" type="date" value="${p.birthDate || ""}">
        <input id="profile-height" type="number" placeholder="Estatura cm" value="${p.height || ""}">

        <button class="btn" onclick="app.saveProfile()">Guardar perfil</button>
        <button class="btn secondary" onclick="app.exportFullData()">Exportar data completa</button>
        <button class="btn danger" onclick="app.logout()">Cerrar sesión</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },

  saveProfile(){
    this.db.profile.userName = document.getElementById("profile-name").value.trim() || "Sergei";
    this.db.profile.birthDate = document.getElementById("profile-birth").value;
    this.db.profile.height = document.getElementById("profile-height").value;

    this.save();
    this.closeModal();
    this.renderAll();
  },

  exportFullData(){
    const data = JSON.stringify(this.db, null, 2);
    navigator.clipboard.writeText(data);
    alert("Data completa copiada en formato JSON.");
  },

  logout(){
    const ok = confirm("¿Cerrar sesión local? No se borrará tu data guardada, solo se cerrará este panel.");
    if(ok) this.closeModal();
  },

  renderEntrenamiento(){
    document.getElementById("entrenamiento").innerHTML = `
      <header class="app-header">
        <div class="logo-word">ENTRENAR</div>
        <button class="avatar" onclick="app.openProfileModal()">S</button>
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
    const activePlan = this.activePlan();

    document.getElementById("plan").innerHTML = `
      <header class="app-header">
        <div class="logo-word">PLAN</div>
        <button class="avatar" onclick="app.openProfileModal()">S</button>
      </header>

      ${activePlan ? `
        <section class="card">
          <div class="card-head">
            <div>
              <div class="label">${activePlan.name}</div>
              <div class="card-title">${activePlan.days.length} días cargados</div>
              <div class="sub">${activePlan.days.map(d=>`${d.day} · ${d.km} km`).join(" / ")}</div>
            </div>
            <button class="pill" onclick="app.openPlanModal()">Nuevo plan</button>
          </div>
        </section>
      ` : `
        <section class="card empty">
          <div class="card-title">No hay plan semanal cargado.</div>
          <div class="sub">Crea una semana para comenzar a medir adherencia.</div>
          <button class="btn" onclick="app.openPlanModal()">Crear plan</button>
        </section>
      `}

      <section class="card">
        <div class="label">Historial de planes</div>
        ${this.db.plans.length ? this.db.plans.map(p=>`
          <div class="plan-day">
            <span>✓</span>
            <div>
              <b>${p.name}</b>
              <div class="sub">${p.days.length} días</div>
            </div>
            <span>${p.days.reduce((a,d)=>a+Number(d.km||0),0)} km</span>
          </div>
        `).join("") : `<div class="empty">Sin planes guardados.</div>`}
      </section>
    `;
  },

  openPlanModal(){
    const nextNumber = this.db.plans.length + 1;
    const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Crear plan semanal</div>
        <div class="modal-subtitle">Selecciona los días y luego ingresa kilómetros objetivo.</div>

        <input id="plan-name" value="Plan semana ${nextNumber}" placeholder="Nombre del plan">

        <div class="plan-list">
          ${days.map(day=>`
            <div class="plan-day">
              <button class="check" id="check-${day}" onclick="app.togglePlanDay('${day}')">✓</button>
              <span>${day}</span>
              <input id="km-${day}" type="number" step="0.1" placeholder="km" disabled>
            </div>
          `).join("")}
        </div>

        <button class="btn" onclick="app.savePlanFromModal()">Guardar plan</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },

  togglePlanDay(day){
    const check = document.getElementById(`check-${day}`);
    const input = document.getElementById(`km-${day}`);

    const isOn = check.classList.toggle("on");
    input.disabled = !isOn;
    if(isOn) input.focus();
    else input.value = "";
  },

  savePlanFromModal(){
    const name = document.getElementById("plan-name").value.trim() || `Plan semana ${this.db.plans.length + 1}`;
    const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

    const selected = days
      .filter(day => document.getElementById(`check-${day}`).classList.contains("on"))
      .map(day => ({
        day,
        km:Number(document.getElementById(`km-${day}`).value || 0)
      }))
      .filter(d => d.km > 0);

    if(!selected.length){
      alert("Selecciona al menos un día e ingresa kilómetros.");
      return;
    }

    this.db.plans.push({
      id:Date.now(),
      name,
      createdAt:new Date().toISOString(),
      days:selected
    });

    this.save();
    this.closeModal();
    this.renderAll();
  },

  renderProgress(){
    document.getElementById("progreso").innerHTML = `
      <header class="app-header">
        <div class="logo-word">PROGRESO</div>
        <button class="avatar" onclick="app.openProfileModal()">S</button>
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
  },

  showModal(html){
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");
    modal.innerHTML = html;
  },

  closeModal(){
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("modal").innerHTML = "";
  }
};

window.onload = () => app.init();

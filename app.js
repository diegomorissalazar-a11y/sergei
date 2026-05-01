const app = {
  db:{
    profile:{
      userName:"Sergei",
      birthDate:"",
      height:""
    },
    nutrition:{
      source:"25-03 Programa Nutricional - Sergio Espinoza MARATON 2025.pdf",
      planName:"Plan Alimentario Nutricional",
      athleteName:"Sergio Espinoza",
      age:31,
      baselineWeight:113,
      bodyFatPercent:24.94,
      objective:"Maratón STGO · Recomposición corporal · disminución % graso · rendimiento running",
      baseCalories:1898,
      baseCarbs:235,
      baseFat:43,
      baseProtein:143,
      trainingDayCalories:1878,
      trainingDayCarbs:222,
      trainingDayFat:42,
      trainingDayProtein:153,
      intenseDayCalories:2335,
      intenseDayCarbs:265,
      intenseDayFat:71,
      intenseDayProtein:153
    },
    goalWeight:95,
    startWeight:null,
    weights:[],
    sessions:[],
    plans:[],
    race:null
  },

  charts:{},
  progressRange:"4",

  init(){
    this.load();
    this.ensureNutritionDefaults();
    this.renderAll();
  },

  ensureNutritionDefaults(){
    const defaults = {
      source:"25-03 Programa Nutricional - Sergio Espinoza MARATON 2025.pdf",
      planName:"Plan Alimentario Nutricional",
      athleteName:"Sergio Espinoza",
      age:31,
      baselineWeight:113,
      bodyFatPercent:24.94,
      objective:"Maratón STGO · Recomposición corporal · disminución % graso · rendimiento running",
      baseCalories:1898,
      baseCarbs:235,
      baseFat:43,
      baseProtein:143,
      trainingDayCalories:1878,
      trainingDayCarbs:222,
      trainingDayFat:42,
      trainingDayProtein:153,
      intenseDayCalories:2335,
      intenseDayCarbs:265,
      intenseDayFat:71,
      intenseDayProtein:153
    };

    this.db.nutrition = {
      ...defaults,
      ...(this.db.nutrition || {})
    };

    this.save();
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
        profile:{...this.db.profile, ...(parsed.profile || {})},
        nutrition:{...this.db.nutrition, ...(parsed.nutrition || {})}
      };
    }
  },

  go(id, el){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    if(el) el.classList.add("active");

    if(id === "progreso"){
      this.renderProgress();
      setTimeout(()=>this.drawProgressCharts(),80);
    }
  },

  header(){
    return `
      <header class="app-header">
        <div class="logo-wrap">
          <img src="assets/logo-sergei-run.png" alt="SERGEI RUN" class="logo-image">
        </div>
        <button class="avatar" onclick="app.openProfileModal()">S</button>
      </header>
    `;
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

  dateInputToISO(dateString){
    if(!dateString) return new Date().toISOString();
    const [y,m,d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).toISOString();
  },

  lastWeight(){
    return this.db.weights.length ? this.db.weights[this.db.weights.length-1].value : null;
  },

  baselineDiff(){
    const current = this.lastWeight();
    const baseline = Number(this.db.nutrition?.baselineWeight || 0);
    if(!current || !baseline) return null;
    return Number((current - baseline).toFixed(1));
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

  activePlan(){
    if(!this.db.plans.length) return null;
    return this.db.plans[this.db.plans.length - 1];
  },

  dayNumber(dayName){
    const map = {
      "lunes":1,
      "martes":2,
      "miércoles":3,
      "miercoles":3,
      "jueves":4,
      "viernes":5,
      "sábado":6,
      "sabado":6,
      "domingo":7
    };

    return map[String(dayName || "").toLowerCase()] || 0;
  },

  planDueDaysUntilToday(){
    const activePlan = this.activePlan();
    if(!activePlan || !activePlan.days.length) return [];

    const todayNumber = new Date().getDay() || 7;

    return activePlan.days.filter(d => this.dayNumber(d.day) <= todayNumber);
  },

  completedDuePlanDays(){
    const activePlan = this.activePlan();
    if(!activePlan || !activePlan.days.length) return [];

    const dueDays = this.planDueDaysUntilToday().map(d => d.day);

    const completedDays = new Set(
      this.weekSessions()
        .filter(s => s.fromPlan === true && s.planName === activePlan.name)
        .filter(s => dueDays.includes(s.planDay))
        .map(s => s.planDay)
    );

    return [...completedDays];
  },

  adherenceToDate(){
    const due = this.planDueDaysUntilToday();
    if(!due.length) return 0;

    const done = this.completedDuePlanDays().length;
    return Math.round((done / due.length) * 100);
  },

  weeklyAdherence(){
    const activePlan = this.activePlan();
    if(!activePlan || !activePlan.days.length) return 0;

    const completedDays = new Set(
      this.weekSessions()
        .filter(s => s.fromPlan === true && s.planName === activePlan.name)
        .map(s => s.planDay)
    );

    const done = activePlan.days.filter(d => completedDays.has(d.day)).length;
    return Math.round((done / activePlan.days.length) * 100);
  },

  adherence(){
    return this.adherenceToDate();
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

  formatDuration(seconds){
    seconds = Number(seconds || 0);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  },

  formatPace(totalSeconds, km){
    if(!totalSeconds || !km) return "";
    const paceSec = Math.round(Number(totalSeconds) / Number(km));
    const min = Math.floor(paceSec / 60);
    const sec = paceSec % 60;
    return `${min}'${String(sec).padStart(2,"0")}"/km`;
  },

  formatSpeed(totalSeconds, km){
    if(!totalSeconds || !km) return "";
    const hours = Number(totalSeconds) / 3600;
    return (Number(km) / hours).toFixed(2);
  },

  normalizeRunMetrics(raw){
    const km = Number(raw.km || 0);
    const timeSeconds = Number(raw.timeSeconds || 0);
    const steps = Number(raw.steps || 0);

    const pace = km && timeSeconds ? this.formatPace(timeSeconds, km) : "";
    const speed = km && timeSeconds ? this.formatSpeed(timeSeconds, km) : "";

    const cadence = steps && timeSeconds
      ? Math.round(steps / (timeSeconds / 60))
      : "";

    const strideLength = km && steps
      ? Math.round((km * 100000) / steps)
      : "";

    return {
      ...raw,
      km:raw.km || "",
      timeSeconds,
      durationLabel:this.formatDuration(timeSeconds),
      time:this.formatDuration(timeSeconds),
      pace,
      speed,
      kcal:raw.kcal || "",
      steps:raw.steps || "",
      fc:raw.fc || raw.avgHr || "",
      avgHr:raw.fc || raw.avgHr || "",
      cadence,
      strideLength
    };
  },

  renderInicio(){
    const current = this.lastWeight();
    const goal = this.db.goalWeight;
    const lost = current && this.db.startWeight ? (this.db.startWeight-current).toFixed(1) : "0.0";
    const missing = current ? Math.max(0,current-goal).toFixed(1) : "0.0";
    const activePlan = this.activePlan();
    const dueDays = this.planDueDaysUntilToday();
    const doneDue = this.completedDuePlanDays();
    const baselineDiff = this.baselineDiff();

    document.getElementById("inicio").innerHTML = `
      ${this.header()}

      <div class="date">${this.today()}</div>
      <h1>Hola, ${this.db.profile.userName || "Sergei"} 👋</h1>

      ${activePlan ? `
        <section class="card">
          <div class="card-head">
            <div>
              <div class="label">Plan activo · ${activePlan.name}</div>
              <div class="card-title">${doneDue.length} de ${dueDays.length} vencidos · ${this.adherenceToDate()}%</div>
              <div class="sub">${activePlan.days.map(d=>`${d.day} ${d.km}km`).join(" · ")}</div>
            </div>
            <button class="pill light" onclick="app.go('plan', document.querySelectorAll('.tab')[2])">Editar</button>
          </div>
          <div class="progress"><div style="width:${this.adherenceToDate()}%"></div></div>
          <div class="sub" style="margin-top:10px;">Adherencia al día. Semanal total: ${this.weeklyAdherence()}%</div>
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
        <div class="stat"><b>${this.weekSessions().length}</b><span>Semana</span></div>
        <div class="stat"><b>${this.adherenceToDate()}%</b><span>Adherencia</span></div>
        <div class="stat"><b>${this.streak()}</b><span>Racha</span></div>
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

            <div class="sub" style="margin-top:10px;">
              Peso pauta nutricional: ${this.db.nutrition.baselineWeight} kg
              ${baselineDiff !== null ? ` · Desde pauta: ${baselineDiff > 0 ? "+" : ""}${baselineDiff} kg` : ""}
            </div>
          </div>

          <div class="goal-box">
            <small>Objetivo</small>
            <b>${goal}</b>
            <small>kg</small>
          </div>
        </div>
      </section>

      ${this.renderNutritionCard()}

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

  renderNutritionCard(){
    const n = this.db.nutrition;

    return `
      <section class="card nutrition-card">
        <div class="card-head">
          <div>
            <div class="label">Pauta nutricional</div>
            <div class="card-title">${n.planName}</div>
            <div class="sub">${n.objective}</div>
          </div>
          <button class="pill light" onclick="app.openNutritionModal()">Editar</button>
        </div>

        <div class="nutrition-grid">
          <div class="nutri-mini"><b>${n.baselineWeight} kg</b><span>Peso pauta</span></div>
          <div class="nutri-mini"><b>${n.bodyFatPercent}%</b><span>% graso</span></div>
          <div class="nutri-mini"><b>${n.baseCalories}</b><span>Kcal base</span></div>
          <div class="nutri-mini"><b>${n.baseProtein} g</b><span>Proteína</span></div>
        </div>
      </section>
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

    return this.db.sessions.slice(-5).reverse().map((s)=>{
      const idx = this.db.sessions.indexOf(s);
      return `
        <section class="card train-card">
          <div class="train-icon">${s.type==="run" ? "⚡" : "💪"}</div>
          <div>
            <div class="train-title">${s.type==="run" ? "Carrera" : "Fuerza"}</div>
            <div class="sub">${this.relativeDate(s.date)}</div>
          </div>

          <div class="metrics">
            <div class="metric"><b>${s.durationLabel || s.time || "-"} </b><small>Duración</small></div>
            <div class="metric"><b>${s.km || "-"} km</b><small>Distancia</small></div>
            <div class="metric"><b>${s.pace || "-"}</b><small>Ritmo</small></div>
            <div class="metric"><b>${s.speed || "-"} km/h</b><small>Velocidad</small></div>
            <div class="metric"><b>${s.steps || "-"} </b><small>Pasos</small></div>
            <div class="metric"><b>${s.fc || s.avgHr || "-"} ppm</b><small>FC media</small></div>
            <div class="metric"><b>${s.kcal || "-"} kcal</b><small>Calorías</small></div>
            <div class="metric"><b>${s.cadence || "-"} </b><small>Cadencia</small></div>
            <div class="metric"><b>${s.strideLength || "-"} cm</b><small>Zancada</small></div>
          </div>

          <div class="session-actions">
            <button class="mini-btn" onclick="app.openEditSessionModal(${idx})">Editar</button>
          </div>
        </section>
      `;
    }).join("");
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

  renderEntrenamiento(){
    const activePlan = this.activePlan();

    document.getElementById("entrenamiento").innerHTML = `
      ${this.header()}

      <button class="free-session" onclick="app.openFreeSessionModal()">
        + SESIÓN LIBRE
      </button>

      <div class="label" style="margin-bottom:14px;">Mis rutinas</div>

      ${
        activePlan && activePlan.days.length
        ? `<div class="routine-list">
            ${activePlan.days.map((day, index) => this.renderRoutineCard(day, index, activePlan)).join("")}
          </div>`
        : `<section class="card empty">
            <div class="card-title">No hay plan activo.</div>
            <div class="sub">Crea un plan semanal para ver tus rutinas aquí.</div>
            <button class="btn" onclick="app.openPlanModal()">Crear plan</button>
          </section>`
      }
    `;
  },

  renderRoutineCard(day, index, plan){
    const completed = this.findCompletedPlanSession(day.day, plan.name);
    const isDone = !!completed;
    const diff = completed?.diffKm ? Number(completed.diffKm) : null;

    return `
      <section class="routine-card ${isDone ? "done" : ""}">
        <div class="routine-body">
          <div class="routine-header">
            <div class="routine-number">${index + 1}</div>

            <div>
              <div class="routine-title">${day.day} — Carrera</div>
              <div class="routine-sub">Objetivo: ${day.km} km · ${plan.name}</div>
            </div>

            ${isDone ? `<div class="routine-status">✓ COMPLETADO</div>` : `<div class="dots">...</div>`}
          </div>

          <div class="routine-tags">
            <span class="tag plan">👟 Carrera</span>
            <span class="tag">${day.km} km</span>
            <span class="tag blue-tag">⏱ Tiempo con rueda</span>
            <span class="tag">📊 ${plan.name}</span>
          </div>

          ${isDone ? `
            <div class="completed-pill">✓ Entrenamiento completado</div>
            ${diff !== null ? `<div class="diff-pill ${diff >= 0 ? "pos" : "neg"}">${diff >= 0 ? "+" : ""}${diff.toFixed(1)} km vs plan</div>` : ""}
          ` : ""}
        </div>

        <div class="routine-note">
          ✦ Carga plan: ${day.day} / Carrera ${day.km} km
        </div>

        ${
          isDone
          ? `<button class="routine-action done-action" disabled>✓ COMPLETADO</button>`
          : `<button class="routine-action" onclick="app.openCompletePlanModal(${index})">▶ COMPLETAR</button>`
        }
      </section>
    `;
  },

  findCompletedPlanSession(dayName, planName){
    return this.weekSessions().find(s =>
      s.type === "run" &&
      s.fromPlan === true &&
      s.planDay === dayName &&
      s.planName === planName
    );
  },

  openCompletePlanModal(index){
    const plan = this.activePlan();
    if(!plan) return;

    const day = plan.days[index];

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Completar entrenamiento</div>
        <div class="modal-subtitle">${day.day} · Objetivo ${day.km} km · ${plan.name}</div>

        <input id="complete-date" type="date" value="${new Date().toISOString().slice(0,10)}">
        <input id="complete-km" type="number" step="0.1" placeholder="Distancia real km" value="${day.km}">

        ${this.timeWheelHTML("complete", "Duración")}

        <input id="complete-steps" type="number" placeholder="Pasos">
        <input id="complete-kcal" type="number" placeholder="Calorías kcal">
        <input id="complete-fc" type="number" placeholder="Frecuencia cardíaca media ppm">

        <button class="btn" onclick="app.saveCompletedPlanSession(${index})">Guardar entrenamiento</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);

    this.buildTimeWheels("complete", 0);
  },

  saveCompletedPlanSession(index){
    const plan = this.activePlan();
    if(!plan) return;

    const day = plan.days[index];

    const km = document.getElementById("complete-km").value;
    const totalSeconds = this.getTimeFromWheels("complete");
    const date = document.getElementById("complete-date").value || new Date().toISOString().slice(0,10);

    if(!km || totalSeconds <= 0){
      alert("Ingresa distancia y tiempo.");
      return;
    }

    const session = this.normalizeRunMetrics({
      type:"run",
      fromPlan:true,
      planName:plan.name,
      planDay:day.day,
      plannedKm:day.km,
      km,
      timeSeconds:totalSeconds,
      steps:document.getElementById("complete-steps").value,
      kcal:document.getElementById("complete-kcal").value,
      fc:document.getElementById("complete-fc").value,
      date:this.dateInputToISO(date),
      diffKm:(Number(km) - Number(day.km)).toFixed(1)
    });

    this.db.sessions.push(session);

    this.save();
    this.closeModal();
    this.renderAll();
    this.go("entrenamiento", document.querySelectorAll(".tab")[1]);
  },

  openEditSessionModal(index){
    const s = this.db.sessions[index];
    if(!s) return;

    const isRun = s.type === "run";
    const totalSeconds = Number(s.timeSeconds || 0);
    const dateValue = new Date(s.date).toISOString().slice(0,10);

    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Editar entrenamiento</div>
        <div class="modal-subtitle">${isRun ? "Carrera" : "Fuerza"} · ${this.relativeDate(s.date)}</div>

        <input id="edit-date" type="date" value="${dateValue}">

        ${isRun ? `
          <input id="edit-km" type="number" step="0.1" placeholder="Distancia km" value="${s.km || ""}">
        ` : ""}

        ${this.timeWheelHTML("edit", "Duración")}

        ${isRun ? `
          <input id="edit-steps" type="number" placeholder="Pasos" value="${s.steps || ""}">
        ` : ""}

        <input id="edit-kcal" type="number" placeholder="Calorías kcal" value="${s.kcal || ""}">
        <input id="edit-fc" type="number" placeholder="Frecuencia cardíaca media ppm" value="${s.fc || s.avgHr || ""}">

        <button class="btn" onclick="app.saveEditedSession(${index})">Guardar cambios</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);

    this.buildTimeWheels("edit", totalSeconds);
  },

  saveEditedSession(index){
    const old = this.db.sessions[index];
    if(!old) return;

    const totalSeconds = this.getTimeFromWheels("edit");
    const date = document.getElementById("edit-date").value || new Date().toISOString().slice(0,10);

    if(totalSeconds <= 0){
      alert("Ingresa duración.");
      return;
    }

    let updated = {
      ...old,
      date:this.dateInputToISO(date),
      timeSeconds:totalSeconds,
      durationLabel:this.formatDuration(totalSeconds),
      time:this.formatDuration(totalSeconds),
      kcal:document.getElementById("edit-kcal").value,
      fc:document.getElementById("edit-fc").value,
      avgHr:document.getElementById("edit-fc").value
    };

    if(old.type === "run"){
      const km = document.getElementById("edit-km").value;

      updated = this.normalizeRunMetrics({
        ...updated,
        km,
        steps:document.getElementById("edit-steps").value,
        diffKm:old.plannedKm ? (Number(km) - Number(old.plannedKm)).toFixed(1) : ""
      });
    }

    this.db.sessions[index] = updated;
    this.save();
    this.closeModal();
    this.renderAll();
  },

  openFreeSessionModal(){
    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Sesión libre</div>
        <div class="modal-subtitle">Entrenamiento fuera del plan semanal.</div>

        <select id="free-type" onchange="app.renderFreeSessionFields()">
          <option value="run">Carrera</option>
          <option value="strength">Fuerza</option>
        </select>

        <div id="free-fields"></div>

        <button class="btn" onclick="app.saveFreeSession()">Guardar sesión libre</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);

    this.renderFreeSessionFields();
  },

  renderFreeSessionFields(){
    const type = document.getElementById("free-type")?.value;
    const box = document.getElementById("free-fields");
    if(!box) return;

    box.innerHTML = type === "run" ? `
      <input id="free-date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <input id="free-km" type="number" step="0.1" placeholder="Distancia km">
      <input id="free-steps" type="number" placeholder="Pasos">
      ${this.timeWheelHTML("free", "Duración")}
      <input id="free-kcal" type="number" placeholder="Calorías kcal">
      <input id="free-fc" type="number" placeholder="Frecuencia cardíaca media ppm">
    ` : `
      <input id="free-date" type="date" value="${new Date().toISOString().slice(0,10)}">
      ${this.timeWheelHTML("free", "Duración")}
      <input id="free-kcal" type="number" placeholder="Calorías kcal">
      <input id="free-fc" type="number" placeholder="Frecuencia cardíaca media ppm">
    `;

    this.buildTimeWheels("free", 0);
  },

  saveFreeSession(){
    const type = document.getElementById("free-type").value;
    const date = document.getElementById("free-date").value || new Date().toISOString().slice(0,10);
    const totalSeconds = this.getTimeFromWheels("free");

    if(totalSeconds <= 0){
      alert("Ingresa la duración.");
      return;
    }

    let session = {
      type,
      fromPlan:false,
      date:this.dateInputToISO(date),
      timeSeconds:totalSeconds,
      durationLabel:this.formatDuration(totalSeconds),
      time:this.formatDuration(totalSeconds),
      kcal:document.getElementById("free-kcal").value,
      fc:document.getElementById("free-fc").value,
      avgHr:document.getElementById("free-fc").value
    };

    if(type === "run"){
      session = this.normalizeRunMetrics({
        ...session,
        km:document.getElementById("free-km").value,
        steps:document.getElementById("free-steps").value
      });
    }

    this.db.sessions.push(session);

    this.save();
    this.closeModal();
    this.renderAll();
    this.go("entrenamiento", document.querySelectorAll(".tab")[1]);
  },

  timeWheelHTML(prefix, label){
    return `
      <div class="time-picker-block">
        <div class="time-picker-label">${label}</div>
        <div class="time-picker">
          <div class="wheel" id="${prefix}HourWheel"></div>
          <div class="wheel-unit">h</div>
          <div class="wheel" id="${prefix}MinuteWheel"></div>
          <div class="wheel-unit">m</div>
          <div class="wheel" id="${prefix}SecondWheel"></div>
          <div class="wheel-unit">s</div>
        </div>
      </div>
    `;
  },

  buildTimeWheels(prefix, totalSeconds=0){
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    this.buildGenericWheel(`${prefix}HourWheel`, 0, 10, h);
    this.buildGenericWheel(`${prefix}MinuteWheel`, 0, 59, m);
    this.buildGenericWheel(`${prefix}SecondWheel`, 0, 59, s);
  },

  buildGenericWheel(id, min, max, selected){
    const el = document.getElementById(id);
    if(!el) return;

    el.innerHTML = "";

    for(let i=min; i<=max; i++){
      const item = document.createElement("div");
      item.className = "wheel-item";
      item.textContent = String(i).padStart(2,"0");
      el.appendChild(item);
    }

    setTimeout(()=>{
      el.scrollTop = (selected - min) * 42;
    }, 30);
  },

  getGenericWheelValue(id, min){
    const el = document.getElementById(id);
    return min + Math.round(el.scrollTop / 42);
  },

  getTimeFromWheels(prefix){
    const h = this.getGenericWheelValue(`${prefix}HourWheel`,0);
    const m = this.getGenericWheelValue(`${prefix}MinuteWheel`,0);
    const s = this.getGenericWheelValue(`${prefix}SecondWheel`,0);
    return (h * 3600) + (m * 60) + s;
  },

  renderPlan(){
    const activePlan = this.activePlan();

    document.getElementById("plan").innerHTML = `
      ${this.header()}

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

  setProgressRange(range){
    this.progressRange = range;
    this.renderProgress();
    setTimeout(()=>this.drawProgressCharts(),80);
  },

  renderProgress(){
    const data = this.getProgressData();
    const baselineDiff = this.baselineDiff();

    document.getElementById("progreso").innerHTML = `
      ${this.header()}

      <div class="range-filter">
        ${["4","6","8","all"].map(r=>`
          <button class="range-btn ${this.progressRange===r ? "active" : ""}" onclick="app.setProgressRange('${r}')">
            ${r==="all" ? "Todo" : r+" sem"}
          </button>
        `).join("")}
      </div>

      <section class="progress-kpis">
        <div class="kpi-card">
          <div class="kpi-label">Peso actual</div>
          <div class="kpi-value">${data.currentWeight || "--"} kg</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Desde pauta</div>
          <div class="kpi-value">${baselineDiff !== null ? `${baselineDiff > 0 ? "+" : ""}${baselineDiff}` : "--"} kg</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Mejor ritmo</div>
          <div class="kpi-value">${data.bestPace || "--"}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Adh. semana</div>
          <div class="kpi-value">${this.weeklyAdherence()}%</div>
        </div>
      </section>

      <section class="card nutrition-card">
        <div class="label">Pauta nutricional</div>
        <div class="card-title">${this.db.nutrition.baseCalories} kcal base · ${this.db.nutrition.baseProtein} g proteína</div>
        <div class="sub">CHO ${this.db.nutrition.baseCarbs} g · Grasas ${this.db.nutrition.baseFat} g · Peso pauta ${this.db.nutrition.baselineWeight} kg</div>
      </section>

      <section class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Peso histórico</div>
          <div class="sub">${data.weights.length} registros</div>
        </div>
        ${data.weights.length ? `<div class="chart-box"><canvas id="chartWeight"></canvas></div>` : `<div class="chart-empty">Aún no hay datos suficientes de peso.</div>`}
      </section>

      <section class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Km semanales</div>
          <div class="sub">Carga de entrenamiento</div>
        </div>
        ${data.weeklyKm.labels.length ? `<div class="chart-box"><canvas id="chartKm"></canvas></div>` : `<div class="chart-empty">Aún no hay entrenamientos con distancia.</div>`}
      </section>

      <section class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Ritmo promedio</div>
          <div class="sub">min/km por semana</div>
        </div>
        ${data.weeklyPace.labels.length ? `<div class="chart-box"><canvas id="chartPace"></canvas></div>` : `<div class="chart-empty">Aún no hay datos de ritmo.</div>`}
      </section>

      <section class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Adherencia semanal</div>
          <div class="sub">plan vs completado</div>
        </div>
        ${data.weeklyAdherence.labels.length ? `<div class="chart-box"><canvas id="chartAdherence"></canvas></div>` : `<div class="chart-empty">Crea un plan y completa entrenamientos para ver adherencia.</div>`}
      </section>
    `;

    setTimeout(()=>this.drawProgressCharts(),80);
  },

  getProgressData(){
    const since = this.getRangeStartDate();

    const sessions = this.db.sessions.filter(s => {
      if(!since) return true;
      return new Date(s.date) >= since;
    });

    const weights = this.db.weights.filter(w => {
      if(!since) return true;
      return new Date(w.date) >= since;
    });

    const runs = sessions.filter(s => s.type === "run" && Number(s.km) > 0);

    const bestPaceSession = runs
      .filter(s => s.timeSeconds && s.km)
      .sort((a,b)=>(Number(a.timeSeconds)/Number(a.km)) - (Number(b.timeSeconds)/Number(b.km)))[0];

    return {
      sessions,
      weights,
      currentWeight:this.lastWeight(),
      bestPace: bestPaceSession ? bestPaceSession.pace : "",
      weeklyKm:this.weeklyKmSeries(sessions),
      weeklyPace:this.weeklyPaceSeries(sessions),
      weeklyAdherence:this.weeklyAdherenceSeries(sessions)
    };
  },

  getRangeStartDate(){
    if(this.progressRange === "all") return null;
    const weeks = Number(this.progressRange || 4);
    const d = new Date();
    d.setDate(d.getDate() - weeks * 7);
    d.setHours(0,0,0,0);
    return d;
  },

  weekStart(date){
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0,0,0,0);
    return d;
  },

  weekLabel(date){
    const d = this.weekStart(date);
    return d.toLocaleDateString("es-CL",{day:"2-digit",month:"short"});
  },

  weeklyKmSeries(sessions){
    const map = {};

    sessions.forEach(s=>{
      const km = Number(s.km || 0);
      if(!km) return;

      const key = this.weekLabel(s.date);
      map[key] = (map[key] || 0) + km;
    });

    return {
      labels:Object.keys(map),
      values:Object.values(map).map(v=>Number(v.toFixed(1)))
    };
  },

  weeklyPaceSeries(sessions){
    const map = {};

    sessions.forEach(s=>{
      if(!s.timeSeconds || !s.km) return;

      const key = this.weekLabel(s.date);
      if(!map[key]) map[key] = {seconds:0, km:0};

      map[key].seconds += Number(s.timeSeconds);
      map[key].km += Number(s.km);
    });

    const labels = Object.keys(map);
    const values = labels.map(k=>{
      const paceSec = map[k].seconds / map[k].km;
      return Number((paceSec / 60).toFixed(2));
    });

    return {labels, values};
  },

  weeklyAdherenceSeries(sessions){
    const activePlan = this.activePlan();
    if(!activePlan || !activePlan.days.length) return {labels:[], values:[]};

    const map = {};

    sessions
      .filter(s=>s.fromPlan && s.planName === activePlan.name)
      .forEach(s=>{
        const key = this.weekLabel(s.date);
        if(!map[key]) map[key] = new Set();
        map[key].add(s.planDay);
      });

    const labels = Object.keys(map);
    const values = labels.map(k=>{
      return Math.round((map[k].size / activePlan.days.length) * 100);
    });

    return {labels, values};
  },

  destroyChart(name){
    if(this.charts[name]){
      this.charts[name].destroy();
      this.charts[name] = null;
    }
  },

  drawProgressCharts(){
    if(typeof Chart === "undefined") return;

    const data = this.getProgressData();

    this.destroyChart("weight");
    this.destroyChart("km");
    this.destroyChart("pace");
    this.destroyChart("adherence");

    const weightCanvas = document.getElementById("chartWeight");
    if(weightCanvas && data.weights.length){
      this.charts.weight = new Chart(weightCanvas,{
        type:"line",
        data:{
          labels:data.weights.map(w=>new Date(w.date).toLocaleDateString("es-CL",{day:"2-digit",month:"short"})),
          datasets:[
            {
              label:"Peso",
              data:data.weights.map(w=>Number(w.value)),
              borderColor:"#4A7FA5",
              backgroundColor:"rgba(74,127,165,.12)",
              tension:.35,
              fill:true,
              pointRadius:4
            },
            {
              label:"Objetivo",
              data:data.weights.map(()=>Number(this.db.goalWeight)),
              borderColor:"#6ECFBA",
              backgroundColor:"transparent",
              borderDash:[6,6],
              tension:0,
              fill:false,
              pointRadius:0,
              borderWidth:2
            },
            {
              label:"Peso pauta",
              data:data.weights.map(()=>Number(this.db.nutrition.baselineWeight)),
              borderColor:"#8A9BB0",
              backgroundColor:"transparent",
              borderDash:[2,6],
              tension:0,
              fill:false,
              pointRadius:0,
              borderWidth:2
            }
          ]
        },
        options:this.chartOptions("kg")
      });
    }

    const kmCanvas = document.getElementById("chartKm");
    if(kmCanvas && data.weeklyKm.labels.length){
      this.charts.km = new Chart(kmCanvas,{
        type:"bar",
        data:{
          labels:data.weeklyKm.labels,
          datasets:[{
            label:"Km",
            data:data.weeklyKm.values,
            backgroundColor:"#6ECFBA",
            borderRadius:8
          }]
        },
        options:this.chartOptions("km")
      });
    }

    const paceCanvas = document.getElementById("chartPace");
    if(paceCanvas && data.weeklyPace.labels.length){
      this.charts.pace = new Chart(paceCanvas,{
        type:"line",
        data:{
          labels:data.weeklyPace.labels,
          datasets:[{
            label:"Ritmo promedio",
            data:data.weeklyPace.values,
            borderColor:"#1E3A52",
            backgroundColor:"rgba(30,58,82,.08)",
            tension:.35,
            fill:true,
            pointRadius:4
          }]
        },
        options:this.chartOptions("min/km")
      });
    }

    const adhCanvas = document.getElementById("chartAdherence");
    if(adhCanvas && data.weeklyAdherence.labels.length){
      this.charts.adherence = new Chart(adhCanvas,{
        type:"bar",
        data:{
          labels:data.weeklyAdherence.labels,
          datasets:[{
            label:"Adherencia",
            data:data.weeklyAdherence.values,
            backgroundColor:"#7ABDE0",
            borderRadius:8
          }]
        },
        options:this.chartOptions("%", 100)
      });
    }
  },

  chartOptions(unit, max=null){
    return {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y} ${unit}`
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{color:"#8A9BB0", font:{size:11}}
        },
        y:{
          beginAtZero:false,
          suggestedMax:max || undefined,
          max:max || undefined,
          grid:{color:"rgba(138,155,176,.18)"},
          ticks:{
            color:"#8A9BB0",
            font:{size:11},
            callback:(value)=>`${value}${unit==="%" ? "%" : ""}`
          }
        }
      }
    };
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
    this.buildGenericWheel(id, min, max, selected);
  },

  getWheelValue(id, min){
    return this.getGenericWheelValue(id, min);
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

    this.db.race = {name,date,distance:Number(distance)};
    this.save();
    this.closeModal();
    this.renderAll();
  },

  openNutritionModal(){
    const n = this.db.nutrition;

    this.showModal(`
      <div class="modal-box compact">
        <div class="modal-title">Pauta nutricional</div>
        <div class="modal-subtitle">Datos base cargados desde la pauta PDF.</div>

        <div class="field-label">Peso pauta kg</div>
        <input id="nutri-weight" type="number" step="0.1" value="${n.baselineWeight || ""}">

        <div class="field-label">% graso pauta</div>
        <input id="nutri-fat-percent" type="number" step="0.01" value="${n.bodyFatPercent || ""}">

        <div class="field-label">Kcal base</div>
        <input id="nutri-kcal" type="number" value="${n.baseCalories || ""}">

        <div class="field-label">Carbohidratos g</div>
        <input id="nutri-carbs" type="number" value="${n.baseCarbs || ""}">

        <div class="field-label">Grasas g</div>
        <input id="nutri-fat" type="number" value="${n.baseFat || ""}">

        <div class="field-label">Proteína g</div>
        <input id="nutri-protein" type="number" value="${n.baseProtein || ""}">

        <button class="btn" onclick="app.saveNutrition()">Guardar pauta</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },

  saveNutrition(){
    this.db.nutrition.baselineWeight = Number(document.getElementById("nutri-weight").value || 0);
    this.db.nutrition.bodyFatPercent = Number(document.getElementById("nutri-fat-percent").value || 0);
    this.db.nutrition.baseCalories = Number(document.getElementById("nutri-kcal").value || 0);
    this.db.nutrition.baseCarbs = Number(document.getElementById("nutri-carbs").value || 0);
    this.db.nutrition.baseFat = Number(document.getElementById("nutri-fat").value || 0);
    this.db.nutrition.baseProtein = Number(document.getElementById("nutri-protein").value || 0);

    this.save();
    this.closeModal();
    this.renderAll();
  },

  openProfileModal(){
    const p = this.db.profile;

    this.showModal(`
      <div class="modal-box compact">
        <div class="profile-head">
          <div class="profile-avatar">S</div>
          <div>
            <div class="modal-title">Perfil</div>
            <div class="modal-subtitle">Datos personales y respaldo de información.</div>
          </div>
        </div>

        <div class="form-grid">
          <div class="field-label">Nombre visible</div>
          <input id="profile-name" placeholder="Nombre visible" value="${p.userName || "Sergei"}">

          <div class="field-label">Fecha de nacimiento</div>
          <input id="profile-birth" type="date" value="${p.birthDate || ""}">

          <div class="field-label">Estatura cm</div>
          <input id="profile-height" type="number" placeholder="Estatura cm" value="${p.height || ""}">
        </div>

        <button class="btn" onclick="app.saveProfile()">Guardar perfil</button>

        <div class="btn-row">
          <button class="btn secondary" onclick="app.exportFullData()">Exportar</button>
          <button class="btn danger" onclick="app.logout()">Cerrar sesión</button>
        </div>

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
    const ok = confirm("¿Cerrar sesión local? No se borrará tu data guardada.");
    if(ok) this.closeModal();
  },

  exportCSV(){
    let csv = "tipo,fecha,plan,plan_dia,km_plan,km_real,tiempo,segundos,pasos,kcal,fc,ritmo,velocidad,cadencia,zancada,diferencia_km\n";
    this.db.sessions.forEach(s=>{
      csv += `${s.type},${s.date},${s.planName||""},${s.planDay||""},${s.plannedKm||""},${s.km||""},${s.durationLabel||s.time||""},${s.timeSeconds||""},${s.steps||""},${s.kcal||""},${s.fc||s.avgHr||""},${s.pace||""},${s.speed||""},${s.cadence||""},${s.strideLength||""},${s.diffKm||""}\n`;
    });

    csv += "\nfecha,peso\n";
    this.db.weights.forEach(w=>csv += `${w.date},${w.value}\n`);

    csv += "\nPAUTA_NUTRICIONAL\n";
    csv += `peso_pauta,${this.db.nutrition.baselineWeight}\n`;
    csv += `porcentaje_graso,${this.db.nutrition.bodyFatPercent}\n`;
    csv += `kcal_base,${this.db.nutrition.baseCalories}\n`;
    csv += `carbohidratos_base,${this.db.nutrition.baseCarbs}\n`;
    csv += `grasas_base,${this.db.nutrition.baseFat}\n`;
    csv += `proteina_base,${this.db.nutrition.baseProtein}\n`;

    navigator.clipboard.writeText(csv);
    alert("CSV copiado");
  },

  showModal(html){
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");
    modal.innerHTML = html;
  },

  closeModal(){
    document.getElementBy

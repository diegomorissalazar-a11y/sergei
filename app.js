import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhe-I3OnC4l8QZXZE1g4oDirPaBOzpvF8",
  authDomain: "sergei-run.firebaseapp.com",
  databaseURL: "https://sergei-run-default-rtdb.firebaseio.com",
  projectId: "sergei-run",
  storageBucket: "sergei-run.firebasestorage.app",
  messagingSenderId: "1016340493761",
  appId: "1:1016340493761:web:9365302ac2ea602c24eb40"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDB = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

const app = {
  storageKey: 'sergei_run_pwa_v03',
  cloudStatus: 'local',
  cloudError: '',
  cloudUnsubscribe: null,
  cloudSaveTimer: null,
  cloudReady: false,
  cloudApplyingRemote: false,
  charts: {},
  progressRange: 4,
  nutritionView: 'registro',
  ideaFilter: 'desayuno',
  dayNames: ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],
  mealCatalog: [
    { id:'desayuno', name:'Desayuno', time:'08:00', icon:'🌞', target:'1 lácteo · 0.5 cereal · 3 carnes' },
    { id:'colacion_am', name:'Colación AM', time:'10:30', icon:'🍎', target:'Fruta / colación' },
    { id:'almuerzo', name:'Almuerzo', time:'13:00', icon:'🍽️', target:'320 g proteína + verduras' },
    { id:'colacion_pm', name:'Colación PM', time:'16:00', icon:'🥛', target:'Lácteo / fruta' },
    { id:'pre_entreno', name:'Pre-Entreno', time:'18:00', icon:'⚡', target:'Carbohidrato liviano' },
    { id:'cena', name:'Cena', time:'20:30', icon:'🌙', target:'Proteína + verduras' }
  ],
  medalCatalog: [
    { id:'mes-del-mar-10k', title:'Mes del Mar', distance:10, theme:'mar' },
    { id:'media-maraton-del-mar-21k', title:'Media Maratón del Mar', distance:21, theme:'mar' },
    { id:'nocturna-10k', title:'Nocturna', distance:10, theme:'noche' },
    { id:'amanecer-5k', title:'Amanecer', distance:5, theme:'amanecer' },
    { id:'trail-15k', title:'Trail', distance:15, theme:'trail' },
    { id:'reto-cumbre-21k', title:'Reto Cumbre', distance:21, theme:'cumbre' }
  ],

  init(){
    this.db = this.load();
    if(!this.db.startWeight && this.db.weights.length){
      this.db.startWeight = this.db.weights[0].value;
    }
    this.renderAll();
    this.bindGlobalEvents();
    this.setupCloudSync();
  },

  defaultDB(){
    return {
      profile: { userName:'Sergei', birthDate:'1994-03-22', height:'184' },
      sync: { enabled:true, syncId:'diego-sergei-run', cloudUpdatedAt:0, localUpdatedAt:Date.now() },
      goalWeight:90,
      startWeight:109,
      weights:[{ date:this.todayISO(), value:109 }],
      race:{ title:'', date:'', distance:'' },
      plans:[],
      sessions:[],
      completedRaces:[],
      nutrition:{
        patientName:'Diego Moris S.',
        period:'mar-may25',
        goal:'Bajar grasa manteniendo rendimiento',
        waterGoal:10,
        suggestions:{
          desayuno:[
            {title:'Proteico clásico',desc:'3 huevos + 1 pan molde + yogur protein + 60g jamón pavo',portions:'3 carnes + 0.5 cereal + 1 lácteo'},
            {title:'Avena + proteína',desc:'40g avena + yogur protein + 2 huevos + 30g jamón',portions:'0.5 cereal + 1 lácteo + 2 carnes'},
            {title:'Sándwich proteico',desc:'2 panes molde + 2 huevos + 60g pechuga pavo + yogur',portions:'1 cereal + 3 carnes + 1 lácteo'}
          ],
          almuerzo:[
            {title:'Corvina + arroz',desc:'320g corvina + 1 taza arroz + verduras',portions:'proteína + cereal + verduras'},
            {title:'Pollo + papas',desc:'280g pollo + papas cocidas + ensalada',portions:'proteína + cereal + verduras'}
          ],
          cena:[
            {title:'Omelette + ensalada',desc:'4 claras + 2 huevos + verduras salteadas',portions:'proteína + verduras'},
            {title:'Pescado liviano',desc:'250g pescado + verduras al horno',portions:'proteína + verduras'}
          ],
          pre_entreno:[
            {title:'Banana + yogur',desc:'1 plátano + 1 yogur protein',portions:'rápido y liviano'}
          ],
          colacion:[
            {title:'Fruta + queso',desc:'1 fruta + trozo de queso o yogur',portions:'colación simple'}
          ],
          pm:[
            {title:'Yogur / leche',desc:'1 yogur o vaso de leche descremada',portions:'lácteo'}
          ]
        },
        pauta:'Menú sugerido de descanso: D: Yogur + pan + 3 huevos · A: 320g corvina + brócoli + champiñones · C: 2 tortillas + pollo + rúcula + palta'
      },
      nutritionLogs:{},
      version:'0.3'
    };
  },

  load(){
    try{
      const saved = localStorage.getItem(this.storageKey);
      if(saved){
        const parsed = JSON.parse(saved);
        return { ...this.defaultDB(), ...parsed, profile:{...this.defaultDB().profile, ...(parsed.profile||{})}, sync:{...this.defaultDB().sync, ...(parsed.sync||{})}, nutrition:{...this.defaultDB().nutrition, ...(parsed.nutrition||{})} };
      }
    }catch(e){ console.error(e); }
    return this.defaultDB();
  },

  save(){
    if(!this.db.sync) this.db.sync = { enabled:true, syncId:'diego-sergei-run', cloudUpdatedAt:0, localUpdatedAt:0 };
    this.db.sync.localUpdatedAt = Date.now();
    localStorage.setItem(this.storageKey, JSON.stringify(this.db));
    this.scheduleCloudSave();
  },

  bindGlobalEvents(){
    const modal = document.getElementById('modal');
    modal.addEventListener('click', (e)=>{
      if(e.target === modal) this.closeModal();
    });
    window.addEventListener('beforeunload', ()=> this.save());
  },

  go(id, el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    if(id === 'progreso') setTimeout(()=>this.renderCharts(), 30);
    window.scrollTo({ top:0, behavior:'smooth' });
  },

  renderAll(skipSave = false){
    this.renderInicio();
    this.renderEntrenamiento();
    this.renderPlan();
    this.renderProgreso();
    this.renderNutricion();
    this.renderMedallas();
    if(document.getElementById('progreso').classList.contains('active')) setTimeout(()=>this.renderCharts(), 30);
    if(!skipSave) this.save();
  },

  header(medals=false){
    return `
      <div class="app-header">
        <div class="logo-wrap">
          <img src="assets/logo-sergei-run.png" alt="SERGEI RUN" class="${medals ? 'medal-logo':'logo-image'}">
        </div>
        <button class="avatar" onclick="app.openProfileModal()">${(this.db.profile.userName || 'S').trim().charAt(0).toUpperCase()}</button>
      </div>
    `;
  },

  renderInicio(){
    const page = document.getElementById('inicio');
    const today = new Date();
    const activePlan = this.getActivePlan();
    const due = this.getDuePlanMetrics(activePlan);
    const weekSessions = this.sessionsThisWeek();
    const latest = [...this.db.sessions].sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,3);
    const weight = this.latestWeight();
    const weightProgress = this.weightProgress();
    const habits = this.getHabitKPIs();
    const race = this.db.race;
    const days = race.date ? this.daysUntil(race.date) : null;

    page.innerHTML = `
      ${this.header()}
      <div class="date">${this.formatDateLong(today)}</div>
      <h1>Hola, ${this.db.profile.userName || 'Sergei'} 👋</h1>

      <section class="card">
        <div class="card-head">
          <div>
            <div class="label">Adherencia al plan</div>
            <div class="card-title">${due.doneDue} de ${due.dueCount} cumplidos · ${due.adherenceToDate}%</div>
            <div class="sub">${activePlan ? `${activePlan.name} · ${this.planSummary(activePlan)}` : 'Crea tu plan semanal desde la pestaña Plan.'}</div>
          </div>
          <button class="pill light" onclick="app.go('plan', document.querySelectorAll('.tab')[2])">Plan</button>
        </div>
        <div class="progress"><div style="width:${due.adherenceToDate}%"></div></div>
        <div class="kpi-grid">
          <div class="kpi-box"><small>Km cumplidos</small><b>${this.formatNumber(due.actualKm)} / ${this.formatNumber(due.plannedKmDue)}</b></div>
          <div class="kpi-box"><small>Diferencia</small><b class="${due.diffKm >= 0 ? 'green':'red'}">${due.diffKm >= 0 ? '+' : ''}${this.formatNumber(due.diffKm)} km</b></div>
        </div>
        <div class="sub">Adherencia al día. Cierre semanal total: ${due.weekClosure}%</div>
      </section>

      <section class="stats">
        <div class="stat"><b>${weekSessions.length}</b><span>Sesiones</span></div>
        <div class="stat"><b>${this.streakWeeks()}</b><span>Racha</span></div>
        <div class="stat"><b>${this.db.completedRaces.length}</b><span>Carreras</span></div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <div class="label">Hábitos clave</div>
            <div class="card-title">Resumen diario</div>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi-box"><small>Sin alcohol</small><b>${habits.daysWithoutAlcohol}</b></div>
          <div class="kpi-box"><small>Sin fuera de plan</small><b>${habits.daysWithoutOffPlan}</b></div>
          <div class="kpi-box"><small>Racha nutrición</small><b>${habits.nutritionStreak}</b></div>
          <div class="kpi-box"><small>Agua promedio</small><b>${habits.avgWater}</b></div>
        </div>
      </section>

      <section class="card">
        <div class="weight-head">
          <div>
            <div class="label">Objetivo de peso</div>
          </div>
          <div class="btn-row">
            <button class="pill" onclick="app.openWeightModal()">+ Peso</button>
            <button class="icon-btn" onclick="app.openGoalWeightModal()">✏️</button>
          </div>
        </div>
        <div class="weight-main">
          <div>
            <div class="weight-current"><span>${weight ? `${this.formatNumber(weight.value)}kg actual` : 'Sin peso actual'}</span><span class="weight-percent">${weightProgress.percent}%</span></div>
            <div class="progress"><div style="width:${weightProgress.percent}%"></div></div>
            <div class="weight-values">
              <div><b class="green">-${this.formatNumber(weightProgress.lost)}</b><small>Desde inicio</small></div>
              <div><b>${this.formatNumber(weightProgress.remaining)}</b><small>Faltan</small></div>
            </div>
            <div class="sub" style="margin-top:14px">Peso inicial registrado: ${this.formatNumber(this.db.startWeight || 0)} kg</div>
          </div>
          <div class="goal-box"><small>Objetivo</small><b>${this.formatNumber(this.db.goalWeight)}</b><small>kg</small></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <div class="label">Carrera objetivo</div>
            <div class="card-title">${race.title || 'Sin carrera objetivo'}</div>
            <div class="sub">${race.title ? `${race.distance}K · ${this.formatDateShort(race.date)}` : 'Agrega tu próxima carrera y activa el contador.'}</div>
          </div>
          <div class="btn-row">
            <button class="pill light" onclick="app.openRaceModal()">${race.title ? 'Editar':'Agregar'}</button>
            ${race.title ? `<button class="pill" onclick="app.openCompleteRaceModal()">Ya corrí</button>` : ''}
          </div>
        </div>
        <div class="race-box">
          <div class="sub">Cuenta regresiva usando fecha local de Santiago. Distancia total del evento y nombre visibles siempre.</div>
          <div class="days-counter"><b>${days === null ? '--' : days}</b><small>días</small></div>
        </div>
      </section>

      <section class="card blue-card">
        <div class="label">Seguimiento semanal · ${today.getFullYear()}</div>
        <div class="sub" style="margin-top:12px">🥇 Mejor semana del año: <b>${this.bestWeekSummary()}</b></div>
        <div class="sub" style="margin-top:6px">⚡ Racha actual: <b>${this.streakWeeks()} semanas seguidas</b></div>
        <div class="sub" style="margin-top:6px">🏃 Esta semana: <b>${weekSessions.length} sesiones</b></div>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <div class="label">Últimos entrenamientos</div>
          </div>
          <div class="btn-row">
            <button class="pill light" onclick="app.openExportModal()">Exportar</button>
          </div>
        </div>
        ${latest.length ? latest.map(s => this.trainingCard(s, true)).join('') : `<div class="empty">Todavía no tienes entrenamientos registrados.</div>`}
      </section>
    `;
  },

  trainingCard(session, withEdit=false){
    const icon = session.type === 'run' ? '⚡' : '🏋️';
    const title = session.title || `${this.weekdayName(session.date)} — ${session.type === 'run' ? 'Carrera' : 'Fuerza'}`;
    return `
      <div class="card" style="margin-top:14px">
        <div class="train-card">
          <div class="train-icon">${icon}</div>
          <div>
            <div class="train-title">${title}</div>
            <div class="sub">${this.relativeDay(session.date)} · ${session.fromPlan ? `${session.planName} / ${session.planDay}` : 'Sesión libre'}</div>
            <div class="metrics">
              <div class="metric"><b>${session.durationLabel || '--'}</b><small>Tiempo</small></div>
              <div class="metric"><b>${session.km ? `${this.formatNumber(session.km)} km` : '--'}</b><small>Distancia</small></div>
              <div class="metric"><b>${session.pace || '--'}</b><small>Ritmo</small></div>
              <div class="metric"><b>${session.steps || '--'}</b><small>Pasos</small></div>
              <div class="metric"><b>${session.fc || '--'}</b><small>FC media</small></div>
              <div class="metric"><b>${session.kcal || '--'}</b><small>Calorías</small></div>
            </div>
            ${withEdit ? `<div class="session-actions"><button class="mini-btn" onclick="app.openSessionModalForEdit('${session.id}')">Editar</button></div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  renderEntrenamiento(){
    const page = document.getElementById('entrenamiento');
    const activePlan = this.getActivePlan();
    const weekSessions = this.sessionsThisWeek();
    const planDays = activePlan ? activePlan.days.filter(d=>d.enabled) : [];
    page.innerHTML = `
      ${this.header()}
      <button class="free-session" onclick="app.openSessionModal()">+ Sesión libre</button>
      <div class="label" style="margin-bottom:10px">Mis rutinas</div>
      <div class="routine-list">
        ${planDays.length ? planDays.map((d, idx)=> this.planRoutineCard(activePlan, d, idx + 1)).join('') : `<div class="empty">Crea tu plan semanal para ver tus días de entrenamiento aquí.</div>`}
      </div>
      <section class="card" style="margin-top:16px">
        <div class="label">Últimas sesiones</div>
        ${weekSessions.length ? [...weekSessions].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,3).map(s=>this.trainingCard(s, true)).join('') : `<div class="empty">Aún no completas sesiones esta semana.</div>`}
      </section>
    `;
  },

  planRoutineCard(plan, day, index){
    const session = this.findWeekPlannedSession(day.day, plan.name);
    const completed = !!session;
    const diff = session ? (Number(session.km || 0) - Number(day.km || 0)) : null;
    return `
      <article class="routine-card ${completed ? 'done':''}">
        <div class="routine-body">
          <div class="routine-header">
            <div class="routine-number">${index}</div>
            <div>
              <div class="routine-title">${day.day} — ${day.type === 'run' ? 'Carrera' : 'Fuerza'}</div>
              <div class="routine-sub">Objetivo: ${day.type === 'run' ? `${this.formatNumber(day.km)} km` : 'Sesión de fuerza'} · ${plan.name}</div>
              <div class="routine-tags">
                <span class="tag blue-tag">${day.type === 'run' ? `Carrera / ${this.formatNumber(day.km)} km` : 'Fuerza / libre'}</span>
                <span class="tag plan">${plan.name.toUpperCase()}</span>
                <span class="tag">${day.day.toUpperCase()}</span>
              </div>
              ${completed ? `<div class="completed-pill">✓ Entrenamiento completado</div>` : ''}
              ${completed && day.type === 'run' ? `<div class="diff-pill ${diff >= 0 ? 'pos':'neg'}">${diff >= 0 ? '+' : ''}${this.formatNumber(diff)} km vs plan</div>` : ''}
            </div>
            <div class="dots">•••</div>
          </div>
        </div>
        <div class="routine-note">✦ Carga plan: ${day.day} / ${day.type === 'run' ? `Carrera ${this.formatNumber(day.km)} km` : 'Fuerza'}</div>
        <button class="routine-action ${completed ? 'done-action':''}" onclick="app.openSessionModalFromEncoded('${encodeURIComponent(JSON.stringify({ fromPlan:true, planName:plan.name, planDay:day.day, type:day.type, plannedKm:day.km || '', date:this.dateForCurrentWeek(day.day), sessionId:session ? session.id : '' }))}')">${completed ? '✓ COMPLETADO' : '▶ COMPLETAR'}</button>
      </article>
    `;
  },

  renderPlan(){
    const page = document.getElementById('plan');
    const plans = [...this.db.plans].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    page.innerHTML = `
      ${this.header()}
      <section class="card">
        <div class="card-head">
          <div>
            <div class="label">Plan semanal</div>
            <div class="card-title">Carga tus días de entrenamiento</div>
            <div class="sub">Crea un plan por semana. Puedes nombrarlos correlativamente: Plan semana 1, Plan semana 2, etc.</div>
          </div>
          <button class="pill" onclick="app.openPlanModal()">Crear plan</button>
        </div>
      </section>
      <section class="card">
        <div class="label">Histórico de planes</div>
        <div class="plan-list">
          ${plans.length ? plans.map(plan => `
            <div class="card" style="padding:14px;margin-bottom:0">
              <div class="card-head">
                <div>
                  <div class="card-title">${plan.name}</div>
                  <div class="sub">${this.planSummary(plan)}</div>
                </div>
                <button class="mini-btn" onclick="app.duplicatePlan('${plan.id}')">Duplicar</button>
              </div>
              <div class="routine-tags" style="margin-top:12px">${plan.days.filter(d=>d.enabled).map(d => `<span class="tag">${d.day} · ${d.type === 'run' ? `${this.formatNumber(d.km)} km` : 'Fuerza'}</span>`).join('')}</div>
            </div>
          `).join('') : `<div class="empty">Aún no has creado planes.</div>`}
        </div>
      </section>
    `;
  },

  renderProgreso(){
    const page = document.getElementById('progreso');
    const data = this.getProgressData();
    page.innerHTML = `
      ${this.header()}
      <div class="range-filter">
        ${[4,8,16,'all'].map(r => `<button class="range-btn ${this.progressRange===r?'active':''}" onclick="app.setProgressRange(${r === 'all' ? `'all'` : r})">${r==='all'?'Todo':`${r} semanas`}</button>`).join('')}
      </div>
      <section class="progress-kpis">
        <div class="kpi-card"><div class="kpi-label">Peso actual</div><div class="kpi-value">${this.latestWeight() ? `${this.formatNumber(this.latestWeight().value)} kg` : '--'}</div></div>
        <div class="kpi-card"><div class="kpi-label">Sesiones</div><div class="kpi-value">${data.filteredSessions.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Km acumulados</div><div class="kpi-value">${this.formatNumber(data.totalKm)} km</div></div>
        <div class="kpi-card"><div class="kpi-label">Adherencia media</div><div class="kpi-value">${data.avgAdherence}%</div></div>
      </section>
      <section class="chart-card">
        <div class="chart-head"><div class="card-title">Peso</div><div class="sub">histórico</div></div>
        ${data.weights.labels.length ? `<div class="chart-box"><canvas id="chartWeight"></canvas></div>` : `<div class="chart-empty">Aún no hay registros de peso suficientes.</div>`}
      </section>
      <section class="chart-card">
        <div class="chart-head"><div class="card-title">Km semanales</div><div class="sub">carga de entrenamiento</div></div>
        ${data.weeklyKm.labels.length ? `<div class="chart-box"><canvas id="chartKm"></canvas></div>` : `<div class="chart-empty">Aún no hay kilómetros acumulados.</div>`}
      </section>
      <section class="chart-card">
        <div class="chart-head"><div class="card-title">Ritmo promedio</div><div class="sub">min/km por sesión</div></div>
        ${data.sessionPace.labels.length ? `<div class="chart-box"><canvas id="chartPace"></canvas></div>` : `<div class="chart-empty">Aún no hay sesiones de carrera con tiempo y distancia.</div>`}
      </section>
      <section class="chart-card">
        <div class="chart-head"><div class="card-title">Adherencia semanal</div><div class="sub">cumplimiento del plan</div></div>
        ${data.adherence.labels.length ? `<div class="chart-box"><canvas id="chartAdherence"></canvas></div>` : `<div class="chart-empty">Crea un plan y completa sesiones para ver adherencia semanal.</div>`}
      </section>
    `;
  },

  renderCharts(){
    if(!document.getElementById('progreso')?.classList.contains('active')) return;
    if(this.chartRenderLock) return;
    this.chartRenderLock = true;
    Object.values(this.charts).forEach(ch => { try{ ch.destroy(); }catch(e){} });
    this.charts = {};
    const data = this.getProgressData();

    const common = {
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:'#8A9BB0', font:{ size:11 } }, grid:{ display:false } },
        y:{ ticks:{ color:'#8A9BB0', font:{ size:11 } }, grid:{ color:'rgba(138,155,176,.18)' } }
      }
    };

    const weightCanvas = document.getElementById('chartWeight');
    if(weightCanvas && data.weights.labels.length){
      const axis = this.getNiceAxisBounds([...data.weights.values, Number(this.db.goalWeight || 0)]);
      this.charts.weight = new Chart(weightCanvas, {
        type:'line',
        data:{
          labels:data.weights.labels,
          datasets:[
            { label:'Peso', data:data.weights.values, borderColor:'#6ECFBA', backgroundColor:'rgba(110,207,186,.10)', pointBackgroundColor:'#1E3A52', pointRadius:4, tension:.35, fill:true },
            { label:'Objetivo', data:data.weights.values.map(()=> Number(this.db.goalWeight || 0)), borderColor:'#1E3A52', borderDash:[8,6], pointRadius:0, tension:0, borderWidth:2 }
          ]
        },
        options:{
          ...common,
          plugins:{ legend:{ display:true, labels:{ color:'#1E3A52', boxWidth:12, font:{ size:12, weight:'700' } } }, tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${ctx.parsed.y} kg` } } },
          scales:{
            ...common.scales,
            y:{ ...common.scales.y, min:axis.min, max:axis.max, ticks:{ ...common.scales.y.ticks, stepSize:axis.step } }
          }
        }
      });
    }

    const kmCanvas = document.getElementById('chartKm');
    if(kmCanvas && data.weeklyKm.labels.length){
      const axis = this.getNiceAxisBounds(data.weeklyKm.values, { clampZero:true });
      this.charts.km = new Chart(kmCanvas, {
        type:'bar',
        data:{ labels:data.weeklyKm.labels, datasets:[{ data:data.weeklyKm.values, backgroundColor:'#43D1B7', borderRadius:12 }] },
        options:{
          ...common,
          plugins:{ ...common.plugins, tooltip:{ callbacks:{ label:(ctx)=> `${ctx.parsed.y} km` } } },
          scales:{
            ...common.scales,
            y:{ ...common.scales.y, min:axis.min, max:axis.max, ticks:{ ...common.scales.y.ticks, stepSize:axis.step, callback:(v)=> Number.isInteger(v) ? v : Math.round(v) } }
          }
        }
      });
    }

    const paceCanvas = document.getElementById('chartPace');
    if(paceCanvas && data.sessionPace.labels.length){
      const axis = this.getNiceAxisBounds(data.sessionPace.values);
      this.charts.pace = new Chart(paceCanvas, {
        type:'line',
        data:{ labels:data.sessionPace.labels, datasets:[{ data:data.sessionPace.values, borderColor:'#1E3A52', backgroundColor:'rgba(110,207,186,.1)', fill:true, pointBackgroundColor:'#6ECFBA', pointRadius:4, tension:.35 }] },
        options:{
          ...common,
          plugins:{ ...common.plugins, tooltip:{ callbacks:{ label:(ctx)=> `${ctx.parsed.y} min/km` } } },
          scales:{
            ...common.scales,
            y:{ ...common.scales.y, min:axis.min, max:axis.max, ticks:{ ...common.scales.y.ticks, callback:(v)=> `${v}` } }
          }
        }
      });
    }

    const adhCanvas = document.getElementById('chartAdherence');
    if(adhCanvas && data.adherence.labels.length){
      this.charts.adherence = new Chart(adhCanvas, {
        type:'line',
        data:{ labels:data.adherence.labels, datasets:[{ data:data.adherence.values, borderColor:'#4A7FA5', backgroundColor:'rgba(74,127,165,.12)', fill:true, pointBackgroundColor:'#4A7FA5', pointRadius:4, tension:.3 }] },
        options:{
          ...common,
          plugins:{ ...common.plugins, tooltip:{ callbacks:{ label:(ctx)=> `${ctx.parsed.y}%` } } },
          scales:{
            ...common.scales,
            y:{ ...common.scales.y, min:0, max:100, ticks:{ ...common.scales.y.ticks, stepSize:20, callback:(v)=> `${v}%` } }
          }
        }
      });
    }
    this.chartRenderLock = false;
  },

  renderNutricion(){
    const page = document.getElementById('nutricion');
    const today = this.todayISO();
    const log = this.getNutritionLog(today);
    const completedMeals = this.nutritionCompletedMeals(today);
    const ideas = this.db.nutrition.suggestions[this.ideaFilter] || [];
    page.innerHTML = `
      ${this.header()}
      <div class="nutrition-tabs">
        ${['registro','ideas','pauta'].map(v => `<button class="nutrition-tab ${this.nutritionView===v?'active':''}" onclick="app.setNutritionView('${v}')">${v==='registro'?'Registro':v==='ideas'?'Ideas':'Mi pauta'}</button>`).join('')}
      </div>
      ${this.nutritionView === 'registro' ? `
        <section class="card">
          <div class="section-head">
            <div class="card-title">🍽️ Comidas</div>
            <div class="kpi-value" style="font-size:18px;color:#16B35D">${completedMeals} / ${this.mealCatalog.length}</div>
          </div>
          <div class="nutrition-note"><div class="label" style="letter-spacing:.22em">Menú sugerido · descanso</div><div class="sub" style="margin-top:8px">${this.db.nutrition.pauta}</div></div>
          <div class="meal-list">
            ${this.mealCatalog.map(meal => `
              <button class="meal-row ${log.meals[meal.id] ? 'done':''}" onclick="app.toggleMeal('${today}','${meal.id}')">
                <div class="meal-icon">${meal.icon}</div>
                <div>
                  <div class="meal-name">${meal.name}</div>
                  <div class="meal-time">${meal.time}</div>
                  <div class="meal-target">${meal.target}</div>
                </div>
                <div class="meal-check">✓</div>
              </button>
            `).join('')}
          </div>
          <div class="nutrition-grid">
            <div class="nutrition-item"><small>Vasos de agua</small><b>${log.waterGlasses} / ${this.db.nutrition.waterGoal}</b><button class="mini-btn" style="margin-top:10px" onclick="app.changeWater(1)">+1 vaso</button></div>
            <div class="nutrition-item"><small>Alcohol</small><b>${log.alcohol}</b><button class="mini-btn" style="margin-top:10px" onclick="app.changeAlcohol(1)">+1</button></div>
            <div class="nutrition-item"><small>Fuera de plan</small><b>${log.offPlanMeals.length}</b><button class="mini-btn" style="margin-top:10px" onclick="app.addOffPlanMeal()">Agregar</button></div>
            <div class="nutrition-item"><small>Score del día</small><b>${this.nutritionScore(today)}%</b></div>
          </div>
          ${log.offPlanMeals.length ? `<div class="pauta-row"><b style="display:block;margin-bottom:8px;color:var(--navy)">Fuera de plan</b>${log.offPlanMeals.map(item=>`<div class="offplan-item">${item}</div>`).join('')}</div>` : ''}
        </section>
        <section class="card">
          <div class="card-head"><div><div class="label">Heatmap nutricional</div><div class="card-title">Año ${new Date().getFullYear()}</div></div></div>
          <div class="heatmap-grid">${this.renderHeatmap()}</div>
          <div class="heatmap-legend"><span>Menos</span><span class="heatmap-dot" style="background:#F2EFE7"></span><span class="heatmap-dot" style="background:#E1D5A3"></span><span class="heatmap-dot" style="background:#C8AE56"></span><span class="heatmap-dot" style="background:#9D7321"></span><span class="heatmap-dot" style="background:#37312B"></span><span>Más</span></div>
        </section>
      ` : this.nutritionView === 'ideas' ? `
        <section class="card">
          <div class="sub">Ideas basadas en tu pauta. Toca “Usar hoy” para copiar al registro.</div>
          <div class="idea-filters">
            ${['desayuno','almuerzo','cena','pre_entreno','colacion','pm'].map(key => `<button class="pill ${this.ideaFilter===key ? '' : 'light'}" onclick="app.setIdeaFilter('${key}')">${this.ideaLabel(key)}</button>`).join('')}
          </div>
          <div class="sub" style="margin-top:12px">${this.portionHint(this.ideaFilter)}</div>
        </section>
        ${ideas.map((idea, idx) => `
          <section class="idea-card">
            <div class="card-head">
              <div>
                <div class="idea-title">${idea.title}</div>
                <div class="idea-desc">${idea.desc}</div>
                <div class="idea-portions">${idea.portions}</div>
              </div>
              <button class="pill" onclick="app.useIdeaToday('${this.ideaFilter}', ${idx})">Usar hoy</button>
            </div>
          </section>
        `).join('')}
      ` : `
        <section class="card">
          <div class="label">Pauta base</div>
          <div class="card-title">${this.db.nutrition.patientName}</div>
          <div class="sub" style="margin-top:10px">Periodo: ${this.db.nutrition.period}</div>
          <div class="sub" style="margin-top:4px">Objetivo: ${this.db.nutrition.goal}</div>
          <div class="nutrition-grid">
            <div class="nutrition-item"><small>Agua objetivo</small><b>${this.db.nutrition.waterGoal} vasos</b></div>
            <div class="nutrition-item"><small>Comidas sugeridas</small><b>${this.mealCatalog.length}</b></div>
          </div>
          <div class="pauta-row"><div class="label" style="letter-spacing:.22em">Resumen pauta</div><div class="sub" style="margin-top:8px">${this.db.nutrition.pauta}</div></div>
        </section>
      `}
    `;
  },

  renderMedallas(){
    const page = document.getElementById('medallas');
    const medals = this.buildMedalCollection();
    const unlocked = medals.length;
    const totalKm = medals.reduce((acc,m)=> acc + Number(m.distance || 0), 0);
    page.innerHTML = `
      <div class="medal-shell">
        ${this.header(false)}
        <div class="medal-title-main">MEDALLERO</div>
        <div class="medal-hero">Tu colección</div>
        <div class="medal-hero-sub">Tus carreras, tus logros.</div>

        <section class="collection-card">
          <div class="collection-icon">★</div>
          <div>
            <div class="collection-title">${unlocked} ${unlocked === 1 ? 'medalla' : 'medallas'}</div>
            <div class="collection-sub">${totalKm ? `${this.formatNumber(totalKm)} km oficiales acumulados.` : 'Marca “Ya corrí” en una carrera objetivo para desbloquear tu primera medalla.'}</div>
          </div>
          <div class="collection-right">${unlocked}</div>
          <div class="collection-bar"><span style="width:${unlocked ? '100' : '0'}%"></span></div>
        </section>

        ${medals.length ? `
          <section class="medal-grid unlocked-only">
            ${medals.map(m => this.medalCard(m)).join('')}
          </section>
        ` : `
          <section class="medal-empty-state">
            <div class="medal-empty-icon">🏅</div>
            <div class="card-title">Todavía no hay medallas</div>
            <div class="sub">Cuando marques <b>Ya corrí</b> en tu carrera objetivo, aparecerá acá tu medalla metálica.</div>
            <button class="btn" onclick="app.go('inicio', document.querySelectorAll('.tab')[0])">Ir al inicio</button>
          </section>
        `}
      </div>
    `;
  },

  medalCard(medal){
    return `
      <article class="medal-card unlocked" onclick="app.openMedalDetail('${medal.id}')">
        <div class="medal-top">
          <div class="medal-ribbon"></div>
          <div class="medal-badge">✓</div>
        </div>
        <div class="medal-coin">
          <div class="scene"></div>
          <div class="title-ring">${this.escapeHtml(medal.ringTitle || medal.title)}</div>
          <div class="medal-distance">${this.formatNumber(medal.distance)}K</div>
        </div>
        <div class="medal-name">${this.escapeHtml(medal.title)}</div>
        <div class="medal-km">${this.formatNumber(medal.distance)}K · ${this.formatDateForBadge(medal.raceData.date)}</div>
      </article>
    `;
  },

  buildMedalCollection(){
    const completed = [...(this.db.completedRaces || [])]
      .sort((a,b)=> new Date(b.date) - new Date(a.date));

    return completed.map(r => {
      const key = r.catalogId || this.slugify(r.name) || r.id;
      return {
        id: key,
        title: r.name,
        distance: Number(r.distance || 0),
        unlocked: true,
        raceData: r,
        ringTitle: r.name.length > 24 ? r.name.slice(0,24) : r.name
      };
    });
  },

  openMedalDetail(id){
    const medal = this.buildMedalCollection().find(m => m.id === id);
    if(!medal || !medal.raceData) return;
    const r = medal.raceData;
    const insights = this.medalInsights(r);
    const dateLabel = this.formatDateForBadge(r.date);
    const medalHtml = this.largeMedalMarkup(medal);
    const html = `
      <div class="medal-detail-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="medal-detail-shell">
          <div class="medal-detail-top">
            <button class="circle-icon-btn" onclick="app.closeModal()">‹</button>
            <button class="circle-icon-btn" onclick="app.shareRace('${r.id}')">⤴</button>
          </div>
          <div class="medal-large-wrap">${medalHtml}</div>
          <div class="medal-detail-title">${this.escapeHtml(r.name)}</div>
          <div class="medal-highlight">✪ Medalla oficial de carrera</div>
          <div class="detail-divider"></div>
          <div class="medal-detail-note">${this.escapeHtml(r.note || `Ganaste esta medalla por completar la carrera de ${this.formatNumber(r.distance)}K.`)}</div>
          <div class="medal-detail-date">Última vez: ${dateLabel}</div>
          <div class="medal-stats">
            <div class="medal-stat-box"><small>Tiempo</small><b>${r.durationLabel}</b></div>
            <div class="medal-stat-box"><small>Ritmo</small><b>${r.pace}</b></div>
            <div class="medal-stat-box"><small>FC media</small><b>${r.fc || '--'}</b></div>
            <div class="medal-stat-box"><small>Peso</small><b>${r.weight ? `${this.formatNumber(r.weight)} kg` : '--'}</b></div>
          </div>
          <div class="medal-insights">
            <h3>Insights</h3>
            <ul>
              <li>${insights.bestDistance}</li>
              <li>${insights.bestPace}</li>
              <li>${insights.bestKcal}</li>
              <li>${insights.bestWeight}</li>
              <li>${insights.worstWeight}</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    this.showModal(html, () => {
      this.bindMedalFlipGesture();
    }, true);
  },

  largeMedalMarkup(medal){
    const r = medal.raceData || {};
    const dateText = r.date ? this.formatDateLong(new Date(`${r.date}T12:00:00`)).toUpperCase() : 'SIN FECHA';
    const paceText = r.pace || '--';
    const timeText = r.durationLabel || '--';
    const distanceText = r.distance ? `${this.formatNumber(r.distance)}K` : `${this.formatNumber(medal.distance)}K`;

    return `
      <div class="medal-flip-stage" id="medalFlipStage">
        <div class="medal-flip-inner" id="medalFlipInner">
          <div class="medal-face medal-front">
            <div class="medal-large apple-medal-front">
              <div class="medal-ribbon"></div>
              <div class="medal-coin">
                <div class="scene"></div>
                <div class="title-ring">${this.escapeHtml(medal.ringTitle || medal.title)}</div>
                <div class="medal-distance">${distanceText}</div>
              </div>
            </div>
          </div>
          <div class="medal-face medal-edge">
            <div class="medal-edge-disc"></div>
          </div>
          <div class="medal-face medal-back">
            <div class="medal-large apple-medal-back">
              <div class="medal-back-disc">
                <div class="medal-back-text">OBTENIDO<br>${this.escapeHtml(dateText)}</div>
                <div class="medal-back-hole"></div>
                <div class="medal-back-bottom">
                  <div class="medal-back-pill">Ritmo <b>${this.escapeHtml(paceText)}</b></div>
                  <div class="medal-back-pill">Tiempo <b>${this.escapeHtml(timeText)}</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="medal-gesture-hint">Desliza sobre la medalla para girarla</div>
    `;
  },

  bindMedalFlipGesture(){
    const stage = document.getElementById('medalFlipStage');
    const inner = document.getElementById('medalFlipInner');
    if(!stage || !inner) return;

    let isDragging = false;
    let startX = 0;
    let currentRotation = 0;
    let committedSide = 0;

    const setRotation = (deg, smooth=false) => {
      inner.style.transition = smooth ? 'transform .42s cubic-bezier(.2,.8,.2,1)' : 'none';
      inner.style.transform = `rotateY(${deg}deg)`;
      const shadow = Math.min(1, Math.abs(Math.sin((deg * Math.PI) / 180)));
      stage.style.setProperty('--flip-shadow', shadow.toFixed(2));
    };

    const pointerDown = (clientX) => {
      isDragging = true;
      startX = clientX;
      currentRotation = committedSide;
      setRotation(currentRotation, false);
    };

    const pointerMove = (clientX) => {
      if(!isDragging) return;
      const delta = clientX - startX;
      let dragRotation = committedSide + delta * 0.82;
      if(dragRotation < -18) dragRotation = -18;
      if(dragRotation > 198) dragRotation = 198;
      currentRotation = dragRotation;
      setRotation(currentRotation, false);
    };

    const pointerUp = () => {
      if(!isDragging) return;
      isDragging = false;
      committedSide = currentRotation > 90 ? 180 : 0;
      currentRotation = committedSide;
      setRotation(currentRotation, true);
    };

    stage.addEventListener('touchstart', (e)=>{
      if(!e.touches || !e.touches.length) return;
      pointerDown(e.touches[0].clientX);
    }, { passive:true });

    stage.addEventListener('touchmove', (e)=>{
      if(!e.touches || !e.touches.length) return;
      pointerMove(e.touches[0].clientX);
    }, { passive:true });

    stage.addEventListener('touchend', pointerUp);
    stage.addEventListener('touchcancel', pointerUp);
    stage.addEventListener('mousedown', (e)=> pointerDown(e.clientX));
    window.addEventListener('mousemove', (e)=> pointerMove(e.clientX));
    window.addEventListener('mouseup', pointerUp);

    setRotation(0, true);
  },

  medalInsights(race){
    const races = this.db.completedRaces || [];
    const maxDistance = races.reduce((a,r)=> Math.max(a, Number(r.distance || 0)), 0);
    const bestPaceRace = [...races].filter(r=>r.paceValue).sort((a,b)=> a.paceValue - b.paceValue)[0];
    const maxKcalRace = [...races].sort((a,b)=> Number(b.kcal || 0) - Number(a.kcal || 0))[0];
    const sortedByWeight = [...races].filter(r=>r.weight).sort((a,b)=> Number(a.weight) - Number(b.weight));
    const bestWeight = sortedByWeight[0];
    const worstWeight = sortedByWeight[sortedByWeight.length-1];
    return {
      bestDistance: maxDistance === Number(race.distance) ? 'Esta fue tu mayor distancia hasta ahora.' : `Tu mayor distancia histórica es ${this.formatNumber(maxDistance)} km.`,
      bestPace: bestPaceRace && bestPaceRace.id === race.id ? 'Esta fue tu mejor carrera por ritmo.' : `Tu mejor ritmo histórico es ${bestPaceRace ? bestPaceRace.pace : '--'}.`,
      bestKcal: maxKcalRace && maxKcalRace.id === race.id ? 'Esta fue la carrera con más calorías hasta ahora.' : `Mayor gasto calórico: ${maxKcalRace ? `${maxKcalRace.kcal} kcal` : '--'}.`,
      bestWeight: bestWeight ? `Mejor peso en carrera: ${this.formatNumber(bestWeight.weight)} kg.` : 'Sin registros de peso en carreras todavía.',
      worstWeight: worstWeight ? `Peso más alto en carrera: ${this.formatNumber(worstWeight.weight)} kg.` : 'Sin registros de peso en carreras todavía.'
    };
  },

  setProgressRange(range){
    this.progressRange = range;
    this.renderProgreso();
    setTimeout(()=>this.renderCharts(), 30);
  },

  setNutritionView(view){ this.nutritionView = view; this.renderNutricion(); },
  setIdeaFilter(filter){ this.ideaFilter = filter; this.renderNutricion(); },
  ideaLabel(key){ return ({desayuno:'🌞 Desayuno',almuerzo:'🍽️ Almuerzo',cena:'🌙 Cena',pre_entreno:'⚡ Pre-Entreno',colacion:'🍎 Colación',pm:'🥛 PM'})[key] || key; },
  portionHint(key){ return ({desayuno:'1 lácteo · 0.5 cereal · 3 carnes',almuerzo:'proteína + cereal + verduras',cena:'proteína + verduras',pre_entreno:'energía ligera',colacion:'fruta o lácteo',pm:'vaso de leche o yogur'})[key] || ''; },

  toggleMeal(date, mealId){
    const log = this.getNutritionLog(date);
    log.meals[mealId] = !log.meals[mealId];
    this.db.nutritionLogs[date] = log;
    this.renderAll();
  },
  changeWater(delta){
    const date = this.todayISO();
    const log = this.getNutritionLog(date);
    log.waterGlasses = Math.max(0, Number(log.waterGlasses || 0) + delta);
    this.db.nutritionLogs[date] = log;
    this.renderAll();
  },
  changeAlcohol(delta){
    const date = this.todayISO();
    const log = this.getNutritionLog(date);
    log.alcohol = Math.max(0, Number(log.alcohol || 0) + delta);
    this.db.nutritionLogs[date] = log;
    this.renderAll();
  },
  addOffPlanMeal(){
    const value = prompt('¿Qué comida fuera de plan quieres registrar?');
    if(!value) return;
    const date = this.todayISO();
    const log = this.getNutritionLog(date);
    log.offPlanMeals.push(value);
    this.db.nutritionLogs[date] = log;
    this.renderAll();
  },
  useIdeaToday(filter, idx){
    const idea = (this.db.nutrition.suggestions[filter] || [])[idx];
    if(!idea) return;
    alert(`Idea copiada para hoy: ${idea.title}`);
  },

  openProfileModal(){
    const p = this.db.profile;
    this.showModal(`
      <div class="modal-box compact">
        <div class="profile-head"><div class="profile-avatar">${(p.userName || 'S').trim().charAt(0).toUpperCase()}</div><div><div class="modal-title">Perfil</div><div class="modal-subtitle">Configura tus datos personales y exporta tu información.</div></div></div>
        <input id="profileName" placeholder="Nombre" value="${this.escapeAttr(p.userName || '')}">
        <input id="profileBirth" type="date" value="${this.escapeAttr(p.birthDate || '')}">
        <input id="profileHeight" type="number" placeholder="Estatura (cm)" value="${this.escapeAttr(p.height || '')}">
        <div class="pauta-row">
          <div class="label" style="letter-spacing:.22em">Sincronización nube</div>
          <div class="sub" style="margin-top:8px">Estado: <b>${this.cloudStatusLabel()}</b>${this.cloudError ? ` · ${this.escapeHtml(this.cloudError)}` : ''}</div>
          <input id="syncIdInput" placeholder="Sync ID" value="${this.escapeAttr(this.db.sync?.syncId || 'diego-sergei-run')}">
          <div class="btn-row">
            <button class="btn" onclick="app.saveProfile(); app.connectCloudFromProfile();">Conectar nube</button>
            <button class="btn secondary" onclick="app.forceCloudUpload()">Subir local</button>
            <button class="btn secondary" onclick="app.forceCloudDownload()">Bajar nube</button>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn" onclick="app.saveProfile()">Guardar perfil</button>
        </div>
        <button class="btn secondary" onclick="app.exportFullData()">Exportar data completa</button>
        <button class="btn danger" onclick="app.resetData()">Cerrar sesión</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },
  saveProfile(){
    this.db.profile.userName = document.getElementById('profileName').value.trim() || 'Sergei';
    this.db.profile.birthDate = document.getElementById('profileBirth').value;
    this.db.profile.height = document.getElementById('profileHeight').value;
    const syncInput = document.getElementById('syncIdInput');
    if(syncInput){
      if(!this.db.sync) this.db.sync = {};
      this.db.sync.syncId = this.cleanSyncId(syncInput.value || 'diego-sergei-run');
      this.db.sync.enabled = true;
    }
    this.closeModal();
    this.renderAll();
  },
  exportFullData(){
    navigator.clipboard.writeText(JSON.stringify(this.db, null, 2));
    alert('Data completa copiada al portapapeles.');
  },
  resetData(){
    if(confirm('¿Seguro que quieres limpiar la data local?')){
      localStorage.removeItem(this.storageKey);
      this.db = this.defaultDB();
      this.closeModal();
      this.renderAll();
    }
  },

  openGoalWeightModal(){
    this.showModal(`
      <div class="modal-box compact">
        <div class="modal-title">Objetivo de peso</div>
        <div class="modal-subtitle">Actualiza tu peso objetivo y, si quieres, el peso inicial.</div>
        <input id="goalWeightInput" type="number" step="0.1" placeholder="Objetivo kg" value="${this.db.goalWeight}">
        <input id="startWeightInput" type="number" step="0.1" placeholder="Peso inicial" value="${this.db.startWeight || ''}">
        <button class="btn" onclick="app.saveGoalWeight()">Guardar</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },
  saveGoalWeight(){
    this.db.goalWeight = Number(document.getElementById('goalWeightInput').value || this.db.goalWeight);
    this.db.startWeight = Number(document.getElementById('startWeightInput').value || this.db.startWeight || 0);
    this.closeModal();
    this.renderAll();
  },

  openWeightModal(){
    const latest = this.latestWeight();
    const current = latest ? Number(latest.value) : Number(this.db.startWeight || 100);
    const kg = Math.floor(current);
    const dec = Math.round((current - kg) * 10);
    this.showModal(`
      <div class="modal-box compact">
        <div class="modal-title">Registrar peso</div>
        <div class="modal-subtitle">Usa la rueda tipo iPhone para kilos y gramos.</div>
        <div class="weight-picker-label">Peso</div>
        <div class="weight-picker">
          <div id="weightKgWheel" class="wheel"></div>
          <div class="wheel-unit">.</div>
          <div id="weightDecWheel" class="wheel"></div>
          <div class="wheel-unit">kg</div>
        </div>
        <input id="weightDate" type="date" value="${this.todayISO()}">
        <button class="btn" onclick="app.saveWeightFromWheels()">Guardar</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `, ()=>{
      this.setupWheel('weightKgWheel', this.range(80,150), kg);
      this.setupWheel('weightDecWheel', this.range(0,9), dec);
    });
  },
  saveWeightFromWheels(){
    const kg = Number(document.getElementById('weightKgWheel').dataset.selected || 0);
    const dec = Number(document.getElementById('weightDecWheel').dataset.selected || 0);
    const date = document.getElementById('weightDate').value || this.todayISO();
    const value = Number(`${kg}.${dec}`);
    this.db.weights.push({ date, value });
    this.db.weights.sort((a,b)=> new Date(a.date)-new Date(b.date));
    if(!this.db.startWeight) this.db.startWeight = value;
    this.closeModal();
    this.renderAll();
  },

  openRaceModal(){
    const race = this.db.race || {};
    this.showModal(`
      <div class="modal-box compact">
        <div class="modal-title">Carrera objetivo</div>
        <div class="modal-subtitle">Agrega nombre, fecha y distancia del evento.</div>
        <input id="raceName" placeholder="Nombre del evento" value="${this.escapeAttr(race.title || '')}">
        <input id="raceDate" type="date" value="${this.escapeAttr(race.date || '')}">
        <input id="raceDistance" type="number" step="0.1" placeholder="Distancia km" value="${this.escapeAttr(race.distance || '')}">
        <button class="btn" onclick="app.saveRace()">Guardar</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },
  saveRace(){
    this.db.race = { title:document.getElementById('raceName').value.trim(), date:document.getElementById('raceDate').value, distance:Number(document.getElementById('raceDistance').value || 0) };
    this.closeModal();
    this.renderAll();
  },

  openCompleteRaceModal(){
    const race = this.db.race || {};
    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Ya corrí</div>
        <div class="modal-subtitle">Registra la carrera completada para sumarla al medallero.</div>
        <input id="medalRaceName" placeholder="Nombre de la carrera" value="${this.escapeAttr(race.title || '')}">
        <input id="medalRaceDate" type="date" value="${this.escapeAttr(race.date || this.todayISO())}">
        <input id="medalRaceDistance" type="number" step="0.1" placeholder="Distancia km" value="${this.escapeAttr(race.distance || '')}">
        <div class="time-picker-label">Duración</div>
        <div class="time-picker">
          <div id="raceHourWheel" class="wheel"></div><div class="wheel-unit">:</div>
          <div id="raceMinWheel" class="wheel"></div><div class="wheel-unit">:</div>
          <div id="raceSecWheel" class="wheel"></div><div class="wheel-unit">h:m:s</div>
        </div>
        <div class="form-grid">
          <input id="medalSteps" type="number" placeholder="Pasos">
          <input id="medalKcal" type="number" placeholder="Kcal">
          <input id="medalFc" type="number" placeholder="FC media">
          <input id="medalWeight" type="number" step="0.1" placeholder="Peso del día (kg)">
          <textarea id="medalNote" placeholder="Nota o comentario"></textarea>
        </div>
        <button class="btn" onclick="app.saveCompletedRace()">Guardar medalla</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `, ()=>{
      this.setupWheel('raceHourWheel', this.range(0,5).map(v=>String(v).padStart(2,'0')), '00');
      this.setupWheel('raceMinWheel', this.range(0,59).map(v=>String(v).padStart(2,'0')), '45');
      this.setupWheel('raceSecWheel', this.range(0,59).map(v=>String(v).padStart(2,'0')), '00');
    });
  },
  saveCompletedRace(){
    const name = document.getElementById('medalRaceName').value.trim();
    const date = document.getElementById('medalRaceDate').value || this.todayISO();
    const distance = Number(document.getElementById('medalRaceDistance').value || 0);
    const h = Number(document.getElementById('raceHourWheel').dataset.selected || 0);
    const m = Number(document.getElementById('raceMinWheel').dataset.selected || 0);
    const s = Number(document.getElementById('raceSecWheel').dataset.selected || 0);
    const timeSeconds = h*3600 + m*60 + s;
    const steps = Number(document.getElementById('medalSteps').value || 0);
    const kcal = Number(document.getElementById('medalKcal').value || 0);
    const fc = Number(document.getElementById('medalFc').value || 0);
    const weight = Number(document.getElementById('medalWeight').value || 0);
    const note = document.getElementById('medalNote').value.trim();
    const calc = this.computeRunMetrics(distance, timeSeconds, steps);
    const obj = {
      id:'race_'+Date.now(),
      catalogId: this.matchCatalogId(name, distance),
      name, date, distance, timeSeconds,
      durationLabel:this.formatDuration(timeSeconds),
      steps: steps || '', kcal: kcal || '', fc: fc || '', weight: weight || '', note,
      pace: calc.pace, paceValue: calc.paceValue, speed: calc.speed, cadence: calc.cadence, strideLength: calc.strideLength
    };
    this.db.completedRaces.push(obj);
    if(weight){
      this.db.weights.push({ date, value: weight });
      this.db.weights.sort((a,b)=> new Date(a.date)-new Date(b.date));
    }
    this.closeModal();
    this.renderAll();
    this.go('medallas', document.querySelectorAll('.tab')[5]);
  },
  matchCatalogId(name, distance){
    const slug = this.slugify(name);
    const match = this.medalCatalog.find(m => m.id === slug || (this.slugify(m.title) === slug) || (Number(m.distance) === Number(distance) && slug.includes(this.slugify(m.title).split('-')[0])));
    return match ? match.id : slug;
  },
  shareRace(id){
    const race = this.db.completedRaces.find(r=>r.id===id);
    if(!race) return;
    const text = `${race.name} · ${race.distance}K · ${race.durationLabel} · ritmo ${race.pace}`;
    navigator.clipboard.writeText(text);
    alert('Resumen de la carrera copiado al portapapeles.');
  },

  openPlanModal(){
    const id = `plan_${Date.now()}`;
    const rows = this.dayNames.map(day => `
      <div class="plan-day">
        <button class="check" data-day="${day}" onclick="app.togglePlanCheck(this)">✓</button>
        <div>
          <div style="font-weight:800;color:var(--navy)">${day}</div>
          <div class="sub">Entrenamiento de carrera o fuerza</div>
        </div>
        <input type="number" step="0.1" placeholder="km" data-km="${day}" disabled>
      </div>
    `).join('');
    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">Crear plan semanal</div>
        <div class="modal-subtitle">Agrega días de entrenamiento y luego define kilómetros objetivo. Si el día es de fuerza, deja km vacío.</div>
        <input id="planName" value="Plan semana ${this.db.plans.length + 1}" placeholder="Nombre del plan">
        <div class="plan-list">${rows}</div>
        <button class="btn" onclick="app.savePlanModal('${id}')">Guardar plan</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },
  togglePlanCheck(btn){
    btn.classList.toggle('on');
    const day = btn.dataset.day;
    const input = document.querySelector(`[data-km="${day}"]`);
    input.disabled = !btn.classList.contains('on');
  },
  savePlanModal(id){
    const name = document.getElementById('planName').value.trim() || `Plan semana ${this.db.plans.length + 1}`;
    const days = this.dayNames.map(day => {
      const enabled = document.querySelector(`.check[data-day="${day}"]`).classList.contains('on');
      const km = Number(document.querySelector(`[data-km="${day}"]`).value || 0);
      return { day, enabled, type: km > 0 ? 'run' : 'strength', km: enabled ? km : 0 };
    });
    this.db.plans.push({ id, name, createdAt:new Date().toISOString(), days });
    this.closeModal();
    this.renderAll();
  },
  duplicatePlan(id){
    const p = this.db.plans.find(x=>x.id===id); if(!p) return;
    this.db.plans.push({ ...JSON.parse(JSON.stringify(p)), id:`plan_${Date.now()}`, name:`${p.name} copia`, createdAt:new Date().toISOString() });
    this.renderAll();
  },


  openSessionModalFromEncoded(encoded){
    try{
      const decoded = JSON.parse(decodeURIComponent(encoded));
      this.openSessionModal(decoded);
    }catch(err){
      console.error('No se pudo abrir la sesión planificada', err);
      this.openSessionModal();
    }
  },

  openSessionModal(preset = null){
    let data = { fromPlan:false, type:'run', planName:'', planDay:'', plannedKm:'', date:this.todayISO(), sessionId:'', km:'', timeSeconds:0, steps:'', kcal:'', fc:'', cadence:'', strideLength:'', note:'' };
    if(preset && typeof preset === 'string'){
      try{ data = { ...data, ...JSON.parse(preset) }; }catch(e){}
    } else if (preset && typeof preset === 'object') {
      data = { ...data, ...preset };
    }
    const title = data.sessionId ? 'Editar entrenamiento' : (data.fromPlan ? `Completar ${data.planDay}` : 'Añadir entrenamiento');
    const editKmValue = data.km !== '' && data.km !== undefined ? data.km : (data.plannedKm || '');
    const editSeconds = Number(data.timeSeconds || 0);
    const editHours = String(Math.floor(editSeconds / 3600)).padStart(2,'0');
    const editMinutes = String(Math.floor((editSeconds % 3600) / 60)).padStart(2,'0');
    const editSecs = String(Math.floor(editSeconds % 60)).padStart(2,'0');
    this.showModal(`
      <div class="modal-box">
        <div class="modal-title">${title}</div>
        <div class="modal-subtitle">${data.fromPlan ? `Plan activo: ${data.planName}` : 'Registra carrera o fuerza.'}</div>
        <select id="sessionType" onchange="app.toggleSessionFields()">
          <option value="run" ${data.type==='run'?'selected':''}>Carrera</option>
          <option value="strength" ${data.type==='strength'?'selected':''}>Fuerza</option>
        </select>
        <input id="sessionDate" type="date" value="${this.escapeAttr(data.date || this.todayISO())}">
        <input id="sessionDistance" type="number" step="0.1" placeholder="Distancia km" value="${this.escapeAttr(editKmValue)}">
        <div id="runFields">
          <div class="time-picker-label">Duración</div>
          <div class="time-picker">
            <div id="sessionHourWheel" class="wheel"></div><div class="wheel-unit">:</div>
            <div id="sessionMinWheel" class="wheel"></div><div class="wheel-unit">:</div>
            <div id="sessionSecWheel" class="wheel"></div><div class="wheel-unit">h:m:s</div>
          </div>
          <input id="sessionSteps" type="number" placeholder="Pasos" value="${this.escapeAttr(data.steps || '')}">
        </div>
        <input id="sessionKcal" type="number" placeholder="Calorías" value="${this.escapeAttr(data.kcal || '')}">
        <input id="sessionFc" type="number" placeholder="Frecuencia cardíaca media" value="${this.escapeAttr(data.fc || '')}">
        <input id="sessionCadence" type="number" placeholder="Cadencia promedio (opcional)" value="${this.escapeAttr(data.cadence || '')}">
        <input id="sessionStride" type="number" placeholder="Zancada promedio cm (opcional)" value="${this.escapeAttr(data.strideLength || '')}">
        <textarea id="sessionNote" placeholder="Nota opcional">${this.escapeHtml(data.note || '')}</textarea>
        <button class="btn" onclick="app.saveSession('${this.escapeAttr(JSON.stringify(data))}')">Guardar sesión</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `, ()=>{
      this.setupWheel('sessionHourWheel', this.range(0,5).map(v=>String(v).padStart(2,'0')), editHours);
      this.setupWheel('sessionMinWheel', this.range(0,59).map(v=>String(v).padStart(2,'0')), editMinutes);
      this.setupWheel('sessionSecWheel', this.range(0,59).map(v=>String(v).padStart(2,'0')), editSecs);
      this.toggleSessionFields();
    });
  },
  toggleSessionFields(){
    const type = document.getElementById('sessionType')?.value;
    const runFields = document.getElementById('runFields');
    if(runFields) runFields.style.display = type === 'run' ? 'block':'none';
  },
  saveSession(presetString){
    let preset = { fromPlan:false, planName:'', planDay:'', plannedKm:'', type:'run' };
    try{ preset = { ...preset, ...JSON.parse(presetString) }; }catch(e){}
    const type = document.getElementById('sessionType').value;
    const date = document.getElementById('sessionDate').value || this.todayISO();
    const km = Number(document.getElementById('sessionDistance').value || 0);
    let timeSeconds = 0;
    let steps = 0;
    if(type === 'run'){
      const h = Number(document.getElementById('sessionHourWheel').dataset.selected || 0);
      const m = Number(document.getElementById('sessionMinWheel').dataset.selected || 0);
      const s = Number(document.getElementById('sessionSecWheel').dataset.selected || 0);
      timeSeconds = h*3600 + m*60 + s;
      steps = Number(document.getElementById('sessionSteps').value || 0);
    }
    const kcal = Number(document.getElementById('sessionKcal').value || 0);
    const fc = Number(document.getElementById('sessionFc').value || 0);
    let cadence = Number(document.getElementById('sessionCadence').value || 0);
    let stride = Number(document.getElementById('sessionStride').value || 0);
    const note = document.getElementById('sessionNote').value.trim();
    const calc = type === 'run' ? this.computeRunMetrics(km, timeSeconds, steps) : { pace:'--', paceValue:null, speed:'--', cadence:'--', strideLength:'--' };
    if(type === 'run'){
      if(!cadence && calc.cadenceNumber) cadence = calc.cadenceNumber;
      if(!stride && calc.strideNumber) stride = calc.strideNumber;
    }
    const obj = {
      id: preset.sessionId || `session_${Date.now()}`,
      title: preset.fromPlan ? `${preset.planDay} — ${type === 'run' ? 'Carrera' : 'Fuerza'}` : `${this.weekdayName(date)} — ${type === 'run' ? 'Carrera' : 'Fuerza'}`,
      type,
      fromPlan: !!preset.fromPlan,
      planName: preset.planName || '',
      planDay: preset.planDay || '',
      plannedKm: Number(preset.plannedKm || 0),
      km: km || '',
      diffKm: type === 'run' && preset.plannedKm !== '' ? Number((km - Number(preset.plannedKm || 0)).toFixed(1)) : '',
      date,
      timeSeconds,
      durationLabel: type === 'run' ? this.formatDuration(timeSeconds) : '--',
      pace: calc.pace,
      paceValue: calc.paceValue,
      speed: calc.speed,
      steps: steps || '',
      kcal: kcal || '',
      fc: fc || '',
      cadence: cadence || calc.cadence || '',
      strideLength: stride || calc.strideLength || '',
      note
    };
    const idx = this.db.sessions.findIndex(s=>s.id===obj.id);
    if(idx >= 0) this.db.sessions[idx] = obj; else this.db.sessions.push(obj);
    this.closeModal();
    this.renderAll();
  },
  openSessionModalForEdit(id){
    const s = this.db.sessions.find(x=>x.id===id);
    if(!s) return;
    this.openSessionModal({ fromPlan:s.fromPlan, planName:s.planName, planDay:s.planDay, plannedKm:s.plannedKm, date:s.date, type:s.type, sessionId:s.id, km:s.km || '', timeSeconds:s.timeSeconds || 0, steps:s.steps || '', kcal:s.kcal || '', fc:s.fc || '', cadence:s.cadence || '', strideLength:s.strideLength || '', note:s.note || '' });
  },

  openExportModal(){
    this.showModal(`
      <div class="modal-box compact">
        <div class="modal-title">Exportar entrenamientos</div>
        <div class="modal-subtitle">Copia un CSV con fecha, KPIs de entrenamiento y peso más cercano para pegarlo en ChatGPT.</div>
        <button class="btn" onclick="app.exportCSVRange(4)">Copiar últimas 4 semanas</button>
        <button class="btn" onclick="app.exportCSVRange(8)">Copiar últimas 8 semanas</button>
        <button class="btn" onclick="app.exportCSVRange(16)">Copiar últimas 16 semanas</button>
        <button class="btn secondary" onclick="app.exportCSVRange('all')">Copiar todo</button>
        <button class="btn secondary" onclick="app.closeModal()">Cancelar</button>
      </div>
    `);
  },
  exportCSVRange(range){
    const since = this.getExportStartDate(range);
    const sessions = this.db.sessions.filter(s => !since || new Date(s.date) >= since).sort((a,b)=> new Date(a.date) - new Date(b.date));
    let csv = 'fecha,dia_semana,tipo,origen,plan,dia_plan,km_plan,km_real,diferencia_km,tiempo,segundos,ritmo_min_km,velocidad_km_h,pasos,kcal,fc_media,cadencia_pasos_min,zancada_cm,peso_mas_cercano_kg,fecha_peso_usado\n';
    sessions.forEach(s => {
      const closestWeight = this.closestWeightToDate(s.date);
      const dateObj = new Date(s.date);
      csv += [
        this.formatCSVDate(s.date),
        dateObj.toLocaleDateString('es-CL', { weekday:'long' }),
        s.type === 'run' ? 'carrera':'fuerza',
        s.fromPlan ? 'plan':'libre',
        s.planName || '',
        s.planDay || '',
        s.plannedKm || '',
        s.km || '',
        s.diffKm || '',
        s.durationLabel || '',
        s.timeSeconds || '',
        s.pace || '',
        s.speed || '',
        s.steps || '',
        s.kcal || '',
        s.fc || '',
        s.cadence || '',
        s.strideLength || '',
        closestWeight?.value || '',
        closestWeight?.date ? this.formatCSVDate(closestWeight.date) : ''
      ].map(v => this.csvSafe(v)).join(',') + '\n';
    });
    navigator.clipboard.writeText(csv);
    alert(`CSV copiado: ${range==='all' ? 'todo el historial' : `últimas ${range} semanas`}`);
    this.closeModal();
  },
  getExportStartDate(range){ if(range === 'all') return null; const d = new Date(); d.setDate(d.getDate() - Number(range)*7); d.setHours(0,0,0,0); return d; },
  closestWeightToDate(date){
    if(!this.db.weights.length) return null;
    const target = new Date(date).getTime();
    return [...this.db.weights].sort((a,b)=> Math.abs(new Date(a.date).getTime()-target) - Math.abs(new Date(b.date).getTime()-target))[0] || null;
  },

  getProgressData(){
    const since = this.getExportStartDate(this.progressRange);
    const filteredSessions = this.db.sessions.filter(s => !since || new Date(s.date) >= since);
    const filteredWeights = this.db.weights.filter(w => !since || new Date(w.date) >= since);
    const totalKm = filteredSessions.reduce((acc,s)=> acc + Number(s.km || 0), 0);
    const adherence = this.weeklyAdherenceSeries(filteredSessions);
    return {
      filteredSessions,
      totalKm:Number(totalKm.toFixed(1)),
      avgAdherence: adherence.values.length ? Math.round(adherence.values.reduce((a,b)=>a+b,0)/adherence.values.length) : 0,
      weights:{ labels: filteredWeights.map(w => this.shortChartDate(w.date)), values: filteredWeights.map(w => Number(w.value)) },
      weeklyKm:this.weeklyKmSeries(filteredSessions),
      sessionPace:this.sessionPaceSeries(filteredSessions),
      adherence
    };
  },
  weeklyKmSeries(sessions){
    const map = {};
    sessions.filter(s=>s.type==='run').forEach(s => { const k = this.weekLabel(s.date); map[k] = (map[k] || 0) + Number(s.km || 0); });
    const labels = Object.keys(map).sort((a,b)=> new Date(a.split('|')[0]) - new Date(b.split('|')[0]));
    return { labels: labels.map(k => this.weekLabelNice(k)), values: labels.map(k => Number(map[k].toFixed(1))) };
  },
  sessionPaceSeries(sessions){
    const runs = sessions.filter(s=>s.type==='run' && Number(s.km) > 0 && Number(s.timeSeconds) > 0).sort((a,b)=> new Date(a.date)-new Date(b.date));
    return { labels: runs.map(s => this.shortChartDate(s.date)), values: runs.map(s => Number((s.timeSeconds / s.km / 60).toFixed(2))) };
  },
  weeklyAdherenceSeries(sessions){
    const plans = [...this.db.plans].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
    if(!plans.length) return { labels:[], values:[] };
    const labels = plans.map(p => p.name);
    const values = plans.map(p => {
      const planned = p.days.filter(d=>d.enabled).length;
      const completed = p.days.filter(d=>d.enabled && sessions.some(s => s.fromPlan && s.planName === p.name && s.planDay === d.day)).length;
      return planned ? Math.round((completed / planned) * 100) : 0;
    });
    return { labels, values };
  },
  getNiceAxisBounds(values, options = {}){
    const { clampZero = false, fixedPercent = false } = options;
    if(fixedPercent) return { min:0, max:100, step:20 };
    const clean = (values || []).map(Number).filter(v => Number.isFinite(v));
    if(!clean.length) return { min:0, max:10, step:1 };
    const minValue = Math.min(...clean);
    const maxValue = Math.max(...clean);
    let min = Math.ceil(minValue * 0.75);
    let max = Math.ceil(maxValue * 1.25);
    if(clampZero && min < 0) min = 0;
    if(clampZero && minValue >= 0 && min < 0) min = 0;
    if(max <= min) max = min + 1;
    const range = max - min;
    let step = Math.ceil(range / 5);
    if(step < 1) step = 1;
    return { min, max, step };
  },

  cloudStatusLabel(){
    const map = { local:'local', connecting:'conectando', synced:'sincronizado', saving:'guardando', error:'error', disabled:'desactivado' };
    return map[this.cloudStatus] || this.cloudStatus;
  },
  cleanSyncId(value){
    return String(value || 'diego-sergei-run').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'diego-sergei-run';
  },
  syncDocRef(){
    const syncId = this.cleanSyncId(this.db.sync?.syncId || 'diego-sergei-run');
    if(!this.db.sync) this.db.sync = {};
    this.db.sync.syncId = syncId;
    return doc(firestoreDB, 'sergei_sync', syncId);
  },
  async setupCloudSync(){
    if(!this.db.sync?.enabled){
      this.cloudStatus = 'disabled';
      return;
    }
    try{
      this.cloudStatus = 'connecting';
      const ref = this.syncDocRef();
      const snap = await getDoc(ref);
      if(snap.exists()){
        const remote = snap.data()?.data;
        if(remote){
          this.cloudApplyingRemote = true;
          this.db = this.mergeCloudData(this.db, remote);
          localStorage.setItem(this.storageKey, JSON.stringify(this.db));
          this.cloudApplyingRemote = false;
          this.renderAll(true);
        }
      }else{
        await this.forceCloudUpload(false);
      }
      this.cloudReady = true;
      this.cloudStatus = 'synced';
      if(this.cloudUnsubscribe) this.cloudUnsubscribe();
      this.cloudUnsubscribe = onSnapshot(ref, (snapshot)=>{
        if(!snapshot.exists()) return;
        const remote = snapshot.data()?.data;
        if(!remote || this.cloudApplyingRemote) return;
        const remoteAt = Number(remote.sync?.cloudUpdatedAt || snapshot.data()?.updatedAt || 0);
        const localAt = Number(this.db.sync?.cloudUpdatedAt || 0);
        if(remoteAt > localAt){
          this.cloudApplyingRemote = true;
          this.db = this.mergeCloudData(this.db, remote);
          localStorage.setItem(this.storageKey, JSON.stringify(this.db));
          this.cloudApplyingRemote = false;
          this.cloudStatus = 'synced';
          this.renderAll(true);
        }
      }, (err)=>{
        this.cloudStatus = 'error';
        this.cloudError = err.message || String(err);
        console.error('Firestore sync error', err);
      });
    }catch(err){
      this.cloudStatus = 'error';
      this.cloudError = err.message || String(err);
      console.error('Cloud setup error', err);
    }
  },
  scheduleCloudSave(){
    if(this.cloudApplyingRemote || !this.db?.sync?.enabled || !this.cloudReady) return;
    clearTimeout(this.cloudSaveTimer);
    this.cloudSaveTimer = setTimeout(()=> this.forceCloudUpload(false), 900);
  },
  async forceCloudUpload(showAlert = true){
    try{
      if(!this.db.sync) this.db.sync = { enabled:true, syncId:'diego-sergei-run' };
      this.db.sync.enabled = true;
      this.db.sync.syncId = this.cleanSyncId(this.db.sync.syncId || 'diego-sergei-run');
      const ts = Date.now();
      this.db.sync.cloudUpdatedAt = ts;
      this.cloudStatus = 'saving';
      localStorage.setItem(this.storageKey, JSON.stringify(this.db));
      await setDoc(this.syncDocRef(), { data:this.db, updatedAt:ts }, { merge:true });
      this.cloudStatus = 'synced';
      this.cloudError = '';
      if(showAlert) alert('Datos locales subidos a Firestore.');
    }catch(err){
      this.cloudStatus = 'error';
      this.cloudError = err.message || String(err);
      console.error('Cloud upload error', err);
      if(showAlert) alert('No se pudo subir a Firestore: ' + this.cloudError);
    }
  },
  async forceCloudDownload(){
    try{
      this.cloudStatus = 'connecting';
      const snap = await getDoc(this.syncDocRef());
      if(!snap.exists()){
        alert('No hay datos en nube para este Sync ID.');
        this.cloudStatus = 'synced';
        return;
      }
      const remote = snap.data()?.data;
      if(remote){
        this.cloudApplyingRemote = true;
        this.db = this.mergeCloudData(this.db, remote);
        localStorage.setItem(this.storageKey, JSON.stringify(this.db));
        this.cloudApplyingRemote = false;
        this.cloudStatus = 'synced';
        this.closeModal();
        this.renderAll();
        alert('Datos descargados y fusionados desde Firestore.');
      }
    }catch(err){
      this.cloudStatus = 'error';
      this.cloudError = err.message || String(err);
      alert('No se pudo bajar desde Firestore: ' + this.cloudError);
    }
  },
  connectCloudFromProfile(){
    if(this.cloudUnsubscribe) this.cloudUnsubscribe();
    this.cloudReady = false;
    this.closeModal();
    this.setupCloudSync();
    this.renderAll();
  },
  mergeById(localArr = [], remoteArr = [], idField = 'id'){
    const map = new Map();
    [...remoteArr, ...localArr].forEach(item=>{
      if(!item) return;
      const key = item[idField] || JSON.stringify(item);
      map.set(key, { ...(map.get(key)||{}), ...item });
    });
    return [...map.values()];
  },
  mergeWeights(localArr = [], remoteArr = []){
    const map = new Map();
    [...remoteArr, ...localArr].forEach(w=>{
      if(!w) return;
      const key = `${w.date}|${w.value}`;
      map.set(key,w);
    });
    return [...map.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
  },
  mergeNutritionLogs(localLogs = {}, remoteLogs = {}){
    const out = { ...remoteLogs };
    Object.keys(localLogs || {}).forEach(date=>{
      const l = localLogs[date] || {};
      const r = out[date] || {};
      out[date] = {
        ...r,
        ...l,
        meals:{ ...(r.meals||{}), ...(l.meals||{}) },
        offPlanMeals:[...(r.offPlanMeals||[]), ...(l.offPlanMeals||[])].filter((v,i,a)=>a.indexOf(v)===i),
        waterGlasses: Math.max(Number(r.waterGlasses||0), Number(l.waterGlasses||0)),
        alcohol: Math.max(Number(r.alcohol||0), Number(l.alcohol||0))
      };
    });
    return out;
  },
  mergeCloudData(local, remote){
    const base = { ...this.defaultDB(), ...remote, ...local };
    base.profile = { ...(remote.profile||{}), ...(local.profile||{}) };
    base.sync = { ...(remote.sync||{}), ...(local.sync||{}), enabled:true, syncId:this.cleanSyncId(local.sync?.syncId || remote.sync?.syncId || 'diego-sergei-run') };
    base.weights = this.mergeWeights(local.weights, remote.weights);
    base.sessions = this.mergeById(local.sessions, remote.sessions);
    base.plans = this.mergeById(local.plans, remote.plans);
    base.completedRaces = this.mergeById(local.completedRaces, remote.completedRaces);
    base.nutritionLogs = this.mergeNutritionLogs(local.nutritionLogs, remote.nutritionLogs);
    base.goalWeight = local.goalWeight || remote.goalWeight || 90;
    base.startWeight = local.startWeight || remote.startWeight || base.weights?.[0]?.value || 109;
    base.race = local.race?.title ? local.race : (remote.race || local.race || {title:'',date:'',distance:''});
    return base;
  },

  getActivePlan(){
    if(!this.db.plans.length) return null;
    return [...this.db.plans].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];
  },
  planSummary(plan){ return plan.days.filter(d=>d.enabled).map(d => `${d.day} ${d.type === 'run' ? `${this.formatNumber(d.km)}km` : 'Fuerza'}`).join(' · '); },
  sessionsThisWeek(){
    const { start, end } = this.currentWeekRange();
    return this.db.sessions.filter(s => { const d = new Date(`${s.date}T12:00:00`); return d >= start && d <= end; });
  },
  currentWeekRange(){
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = (d.getDay() + 6) % 7;
    const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return { start, end };
  },
  dateForCurrentWeek(dayName){
    const idx = this.dayNames.indexOf(dayName);
    const { start } = this.currentWeekRange();
    const d = new Date(start); d.setDate(start.getDate() + idx);
    return this.formatCSVDate(d);
  },
  findWeekPlannedSession(dayName, planName){
    return this.sessionsThisWeek().find(s => s.fromPlan && s.planName === planName && s.planDay === dayName);
  },
  getDuePlanMetrics(plan){
    if(!plan) return { dueCount:0, doneDue:0, adherenceToDate:0, plannedKmDue:0, actualKm:0, diffKm:0, weekClosure:0 };
    const todayIdx = (new Date().getDay() + 6) % 7;
    const dueDays = plan.days.filter(d=>d.enabled && this.dayNames.indexOf(d.day) <= todayIdx);
    const sessions = this.sessionsThisWeek();
    const doneDue = dueDays.filter(d => sessions.some(s => s.fromPlan && s.planName === plan.name && s.planDay === d.day)).length;
    const allEnabled = plan.days.filter(d=>d.enabled);
    const completedAll = allEnabled.filter(d => sessions.some(s => s.fromPlan && s.planName === plan.name && s.planDay === d.day)).length;
    const plannedKmDue = dueDays.reduce((acc,d)=> acc + Number(d.km || 0), 0);
    const actualKm = dueDays.reduce((acc,d)=> {
      const s = sessions.find(s=> s.fromPlan && s.planName === plan.name && s.planDay === d.day);
      return acc + Number(s?.km || 0);
    }, 0);
    const dueCount = dueDays.length || 0;
    const adherenceToDate = dueCount ? Math.round((doneDue / dueCount) * 100) : 0;
    const weekClosure = allEnabled.length ? Math.round((completedAll / allEnabled.length) * 100) : 0;
    const diffKm = Number((actualKm - plannedKmDue).toFixed(1));
    return { dueCount, doneDue, adherenceToDate, plannedKmDue:Number(plannedKmDue.toFixed(1)), actualKm:Number(actualKm.toFixed(1)), diffKm, weekClosure };
  },
  streakWeeks(){
    const weeks = {};
    this.db.sessions.forEach(s => { const key = this.weekLabel(s.date); weeks[key] = true; });
    const labels = Object.keys(weeks).sort((a,b)=> new Date(b.split('|')[0]) - new Date(a.split('|')[0]));
    let streak = 0;
    let cursorStart = this.currentWeekRange().start;
    for(let i=0;i<52;i++){
      const label = `${this.formatCSVDate(cursorStart)}|${this.formatCSVDate(new Date(cursorStart.getTime()+6*86400000))}`;
      if(weeks[label]) streak++; else break;
      cursorStart = new Date(cursorStart.getTime() - 7*86400000);
    }
    return streak;
  },
  bestWeekSummary(){
    const weekly = this.weeklyKmSeries(this.db.sessions);
    if(!weekly.labels.length) return '0 sesiones';
    const weeks = {};
    this.db.sessions.forEach(s => { const key = this.weekLabel(s.date); if(!weeks[key]) weeks[key] = { sessions:0 }; weeks[key].sessions += 1; });
    const best = Object.entries(weeks).sort((a,b)=> b[1].sessions - a[1].sessions)[0];
    if(!best) return '0 sesiones';
    return `${best[1].sessions} sesiones (${this.weekLabelNice(best[0])})`;
  },
  getHabitKPIs(){
    const dates = Object.keys(this.db.nutritionLogs).sort((a,b)=> new Date(b)-new Date(a));
    let daysWithoutAlcohol = 0, daysWithoutOffPlan = 0, nutritionStreak = 0, waterSum = 0, waterCount = 0;
    const today = new Date(this.todayISO());
    for(let i=0;i<90;i++){
      const d = new Date(today); d.setDate(today.getDate() - i);
      const iso = this.formatCSVDate(d);
      const log = this.getNutritionLog(iso);
      if(i === daysWithoutAlcohol && Number(log.alcohol || 0) === 0) daysWithoutAlcohol++;
      if(i === daysWithoutOffPlan && (log.offPlanMeals || []).length === 0) daysWithoutOffPlan++;
      if(i === nutritionStreak && this.nutritionScore(iso) >= 80) nutritionStreak++;
      if(i < 7){ waterSum += Number(log.waterGlasses || 0); waterCount++; }
    }
    return { daysWithoutAlcohol, daysWithoutOffPlan, nutritionStreak, avgWater: `${waterCount ? (waterSum / waterCount).toFixed(1) : '0.0'} / ${this.db.nutrition.waterGoal}` };
  },

  getNutritionLog(date){
    if(!this.db.nutritionLogs[date]) this.db.nutritionLogs[date] = { meals:{}, waterGlasses:0, offPlanMeals:[], alcohol:0 };
    return this.db.nutritionLogs[date];
  },
  nutritionCompletedMeals(date){
    const log = this.getNutritionLog(date);
    return Object.values(log.meals).filter(Boolean).length;
  },
  nutritionScore(date){
    const log = this.getNutritionLog(date);
    const mealScore = (this.nutritionCompletedMeals(date) / this.mealCatalog.length) * 70;
    const waterScore = Math.min(20, (Number(log.waterGlasses || 0) / this.db.nutrition.waterGoal) * 20);
    const penalty = (log.offPlanMeals.length * 6) + (Number(log.alcohol || 0) * 8);
    return Math.max(0, Math.min(100, Math.round(mealScore + waterScore - penalty)));
  },
  renderHeatmap(){
    const year = new Date().getFullYear();
    const cells = [];
    for(let i=0;i<84;i++){
      const d = new Date(year, 0, 1); d.setDate(d.getDate() + i);
      const iso = this.formatCSVDate(d);
      const score = this.nutritionScore(iso);
      let color = '#F2EFE7';
      if(score >= 80) color = '#37312B'; else if(score >= 60) color = '#9D7321'; else if(score >= 40) color = '#C8AE56'; else if(score >= 20) color = '#E1D5A3';
      cells.push(`<div class="heatmap-cell" title="${iso} · ${score}%" style="background:${color}"></div>`);
    }
    return cells.join('');
  },

  latestWeight(){ return this.db.weights.length ? [...this.db.weights].sort((a,b)=> new Date(a.date)-new Date(b.date)).slice(-1)[0] : null; },
  weightProgress(){
    const current = Number(this.latestWeight()?.value || 0);
    const start = Number(this.db.startWeight || current || 0);
    const goal = Number(this.db.goalWeight || current || 0);
    const totalToLose = Math.max(0.1, start - goal);
    const lost = Math.max(0, Number((start - current).toFixed(1)));
    const remaining = Math.max(0, Number((current - goal).toFixed(1)));
    const percent = Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));
    return { current, lost, remaining, percent };
  },
  computeRunMetrics(km, timeSeconds, steps){
    km = Number(km || 0); timeSeconds = Number(timeSeconds || 0); steps = Number(steps || 0);
    let pace='--', paceValue=null, speed='--', cadence='--', cadenceNumber=null, strideLength='--', strideNumber=null;
    if(km > 0 && timeSeconds > 0){
      const paceSec = timeSeconds / km;
      const min = Math.floor(paceSec / 60);
      const sec = Math.round(paceSec % 60).toString().padStart(2,'0');
      pace = `${min}:${sec} min/km`;
      paceValue = Number((paceSec / 60).toFixed(2));
      speed = Number(((km / timeSeconds) * 3600).toFixed(2));
    }
    if(steps > 0 && timeSeconds > 0){
      cadenceNumber = Math.round(steps / (timeSeconds / 60));
      cadence = cadenceNumber;
    }
    if(steps > 0 && km > 0){
      strideNumber = Math.round((km * 100000) / steps);
      strideLength = strideNumber;
    }
    return { pace, paceValue, speed, cadence, cadenceNumber, strideLength, strideNumber };
  },

  setupWheel(id, values, currentValue){
    const el = document.getElementById(id);
    if(!el) return;
    const vals = values.map(v => String(v));
    const rowH = 42;
    el.innerHTML = vals.map(v => `<div class="wheel-item">${v}</div>`).join('');
    const setSelection = () => {
      let idx = Math.round(el.scrollTop / rowH);
      idx = Math.max(0, Math.min(vals.length - 1, idx));
      el.dataset.selected = vals[idx];
      [...el.children].forEach((child, i) => { child.style.opacity = i === idx ? '1' : '.45'; child.style.transform = i === idx ? 'scale(1.06)' : 'scale(1)'; });
    };
    let idx = vals.findIndex(v => v === String(currentValue));
    if(idx < 0) idx = 0;
    el.scrollTop = idx * rowH;
    setSelection();
    let timer;
    el.onscroll = () => {
      clearTimeout(timer);
      setSelection();
      timer = setTimeout(()=>{
        let snapIdx = Math.round(el.scrollTop / rowH);
        snapIdx = Math.max(0, Math.min(vals.length - 1, snapIdx));
        el.scrollTo({ top:snapIdx * rowH, behavior:'smooth' });
        el.dataset.selected = vals[snapIdx];
        setSelection();
      }, 90);
    };
  },
  showModal(html, afterOpen=null, raw=false){
    const modal = document.getElementById('modal');
    modal.innerHTML = raw ? html : html;
    modal.classList.remove('hidden');
    if(typeof afterOpen === 'function') setTimeout(afterOpen, 20);
  },
  closeModal(){
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    modal.innerHTML = '';
  },

  todayISO(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  },

  formatDateLong(date){ return date.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' }).replace(/(^\w)/, l=>l.toUpperCase()); },
  formatDateShort(date){ return date ? new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }) : ''; },
  formatDateForBadge(date){ if(!date) return ''; const d = new Date(`${date}T12:00:00`); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getFullYear()).slice(-2)}.`; },
  shortChartDate(date){ return new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { day:'2-digit', month:'short' }).replace(/\.$/,''); },
  weekdayName(date){ return new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { weekday:'long' }).replace(/(^\w)/, l=>l.toUpperCase()); },
  relativeDay(date){
    const today = this.todayISO();
    if(date === today) return 'Hoy';
    return this.weekdayName(date);
  },
  daysUntil(date){
    const target = new Date(`${date}T00:00:00`); const today = new Date(); today.setHours(0,0,0,0);
    return Math.max(0, Math.ceil((target - today)/86400000));
  },
  formatDuration(seconds){
    const h = Math.floor(seconds / 3600).toString().padStart(2,'0');
    const m = Math.floor((seconds % 3600)/60).toString().padStart(2,'0');
    const s = Math.floor(seconds % 60).toString().padStart(2,'0');
    return `${h}:${m}:${s}`;
  },
  weekLabel(date){
    const d = new Date(`${date}T12:00:00`);
    const day = (d.getDay() + 6) % 7;
    const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${this.formatCSVDate(start)}|${this.formatCSVDate(end)}`;
  },
  weekLabelNice(label){
    const [start] = label.split('|');
    return this.shortChartDate(start);
  },
  formatCSVDate(date){
    const d = typeof date === 'string' ? new Date(date.includes('T') ? date : `${date}T12:00:00`) : new Date(date);
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  },
  formatNumber(v){ const n = Number(v || 0); return Number.isInteger(n) ? String(n) : n.toFixed(1); },
  range(a,b){ return Array.from({length:b-a+1}, (_,i)=> a+i); },
  csvSafe(value){ const text = String(value ?? ''); return (text.includes(',') || text.includes('\n') || text.includes('"')) ? `"${text.replaceAll('"','""')}"` : text; },
  slugify(text){ return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); },
  escapeHtml(text){ return String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  escapeAttr(text){ return this.escapeHtml(text); },
  escapeJS(text){ return `'${String(text).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'`; }
};

window.app = app;
window.addEventListener('DOMContentLoaded', ()=> app.init());

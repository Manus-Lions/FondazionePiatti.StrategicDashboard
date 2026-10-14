const STORAGE_KEY = "rp-strategy-dashboard-v2";

const statusLabels = {
  analyzed: "Analizzato",
  partial: "Parzialmente analizzato",
  verify: "Da verificare",
  proposal: "Proposta"
};

const phaseLabels = {
  done: "Completata",
  active: "In corso",
  planned: "Pianificata",
  blocked: "Bloccata da dati"
};

const dependencyTypeLabels = {
  baseline: "Costruisce la baseline",
  prerequisite: "Prerequisito di processo",
  sizing: "Dimensiona la stima",
  conversion: "Converte ore in capacità",
  evidence: "Produce evidenza prima-dopo",
  enabling: "Abilita il controllo",
  measurement: "Rende il beneficio misurabile"
};

const state = {
  data: null,
  originalData: null,
  activeView: "portfolio",
  activeAxis: "all",
  status: "all",
  context: "all",
  search: "",
  layout: "cards",
  selectedId: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", initialise);

async function initialise() {
  cacheElements();
  bindStaticEvents();

  try {
    const response = await fetch("./data/portfolio.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.originalData = await response.json();
    state.data = hydrateData(loadSavedData(), state.originalData);
    populateAxisOptions();
    populateContextFilter();
    renderAll();
  } catch (error) {
    elements.portfolioGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">!</div>
        <h3>Dati non disponibili</h3>
        <p>Avvia il progetto da Visual Studio o con <code>dotnet run</code>. Dettaglio: ${escapeHtml(error.message)}</p>
      </div>`;
  }
}

function cacheElements() {
  [
    "updateStamp", "metrics", "axisList", "clearAxis", "resultCount", "searchInput",
    "statusFilter", "contextFilter", "portfolioGrid", "contextGrid", "roadmapTable",
    "sourceSummary", "sourceList", "benefitSummary", "benefitRank", "completedSummary",
    "logicPrinciple", "logicSummary", "logicPaths", "dependencyMatrix", "decisionGates",
    "legalGovernanceNote", "legalFlow", "legalPrinciples", "externalWorkers", "legalSourceNote",
    "questionSummary", "questionList", "exportButton", "addButton", "resetButton",
    "drawerBackdrop", "detailDrawer", "drawerCode", "drawerTitle", "drawerContent",
    "closeDrawer", "addModal", "addForm", "newAxis", "emptyStateTemplate"
  ].forEach(id => { elements[id] = document.getElementById(id); });
}

function bindStaticEvents() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".switch-button").forEach(button => {
    button.addEventListener("click", () => {
      state.layout = button.dataset.layout;
      document.querySelectorAll(".switch-button").forEach(item => item.classList.toggle("is-active", item === button));
      renderPortfolio();
    });
  });

  elements.searchInput.addEventListener("input", event => {
    state.search = event.target.value.trim().toLocaleLowerCase("it");
    renderPortfolio();
  });
  elements.statusFilter.addEventListener("change", event => {
    state.status = event.target.value;
    renderPortfolio();
  });
  elements.contextFilter.addEventListener("change", event => {
    state.context = event.target.value;
    renderPortfolio();
  });
  elements.clearAxis.addEventListener("click", () => {
    state.activeAxis = "all";
    renderAxes();
    renderPortfolio();
  });
  elements.exportButton.addEventListener("click", exportData);
  elements.addButton.addEventListener("click", () => elements.addModal.showModal());
  elements.resetButton.addEventListener("click", resetData);
  elements.closeDrawer.addEventListener("click", closeDrawer);
  elements.drawerBackdrop.addEventListener("click", closeDrawer);
  elements.addForm.addEventListener("submit", addInitiative);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && elements.detailDrawer.classList.contains("is-open")) closeDrawer();
  });
}

function renderAll() {
  renderUpdateStamp();
  renderMetrics();
  renderAxes();
  renderPortfolio();
  renderBenefits();
  renderLogicOrder();
  renderLegalGovernance();
  renderContexts();
  renderRoadmap();
  renderSources();
  renderQuestions();
}

function renderUpdateStamp() {
  const date = new Date(`${state.data.meta.updated}T12:00:00`);
  elements.updateStamp.textContent = `Aggiornato ${new Intl.DateTimeFormat("it-IT", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date)}`;
}

function renderMetrics() {
  const initiatives = state.data.initiatives;
  const analyzed = initiatives.filter(item => item.status === "analyzed").length;
  const partial = initiatives.filter(item => item.status === "partial").length;
  const toValidate = initiatives.filter(item => ["verify", "proposal"].includes(item.status)).length;
  const contexts = new Set(initiatives.flatMap(item => item.contexts.map(context => context.name))).size;
  const averageConfidence = Math.round(average(initiatives.map(item => item.confidence)));
  const cards = [
    { label: "Portafoglio", value: initiatives.length, foot: `cantieri su ${state.data.axes.length} direttrici`, color: "#1f6654" },
    { label: "Con evidenze", value: analyzed + partial, foot: `${analyzed} analizzati · ${partial} parziali`, color: "#4169e1" },
    { label: "Da validare", value: toValidate, foot: "richiedono dati o mandato", color: "#b36b26" },
    { label: "Copertura operativa", value: contexts, foot: `${averageConfidence}% confidenza media`, color: "#7b5bb5" }
  ];

  elements.metrics.innerHTML = cards.map(card => `
    <article class="metric-card" style="--metric-accent:${card.color}">
      <span class="metric-label">${card.label}</span>
      <strong class="metric-value">${card.value}</strong>
      <span class="metric-foot">${card.foot}</span>
    </article>`).join("");
}

function renderAxes() {
  elements.axisList.innerHTML = state.data.axes.map(axis => {
    const linked = state.data.initiatives.filter(item => item.axisIds.includes(axis.id));
    const maturity = Math.round(average(linked.map(item => item.confidence)));
    return `
      <button class="axis-card ${state.activeAxis === axis.id ? "is-active" : ""}"
        style="--axis-color:${axis.color}" data-axis="${axis.id}" title="${escapeHtml(axis.description)}">
        <span class="axis-head"><span class="axis-index">${axis.index}</span><span class="axis-count">${linked.length} cantieri</span></span>
        <strong class="axis-name">${escapeHtml(axis.name)}</strong>
        <span class="axis-track"><i style="width:${maturity}%"></i></span>
        <span class="axis-meta"><span>confidenza</span><strong>${maturity}%</strong></span>
      </button>`;
  }).join("");

  elements.axisList.querySelectorAll(".axis-card").forEach(card => {
    card.addEventListener("click", () => {
      state.activeAxis = state.activeAxis === card.dataset.axis ? "all" : card.dataset.axis;
      renderAxes();
      renderPortfolio();
    });
  });
}

function renderPortfolio() {
  const initiatives = filteredInitiatives();
  elements.resultCount.textContent = `${initiatives.length} ${initiatives.length === 1 ? "intervento" : "interventi"}`;
  elements.portfolioGrid.classList.toggle("table-layout", state.layout === "table");

  if (!initiatives.length) {
    elements.portfolioGrid.replaceChildren(elements.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  elements.portfolioGrid.innerHTML = initiatives.map(item => {
    const color = confidenceColor(item.confidence);
    return `
      <article class="initiative-card" tabindex="0" role="button" data-id="${item.id}" aria-label="Apri ${escapeHtml(item.title)}">
        <div class="card-topline">
          <span class="card-code">${item.id}</span>
          <span class="status-badge status-${item.status}">${statusLabels[item.status]}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="card-summary">${escapeHtml(item.summary)}</p>
        <div class="axis-chips">${renderAxisChips(item.axisIds)}</div>
        <div class="context-chips">${item.contexts.slice(0, 2).map(context => `<span class="context-chip">${escapeHtml(context.name)}</span>`).join("")}</div>
        <div class="benefit-teaser">
          <span>Beneficio potenziale</span>
          <strong>${formatBenefitPotential(item.benefit)}</strong>
          <small>${escapeHtml(item.benefit.statement)}</small>
        </div>
        <div class="card-footer">
          <div class="confidence">
            <span class="confidence-label"><span>Confidenza evidenze</span><strong>${item.confidence}%</strong></span>
            <span class="confidence-bar"><i style="width:${item.confidence}%;--confidence-color:${color}"></i></span>
          </div>
          <div class="next-step"><strong>Prossimo passo</strong>${escapeHtml(item.nextStep)}</div>
        </div>
      </article>`;
  }).join("");

  elements.portfolioGrid.querySelectorAll(".initiative-card").forEach(card => {
    card.addEventListener("click", () => openDrawer(card.dataset.id));
    card.addEventListener("keydown", event => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        openDrawer(card.dataset.id);
      }
    });
  });
}

function renderBenefits() {
  const initiatives = [...state.data.initiatives].sort((a, b) => b.benefit.priorityScore - a.benefit.priorityScore);
  const incomplete = initiatives.filter(item => !isCompleted(item));
  const quantified = incomplete.filter(item => hasEconomicEstimate(item.benefit));
  const measured = initiatives.reduce((sum, item) => sum + Number(item.benefit.measuredAnnual || 0), 0);
  const grossLow = quantified.reduce((sum, item) => sum + item.benefit.annualLow, 0);
  const grossHigh = quantified.reduce((sum, item) => sum + item.benefit.annualHigh, 0);
  const weightedRemaining = incomplete.reduce((sum, item) => {
    if (!hasEconomicEstimate(item.benefit)) return sum;
    const midpoint = (item.benefit.annualLow + item.benefit.annualHigh) / 2;
    return sum + Math.max(0, midpoint * item.confidence / 100 - Number(item.benefit.measuredAnnual || 0));
  }, 0);
  const unmonetized = incomplete.filter(item => !hasEconomicEstimate(item.benefit)).length;
  const outlook = measured + weightedRemaining;

  elements.benefitSummary.innerHTML = `
    <article class="benefit-stat" style="--stat-color:#dff1eb"><span>Benefici misurati</span><strong>${formatEuro(measured)}</strong><small>${initiatives.filter(item => item.benefit.measuredAnnual > 0).length} interventi con consuntivo</small></article>
    <article class="benefit-stat" style="--stat-color:#e9eeff"><span>Potenziale annuo lordo</span><strong>${formatRange(grossLow, grossHigh)}</strong><small>${quantified.length} scenari economici espliciti</small></article>
    <article class="benefit-stat" style="--stat-color:#fff1d4"><span>Previsione residua ponderata</span><strong>${formatEuro(weightedRemaining)}</strong><small>midpoint × confidenza, al netto del misurato</small></article>
    <article class="benefit-stat" style="--stat-color:#eeeaf7"><span>Totale atteso misurato + residuo</span><strong>${formatEuro(outlook)}</strong><small>${unmonetized} benefici ancora non monetizzati</small></article>`;

  elements.benefitRank.innerHTML = `
    <div class="benefit-table-head"><span>#</span><span>Intervento e apporto</span><span>Potenziale annuo</span><span>Previsione ponderata</span><span>Misurato</span><span>Indice</span></div>
    ${initiatives.map((item, index) => {
      const weighted = hasEconomicEstimate(item.benefit)
        ? ((item.benefit.annualLow + item.benefit.annualHigh) / 2) * item.confidence / 100
        : null;
      return `
        <button class="benefit-row" data-id="${item.id}">
          <div class="rank-number">${String(index + 1).padStart(2, "0")}</div>
          <div class="benefit-title"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.benefit.statement)}</span></div>
          <div class="benefit-potential"><strong>${formatBenefitPotential(item.benefit)}</strong><span>${escapeHtml(item.benefit.primaryType)}</span></div>
          <div class="benefit-forecast"><strong>${weighted === null ? "Non calcolabile" : formatEuro(weighted)}</strong><span>${item.confidence}% confidenza</span></div>
          <div class="benefit-measured"><strong>${formatEuro(item.benefit.measuredAnnual)}</strong><span>${item.benefit.measuredEvidence ? "con evidenza" : "da consuntivare"}</span></div>
          <div><span class="benefit-score" style="--score-color:${confidenceColor(item.benefit.priorityScore)}">${item.benefit.priorityScore}</span></div>
        </button>`;
    }).join("")}`;

  elements.benefitRank.querySelectorAll(".benefit-row").forEach(row => {
    row.addEventListener("click", () => openDrawer(row.dataset.id));
  });

  const completed = initiatives.filter(isCompleted);
  if (!completed.length) {
    elements.completedSummary.innerHTML = `<div class="completed-empty"><strong>Nessun intervento risulta ancora concluso.</strong>Il consuntivo iniziale è quindi ${formatEuro(measured)}. Un cantiere entrerà qui quando tutte le quattro fasi saranno completate; il beneficio resterà zero finché non saranno inseriti importo, periodo ed evidenza.</div>`;
    return;
  }

  elements.completedSummary.innerHTML = `<div class="benefit-table">${completed.map(item => `
    <button class="benefit-row" data-id="${item.id}">
      <div class="rank-number">✓</div><div class="benefit-title"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.benefit.measuredEvidence || "Evidenza non ancora registrata")}</span></div>
      <div class="benefit-potential"><strong>${formatBenefitPotential(item.benefit)}</strong><span>potenziale</span></div>
      <div class="benefit-forecast"><strong>${escapeHtml(item.benefit.measuredPeriod || "Periodo mancante")}</strong><span>periodo</span></div>
      <div class="benefit-measured"><strong>${formatEuro(item.benefit.measuredAnnual)}</strong><span>misurato annuo</span></div>
      <div><span class="benefit-score" style="--score-color:#1f6654">100</span></div>
    </button>`).join("")}</div>`;
  elements.completedSummary.querySelectorAll(".benefit-row").forEach(row => row.addEventListener("click", () => openDrawer(row.dataset.id)));
}

function renderLogicOrder() {
  const plan = state.data.logicalOrder;
  if (!plan) return;
  const byId = new Map(state.data.initiatives.map(item => [item.id, item]));
  const gating = plan.dependencies.filter(link => link.level === "gating").length;
  const crosscutting = plan.paths.find(path => path.kind === "crosscutting")?.steps.flatMap(step => step.ids).length || 0;

  elements.logicPrinciple.textContent = plan.principle;
  elements.logicSummary.innerHTML = `
    <article><span>Fondamenta informative</span><strong>${plan.foundationIds.length}</strong><small>analisi da avviare prima delle decisioni finali</small></article>
    <article><span>Gate decisionali</span><strong>${gating}</strong><small>dipendenze che devono avere evidenza sufficiente</small></article>
    <article><span>Decisioni economiche</span><strong>${plan.economicDecisionIds.length}</strong><small>internalizzazione, saturazione e fornitori</small></article>
    <article><span>Presidi trasversali</span><strong>${crosscutting}</strong><small>misurazione attiva dall'inizio al consuntivo</small></article>`;

  elements.logicPaths.innerHTML = plan.paths.map(path => `
    <article class="logic-path logic-path-${path.kind}">
      <header class="logic-path-head">
        <span class="logic-path-index">${escapeHtml(path.index)}</span>
        <div><span class="logic-path-kind">${path.kind === "critical" ? "Percorso critico" : path.kind === "parallel" ? "Avvio parallelo" : "Presidio trasversale"}</span><h3>${escapeHtml(path.title)}</h3><p>${escapeHtml(path.purpose)}</p></div>
      </header>
      <div class="logic-flow">
        ${path.steps.map((step, stepIndex) => `
          ${stepIndex ? `<span class="logic-arrow" aria-hidden="true">→</span>` : ""}
          <div class="logic-step">
            <span class="logic-step-label">${escapeHtml(step.label)}</span>
            <div class="logic-step-items">${step.ids.map(id => {
              const item = byId.get(id);
              return item ? `<button class="logic-initiative" data-initiative="${escapeAttribute(id)}"><span>${escapeHtml(id)}</span><strong>${escapeHtml(item.title)}</strong></button>` : "";
            }).join("")}</div>
          </div>`).join("")}
      </div>
      <footer>${escapeHtml(path.note)}</footer>
    </article>`).join("");

  elements.dependencyMatrix.innerHTML = `
    <div class="dependency-head"><span>Da</span><span>Relazione</span><span>A</span><span>Perché cambia la decisione</span></div>
    ${plan.dependencies.map(link => {
      const source = byId.get(link.from);
      const target = byId.get(link.to);
      return `
        <div class="dependency-row dependency-${link.level}">
          <button class="dependency-node" data-initiative="${escapeAttribute(link.from)}"><span>${escapeHtml(link.from)}</span><strong>${escapeHtml(source?.title || link.from)}</strong></button>
          <div class="dependency-relation"><span class="dependency-level">${link.level === "gating" ? "Gate decisionale" : "Raffina la stima"}</span><strong>${escapeHtml(dependencyTypeLabels[link.type] || link.type)}</strong><i aria-hidden="true">→</i></div>
          <button class="dependency-node" data-initiative="${escapeAttribute(link.to)}"><span>${escapeHtml(link.to)}</span><strong>${escapeHtml(target?.title || link.to)}</strong></button>
          <p>${escapeHtml(link.reason)}</p>
        </div>`;
    }).join("")}`;

  elements.decisionGates.innerHTML = plan.decisionGates.map(gate => `
    <article class="decision-gate"><span>${escapeHtml(gate.id)}</span><div><strong>${escapeHtml(gate.title)}</strong><p>${escapeHtml(gate.rule)}</p></div></article>`).join("");

  bindInitiativeLinks(elements.logicPaths);
  bindInitiativeLinks(elements.dependencyMatrix);
}

function renderLegalGovernance() {
  const governance = state.data.legalGovernance;
  if (!governance || !elements.legalFlow) return;
  const byId = new Map(state.data.initiatives.map(item => [item.id, item]));
  const levelLabels = {
    ready: "Procedibile con cautele",
    review: "Validazione preventiva",
    stop: "Gate bloccante"
  };

  elements.legalGovernanceNote.textContent = governance.note;
  elements.legalFlow.innerHTML = governance.stages.map((stage, index) => `
    <article class="legal-stage legal-stage-${escapeAttribute(stage.level)}">
      <div class="legal-stage-rail"><span>${String(index + 1).padStart(2, "0")}</span>${index < governance.stages.length - 1 ? `<i aria-hidden="true"></i>` : ""}</div>
      <div class="legal-stage-card">
        <header>
          <div><span class="legal-level">${escapeHtml(levelLabels[stage.level] || stage.level)}</span><h3>${escapeHtml(stage.title)}</h3></div>
          <div class="legal-initiative-links">${stage.initiativeIds.map(id => {
            const item = byId.get(id);
            return item ? `<button data-initiative="${escapeAttribute(id)}" title="${escapeAttribute(item.title)}">${escapeHtml(id)}</button>` : "";
          }).join("")}</div>
        </header>
        <p class="legal-stage-purpose">${escapeHtml(stage.purpose)}</p>
        <div class="legal-stage-columns">
          <div><span>Vincolo giuridico</span><p>${escapeHtml(stage.legal)}</p></div>
          <div><span>Passaggio sindacale</span><p>${escapeHtml(stage.union)}</p></div>
          <div><span>Gate prima di decidere</span><p>${escapeHtml(stage.gate)}</p></div>
        </div>
        <footer><strong>Validano</strong><span>${escapeHtml(stage.owners)}</span></footer>
      </div>
    </article>`).join("");

  elements.legalPrinciples.innerHTML = governance.stopRules.map((rule, index) => `
    <article class="legal-principle-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div><strong>${escapeHtml(rule.title)}</strong><p>${escapeHtml(rule.rule)}</p></div>
    </article>`).join("");

  elements.externalWorkers.innerHTML = `
    <div class="external-worker-head"><span>Rapporto effettivo</span><span>Potere organizzativo</span><span>Tutele rilevanti</span><span>Regola per il progetto</span></div>
    ${governance.externalWorkers.map(item => `
      <div class="external-worker-row">
        <div><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.employer)}</span></div>
        <p>${escapeHtml(item.direction)}</p>
        <p>${escapeHtml(item.protections)}</p>
        <p class="external-worker-rule">${escapeHtml(item.projectRule)}</p>
      </div>`).join("")}`;
  elements.legalSourceNote.textContent = governance.sourceNote;

  bindInitiativeLinks(elements.legalFlow);
}

function bindInitiativeLinks(container) {
  container.querySelectorAll("[data-initiative]").forEach(button => {
    button.addEventListener("click", () => openDrawer(button.dataset.initiative));
  });
}

function renderContexts() {
  const map = new Map();
  state.data.initiatives.forEach(initiative => {
    initiative.contexts.forEach(context => {
      if (!map.has(context.name)) {
        map.set(context.name, {
          name: context.name,
          type: context.type,
          initiatives: [],
          dataNeeds: new Set(),
          axes: new Set()
        });
      }
      const aggregate = map.get(context.name);
      aggregate.initiatives.push(initiative);
      initiative.axisIds.forEach(axis => aggregate.axes.add(axis));
      initiative.dataNeeds.forEach(need => aggregate.dataNeeds.add(need));
    });
  });

  const contexts = [...map.values()].sort((a, b) => {
    if (b.initiatives.length !== a.initiatives.length) return b.initiatives.length - a.initiatives.length;
    return a.name.localeCompare(b.name, "it");
  });

  elements.contextGrid.innerHTML = contexts.map(context => {
    const score = Math.round(average(context.initiatives.map(item => item.confidence)));
    const needs = [...context.dataNeeds].slice(0, 3);
    return `
      <article class="context-card" tabindex="0" role="button" data-context="${escapeAttribute(context.name)}">
        <div class="context-card-header">
          <div><span class="context-type">${escapeHtml(context.type)}</span><h3>${escapeHtml(context.name)}</h3></div>
          <span class="context-score" style="--score-color:${confidenceColor(score)}">${score}%</span>
        </div>
        <div class="axis-chips">${renderAxisChips([...context.axes])}</div>
        <div class="context-stat"><span>Cantieri collegati</span><strong>${context.initiatives.length}</strong></div>
        <ul class="data-list">${needs.map(need => `<li>${escapeHtml(need)}</li>`).join("")}</ul>
      </article>`;
  }).join("");

  elements.contextGrid.querySelectorAll(".context-card").forEach(card => {
    const selectContext = () => {
      state.context = card.dataset.context;
      elements.contextFilter.value = state.context;
      switchView("portfolio");
      renderPortfolio();
      document.querySelector(".portfolio-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    card.addEventListener("click", selectContext);
    card.addEventListener("keydown", event => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        selectContext();
      }
    });
  });
}

function renderRoadmap() {
  const phaseNames = ["Baseline", "Disegno", "Pilota", "Scala"];
  elements.roadmapTable.innerHTML = `
    <div class="roadmap-header"><div>Intervento</div>${phaseNames.map(name => `<div>${name}</div>`).join("")}</div>
    ${state.data.initiatives.map(item => `
      <div class="roadmap-row" data-id="${item.id}">
        <div class="roadmap-title"><span class="status-badge status-${item.status}">${item.id}</span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.nextStep)}</span></div></div>
        ${item.phases.map(phase => `<div class="phase-cell"><i class="phase-dot ${phase.status}"></i><span>${escapeHtml(phase.description)}</span></div>`).join("")}
      </div>`).join("")}`;

  elements.roadmapTable.querySelectorAll(".roadmap-row").forEach(row => {
    row.addEventListener("click", () => openDrawer(row.dataset.id));
  });
}

function renderSources() {
  const verified = state.data.sources.filter(source => source.status === "verified").length;
  const required = state.data.sources.filter(source => source.status === "required").length;
  const referencedKpis = state.data.initiatives.reduce((sum, item) => sum + item.kpis.length, 0);
  elements.sourceSummary.innerHTML = `
    <div class="source-stat"><strong>${verified}</strong><span>fonti già verificate</span></div>
    <div class="source-stat"><strong>${required}</strong><span>fonti/dataset da acquisire</span></div>
    <div class="source-stat"><strong>${referencedKpis}</strong><span>KPI con fonte dichiarata</span></div>`;

  elements.sourceList.innerHTML = state.data.sources.map(source => `
    <article class="source-item">
      <span class="source-kind">${escapeHtml(source.kind)}</span>
      <strong class="source-title">${source.url
        ? `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>`
        : escapeHtml(source.title)}</strong>
      <span class="source-use">${escapeHtml(source.use)}</span>
      <span class="evidence-tag evidence-${source.status}">${source.status === "verified" ? "Verificata" : "Da acquisire"}</span>
    </article>`).join("");
}

function renderQuestions() {
  const questions = [...(state.data.questions || [])].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const open = questions.filter(question => question.status === "open").length;
  const requested = questions.filter(question => question.status === "requested").length;
  const answered = questions.filter(question => question.status === "answered").length;
  elements.questionSummary.innerHTML = `
    <div class="question-stat"><strong>${open}</strong><span>da porre alla Direzione</span></div>
    <div class="question-stat"><strong>${requested}</strong><span>poste, in attesa di risposta</span></div>
    <div class="question-stat"><strong>${answered}</strong><span>risposte acquisite e registrate</span></div>`;

  elements.questionList.innerHTML = questions.map(question => {
    const color = priorityColor(question.priority);
    return `
      <article class="question-card" data-question-id="${question.id}">
        <div class="priority-pill" style="--priority-color:${color}" title="Priorità ${question.priority}">${question.priority}</div>
        <div class="question-main">
          <h3>${escapeHtml(question.question)}</h3>
          <div class="question-meta"><span>${escapeHtml(question.audience)}</span><span>${escapeHtml(question.context)}</span>${question.initiativeIds.map(id => `<span>${id}</span>`).join("")}</div>
          <p class="question-unlocks"><strong>Sblocca:</strong> ${escapeHtml(question.unlocks)}</p>
        </div>
        <div class="question-response">
          <select data-question-status aria-label="Stato ${question.id}">
            <option value="open" ${question.status === "open" ? "selected" : ""}>Da porre</option>
            <option value="requested" ${question.status === "requested" ? "selected" : ""}>Posta · in attesa</option>
            <option value="answered" ${question.status === "answered" ? "selected" : ""}>Risposta acquisita</option>
          </select>
          <textarea data-question-answer rows="2" placeholder="Annota qui la risposta…">${escapeHtml(question.answer)}</textarea>
        </div>
      </article>`;
  }).join("");

  elements.questionList.querySelectorAll(".question-card").forEach(card => {
    const question = state.data.questions.find(item => item.id === card.dataset.questionId);
    card.querySelector("[data-question-status]").addEventListener("change", event => {
      question.status = event.target.value;
      saveData();
      renderQuestions();
    });
    card.querySelector("[data-question-answer]").addEventListener("input", event => {
      question.answer = event.target.value;
      saveData();
    });
  });
}

function renderEssay(essay) {
  if (!essay) return "";
  const sections = [
    ["01", "Quadro del problema", essay.overview],
    ["02", "Analisi svolta", essay.analysis],
    ["03", "Come si costruisce la stima", essay.estimateMethod],
    ["04", "Come i dati mancanti cambiano la stima", essay.missingInformation],
    ["05", "Regola decisionale", essay.decisionRule]
  ];
  return `
    <section class="detail-block essay-block">
      <div class="essay-heading">
        <span class="essay-kicker">Approfondimento metodologico</span>
        <h3>Analisi estesa</h3>
        <p>Dal problema osservato alla decisione: evidenze, ipotesi, formula e condizioni di validazione.</p>
      </div>
      <article class="essay-article">
        ${sections.map(([number, title, content]) => `
          <section class="essay-section">
            <div class="essay-section-title"><span>${number}</span><h4>${escapeHtml(title)}</h4></div>
            <p>${escapeHtml(content || "Da sviluppare con il responsabile del processo.")}</p>
          </section>`).join("")}
      </article>
    </section>`;
}

function renderItemDependencies(id) {
  const plan = state.data.logicalOrder;
  if (!plan) return "";
  const byId = new Map(state.data.initiatives.map(item => [item.id, item]));
  const upstream = plan.dependencies.filter(link => link.to === id);
  const downstream = plan.dependencies.filter(link => link.from === id);
  if (!upstream.length && !downstream.length) return "";

  const renderLink = (link, relatedId) => {
    const related = byId.get(relatedId);
    return `<button class="drawer-dependency dependency-${link.level}" data-related-id="${escapeAttribute(relatedId)}">
      <span>${escapeHtml(relatedId)} · ${link.level === "gating" ? "gate" : "influenza"}</span>
      <strong>${escapeHtml(related?.title || relatedId)}</strong>
      <small>${escapeHtml(dependencyTypeLabels[link.type] || link.type)}</small>
    </button>`;
  };

  return `
    <section class="detail-block dependency-detail">
      <h3>Dipendenze logiche</h3>
      <p>Mostra quali evidenze alimentano questa decisione e quali interventi vengono a loro volta abilitati.</p>
      <div class="dependency-detail-grid">
        <div><h4>Informazioni in ingresso</h4>${upstream.length ? upstream.map(link => renderLink(link, link.from)).join("") : `<span class="dependency-empty">Nessun prerequisito esplicito</span>`}</div>
        <div><h4>Decisioni abilitate</h4>${downstream.length ? downstream.map(link => renderLink(link, link.to)).join("") : `<span class="dependency-empty">Nessuna dipendenza successiva</span>`}</div>
      </div>
    </section>`;
}

function renderCompliance(compliance) {
  if (!compliance) return "";
  const levelLabels = {
    low: "Presidio ordinario",
    medium: "Impatto medio",
    high: "Impatto alto",
    critical: "Gate critico"
  };
  return `
    <section class="detail-block compliance-detail compliance-${escapeAttribute(compliance.level)}">
      <div class="compliance-heading"><h3>Impatto legale e sindacale</h3><span>${escapeHtml(levelLabels[compliance.level] || compliance.level)}</span></div>
      <p>${escapeHtml(compliance.summary)}</p>
      <div class="compliance-checks">${compliance.checks.map(check => `
        <article><span>${escapeHtml(check.area)}</span><strong>${escapeHtml(check.action)}</strong><p>${escapeHtml(check.trigger)}</p></article>`).join("")}</div>
      <div class="compliance-gate"><strong>Prima di avanzare</strong><span>${escapeHtml(compliance.gate)}</span></div>
    </section>`;
}

function openDrawer(id) {
  const item = state.data.initiatives.find(initiative => initiative.id === id);
  if (!item) return;
  state.selectedId = id;
  elements.drawerCode.textContent = `${item.id} · ${statusLabels[item.status]}`;
  elements.drawerTitle.textContent = item.title;
  elements.drawerContent.innerHTML = `
    <div class="drawer-status-row">
      <span class="owner">Owner · ${escapeHtml(item.owner)}</span>
      <select id="drawerStatus" aria-label="Stato intervento">
        ${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </div>
    <div class="axis-chips">${renderAxisChips(item.axisIds)}</div>
    <section class="detail-block"><h3>Problema osservato</h3><p>${escapeHtml(item.problem)}</p></section>
    ${renderEssay(item.essay)}
    ${renderItemDependencies(item.id)}
    ${renderCompliance(item.compliance)}
    <section class="detail-block"><h3>Proposta</h3><div class="proposal-box"><p>${escapeHtml(item.proposal)}</p></div></section>
    <section class="detail-block">
      <h3>Apporto e beneficio possibile</h3>
      <p><strong>${formatBenefitPotential(item.benefit)} · ${escapeHtml(item.benefit.primaryType)}</strong><br>${escapeHtml(item.benefit.statement)}</p>
      <div class="proposal-box" style="margin-top:12px"><p>${escapeHtml(item.benefit.basis)}</p></div>
    </section>
    <section class="detail-block">
      <h3>Consuntivo del beneficio</h3>
      <div class="measurement-grid">
        <label class="measurement-field"><span>Beneficio annuo misurato (€)</span><input id="measuredAnnual" type="number" min="0" step="100" value="${Number(item.benefit.measuredAnnual || 0)}"></label>
        <label class="measurement-field"><span>Periodo di misurazione</span><input id="measuredPeriod" type="text" value="${escapeAttribute(item.benefit.measuredPeriod || "")}" placeholder="Es. gen–giu 2027"></label>
        <label class="measurement-field full"><span>Fonte/evidenza e criterio di calcolo</span><input id="measuredEvidence" type="text" value="${escapeAttribute(item.benefit.measuredEvidence || "")}" placeholder="Es. fatture prima-dopo, validato dal Controllo di Gestione"></label>
      </div>
      <div class="save-note" id="benefitSaveNote">Il valore entra nel totale misurato; evitare doppio conteggio.</div>
    </section>
    <section class="detail-block">
      <h3>Luoghi e contesti concreti</h3>
      <ul class="evidence-list">${item.contexts.map(context => `<li><span><strong>${escapeHtml(context.name)}</strong> · ${escapeHtml(context.evidence)}</span></li>`).join("")}</ul>
    </section>
    <section class="detail-block">
      <h3>Fasi</h3>
      <div class="phase-list">${item.phases.map((phase, index) => `
        <div class="phase-item">
          <span class="phase-number">${index + 1}</span>
          <div><strong>${escapeHtml(phase.name)}</strong><span>${escapeHtml(phase.description)}</span></div>
          <select data-phase-index="${index}" aria-label="Stato fase ${escapeHtml(phase.name)}">
            ${Object.entries(phaseLabels).map(([value, label]) => `<option value="${value}" ${phase.status === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>`).join("")}</div>
    </section>
    <section class="detail-block">
      <h3>KPI e fonti</h3>
      <table class="kpi-table">
        <thead><tr><th>Indicatore</th><th>Baseline</th><th>Obiettivo</th><th>Fonte</th></tr></thead>
        <tbody>${item.kpis.map(kpi => `
          <tr><td class="kpi-name">${escapeHtml(kpi.name)}</td><td class="kpi-baseline ${isMissing(kpi.baseline) ? "missing" : ""}">${escapeHtml(kpi.baseline)}</td><td>${escapeHtml(kpi.target)}</td><td>${escapeHtml(kpi.source)}</td></tr>`).join("")}</tbody>
      </table>
    </section>
    <section class="detail-block"><h3>Informazioni da acquisire</h3><ul class="data-list">${item.dataNeeds.map(need => `<li>${escapeHtml(need)}</li>`).join("")}</ul></section>
    <section class="detail-block"><h3>Rischi da governare</h3><div class="risk-grid">${item.risks.map(risk => `<div class="risk-card"><strong>${escapeHtml(risk.name)}</strong><span>${escapeHtml(risk.detail)}</span></div>`).join("")}</div></section>
    <section class="detail-block"><h3>Note operative</h3><textarea class="notes-area" id="initiativeNotes" rows="4">${escapeHtml(item.notes)}</textarea><div class="save-note" id="saveNote">Salvataggio automatico nel browser</div></section>`;

  elements.drawerContent.querySelectorAll("[data-related-id]").forEach(button => {
    button.addEventListener("click", () => openDrawer(button.dataset.relatedId));
  });

  document.getElementById("drawerStatus").addEventListener("change", event => {
    item.status = event.target.value;
    persistAndRefresh();
    openDrawer(id);
  });
  elements.drawerContent.querySelectorAll("[data-phase-index]").forEach(select => {
    select.addEventListener("change", event => {
      item.phases[Number(event.target.dataset.phaseIndex)].status = event.target.value;
      saveData();
      renderRoadmap();
    });
  });
  document.getElementById("initiativeNotes").addEventListener("input", event => {
    item.notes = event.target.value;
    saveData();
    const note = document.getElementById("saveNote");
    note.textContent = "Salvato ora nel browser";
  });
  ["measuredAnnual", "measuredPeriod", "measuredEvidence"].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener("change", () => {
      item.benefit.measuredAnnual = Math.max(0, Number(document.getElementById("measuredAnnual").value || 0));
      item.benefit.measuredPeriod = document.getElementById("measuredPeriod").value.trim();
      item.benefit.measuredEvidence = document.getElementById("measuredEvidence").value.trim();
      touchData();
      saveData();
      renderMetrics();
      renderBenefits();
      document.getElementById("benefitSaveNote").textContent = "Consuntivo salvato nel browser.";
    });
  });

  elements.drawerBackdrop.classList.add("is-open");
  elements.detailDrawer.classList.add("is-open");
  elements.detailDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  state.selectedId = null;
  elements.drawerBackdrop.classList.remove("is-open");
  elements.detailDrawer.classList.remove("is-open");
  elements.detailDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function populateAxisOptions() {
  elements.newAxis.innerHTML = state.data.axes.map(axis => `<option value="${axis.id}">${escapeHtml(axis.name)}</option>`).join("");
}

function populateContextFilter() {
  const selected = state.context;
  const contexts = [...new Set(state.data.initiatives.flatMap(item => item.contexts.map(context => context.name)))].sort((a, b) => a.localeCompare(b, "it"));
  elements.contextFilter.innerHTML = `<option value="all">Tutti i contesti</option>${contexts.map(context => `<option value="${escapeAttribute(context)}">${escapeHtml(context)}</option>`).join("")}`;
  elements.contextFilter.value = contexts.includes(selected) ? selected : "all";
  state.context = elements.contextFilter.value;
}

function addInitiative(event) {
  const submitter = event.submitter;
  if (submitter?.value === "cancel") return;
  event.preventDefault();
  const form = new FormData(elements.addForm);
  const nextNumber = Math.max(0, ...state.data.initiatives.map(item => Number(item.id.replace(/\D/g, "")) || 0)) + 1;
  const title = String(form.get("title")).trim();
  const summary = String(form.get("summary")).trim();
  const context = String(form.get("context")).trim();
  const axis = String(form.get("axis"));

  state.data.initiatives.push({
    id: `INT-${String(nextNumber).padStart(2, "0")}`,
    title,
    status: String(form.get("status")),
    confidence: 15,
    axisIds: [axis],
    owner: "Da assegnare",
    summary,
    problem: summary,
    essay: {
      overview: "Descrivere il problema nel suo contesto operativo, distinguendo sintomo, causa e vincoli del servizio.",
      analysis: "Ricostruire le evidenze disponibili, il processo attuale, i ruoli coinvolti e le ipotesi che richiedono verifica.",
      estimateMethod: "Definire formula, baseline, unità di misura e condizioni che trasformano la capacità teorica in beneficio reale.",
      missingInformation: "Indicare quali dati mancano e in quale direzione ciascuno di essi può modificare la stima.",
      decisionRule: "Stabilire soglie, criteri di pilota e modalità con cui il beneficio sarà validato e registrato a consuntivo."
    },
    proposal: "Da definire con il responsabile del processo e validare con la Direzione.",
    nextStep: "Assegnare owner e raccogliere la baseline",
    benefit: {
      priorityScore: 30,
      primaryType: "Beneficio da qualificare",
      statement: "Definire l'esito operativo atteso e il meccanismo con cui produrrà capacità, qualità o costo evitato.",
      annualLow: null,
      annualHigh: null,
      measuredAnnual: 0,
      measuredPeriod: "",
      measuredEvidence: "",
      basis: "Nessuna monetizzazione prima di baseline, formula, fonte e owner del dato.",
      monetizationStatus: "pending"
    },
    contexts: [{ name: context, type: "Contesto da classificare", evidence: "Osservazione o dato da acquisire." }],
    phases: [
      { name: "Baseline", description: "Raccogliere processo, volumi e tempi", status: "planned" },
      { name: "Disegno", description: "Definire soluzione e responsabilità", status: "planned" },
      { name: "Pilota", description: "Testare su perimetro limitato", status: "planned" },
      { name: "Scala", description: "Estendere dopo verifica dei risultati", status: "planned" }
    ],
    kpis: [{ name: "Indicatore da definire", baseline: "Da acquisire", target: "Da validare", source: "Owner del processo" }],
    dataNeeds: ["Baseline del processo, volumi, tempi e sistemi coinvolti"],
    risks: [{ name: "Dati insufficienti", detail: "Non approvare il business case prima della baseline." }],
    notes: "Intervento inserito manualmente nel cruscotto."
  });
  touchData();
  saveData();
  elements.addForm.reset();
  elements.addModal.close();
  populateContextFilter();
  renderAll();
}

function switchView(view) {
  if (elements.detailDrawer.classList.contains("is-open")) closeDrawer();
  state.activeView = view;
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
  window.scrollTo({ top: 0, behavior: "auto" });
}

function filteredInitiatives() {
  return state.data.initiatives.filter(item => {
    const matchesAxis = state.activeAxis === "all" || item.axisIds.includes(state.activeAxis);
    const matchesStatus = state.status === "all" || item.status === state.status;
    const matchesContext = state.context === "all" || item.contexts.some(context => context.name === state.context);
    const haystack = [
      item.id, item.title, item.summary, item.problem, item.proposal, item.owner,
      ...Object.values(item.essay || {}),
      ...item.contexts.flatMap(context => [context.name, context.type, context.evidence]),
      ...item.dataNeeds
    ].join(" ").toLocaleLowerCase("it");
    const matchesSearch = !state.search || haystack.includes(state.search);
    return matchesAxis && matchesStatus && matchesContext && matchesSearch;
  }).sort((a, b) => b.benefit.priorityScore - a.benefit.priorityScore || b.confidence - a.confidence);
}

function renderAxisChips(axisIds) {
  return axisIds.map(id => {
    const axis = state.data.axes.find(item => item.id === id);
    return axis ? `<span class="axis-chip" style="--chip-color:${axis.color}">${escapeHtml(axis.name)}</span>` : "";
  }).join("");
}

function persistAndRefresh() {
  touchData();
  saveData();
  populateContextFilter();
  renderAll();
}

function touchData() {
  state.data.meta.updated = new Date().toISOString().slice(0, 10);
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (error) {
    console.warn("Salvataggio locale non riuscito", error);
  }
}

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Dati locali non leggibili", error);
    return null;
  }
}

function hydrateData(savedData, originalData) {
  if (!savedData) return clone(originalData);
  const hydrated = clone(savedData);
  hydrated.meta = clone(originalData.meta);
  hydrated.logicalOrder = clone(originalData.logicalOrder);
  hydrated.legalGovernance = clone(originalData.legalGovernance);
  hydrated.sources = clone(originalData.sources);

  const savedQuestions = new Map((savedData.questions || []).map(item => [item.id, item]));
  hydrated.questions = originalData.questions.map(question => {
    const saved = savedQuestions.get(question.id);
    return {
      ...clone(question),
      status: saved?.status || question.status,
      answer: saved?.answer || question.answer
    };
  });

  const originalInitiatives = new Map(originalData.initiatives.map(item => [item.id, item]));
  hydrated.initiatives = (hydrated.initiatives || []).map(item => {
    const original = originalInitiatives.get(item.id);
    return original ? { ...item, compliance: clone(original.compliance) } : item;
  });
  return hydrated;
}

function resetData() {
  if (!window.confirm("Ripristinare i dati iniziali? Le modifiche salvate in questo browser verranno eliminate.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.data = clone(state.originalData);
  state.activeAxis = "all";
  state.status = "all";
  state.context = "all";
  state.search = "";
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  populateContextFilter();
  closeDrawer();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fondazione-piatti-portafoglio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isCompleted(initiative) {
  return initiative.phases.length > 0 && initiative.phases.every(phase => phase.status === "done");
}

function hasEconomicEstimate(benefit) {
  return Number.isFinite(benefit?.annualLow) && Number.isFinite(benefit?.annualHigh);
}

function formatBenefitPotential(benefit) {
  return hasEconomicEstimate(benefit) ? `${formatRange(benefit.annualLow, benefit.annualHigh)} / anno` : "Da monetizzare dopo la baseline";
}

function formatRange(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return "Non quantificato";
  return low === high ? formatEuro(low) : `${formatEuro(low)}–${formatEuro(high)}`;
}

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function priorityColor(priority) {
  return ["#72827b", "#517567", "#4169e1", "#b36b26", "#b74d58"][Math.max(1, Math.min(5, priority)) - 1];
}

function isMissing(value) {
  return /^(da |non |0 h)/i.test(value.trim());
}

function confidenceColor(value) {
  if (value >= 65) return "#1f6654";
  if (value >= 40) return "#4169e1";
  return "#b36b26";
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

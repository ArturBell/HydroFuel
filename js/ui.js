import { calculateCompetitionLoad } from './calculator.js';

export function renderResults(plan, competitionEvents = []) {
    // UI: Calorías
    document.getElementById('res-calories').innerHTML = `${plan.totalCalories.toLocaleString()} <span class="unit">kcal</span>`;

    // UI: Etiquetas Macros
    document.getElementById('res-carbs').textContent = `${plan.macros.carbs}g (${plan.percentages.carbs}%)`;
    document.getElementById('res-protein').textContent = `${plan.macros.protein}g (${plan.percentages.protein}%)`;
    document.getElementById('res-fats').textContent = `${plan.macros.fats}g (${plan.percentages.fats}%)`;

    // UI: Barra de Progreso
    const chart = document.getElementById('res-macros-chart');
    chart.innerHTML = `
        <div class="macro-bar carbs" style="width: ${plan.percentages.carbs}%" title="Carbohidratos: ${plan.percentages.carbs}%"></div>
        <div class="macro-bar protein" style="width: ${plan.percentages.protein}%" title="Proteínas: ${plan.percentages.protein}%"></div>
        <div class="macro-bar fats" style="width: ${plan.percentages.fats}%" title="Grasas: ${plan.percentages.fats}%"></div>
    `;

    // Anillos de Recuperación (Energy, Repair, Hydration)
    renderRecoveryRings(plan);

    // Semáforo de Estado
    renderTrafficLight(plan, competitionEvents);

    // Timeline y Recuperación base
    renderRecoveryTips(plan, competitionEvents);
    renderSupplements(plan, competitionEvents);
    renderTimeline(plan, competitionEvents);
}

function renderRecoveryRings(plan) {
    // Lógica simulada de "Cumplimiento" basado en los datos ingresados
    let energyScore = 100;
    if (plan.context.classesHours > 8) energyScore -= 15;
    if (plan.context.stressLevel === 'high') energyScore -= 20;

    let repairScore = 100;
    if (plan.context.sleepHours < 7) repairScore -= 25;
    if (plan.context.dayIntensity === 'fire') repairScore -= 10;

    let hydrationScore = 100; // Asumimos 100% de objetivo

    document.getElementById('ring-energy-val').innerText = `${energyScore}%`;
    document.getElementById('ring-repair-val').innerText = `${repairScore}%`;
    document.getElementById('ring-hydration-val').innerText = `${hydrationScore}%`;

    // Set stroke-dasharray para SVG circle (circumference is 251.2 for r=40)
    const circ = 251.2;
    document.getElementById('ring-energy').style.strokeDasharray = `${(energyScore / 100) * circ} ${circ}`;
    document.getElementById('ring-repair').style.strokeDasharray = `${(repairScore / 100) * circ} ${circ}`;
    document.getElementById('ring-hydration').style.strokeDasharray = `${(hydrationScore / 100) * circ} ${circ}`;
}

function renderTrafficLight(plan, events) {
    const lightEl = document.getElementById('traffic-light-status');
    const msgEl = document.getElementById('traffic-light-msg');

    let load = events.length > 0 ? calculateCompetitionLoad(events) : 0;

    // Penalizaciones
    let fatigue = 0;
    if (plan.context.sleepHours < 6) fatigue += 50;
    if (plan.context.dayIntensity === 'fire') fatigue += 30;
    if (plan.context.stressLevel === 'high') fatigue += 20;

    fatigue += load;

    lightEl.className = 'status-indicator';
    if (fatigue > 80) {
        lightEl.classList.add('status-red');
        msgEl.innerHTML = "<strong>CRÍTICO:</strong> Carga masiva o mal descanso. Tu SNC está frito. Prioriza dormir y carbohidratos, o tu rendimiento caerá mañana.";
    } else if (fatigue > 40) {
        lightEl.classList.add('status-yellow');
        msgEl.innerHTML = "<strong>PRECAUCIÓN:</strong> Fatiga acumulada notable. No te saltes el batido post-entreno y añade 30m extra de sueño hoy.";
    } else {
        lightEl.classList.add('status-green');
        msgEl.innerHTML = "<strong>ÓPTIMO:</strong> Tienes capacidad de absorber el entrenamiento. ¡A romper el agua!";
    }
}

function renderRecoveryTips(plan, events) {
    const recoveryEl = document.getElementById('res-recovery');
    let recoveryTips = [
        `<strong>Sueño:</strong> Reportas ${plan.context.sleepHours}h. ${(plan.context.sleepHours < 8) ? '<span style="color:var(--brand-accent);font-weight:700;">⚠️ Insuficiente para maximizar hormona de crecimiento.</span> Añade siestas.' : '<span style="color:#10b981;font-weight:700;">✅ Excelente rango de recuperación.</span>'}`,
        `<strong>Gestión de Estrés:</strong> ${plan.context.stressLevel === 'high' ? 'Estrés alto detectado. El cortisol bloquea la hipertrofia, considera magnesio pre-dormir.' : 'Mantén tu buena rutina y balance.'}`
    ];

    let hydrationBase = (plan.context.weight * 0.04).toFixed(1);

    if (plan.context.dayIntensity === 'rest') {
        recoveryTips.push(`<strong>Cerebro Activo:</strong> Tu cerebro gasta 20% de la energía diaria. Hidrátate.`);
        if (plan.context.activeRecovery) {
            recoveryTips.push(`<strong>Recuperación Activa:</strong> Excelente opción. Haz 20 min de movilidad ligera.`);
        }
    } else {
        recoveryTips.push(`<strong>Recuperación Activa:</strong> Termina la sesión con nado suave (RPE 3) para barrido de lactato.`);
        recoveryTips.push(`<strong>Hidratación:</strong> Bebe ~${hydrationBase} L diarios. En entreno: añade ${(plan.context.rpe >= 8 ? 800 : 500)} ml/h.`);
    }

    if (events.length > 0) {
        recoveryTips.push(`<strong>Atención Competición:</strong> Vas a nadar ${events.length} pruebas. La recuperación centralizada entre pruebas es obligatoria.`);
    }

    recoveryEl.innerHTML = recoveryTips.map(t => `<li>${t}</li>`).join('');
}

function renderSupplements(plan, events) {
    const suppsEl = document.getElementById('res-supplements');
    let creatinaDosis = (plan.context.weight * 0.1).toFixed(1);
    let cafeinaDosisMin = Math.round(plan.context.weight * 3);
    let cafeinaDosisMax = Math.round(plan.context.weight * 6);

    let supps = [];

    if (plan.context.dayIntensity === 'rest') {
        supps = [
            { name: "Creatina Monohidrato", desc: `${creatinaDosis}g diarios. Mantén niveles altos.` },
            { name: "Omega-3", desc: "1-2g. Crucial para concentración." }
        ];
    } else {
        supps = [
            { name: "Creatina Monohidrato", desc: `${creatinaDosis}g diarios. CLAVE para 50-100m.` },
            { name: "Beta-Alanina", desc: "3-4g diarios. Amortigua acidez láctica en los 100m." }
        ];

        if (plan.context.dayIntensity === 'competition' || events.length > 0) {
            supps.push({ name: "Cafeína", desc: `${cafeinaDosisMin}-${cafeinaDosisMax}mg 45 min ANTES de la primera prueba.` });
        } else {
            supps.push({ name: "Whey Protein", desc: `Post-entreno. 30g para síntesis proteica.` });
        }
    }

    suppsEl.innerHTML = supps.map(s => `
        <div class="supplement-item">
            <h4>${s.name}</h4>
            <p>${s.desc}</p>
        </div>
    `).join('');
}

function renderTimeline(plan, events) {
    const timingEl = document.getElementById('res-timing');
    let timeline = [];

    if (plan.context.dayIntensity === 'rest') {
        timeline = [
            { time: "Desayuno Brain-Fuel", text: "Alto grasa/proteína, moderado CH. Evita pico de insulina para estudiar." },
            { time: "Comida Equilibrada", text: "Verduras, proteína magra, granos enteros." },
            { time: "Cena Reparadora", text: "Proteína lenta para dormir y recuperar fibras." }
        ];
    } else if (plan.context.dayIntensity === 'competition' || events.length > 0) {
        timeline.push({ time: "Comida Pre-Competencia (3-4h)", text: "Baja fibra/grasa (ej: Arroz/Pollo)." });
        timeline.push({ time: "Calentamiento (45m antes)", text: "Dosis de Cafeína. Sorbos de Isotónica." });

        events.forEach(ev => {
            timeline.push({ time: `Prueba: ${ev}`, text: "Full gas." });
            timeline.push({ time: "Post-Prueba Inmediato", text: "Recuperación activa en piscina pequeña 10 mins. Bebida 2:1 CH/PRO líquida." });
        });

        timeline.push({ time: "Post-Competición Final", text: "Comida libre moderada. Rehidratación masiva." });

    } else {
        timeline = [
            { time: "Ventana Pre-Entreno", text: "2h antes: Comida sólida. 30m antes: CH rápido (fruta)." },
            { time: "Intra-Entrenamiento", text: plan.context.rpe >= 8 ? "Bebida isotónica deportiva (mín 30g CH/hr)." : "Agua + Electrolitos." },
            { time: "Post-Entrenamiento", text: `Recuperación aguda. Ratio ${plan.context.dayIntensity === 'fire' ? '4:1' : '3:1'} CH/PRO.` },
            { time: "Cena", text: "Proteína digestión lenta." }
        ];
    }

    timingEl.innerHTML = timeline.map(t => `
        <div class="timeline-item">
            <div class="timeline-time">${t.time}</div>
            <div class="timeline-content">${t.text}</div>
        </div>
    `).join('');
}

/**
 * Stroke Multipliers (Ref: Gasto Energético en Natación)
 */
const STROKE_MULTIPLIERS = {
    freestyle: 1.0,  // Base libre
    backstroke: 1.05, // Espalda requiere poco más core
    breaststroke: 1.25, // Braza es el más ineficiente, gasta mucho más
    butterfly: 1.45   // Mariposa altísimo gasto
};

/**
 * Especialización: El 100m tolera mucho lactato y requiere carga mayor que el 50m aláctico.
 */
const SPECIALIZATION_GLYCOGEN_FACTOR = {
    '50m': 1.0,
    '100m': 1.12
};

export function calculatePlan(d) {
    // 1. Tasa Metabólica Basal (TMB)
    let bmr = 0;

    // Si hay Body Fat %, usamos Fórmula de Cunningham
    if (d.bodyFat && d.bodyFat > 0) {
        let leanBodyMass = d.weight * (1 - (d.bodyFat / 100));
        bmr = 500 + (22 * leanBodyMass);
    } else {
        // Mifflin-St Jeor como fallback
        bmr = (10 * d.weight) + (6.25 * d.height) - (5 * d.age);
        bmr += (d.gender === 'm') ? 5 : -161;
    }

    // Factor cuerpo general
    if (d.bodyType === 'ectomorph') bmr *= 1.05;
    if (d.bodyType === 'endomorph') bmr *= 0.95;

    // 2. Factor de Actividad Estudiantil (NEAT)
    let neatMultiplier = 1.2;
    if (d.neatActivity === 'low') neatMultiplier = 1.2;
    else if (d.neatActivity === 'moderate') neatMultiplier = 1.35;
    else if (d.neatActivity === 'high') neatMultiplier = 1.5;

    if (d.classesHours > 6 && d.neatActivity !== 'high') neatMultiplier -= 0.05;
    if (d.commute === 'active') neatMultiplier += 0.1;

    let neatCalories = bmr * neatMultiplier;

    // 3. Gasto Deportivo
    let totalCalories = neatCalories;

    // Multiplicador del Estilo Principal
    let strokeFactor = STROKE_MULTIPLIERS[d.mainStroke] || 1.0;

    if (d.dayIntensity !== 'rest') {
        let basePoolKcal = 0;
        if (d.avgVolume <= 3000) basePoolKcal = 600;
        else if (d.avgVolume <= 5000) basePoolKcal = 850;
        else basePoolKcal = 1100;

        basePoolKcal *= strokeFactor;

        let rpeMultiplier = 1 + ((d.rpe - 5) * 0.05);
        let kcalPerPoolSession = basePoolKcal * rpeMultiplier;
        let kcalPerGymSession = 400 * rpeMultiplier;

        // Distribución diaria basada en reportes semanales
        let dailyPoolAvg = (kcalPerPoolSession * d.poolSessions) / 7;
        let dailyGymAvg = (kcalPerGymSession * d.gymSessions) / 7;

        totalCalories += dailyPoolAvg;
        if (d.dayIntensity === 'fire') totalCalories += dailyGymAvg;

        if (d.dayIntensity === 'fire') totalCalories += 300; // Extra SNC cost

        // Si es competición de varios eventos, la carga cambia en el Competition Module,
        // pero aquí definimos la base de la carga de un día de competición típico.
        if (d.dayIntensity === 'competition') {
            totalCalories *= 0.85; // Menor volumen pero altísima intensidad nerviosa.
        }
    } else {
        if (d.activeRecovery) totalCalories += 150;
    }

    if (d.stressLevel === 'high') totalCalories *= 1.05;

    totalCalories = Math.round(totalCalories);

    // 4. Macronutrientes (con enfoque de especialización)
    let proteinPerKg = 2.0;

    if (d.dayIntensity === 'rest') {
        proteinPerKg = 1.9;
    } else {
        if (d.bodyType === 'ectomorph') proteinPerKg = 2.2;
    }

    let carbsPerKg = 5.0;

    // Ajuste por especialidad (50m vs 100m)
    let specFactor = SPECIALIZATION_GLYCOGEN_FACTOR[d.specialization] || 1.0;

    if (d.dayIntensity === 'rest') {
        carbsPerKg = 2.5; // Drop
        if (d.bodyType === 'ectomorph') carbsPerKg = 3.0;
    } else {
        if (d.avgVolume > 4000) carbsPerKg = 6.0;
        if (d.rpe >= 8) carbsPerKg += 0.5;

        if (d.dayIntensity === 'competition') {
            carbsPerKg = 7.5 * specFactor; // Carga máxima de glucógeno adaptada a 50m o 100m
        } else {
            carbsPerKg *= specFactor;
        }
    }

    let proteinGrams = Math.round(d.weight * proteinPerKg);
    let carbsGrams = Math.round(d.weight * carbsPerKg);

    let proteinKcal = proteinGrams * 4;
    let carbsKcal = carbsGrams * 4;

    let fatsKcal = totalCalories - (proteinKcal + carbsKcal);
    let fatsGrams = Math.max(Math.round(fatsKcal / 9), Math.round(d.weight * 1.0));

    totalCalories = proteinKcal + carbsKcal + (fatsGrams * 9);

    let pctCarbs = Math.round((carbsKcal / totalCalories) * 100);
    let pctProtein = Math.round((proteinKcal / totalCalories) * 100);
    let pctFats = 100 - pctCarbs - pctProtein;

    return {
        totalCalories,
        macros: { carbs: carbsGrams, protein: proteinGrams, fats: fatsGrams },
        percentages: { carbs: pctCarbs, protein: pctProtein, fats: pctFats },
        context: d
    };
}

export function calculateCompetitionLoad(eventsStrArray) {
    // Ejemplo: ["50m Libre", "100m Mariposa"]
    let load = 0;

    eventsStrArray.forEach(ev => {
        let l = ev.toLowerCase();
        let multiplier = 1;
        if (l.includes("libre")) multiplier = STROKE_MULTIPLIERS.freestyle;
        if (l.includes("espalda")) multiplier = STROKE_MULTIPLIERS.backstroke;
        if (l.includes("braza")) multiplier = STROKE_MULTIPLIERS.breaststroke;
        if (l.includes("mariposa")) multiplier = STROKE_MULTIPLIERS.butterfly;

        let distanceFactor = 1;
        if (l.includes("100m")) distanceFactor = 2.5; // Dolor láctico masivo 

        load += (10 * multiplier * distanceFactor);
    });

    return load;
}

import { calculatePlan } from './calculator.js';
import { renderResults } from './ui.js';
import { login, register, loginAsGuest, logout, setOnAuthStateChangeCallback } from './auth.js';

let competitionEvents = [];

// ─── Module-scope helpers (available everywhere, no hoisting issues) ───────────

const toastEl = () => document.getElementById('toast');
let toastTimeout = null;

function showToast(message, type = 'info') {
    const el = toastEl();
    if (!el) return;
    el.className = '';
    el.textContent = message;
    el.classList.add(`toast-${type}`, 'toast-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('toast-visible'), 4000);
}

function friendlyError(msg) {
    if (!msg) return 'Error desconocido.';
    if (msg.includes('invalid-email')) return 'El correo electrónico no es válido.';
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
        return 'Correo o contraseña incorrectos.';
    if (msg.includes('email-already-in-use')) return 'Ese correo ya tiene una cuenta. Prueba a iniciar sesión.';
    if (msg.includes('weak-password')) return 'La contraseña debe tener mínimo 6 caracteres.';
    if (msg.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
    if (msg.includes('network-request-failed')) return 'Sin conexión a internet. Revisa tu red.';
    return 'Error inesperado. Inténtalo de nuevo.';
}

// ─── Global error handler ────────────────────────────────────────────────────

window.addEventListener('error', (e) => {
    console.error('[HydroFuel Error]', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[HydroFuel Unhandled Promise]', e.reason);
});

// ─── Main ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('nutrition-form');
    const inputSection = document.getElementById('input-section');
    const resultsSection = document.getElementById('results-section');
    const resetBtn = document.getElementById('reset-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // Auth UI elements
    const authModal = document.getElementById('auth-modal');
    const authFormContainer = document.getElementById('auth-form-container');
    const authSuccessMsg = document.getElementById('auth-success-msg');

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const viewLogin = document.getElementById('view-login');
    const viewRegister = document.getElementById('view-register');

    const emailLogin = document.getElementById('auth-email-login');
    const pwdLogin = document.getElementById('auth-pwd-login');
    const btnLogin = document.getElementById('btn-login');

    const emailRegister = document.getElementById('auth-email-register');
    const pwdRegister = document.getElementById('auth-pwd-register');
    const btnRegister = document.getElementById('btn-register');

    const btnGuest = document.getElementById('btn-guest');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const userEmailDisplay = document.getElementById('user-email-display');

    // ── Tab Switching ───────────────────────────────────────────────────────

    tabLogin.addEventListener('click', () => {
        tabLogin.style.cssText = 'flex:1;padding:10px;background:none;border:none;color:var(--brand-primary);border-bottom:2px solid var(--brand-primary);cursor:pointer;font-weight:600;';
        tabRegister.style.cssText = 'flex:1;padding:10px;background:none;border:none;color:var(--text-muted);border-bottom:2px solid transparent;cursor:pointer;font-weight:600;';
        viewLogin.classList.remove('hidden');
        viewRegister.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.style.cssText = 'flex:1;padding:10px;background:none;border:none;color:var(--brand-primary);border-bottom:2px solid var(--brand-primary);cursor:pointer;font-weight:600;';
        tabLogin.style.cssText = 'flex:1;padding:10px;background:none;border:none;color:var(--text-muted);border-bottom:2px solid transparent;cursor:pointer;font-weight:600;';
        viewRegister.classList.remove('hidden');
        viewLogin.classList.add('hidden');
    });

    // ── Auth State Observer ─────────────────────────────────────────────────
    // KEY FIX: only hide modal for REAL (non-anonymous) logged-in users.
    // Anonymous sessions (from signInAnonymously) should NOT dismiss the modal.
    setOnAuthStateChangeCallback((user, profile) => {
        if (user && !user.isAnonymous) {
            // Real authenticated user → close modal, show badge
            authModal.style.display = 'none';
            userProfileBadge.classList.remove('hidden');
            userEmailDisplay.innerText = user.email;
            if (profile) fillFormWithProfile(profile);
        }
        // INTENTIONALLY do nothing for anonymous users and null (not logged in)
        // The modal stays open until the user explicitly acts
    });

    // ── Auth Buttons ────────────────────────────────────────────────────────

    btnGuest.addEventListener('click', async () => {
        btnGuest.disabled = true;
        btnGuest.textContent = 'Cargando...';
        await loginAsGuest();
        // Explicitly close modal when user chooses guest mode
        authModal.style.display = 'none';
        btnGuest.disabled = false;
        btnGuest.textContent = 'Continuar como Invitado y Probar';
    });

    btnLogin.addEventListener('click', async () => {
        if (!emailLogin.value.trim() || !pwdLogin.value) {
            showToast('Por favor, ingresa tu correo y contraseña.', 'error');
            return;
        }
        btnLogin.disabled = true;
        btnLogin.textContent = 'Entrando...';
        const res = await login(emailLogin.value.trim(), pwdLogin.value);
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
        if (res.success) showAuthSuccess();
        else showToast(friendlyError(res.error), 'error');
    });

    const btnForgotPwd = document.getElementById('btn-forgot-pwd');
    if (btnForgotPwd) {
        btnForgotPwd.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailLogin.value.trim();
            if (!email) {
                showToast('Ingresa tu correo en el campo superior primero.', 'error');
                return;
            }
            import('./auth.js').then(async (m) => {
                if (m.resetPassword) {
                    const res = await m.resetPassword(email);
                    if (res.success) showToast('Enlace de restablecimiento enviado a tu correo. 📧', 'success');
                    else showToast(friendlyError(res.error), 'error');
                }
            });
        });
    }

    btnRegister.addEventListener('click', async () => {
        if (!emailRegister.value.trim() || !pwdRegister.value) {
            showToast('Por favor, completa los campos para registrarte.', 'error');
            return;
        }
        if (pwdRegister.value.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }
        btnRegister.disabled = true;
        btnRegister.textContent = 'Creando cuenta...';
        const res = await register(emailRegister.value.trim(), pwdRegister.value);
        btnRegister.disabled = false;
        btnRegister.textContent = 'Crear Cuenta';
        if (res.success) showAuthSuccess();
        else showToast(friendlyError(res.error), 'error');
    });

    userProfileBadge.addEventListener('click', async () => {
        await logout();
        location.reload();
    });

    function showAuthSuccess() {
        authFormContainer.classList.add('hidden');
        authSuccessMsg.classList.remove('hidden');
        setTimeout(() => {
            authModal.style.display = 'none';
            authFormContainer.classList.remove('hidden');
            authSuccessMsg.classList.add('hidden');
        }, 1500);
    }

    function fillFormWithProfile(p) {
        if (p.age) document.getElementById('age').value = p.age;
        if (p.gender) document.getElementById('gender').value = p.gender;
        if (p.weight) document.getElementById('weight').value = p.weight;
        if (p.height) document.getElementById('height').value = p.height;
        if (p.bodyType) document.getElementById('body-type').value = p.bodyType;
        if (p.bodyFat) document.getElementById('body-fat').value = p.bodyFat;
        if (p.mainStroke) document.getElementById('main-stroke').value = p.mainStroke;
        if (p.specialization) document.getElementById('specialization').value = p.specialization;
    }

    // ── Competition Events ──────────────────────────────────────────────────

    const dayIntensitySelect = document.getElementById('day-intensity');
    const compEventsSection = document.getElementById('competition-events-section');
    const activeRecoveryGroup = document.getElementById('active-recovery-group');
    const rpeInput = document.getElementById('rpe');

    if (dayIntensitySelect) {
        dayIntensitySelect.addEventListener('change', (e) => {
            if (e.target.value === 'rest') {
                activeRecoveryGroup.style.display = 'flex';
                rpeInput.closest('.input-group').style.display = 'none';
                compEventsSection.style.display = 'none';
            } else if (e.target.value === 'competition') {
                activeRecoveryGroup.style.display = 'none';
                rpeInput.closest('.input-group').style.display = 'none';
                compEventsSection.style.display = 'block';
            } else {
                activeRecoveryGroup.style.display = 'none';
                rpeInput.closest('.input-group').style.display = 'flex';
                compEventsSection.style.display = 'none';
            }
        });
    }

    const addEventBtns = document.querySelectorAll('.add-event-btn');
    const eventsListEl = document.getElementById('events-list');

    addEventBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const eventStr = e.target.closest('button').dataset.event;
            competitionEvents.push(eventStr);
            updateEventsList();
        });
    });

    function updateEventsList() {
        if (competitionEvents.length === 0) {
            eventsListEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">Ninguna prueba añadida aún.</p>`;
            return;
        }
        eventsListEl.innerHTML = competitionEvents.map((ev, i) =>
            `<span class="event-tag">${ev} <button type="button" onclick="window.removeEvent(${i})">×</button></span>`
        ).join('');
    }

    window.removeEvent = function (index) {
        competitionEvents.splice(index, 1);
        updateEventsList();
    };

    // ── PDF Export ──────────────────────────────────────────────────────────

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            const exportElement = document.getElementById('results-section');
            const buttonsContainer = document.querySelector('.results-header div');
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: 'Mi-Plan-HydroFuel.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#070B19' },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            if (buttonsContainer) buttonsContainer.style.display = 'none';
            html2pdf().set(opt).from(exportElement).save().then(() => {
                if (buttonsContainer) buttonsContainer.style.display = 'flex';
            });
        });
    }

    // ── Form Submit ─────────────────────────────────────────────────────────

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            weight: parseFloat(document.getElementById('weight').value),
            height: parseInt(document.getElementById('height').value),
            bodyType: document.getElementById('body-type').value,
            bodyFat: parseFloat(document.getElementById('body-fat').value) || null,
            mainStroke: document.getElementById('main-stroke').value,
            specialization: document.getElementById('specialization').value,
            classesHours: parseInt(document.getElementById('classes-hours').value),
            commute: document.getElementById('commute').value,
            neatActivity: document.getElementById('neat-activity').value,
            sleepHours: parseFloat(document.getElementById('sleep-hours').value),
            stressLevel: document.getElementById('stress-level').value,
            poolSessions: parseInt(document.getElementById('pool-sessions').value),
            avgVolume: parseInt(document.getElementById('avg-volume').value),
            gymSessions: parseInt(document.getElementById('gym-sessions').value),
            dayIntensity: document.getElementById('day-intensity').value,
            rpe: parseInt(document.getElementById('rpe').value) || 5,
            activeRecovery: document.getElementById('active-recovery')
                ? document.getElementById('active-recovery').checked : false
        };

        // Save profile if user is logged in
        import('./auth.js').then(m => {
            if (m.auth && m.auth.currentUser && !m.auth.currentUser.isAnonymous) {
                m.saveUserProfile(m.auth.currentUser.uid, {
                    age: data.age, gender: data.gender, weight: data.weight,
                    height: data.height, bodyType: data.bodyType, bodyFat: data.bodyFat,
                    mainStroke: data.mainStroke, specialization: data.specialization
                });
            }
        });

        const plan = calculatePlan(data);
        renderResults(plan, competitionEvents);

        resultsSection.classList.remove('hidden');
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });

    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        form.reset();
        competitionEvents = [];
        updateEventsList();
        inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

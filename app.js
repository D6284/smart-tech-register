/* =====================================================================
   SMART TECH — Registration & Admin System
   Storage-backed "database" using window.storage (shared = visible to
   everyone who opens this file — that's what makes the admin dashboard
   work).
===================================================================== */

const APP_STATE = { route: '#/register', drawerId: null, showDupModal: false, pendingSubmit: null, adminMenuOpen: false };

const DEFAULT_PROGRAM = {
  id: 'prog_web14',
  program_name: 'BUILD YOUR FIRST WEBSITE IN 14 DAYS',
  slug: 'web-development-bootcamp',
  type: 'Free Web Development Bootcamp',
  level: 'Beginner',
  duration: '14 Days',
  learning_mode: 'Online / Hybrid',
  start_date: '',
  description: "A practical beginner-friendly program designed to introduce young people to web development by taking them from the basics of HTML and CSS toward building and deploying their first website.",
  outcomes: ['Computer and internet foundations', 'HTML', 'CSS', 'JavaScript fundamentals', 'Building a responsive website', 'Git/GitHub basics', 'Deploying a website'],
  registration_open: true,
  registration_deadline: '',
  maximum_students: '',
  created_at: Date.now()
};

const LOCATIONS = ['Kumba', 'Buea', 'Limbe', 'Bamenda', 'Douala', 'Yaoundé', 'Other'];
const STATUSES = ['New', 'Reviewing', 'Approved', 'Rejected', 'Waitlisted', 'Enrolled', 'Completed'];
const TECH_OPTIONS = ['HTML', 'CSS', 'JavaScript', 'Python', 'PHP', 'Java', 'C', 'C++', 'React', 'Node.js', 'Other'];

let DB = { programs: [], applicants: [], settings: { admin_password: 'smarttech2026' } };
let SESSION = { isAdmin: false };

const storageAdapter = {
  async get(key, useNamespace) {
    try {
      if (window.storage && typeof window.storage.get === 'function') {
        const result = await window.storage.get(key, useNamespace).catch(() => null);
        if (result && result.value !== undefined) return result;
      }
    } catch (e) { }

    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : { value: raw };
    } catch (e) {
      return null;
    }
  },
  async set(key, value, useNamespace) {
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        const result = await window.storage.set(key, value, useNamespace);
        if (result !== null && result !== false) return;
      }
    } catch (e) { }

    try {
      localStorage.setItem(key, String(value));
    } catch (e) {
      // Ignore storage quota or permission issues in locked-down browsers.
    }
  }
};

/* ---------------- storage helpers ---------------- */
async function loadAll() {
  try {
    const progRes = await storageAdapter.get('programs', true);
    DB.programs = progRes && progRes.value ? JSON.parse(progRes.value) : [DEFAULT_PROGRAM];
    if (!progRes) { await storageAdapter.set('programs', JSON.stringify(DB.programs), true); }
  } catch (e) { DB.programs = [DEFAULT_PROGRAM]; }

  try {
    const appRes = await storageAdapter.get('applicants', true);
    DB.applicants = appRes && appRes.value ? JSON.parse(appRes.value) : [];
  } catch (e) { DB.applicants = []; }

  try {
    const setRes = await storageAdapter.get('settings', true);
    DB.settings = setRes && setRes.value ? JSON.parse(setRes.value) : { admin_password: 'smarttech2026' };
    if (!setRes) { await storageAdapter.set('settings', JSON.stringify(DB.settings), true); }
  } catch (e) { DB.settings = { admin_password: 'smarttech2026' }; }

  try {
    const cRes = await storageAdapter.get('app_counter', true);
    DB.counter = cRes && cRes.value ? JSON.parse(cRes.value) : { n: 0 };
  } catch (e) { DB.counter = { n: 0 }; }
}
async function saveApplicants() { await storageAdapter.set('applicants', JSON.stringify(DB.applicants), true); }
async function savePrograms() { await storageAdapter.set('programs', JSON.stringify(DB.programs), true); }
async function saveSettings() { await storageAdapter.set('settings', JSON.stringify(DB.settings), true); }
async function saveCounter() { await storageAdapter.set('app_counter', JSON.stringify(DB.counter), true); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- form state ---------------- */
function blankForm() {
  return {
    full_name: '', age: '', gender: '', phone: '', email: '', location: '', location_other: '',
    current_status: '', institution: '', education_level: '', education_level_other: '',
    tech_level: '', coding_experience: '', technologies: [], technologies_other: '',
    program_id: DB.programs[0] ? DB.programs[0].id : '',
    motivation: '', goals: '', dream_project: '',
    computer_access: '', smartphone_access: '', internet_access: '',
    learning_mode: '', communication_preference: '',
    guardian_name: '', guardian_phone: '', guardian_relationship: '',
    consent_accurate: false, consent_updates: false, guardian_consent: false
  };
}
let FORM = blankForm();
let STEP = 1;
const TOTAL_STEPS = 5;

function currentProgram() {
  return DB.programs.find(p => p.id === FORM.program_id) || DB.programs[0] || DEFAULT_PROGRAM;
}

/* ---------------- validation ---------------- */
function isMinor() { return FORM.age !== '' && Number(FORM.age) < 18; }

function validateStep(step) {
  const errs = {};
  if (step === 1) {
    if (!FORM.full_name.trim()) errs.full_name = 'This field is required.';
    if (FORM.age === '' || isNaN(FORM.age)) errs.age = 'This field is required.';
    else if (Number(FORM.age) < 5 || Number(FORM.age) > 100) errs.age = 'Please enter a realistic age.';
    if (!FORM.gender) errs.gender = 'This field is required.';
    if (!FORM.phone.trim()) errs.phone = 'This field is required.';
    else if (!/^[0-9+ ]{6,}$/.test(FORM.phone.trim())) errs.phone = 'Enter a valid phone number.';
    if (FORM.email.trim() && !/^\S+@\S+\.\S+$/.test(FORM.email.trim())) errs.email = 'Enter a valid email address.';
    if (!FORM.location) errs.location = 'This field is required.';
    if (FORM.location === 'Other' && !FORM.location_other.trim()) errs.location_other = 'Please specify your location.';
  }
  if (step === 2) {
    if (!FORM.current_status) errs.current_status = 'This field is required.';
    if (!FORM.education_level) errs.education_level = 'This field is required.';
    if (FORM.education_level === 'Other' && !FORM.education_level_other.trim()) errs.education_level_other = 'Please specify.';
  }
  if (step === 3) {
    if (!FORM.tech_level) errs.tech_level = 'This field is required.';
    if (!FORM.coding_experience) errs.coding_experience = 'This field is required.';
  }
  if (step === 4) {
    if (!FORM.motivation.trim()) errs.motivation = 'This field is required.';
    if (!FORM.goals.trim()) errs.goals = 'This field is required.';
    if (!FORM.dream_project.trim()) errs.dream_project = 'This field is required.';
    if (!FORM.computer_access) errs.computer_access = 'This field is required.';
    if (!FORM.smartphone_access) errs.smartphone_access = 'This field is required.';
    if (!FORM.internet_access) errs.internet_access = 'This field is required.';
    if (!FORM.learning_mode) errs.learning_mode = 'This field is required.';
    if (!FORM.communication_preference) errs.communication_preference = 'This field is required.';
    if (isMinor()) {
      if (!FORM.guardian_name.trim()) errs.guardian_name = 'Required for applicants under 18.';
      if (!FORM.guardian_phone.trim()) errs.guardian_phone = 'Required for applicants under 18.';
      if (!FORM.guardian_relationship.trim()) errs.guardian_relationship = 'Required for applicants under 18.';
    }
  }
  if (step === 5) {
    if (!FORM.consent_accurate) errs.consent_accurate = 'You must confirm this to continue.';
    if (isMinor() && !FORM.guardian_consent) errs.guardian_consent = 'Parent/guardian consent is required for applicants under 18.';
  }
  return errs;
}
let CURRENT_ERRORS = {};

/* ---------------- submit ---------------- */
function findDuplicate() {
  return DB.applicants.find(a => a.phone === FORM.phone.trim() && a.program_id === FORM.program_id);
}

async function doSubmit() {
  const year = new Date().getFullYear();
  DB.counter.n += 1;
  const seq = String(DB.counter.n).padStart(5, '0');
  const application_id = `ST-${year}-${seq}`;
  const record = {
    id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    application_id,
    ...JSON.parse(JSON.stringify(FORM)),
    application_status: 'New',
    admin_notes: [],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  DB.applicants.unshift(record);
  await saveApplicants();
  await saveCounter();
  APP_STATE.lastAppId = application_id;
  APP_STATE.route = '#/success';
  FORM = blankForm();
  STEP = 1;
  render();
}

/* ---------------- CSV export ---------------- */
function exportCSV(rows) {
  const cols = ['application_id', 'full_name', 'age', 'gender', 'phone', 'email', 'location', 'current_status', 'institution', 'education_level', 'tech_level', 'coding_experience', 'technologies', 'program_id', 'application_status', 'created_at'];
  const lines = [cols.join(',')];
  rows.forEach(r => {
    const line = cols.map(c => {
      let v = r[c];
      if (Array.isArray(v)) v = v.join('|');
      if (c === 'program_id') { const p = DB.programs.find(p => p.id === r.program_id); v = p ? p.program_name : r.program_id; }
      if (c === 'created_at') { v = new Date(r.created_at).toISOString(); }
      v = (v === undefined || v === null) ? '' : String(v).replace(/"/g, '""');
      return `"${v}"`;
    });
    lines.push(line.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smart-tech-applicants-${new Date().getFullYear()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ============================= RENDER ============================= */

function esc(s) { return (s === undefined || s === null) ? '' : String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function render() {
  const app = document.getElementById('app');
  const route = APP_STATE.route;
  if (route === '#/success') app.innerHTML = renderSuccess();
  else if (route.startsWith('#/admin/login')) app.innerHTML = renderLogin();
  else if (route.startsWith('#/admin')) {
    if (!SESSION.isAdmin) { APP_STATE.route = '#/admin/login'; app.innerHTML = renderLogin(); }
    else app.innerHTML = renderAdmin();
  }
  else app.innerHTML = renderRegisterPage();
  attachHandlers();
}

/* ---------------- Public register page ---------------- */
function renderRegisterPage() {
  const prog = currentProgram();
  const steps = ['Personal', 'Education', 'Technology', 'Program', 'Submit'];
  return `
  <div class="brandbar">
    <div class="brand-row">
      <div class="brand-mark">S</div>
      <div>
        <div class="brand-name">SMART <span>TECH</span></div>
        <div class="brand-sub">Technology • Education • Innovation</div>
      </div>
    </div>
    <div class="brand-hero">
      <h1>Start your technology journey</h1>
      <p>Apply for SMART TECH programs, bootcamps, workshops, and training opportunities.</p>
      <div class="brand-tagline">Learn. Build. Deploy. <b>Impact.</b></div>
    </div>
  </div>

  <div class="screen">
    <div class="program-card">
      <span class="program-tag">${esc(prog.type)}</span>
      <h2>${esc(prog.program_name)}</h2>
      <div class="program-meta">
        <div><span class="dot"></span>${esc(prog.level)}</div>
        <div><span class="dot"></span>${esc(prog.duration)}</div>
        <div><span class="dot"></span>${esc(prog.learning_mode)}</div>
        ${prog.start_date ? `<div><span class="dot"></span>Starts ${esc(prog.start_date)}</div>` : ''}
      </div>
      <p class="program-desc">${esc(prog.description)}</p>
      ${prog.outcomes && prog.outcomes.length ? `
      <div class="learn-list">
        ${prog.outcomes.map(o => `<div>${esc(o)}</div>`).join('')}
      </div>` : ''}
      <div class="who-box">
        <b>Who can apply?</b>
        Students, beginners, young people, and anyone interested in learning practical technology skills.
      </div>
    </div>

    <div class="progress-wrap">
      <div class="progress-steps">
        ${steps.map((s, i) => {
    const n = i + 1;
    const cls = n < STEP ? 'done' : (n === STEP ? 'active' : '');
    return `<div class="pstep ${cls}"><div class="circ">${n < STEP ? '✓' : n}</div><div class="lbl">${s}</div></div>`;
  }).join('')}
      </div>
    </div>

    ${renderFormStep()}
    <div class="footer-note">SMART TECH — Learn. Build. Deploy. Impact. · Registrations are reviewed by our admissions team.</div>
  </div>
  `;
}

function field(name, label, type, opts) {
  opts = opts || {};
  const err = CURRENT_ERRORS[name];
  let inner = '';
  if (type === 'text' || type === 'tel' || type === 'email' || type === 'number') {
    inner = `<input type="${type}" data-field="${name}" value="${esc(FORM[name])}" placeholder="${esc(opts.placeholder || '')}" ${opts.min !== undefined ? `min="${opts.min}"` : ''} ${opts.max !== undefined ? `max="${opts.max}"` : ''}>`;
  } else if (type === 'textarea') {
    inner = `<textarea data-field="${name}" placeholder="${esc(opts.placeholder || '')}">${esc(FORM[name])}</textarea>`;
  } else if (type === 'select') {
    inner = `<select data-field="${name}"><option value="">Select...</option>${opts.options.map(o => `<option value="${esc(o)}" ${FORM[name] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (type === 'pills') {
    inner = `<div class="radio-grid" data-pillgroup="${name}">${opts.options.map(o => `<div class="opt-pill ${FORM[name] === o ? 'selected' : ''}" data-pillval="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
  } else if (type === 'multipills') {
    inner = `<div class="check-grid" data-multigroup="${name}">${opts.options.map(o => `<div class="opt-pill ${FORM[name].includes(o) ? 'selected' : ''}" data-pillval="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
  }
  return `<div class="field ${err ? 'error' : ''}"><label>${label}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ''}</label>${inner}<div class="err-msg">${err || ''}</div></div>`;
}

function renderFormStep() {
  if (STEP === 1) {
    return `<div class="form-card">
      <h3>Personal Information</h3>
      <p class="form-sub">Tell us a little about yourself.</p>
      ${field('full_name', 'Full Name', 'text')}
      <div class="row2">
        ${field('age', 'Age', 'number')}
        ${field('gender', 'Gender', 'pills', { options: ['Male', 'Female', 'Prefer not to say'] })}
      </div>
      <div class="row2">
        ${field('phone', 'Phone / WhatsApp Number', 'tel', { placeholder: '+237 6xx xxx xxx' })}
        ${field('email', 'Email Address', 'email', { hint: '(optional)' })}
      </div>
      ${field('location', 'Location', 'pills', { options: LOCATIONS })}
      ${FORM.location === 'Other' ? `<div class="other-input">${field('location_other', 'Please specify your location', 'text')}</div>` : ''}
      <div class="nav-btns"><div></div><button class="btn btn-primary" id="nextBtn">Continue</button></div>
    </div>`;
  }
  if (STEP === 2) {
    return `<div class="form-card">
      <h3>Education Information</h3>
      <p class="form-sub">Where are you in your education or career?</p>
      ${field('current_status', 'Current Status', 'pills', { options: ['Secondary School Student', 'University Student', 'HND/Professional Student', 'Graduate', 'Working', 'Entrepreneur', 'Other'] })}
      ${field('institution', 'School / Institution', 'text', { hint: '(optional)' })}
      ${field('education_level', 'Current Level', 'pills', { options: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth', 'University', 'HND', 'Degree', 'Other'] })}
      ${FORM.education_level === 'Other' ? `<div class="other-input">${field('education_level_other', 'Please specify your level', 'text')}</div>` : ''}
      <div class="nav-btns"><button class="btn btn-ghost" id="backBtn">Back</button><button class="btn btn-primary" id="nextBtn">Continue</button></div>
    </div>`;
  }
  if (STEP === 3) {
    return `<div class="form-card">
      <h3>Technology Experience</h3>
      <p class="form-sub">Help us understand your current skill level.</p>
      ${field('tech_level', 'How would you describe your current technology level?', 'pills', { options: ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced'] })}
      ${field('coding_experience', 'Have you ever written code before?', 'pills', { options: ['Yes', 'No'] })}
      ${FORM.coding_experience === 'Yes' ? `<div class="other-input">
          ${field('technologies', 'Which technologies have you used? (select all that apply)', 'multipills', { options: TECH_OPTIONS })}
          ${FORM.technologies.includes('Other') ? field('technologies_other', 'Please specify other technologies', 'text') : ''}
        </div>` : ''}
      <div class="nav-btns"><button class="btn btn-ghost" id="backBtn">Back</button><button class="btn btn-primary" id="nextBtn">Continue</button></div>
    </div>`;
  }
  if (STEP === 4) {
    return `<div class="form-card">
      <h3>Program, Motivation & Access</h3>
      <p class="form-sub">A few final details before you submit.</p>
      ${DB.programs.length > 1 ? field('program_id', 'Program Applying For', 'select', { options: DB.programs.map(p => p.id) }) : `
        <div class="field"><label>Program Applying For</label><input type="text" value="${esc(currentProgram().program_name)}" disabled></div>
      `}
      ${field('motivation', 'Why do you want to learn technology?', 'textarea')}
      ${field('goals', 'What do you hope to achieve after this training?', 'textarea')}
      ${field('dream_project', 'What would you like to build someday?', 'textarea')}
      ${field('computer_access', 'Do you have access to a computer?', 'pills', { options: ['Yes, my own computer', 'Yes, shared computer', 'No'] })}
      ${field('smartphone_access', 'Do you have access to a smartphone?', 'pills', { options: ['Yes', 'No'] })}
      ${field('internet_access', 'How reliable is your internet access?', 'pills', { options: ['Very reliable', 'Fairly reliable', 'Sometimes difficult', 'Very difficult'] })}
      ${field('learning_mode', 'Preferred Learning Mode', 'pills', { options: ['Online', 'Physical', 'Both'] })}
      ${field('communication_preference', 'Preferred communication platform', 'pills', { options: ['WhatsApp', 'Email', 'Both'] })}
      ${isMinor() ? `
        <div class="guardian-box">
          <div class="tag">⚠ Guardian information required (applicant under 18)</div>
          ${field('guardian_name', 'Parent/Guardian Name', 'text')}
          ${field('guardian_phone', 'Parent/Guardian Phone Number', 'tel')}
          ${field('guardian_relationship', 'Relationship', 'text', { placeholder: 'e.g. Mother, Father, Uncle' })}
        </div>` : ''}
      <div class="nav-btns"><button class="btn btn-ghost" id="backBtn">Back</button><button class="btn btn-primary" id="nextBtn">Continue</button></div>
    </div>`;
  }
  if (STEP === 5) {
    const prog = currentProgram();
    return `<div class="form-card">
      <h3>Review & Submit</h3>
      <p class="form-sub">Please confirm before submitting your application.</p>
      <div class="dgrid" style="margin-bottom:18px;">
        <div><div class="k">Name</div><div class="v">${esc(FORM.full_name)}</div></div>
        <div><div class="k">Phone</div><div class="v">${esc(FORM.phone)}</div></div>
        <div><div class="k">Location</div><div class="v">${esc(FORM.location === 'Other' ? FORM.location_other : FORM.location)}</div></div>
        <div><div class="k">Program</div><div class="v">${esc(prog.program_name)}</div></div>
      </div>
      <div class="consent-row">
        <input type="checkbox" id="consent_accurate" ${FORM.consent_accurate ? 'checked' : ''}>
        <label for="consent_accurate">I confirm that the information I have provided is accurate.</label>
      </div>
      ${CURRENT_ERRORS.consent_accurate ? `<div class="err-msg" style="display:block;margin:-6px 0 8px 28px;">${CURRENT_ERRORS.consent_accurate}</div>` : ''}
      <div class="consent-row">
        <input type="checkbox" id="consent_updates" ${FORM.consent_updates ? 'checked' : ''}>
        <label for="consent_updates">I agree to receive important SMART TECH training and registration updates through WhatsApp or email.</label>
      </div>
      ${isMinor() ? `
      <div class="consent-row">
        <input type="checkbox" id="guardian_consent" ${FORM.guardian_consent ? 'checked' : ''}>
        <label for="guardian_consent">As the applicant's parent/guardian, I consent to this application on behalf of the applicant.</label>
      </div>
      ${CURRENT_ERRORS.guardian_consent ? `<div class="err-msg" style="display:block;margin:-6px 0 8px 28px;">${CURRENT_ERRORS.guardian_consent}</div>` : ''}
      ` : ''}
      <p style="font-size:12px;margin-top:10px;">By submitting, you agree to our <a href="#" id="privacyLink">Privacy Policy</a> and <a href="#" id="termsLink">Terms and Conditions</a>.</p>
      <div class="nav-btns"><button class="btn btn-ghost" id="backBtn">Back</button>
        <button class="btn btn-cta" id="submitBtn" style="flex:1;">Submit Application</button>
      </div>
    </div>`;
  }
}

function renderSuccess() {
  const id = APP_STATE.lastAppId || 'ST-2026-00000';
  return `
  <div class="success-wrap">
    <div class="success-badge">🎉</div>
    <h1>Application received!</h1>
    <p>Thank you for applying to SMART TECH. Your application has been successfully received.</p>
    <div class="appid-box">
      <div class="k">YOUR APPLICATION ID</div>
      <div class="v">${esc(id)}</div>
    </div>
    <div class="save-note">Please save your Application ID for future reference.</div>
    <div class="next-steps">
      <h4>Next steps</h4>
      <ol>
        <li>Your application will be reviewed.</li>
        <li>SMART TECH will contact you through your provided WhatsApp number or email.</li>
        <li>Approved applicants will receive further training information.</li>
      </ol>
    </div>
    <div class="success-actions">
      <button class="btn btn-primary" id="communityBtn">Join SMART TECH Community</button>
      <button class="btn btn-ghost" id="homeBtn">Submit another application</button>
    </div>
  </div>`;
}

/* ---------------- Admin: login ---------------- */
function renderLogin() {
  return `
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand-mark">S</div>
      <h2>SMART TECH Admin</h2>
      <p>Sign in to manage applications and programs.</p>
      <div class="field"><label>Password</label><input type="password" id="adminPass" placeholder="Enter admin password"></div>
      <div class="err-msg" id="loginErr" style="display:none;margin-bottom:10px;">Incorrect password. Please try again.</div>
      <button class="btn btn-primary" id="loginBtn" style="width:100%;margin-top:6px;">Sign in</button>
      <p style="text-align:center;margin-top:16px;"><a href="#/register">← Back to registration page</a></p>
    </div>
  </div>`;
}

/* ---------------- Admin: dashboard shell ---------------- */
function adminTab() {
  const r = APP_STATE.route;
  if (r.includes('applicants')) return 'applicants';
  if (r.includes('programs')) return 'programs';
  if (r.includes('reports')) return 'reports';
  if (r.includes('settings')) return 'settings';
  return 'dashboard';
}

function renderAdmin() {
  const tab = adminTab();
  const navItems = [
    ['dashboard', 'Dashboard'],
    ['applicants', 'Applicants'],
    ['programs', 'Programs'],
    ['reports', 'Reports'],
    ['settings', 'Settings'],
  ];
  let content = '';
  if (tab === 'dashboard') content = renderAdminDashboard();
  else if (tab === 'applicants') content = renderAdminApplicants();
  else if (tab === 'programs') content = renderAdminPrograms();
  else if (tab === 'reports') content = renderAdminReports();
  else if (tab === 'settings') content = renderAdminSettings();

  return `
  <div class="admin-shell">
    <div class="admin-side ${APP_STATE.adminMenuOpen ? 'open' : ''}" id="adminSide">
      <div class="brand-mini"><div class="brand-mark">S</div><span>SMART TECH ADMIN</span></div>
      <div class="admin-nav">
        ${navItems.map(([key, label]) => `<button data-nav="${key}" class="${tab === key ? 'active' : ''}">${label}</button>`).join('')}
      </div>
      <button class="logout" id="logoutBtn">Logout</button>
    </div>
    <div class="admin-main">
      <div class="admin-topbar">
        <button class="mobile-menu-btn" id="menuToggle">☰ Menu</button>
        <h2>${navItems.find(n => n[0] === tab)[1]}</h2>
        <button class="btn btn-ghost btn-sm" id="refreshAdminBtn">Refresh applications</button>
      </div>
      ${content}
    </div>
  </div>
  ${APP_STATE.drawerId ? renderDrawer() : ''}
  `;
}

function renderAdminDashboard() {
  const total = DB.applicants.length;
  const by = s => DB.applicants.filter(a => a.application_status === s).length;
  const progCounts = {};
  DB.applicants.forEach(a => { const p = DB.programs.find(p => p.id === a.program_id); const name = p ? p.program_name : 'Unknown'; progCounts[name] = (progCounts[name] || 0) + 1; });
  const locCounts = {};
  DB.applicants.forEach(a => { const loc = a.location === 'Other' ? (a.location_other || 'Other') : a.location; locCounts[loc] = (locCounts[loc] || 0) + 1; });
  const eduCounts = {};
  DB.applicants.forEach(a => { const e = a.education_level === 'Other' ? (a.education_level_other || 'Other') : a.education_level; if (e) eduCounts[e] = (eduCounts[e] || 0) + 1; });

  return `
  <div class="stat-grid">
    <div class="stat-card accent"><div class="n">${total}</div><div class="l">Total Applicants</div></div>
    <div class="stat-card accent2"><div class="n">${by('New')}</div><div class="l">New Applications</div></div>
    <div class="stat-card"><div class="n">${by('Reviewing')}</div><div class="l">Under Review</div></div>
    <div class="stat-card"><div class="n">${by('Approved')}</div><div class="l">Approved</div></div>
    <div class="stat-card"><div class="n">${by('Enrolled')}</div><div class="l">Enrolled</div></div>
    <div class="stat-card"><div class="n">${by('Completed')}</div><div class="l">Completed</div></div>
  </div>
  <div class="panel">
    <h3>Applications by Program</h3>
    ${breakdownRows(progCounts, total)}
  </div>
  <div class="panel">
    <h3>Applications by Location</h3>
    ${breakdownRows(locCounts, total)}
  </div>
  <div class="panel">
    <h3>Applications by Education Level</h3>
    ${breakdownRows(eduCounts, total)}
  </div>
  `;
}

function breakdownRows(counts, total) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return `<p style="font-size:13px;">No data yet — applications will appear here once submitted.</p>`;
  return entries.map(([k, v]) => {
    const pct = total ? Math.round(v / total * 100) : 0;
    return `<div class="breakdown-row"><div class="label">${esc(k)}</div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div><div class="num">${v}</div></div>`;
  }).join('');
}

function renderAdminApplicants() {
  const q = (APP_STATE.searchQ || '').toLowerCase();
  const fProg = APP_STATE.fProg || '';
  const fLoc = APP_STATE.fLoc || '';
  const fStatus = APP_STATE.fStatus || '';
  const fEdu = APP_STATE.fEdu || '';

  let rows = DB.applicants.filter(a => {
    if (q && !(`${a.full_name} ${a.application_id} ${a.phone} ${a.email}`.toLowerCase().includes(q))) return false;
    if (fProg && a.program_id !== fProg) return false;
    if (fLoc && (a.location === 'Other' ? a.location_other : a.location) !== fLoc) return false;
    if (fStatus && a.application_status !== fStatus) return false;
    if (fEdu && (a.education_level === 'Other' ? a.education_level_other : a.education_level) !== fEdu) return false;
    return true;
  });

  const eduLevels = [...new Set(DB.applicants.map(a => a.education_level === 'Other' ? a.education_level_other : a.education_level).filter(Boolean))];

  return `
  <div class="toolbar">
    <div class="search-box"><input type="text" id="searchInput" placeholder="Search by name, ID, phone, or email" value="${esc(APP_STATE.searchQ || '')}"></div>
    <select class="filter-select" id="fProg"><option value="">All Programs</option>${DB.programs.map(p => `<option value="${p.id}" ${fProg === p.id ? 'selected' : ''}>${esc(p.program_name)}</option>`).join('')}</select>
    <select class="filter-select" id="fLoc"><option value="">All Locations</option>${LOCATIONS.map(l => `<option value="${l}" ${fLoc === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select class="filter-select" id="fStatus"><option value="">All Statuses</option>${STATUSES.map(s => `<option value="${s}" ${fStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <select class="filter-select" id="fEdu"><option value="">All Education Levels</option>${eduLevels.map(l => `<option value="${esc(l)}" ${fEdu === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <button class="btn btn-ghost btn-sm" id="exportBtn">⬇ Export CSV</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Application ID</th><th>Name</th><th>Phone</th><th>Location</th><th>Program</th><th>Education</th><th>Tech Level</th><th>Status</th><th>Date</th><th>Actions</th>
      </tr></thead>
      <tbody>
      ${rows.length ? rows.map(a => {
    const p = DB.programs.find(p => p.id === a.program_id);
    return `<tr>
          <td>${esc(a.application_id)}</td>
          <td>${esc(a.full_name)}</td>
          <td>${esc(a.phone)}</td>
          <td>${esc(a.location === 'Other' ? a.location_other : a.location)}</td>
          <td>${esc(p ? p.program_name : '—')}</td>
          <td>${esc(a.education_level === 'Other' ? a.education_level_other : a.education_level)}</td>
          <td>${esc(a.tech_level)}</td>
          <td><span class="status-pill st-${a.application_status}">${a.application_status}</span></td>
          <td>${new Date(a.created_at).toLocaleDateString()}</td>
          <td><button class="link-btn" data-view="${a.id}">View</button></td>
        </tr>`;
  }).join('') : `<tr class="empty-row"><td colspan="10">No applications match your filters yet.</td></tr>`}
      </tbody>
    </table>
  </div>
  `;
}

function renderDrawer() {
  const a = DB.applicants.find(x => x.id === APP_STATE.drawerId);
  if (!a) return '';
  const p = DB.programs.find(p => p.id === a.program_id);
  return `
  <div class="drawer-overlay" id="drawerOverlay"></div>
  <div class="drawer">
    <div class="drawer-head">
      <button class="close" id="closeDrawer">✕</button>
      <div class="aid">${esc(a.application_id)}</div>
      <h3>${esc(a.full_name)}</h3>
    </div>
    <div class="drawer-body">
      <div class="dsec">
        <h4>Status</h4>
        <div class="status-row">
          ${STATUSES.map(s => `<button class="opt-pill btn-sm ${a.application_status === s ? 'selected' : ''}" data-setstatus="${s}" style="cursor:pointer;">${s}</button>`).join('')}
        </div>
      </div>
      <div class="dsec">
        <h4>Personal Information</h4>
        <div class="dgrid">
          <div><div class="k">Age</div><div class="v">${esc(a.age)}</div></div>
          <div><div class="k">Gender</div><div class="v">${esc(a.gender)}</div></div>
          <div><div class="k">Phone</div><div class="v">${esc(a.phone)}</div></div>
          <div><div class="k">Email</div><div class="v">${esc(a.email || '—')}</div></div>
          <div class="dfull"><div class="k">Location</div><div class="v">${esc(a.location === 'Other' ? a.location_other : a.location)}</div></div>
        </div>
      </div>
      <div class="dsec">
        <h4>Education</h4>
        <div class="dgrid">
          <div><div class="k">Status</div><div class="v">${esc(a.current_status)}</div></div>
          <div><div class="k">Level</div><div class="v">${esc(a.education_level === 'Other' ? a.education_level_other : a.education_level)}</div></div>
          <div class="dfull"><div class="k">Institution</div><div class="v">${esc(a.institution || '—')}</div></div>
        </div>
      </div>
      <div class="dsec">
        <h4>Technology</h4>
        <div class="dgrid">
          <div><div class="k">Level</div><div class="v">${esc(a.tech_level)}</div></div>
          <div><div class="k">Coded before?</div><div class="v">${esc(a.coding_experience)}</div></div>
          <div class="dfull"><div class="k">Technologies</div><div class="v">${(a.technologies || []).join(', ') || '—'}</div></div>
          <div><div class="k">Computer access</div><div class="v">${esc(a.computer_access)}</div></div>
          <div><div class="k">Internet</div><div class="v">${esc(a.internet_access)}</div></div>
        </div>
      </div>
      <div class="dsec">
        <h4>Motivation</h4>
        <div class="dgrid">
          <div class="dfull"><div class="k">Why they want to learn</div><div class="v">${esc(a.motivation)}</div></div>
          <div class="dfull"><div class="k">Goals</div><div class="v">${esc(a.goals)}</div></div>
          <div class="dfull"><div class="k">Dream project</div><div class="v">${esc(a.dream_project)}</div></div>
        </div>
      </div>
      ${(a.guardian_name || a.guardian_phone) ? `
      <div class="dsec">
        <h4>Guardian Information</h4>
        <div class="dgrid">
          <div><div class="k">Name</div><div class="v">${esc(a.guardian_name)}</div></div>
          <div><div class="k">Phone</div><div class="v">${esc(a.guardian_phone)}</div></div>
          <div><div class="k">Relationship</div><div class="v">${esc(a.guardian_relationship)}</div></div>
        </div>
      </div>` : ''}
      <div class="dsec">
        <h4>Program</h4>
        <div class="dgrid">
          <div class="dfull"><div class="k">Applied for</div><div class="v">${esc(p ? p.program_name : '—')}</div></div>
          <div><div class="k">Applied on</div><div class="v">${new Date(a.created_at).toLocaleString()}</div></div>
        </div>
      </div>
      <div class="dsec">
        <h4>Admin Notes <span style="font-weight:400;text-transform:none;color:var(--ink-soft);">(private — not visible to applicant)</span></h4>
        ${(a.admin_notes || []).map(n => `<div class="note-item"><div class="t">${new Date(n.at).toLocaleString()}</div>${esc(n.text)}</div>`).join('')}
        <div class="notes-box">
          <textarea id="noteInput" placeholder="Add a private note..."></textarea>
          <button class="btn btn-primary btn-sm" id="addNoteBtn" style="margin-top:8px;">Add Note</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderAdminPrograms() {
  return `
  <div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <h3 style="margin:0;">All Programs</h3>
      <button class="btn btn-primary btn-sm" id="newProgBtn">+ New Program</button>
    </div>
  </div>
  ${DB.programs.map(p => {
    const count = DB.applicants.filter(a => a.program_id === p.id).length;
    return `<div class="prog-card">
      <div class="prog-card-top">
        <div>
          <h4>${esc(p.program_name)}</h4>
          <p style="margin-top:2px;">${esc(p.type)} · ${esc(p.level)} · ${esc(p.duration)} · ${count} applicant${count === 1 ? '' : 's'}</p>
        </div>
        <span class="badge ${p.registration_open ? 'open' : 'closed'}">${p.registration_open ? 'Open' : 'Closed'}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-ghost btn-sm" data-editprog="${p.id}">Edit</button>
        <button class="btn btn-ghost btn-sm" data-toggleprog="${p.id}">${p.registration_open ? 'Close Registration' : 'Open Registration'}</button>
        <button class="btn btn-danger btn-sm" data-delprog="${p.id}">Archive</button>
      </div>
    </div>`;
  }).join('')}
  ${APP_STATE.progEditor ? renderProgramEditor() : ''}
  `;
}

function renderProgramEditor() {
  const editing = APP_STATE.progEditor;
  const p = editing === 'new' ? { program_name: '', slug: '', type: '', level: '', duration: '', learning_mode: '', start_date: '', description: '', registration_open: true, maximum_students: '', registration_deadline: '' } : DB.programs.find(x => x.id === editing);
  if (!p) return '';
  return `
  <div class="modal-overlay" id="progModalOverlay">
    <div class="modal-box" style="max-width:480px;max-height:85vh;overflow-y:auto;">
      <h4>${editing === 'new' ? 'New Program' : 'Edit Program'}</h4>
      <div class="field"><label>Program Name</label><input type="text" id="pf_name" value="${esc(p.program_name)}"></div>
      <div class="field"><label>Type</label><input type="text" id="pf_type" value="${esc(p.type)}"></div>
      <div class="row2">
        <div class="field"><label>Level</label><input type="text" id="pf_level" value="${esc(p.level)}"></div>
        <div class="field"><label>Duration</label><input type="text" id="pf_duration" value="${esc(p.duration)}"></div>
      </div>
      <div class="field"><label>Learning Mode</label><input type="text" id="pf_mode" value="${esc(p.learning_mode)}"></div>
      <div class="field"><label>Start Date</label><input type="text" id="pf_start" value="${esc(p.start_date)}" placeholder="e.g. October 2026"></div>
      <div class="field"><label>Description</label><textarea id="pf_desc">${esc(p.description)}</textarea></div>
      <div class="field"><label>Maximum Students</label><input type="number" id="pf_max" value="${esc(p.maximum_students)}"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="progCancel">Cancel</button>
        <button class="btn btn-primary" id="progSave">Save Program</button>
      </div>
    </div>
  </div>`;
}

function renderAdminReports() {
  const total = DB.applicants.length;
  const ageBands = { 'Under 18': 0, '18–24': 0, '25–34': 0, '35+': 0 };
  DB.applicants.forEach(a => {
    const age = Number(a.age);
    if (age < 18) ageBands['Under 18']++; else if (age <= 24) ageBands['18–24']++; else if (age <= 34) ageBands['25–34']++; else ageBands['35+']++;
  });
  const approved = DB.applicants.filter(a => a.application_status === 'Approved').length;
  const rejected = DB.applicants.filter(a => a.application_status === 'Rejected').length;
  const enrolled = DB.applicants.filter(a => a.application_status === 'Enrolled').length;
  const techLevels = {}; DB.applicants.forEach(a => { if (a.tech_level) techLevels[a.tech_level] = (techLevels[a.tech_level] || 0) + 1; });

  return `
  <div class="stat-grid">
    <div class="stat-card accent"><div class="n">${total}</div><div class="l">Total Applications</div></div>
    <div class="stat-card"><div class="n">${approved}</div><div class="l">Approved</div></div>
    <div class="stat-card"><div class="n">${rejected}</div><div class="l">Rejected</div></div>
    <div class="stat-card accent2"><div class="n">${enrolled}</div><div class="l">Enrolled</div></div>
  </div>
  <div class="panel"><h3>Applications by Age Group</h3>${breakdownRows(ageBands, total)}</div>
  <div class="panel"><h3>Applications by Technology Level</h3>${breakdownRows(techLevels, total)}</div>
  `;
}

function renderAdminSettings() {
  return `
  <div class="panel">
    <h3>Admin Password</h3>
    <p style="margin-bottom:12px;">This password gates access to the admin dashboard for anyone with this link. Change it to something only your team knows.</p>
    <div class="field"><label>New Password</label><input type="password" id="newPassInput" placeholder="Enter new admin password"></div>
    <button class="btn btn-primary btn-sm" id="savePassBtn">Update Password</button>
  </div>
  <div class="panel">
    <h3>Demo Data</h3>
    <p style="margin-bottom:12px;">Remove all applicant data before going live with real applicants.</p>
    <button class="btn btn-danger btn-sm" id="clearDataBtn">Clear All Applicant Data</button>
  </div>
  `;
}

/* ============================= EVENTS ============================= */
function attachHandlers() {
  const app = document.getElementById('app');

  // pill selects
  app.querySelectorAll('[data-pillgroup]').forEach(g => {
    const name = g.getAttribute('data-pillgroup');
    g.querySelectorAll('.opt-pill').forEach(p => {
      p.onclick = () => { FORM[name] = p.getAttribute('data-pillval'); render(); };
    });
  });
  app.querySelectorAll('[data-multigroup]').forEach(g => {
    const name = g.getAttribute('data-multigroup');
    g.querySelectorAll('.opt-pill').forEach(p => {
      p.onclick = () => {
        const val = p.getAttribute('data-pillval');
        const arr = FORM[name];
        const idx = arr.indexOf(val);
        if (idx > -1) arr.splice(idx, 1); else arr.push(val);
        render();
      };
    });
  });
  // text inputs
  app.querySelectorAll('[data-field]').forEach(inp => {
    inp.oninput = () => { FORM[inp.getAttribute('data-field')] = inp.value; };
  });

  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.onclick = () => {
    const errs = validateStep(STEP);
    CURRENT_ERRORS = errs;
    if (Object.keys(errs).length) { render(); return; }
    STEP = Math.min(TOTAL_STEPS, STEP + 1);
    CURRENT_ERRORS = {};
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.onclick = () => { STEP = Math.max(1, STEP - 1); CURRENT_ERRORS = {}; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const c1 = document.getElementById('consent_accurate');
  if (c1) c1.onchange = () => { FORM.consent_accurate = c1.checked; };
  const c2 = document.getElementById('consent_updates');
  if (c2) c2.onchange = () => { FORM.consent_updates = c2.checked; };
  const c3 = document.getElementById('guardian_consent');
  if (c3) c3.onchange = () => { FORM.guardian_consent = c3.checked; };

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.onclick = async () => {
    const errs = validateStep(5);
    CURRENT_ERRORS = errs;
    if (Object.keys(errs).length) { render(); return; }
    if (findDuplicate()) { APP_STATE.showDupModal = true; render(); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting your application...';
    try { await doSubmit(); }
    catch (e) { showToast('Something went wrong while submitting your application. Please try again later.'); submitBtn.disabled = false; submitBtn.textContent = 'Submit Application'; }
  };

  if (APP_STATE.showDupModal) {
    renderDupModalInto(app);
  }

  const communityBtn = document.getElementById('communityBtn');
  if (communityBtn) communityBtn.onclick = () => {
    window.open('https://chat.whatsapp.com/DkrxhGt3YU77pU05270DIN?s=cl&p=a&mlu=0&ilr=4', '_blank');
  };
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) homeBtn.onclick = () => { APP_STATE.route = '#/register'; render(); };

  const privacyLink = document.getElementById('privacyLink');
  if (privacyLink) privacyLink.onclick = (e) => { e.preventDefault(); showToast('Link your Privacy Policy page here.'); };
  const termsLink = document.getElementById('termsLink');
  if (termsLink) termsLink.onclick = (e) => { e.preventDefault(); showToast('Link your Terms and Conditions page here.'); };

  // login
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.onclick = () => {
    const val = document.getElementById('adminPass').value;
    if (val === DB.settings.admin_password) {
      SESSION.isAdmin = true;
      APP_STATE.route = '#/admin/dashboard';
      render();
    } else {
      document.getElementById('loginErr').style.display = 'block';
    }
  };
  const passInput = document.getElementById('adminPass');
  if (passInput) passInput.onkeydown = (e) => { if (e.key === 'Enter') loginBtn.click(); };

  // admin nav
  app.querySelectorAll('[data-nav]').forEach(b => {
    b.onclick = () => { APP_STATE.route = '#/admin/' + b.getAttribute('data-nav'); APP_STATE.adminMenuOpen = false; render(); };
  });
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => { SESSION.isAdmin = false; APP_STATE.route = '#/admin/login'; render(); };
  const refreshAdminBtn = document.getElementById('refreshAdminBtn');
  if (refreshAdminBtn) refreshAdminBtn.onclick = async () => {
    refreshAdminBtn.disabled = true;
    await loadAll();
    render();
    showToast('Applications refreshed.');
  };
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) menuToggle.onclick = () => { APP_STATE.adminMenuOpen = !APP_STATE.adminMenuOpen; render(); };

  // applicants table
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.oninput = () => { APP_STATE.searchQ = searchInput.value; render(); searchInput.focus(); searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length; };
  }
  ['fProg', 'fLoc', 'fStatus', 'fEdu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { APP_STATE['f' + id.slice(1)] = el.value; render(); };
  });
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.onclick = () => { exportCSV(DB.applicants); showToast('CSV export started.'); };

  app.querySelectorAll('[data-view]').forEach(b => {
    b.onclick = () => { APP_STATE.drawerId = b.getAttribute('data-view'); render(); };
  });
  const closeDrawer = document.getElementById('closeDrawer');
  if (closeDrawer) closeDrawer.onclick = () => { APP_STATE.drawerId = null; render(); };
  const drawerOverlay = document.getElementById('drawerOverlay');
  if (drawerOverlay) drawerOverlay.onclick = () => { APP_STATE.drawerId = null; render(); };

  app.querySelectorAll('[data-setstatus]').forEach(b => {
    b.onclick = async () => {
      const a = DB.applicants.find(x => x.id === APP_STATE.drawerId);
      a.application_status = b.getAttribute('data-setstatus');
      a.updated_at = Date.now();
      await saveApplicants();
      showToast('Status updated to ' + a.application_status);
      render();
    };
  });
  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) addNoteBtn.onclick = async () => {
    const ta = document.getElementById('noteInput');
    if (!ta.value.trim()) return;
    const a = DB.applicants.find(x => x.id === APP_STATE.drawerId);
    a.admin_notes = a.admin_notes || [];
    a.admin_notes.unshift({ text: ta.value.trim(), at: Date.now() });
    await saveApplicants();
    showToast('Note added.');
    render();
  };

  // programs
  const newProgBtn = document.getElementById('newProgBtn');
  if (newProgBtn) newProgBtn.onclick = () => { APP_STATE.progEditor = 'new'; render(); };
  app.querySelectorAll('[data-editprog]').forEach(b => { b.onclick = () => { APP_STATE.progEditor = b.getAttribute('data-editprog'); render(); }; });
  app.querySelectorAll('[data-toggleprog]').forEach(b => {
    b.onclick = async () => {
      const p = DB.programs.find(x => x.id === b.getAttribute('data-toggleprog'));
      p.registration_open = !p.registration_open;
      await savePrograms();
      render();
    };
  });
  app.querySelectorAll('[data-delprog]').forEach(b => {
    b.onclick = async () => {
      if (DB.programs.length <= 1) { showToast('At least one program must remain.'); return; }
      if (!confirm('Archive this program? It will no longer accept new registrations.')) return;
      const id = b.getAttribute('data-delprog');
      DB.programs = DB.programs.filter(p => p.id !== id);
      await savePrograms();
      render();
    };
  });
  const progCancel = document.getElementById('progCancel');
  if (progCancel) progCancel.onclick = () => { APP_STATE.progEditor = null; render(); };
  const progSave = document.getElementById('progSave');
  if (progSave) progSave.onclick = async () => {
    const vals = {
      program_name: document.getElementById('pf_name').value.trim(),
      type: document.getElementById('pf_type').value.trim(),
      level: document.getElementById('pf_level').value.trim(),
      duration: document.getElementById('pf_duration').value.trim(),
      learning_mode: document.getElementById('pf_mode').value.trim(),
      start_date: document.getElementById('pf_start').value.trim(),
      description: document.getElementById('pf_desc').value.trim(),
      maximum_students: document.getElementById('pf_max').value.trim(),
    };
    if (!vals.program_name) { showToast('Program name is required.'); return; }
    if (APP_STATE.progEditor === 'new') {
      const slug = vals.program_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      DB.programs.push({ id: 'prog_' + Date.now(), slug, outcomes: [], registration_open: true, registration_deadline: '', created_at: Date.now(), ...vals });
    } else {
      const p = DB.programs.find(x => x.id === APP_STATE.progEditor);
      Object.assign(p, vals);
    }
    await savePrograms();
    APP_STATE.progEditor = null;
    showToast('Program saved.');
    render();
  };
  const progModalOverlay = document.getElementById('progModalOverlay');
  if (progModalOverlay) progModalOverlay.onclick = (e) => { if (e.target === progModalOverlay) { APP_STATE.progEditor = null; render(); } };

  // settings
  const savePassBtn = document.getElementById('savePassBtn');
  if (savePassBtn) savePassBtn.onclick = async () => {
    const v = document.getElementById('newPassInput').value;
    if (!v || v.length < 4) { showToast('Password must be at least 4 characters.'); return; }
    DB.settings.admin_password = v;
    await saveSettings();
    showToast('Admin password updated.');
  };
  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) clearDataBtn.onclick = async () => {
    if (!confirm('This will permanently delete ALL applicant records. Continue?')) return;
    DB.applicants = [];
    await saveApplicants();
    showToast('All applicant data cleared.');
    render();
  };
}

function renderDupModalInto(app) {
  const div = document.createElement('div');
  div.innerHTML = `
  <div class="modal-overlay" id="dupOverlay">
    <div class="modal-box">
      <h4>Possible duplicate application</h4>
      <p>You may already have an application for this program with this phone number. Would you like to submit anyway, or cancel?</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="dupCancel">Cancel</button>
        <button class="btn btn-primary" id="dupContinue">Submit Anyway</button>
      </div>
    </div>
  </div>`;
  app.appendChild(div.firstElementChild);
  document.getElementById('dupCancel').onclick = () => { APP_STATE.showDupModal = false; render(); };
  document.getElementById('dupContinue').onclick = async () => {
    APP_STATE.showDupModal = false;
    await doSubmit();
  };
}

/* ---------------- init / routing ---------------- */
function parseRouteFromHash() {
  const h = window.location.hash;
  if (h.startsWith('#/register/')) {
    const slug = h.replace('#/register/', '');
    const p = DB.programs.find(p => p.slug === slug);
    if (p) FORM.program_id = p.id;
    APP_STATE.route = '#/register';
  } else if (h) {
    APP_STATE.route = h;
  }
}

window.addEventListener('hashchange', () => { parseRouteFromHash(); render(); });
window.addEventListener('storage', async (event) => {
  if (event.key === 'applicants' && SESSION.isAdmin) {
    await loadAll();
    render();
  }
});

(async function init() {
  document.getElementById('app').innerHTML = '<div style="padding:60px;text-align:center;color:#5A6B80;font-family:Inter,sans-serif;">Loading SMART TECH…</div>';
  await loadAll();
  FORM = blankForm();
  parseRouteFromHash();
  render();
})();

// main.js

document.addEventListener('DOMContentLoaded', async () => { // Make listener async
    // ===== DOM Elements =====
    const navContainer = document.getElementById('app-nav');
    const contentContainers = document.querySelectorAll('.app-content');
    const navButtons = document.querySelectorAll('.nav-button');
    const patientSelector = document.getElementById('patient-selector');
    const newPatientBtn = document.getElementById('new-patient-btn');
    const deletePatientBtn = document.getElementById('delete-patient-btn');
    const appContainer = document.getElementById('app-container');

    let currentPatientId = null;

    // ===== App Initializers =====
    // Storing the app objects themselves
    const apps = {
        app1: App1,
        app2: App2,
        app3: App3
    };
    const initializedApps = new Set();

    // ===== Patient Management =====
    function loadPatientList() {
        const patients = PatientDataManager.getAllPatients();
        patientSelector.innerHTML = '';
        const sortedPatients = Object.values(patients).sort((a, b) => b.createdAt - a.createdAt);
        
        if (sortedPatients.length === 0) {
            patientSelector.innerHTML = '<option>患者がいません</option>';
            return;
        }

        sortedPatients.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            patientSelector.appendChild(option);
        });
    }

    function switchPatient(patientId) {
        currentPatientId = patientId;
        if (!currentPatientId) {
            appContainer.style.display = 'none';
            return;
        }
        appContainer.style.display = 'block';

        const patient = PatientDataManager.getPatient(currentPatientId);
        if (patient) {
            patientSelector.value = patientId;
            // Update all apps with the new patient data
            Object.values(apps).forEach(app => {
                if(app.load) app.load(patient);
            });
        }
    }

    // ===== App Navigation =====
    async function switchAppTab(targetId) { // Make tab switching async
        contentContainers.forEach(c => c.classList.remove('active'));
        navButtons.forEach(b => b.classList.remove('active'));

        document.getElementById(targetId).classList.add('active');
        document.querySelector(`.nav-button[data-target="${targetId}"]`).classList.add('active');

        if (!initializedApps.has(targetId)) {
            // Await the initialization of the app module
            await apps[targetId].initialize();
            initializedApps.add(targetId);
        }
    }

    // ===== Event Listeners =====
    navContainer.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            switchAppTab(e.target.dataset.target);
        }
    });

    patientSelector.addEventListener('change', () => {
        switchPatient(patientSelector.value);
    });

    newPatientBtn.addEventListener('click', () => {
        const newPatient = PatientDataManager.createNewPatient();
        loadPatientList();
        switchPatient(newPatient.id);
    });

    deletePatientBtn.addEventListener('click', () => {
        if (!currentPatientId || !confirm('本当にこの患者データを削除しますか？この操作は元に戻せません。')) return;
        PatientDataManager.deletePatient(currentPatientId);
        loadPatientList();
        const patients = PatientDataManager.getAllPatients();
        const nextPatientId = Object.keys(patients)[0] || null;
        switchPatient(nextPatientId);
    });


    // ===== Initial Load =====
    async function initialize() { // Make main initialize async
        loadPatientList();
        const patients = PatientDataManager.getAllPatients();
        const latestPatient = Object.values(patients).sort((a,b) => b.createdAt - a.createdAt)[0] || null;
        
        // Initialize all app modules in parallel
        await Promise.all(Object.values(apps).map(app => {
             if (!initializedApps.has(app)) {
                 initializedApps.add(app);
                 return app.initialize();
             }
        }));

        if (latestPatient) {
            switchPatient(latestPatient.id);
        } else {
            appContainer.style.display = 'none';
        }
        
        // Ensure the first tab is shown after initialization
        await switchAppTab('app1');
    }

    await initialize(); // Await the full initialization
});
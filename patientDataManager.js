// patientDataManager.js

const PatientDataManager = {
    getAllPatients: function() {
        return JSON.parse(localStorage.getItem('patients') || '{}');
    },

    getPatient: function(patientId) {
        const patients = this.getAllPatients();
        return patients[patientId] || null;
    },

    savePatient: function(patientData) {
        if (!patientData || !patientData.id) return;
        const patients = this.getAllPatients();
        patients[patientData.id] = patientData;
        localStorage.setItem('patients', JSON.stringify(patients));
    },

    createNewPatient: function() {
        const timestamp = Date.now();
        const newPatient = {
            id: timestamp,
            name: `新規患者 ${new Date(timestamp).toLocaleTimeString()}`,
            createdAt: timestamp,
            data: {
                // App1 Data
                age: '',
                gender: '',
                chiefComplaint: '',
                historyOfPresentIllness: '',
                pastMedicalHistory: [],
                surgeryHistory: '',
                allergies: [],
                otherAllergies: '',
                medications: [],
                lifestyle: [],
                lifestyleDetails: '',
                adlScore: 0,
                vitals: '',
                physicalFindings: '',
                assessmentNotes: '',
                planNotes: '',
                // App2 Data
                symptoms: [],
                recordedDiagnoses: {}, // {symptomName: [disease1, disease2]}
                selectedKeywords: [],
                // App3 Data
                labResults: {},
                urinalysisFindings: '',
                ecgFindings: '',
                imagingFindings: '',
                memo: '',
            }
        };
        this.savePatient(newPatient);
        return newPatient;
    },

    deletePatient: function(patientId) {
        const patients = this.getAllPatients();
        delete patients[patientId];
        localStorage.setItem('patients', JSON.stringify(patients));
    }
};
// app1.js
const App1 = {
    patient: null,
    elements: {},
    historyList: [],
    medSuggestions: {},
    adlItems: [
        { label: '食事', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
        // ... (rest of ADL items) ...
        { label: '排尿管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
    ],

    async initialize() {
        this.elements = {
            name: document.getElementById('name'),
            age: document.getElementById('age'),
            genderGroup: document.getElementById('gender'),
            chiefComplaint: document.getElementById('chief-complaint'),
            historyOfPresentIllness: document.getElementById('history-of-present-illness'),
            historyTags: document.getElementById('history-tags'),
            surgeryHistory: document.getElementById('surgery-history'),
            allergyTags: document.getElementById('allergy-tags'),
            otherAllergies: document.getElementById('other-allergies'),
            medSuggestionContainer: document.getElementById('med-suggestion-tags'),
            medListContainer: document.getElementById('medication-list'),
            addMedRowBtn: document.getElementById('add-med-row'),
            lifestyleTags: document.getElementById('lifestyle-tags'),
            lifestyleDetails: document.getElementById('lifestyle-details'),
            adlAssessmentContainer: document.getElementById('adl-assessment'),
            adlScoreDisplay: document.getElementById('adl-score'),
            vitals: document.getElementById('vitals'),
            physicalFindings: document.getElementById('physical-findings'),
            assessmentDiagnosisList: document.getElementById('assessment-diagnosis-list'),
            assessmentNotes: document.getElementById('assessment-notes'),
            planNotes: document.getElementById('plan-notes'),
            outputMemo: document.getElementById('output-memo'),
            copyBtn: document.getElementById('copy-button-app1'),
        };

        // Bind 'this' for all methods that need it
        this.handleInput = this.handleInput.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.addMedicationRow = this.addMedicationRow.bind(this);
        this.deleteMedRow = this.deleteMedRow.bind(this);
        this.copyToClipboard = this.copyToClipboard.bind(this);

        try {
            const [historiesRes, medsRes] = await Promise.all([
                fetch('histories.json'),
                fetch('med_suggestions.json')
            ]);
            this.historyList = await historiesRes.json();
            this.medSuggestions = await medsRes.json();
        } catch (e) {
            console.error("App1 data loading failed", e);
        }

        this.generateDynamicContent();

        // Setup event listeners
        document.querySelector('#app1 .container-app1').addEventListener('input', this.handleInput);
        document.querySelector('#app1 .container-app1').addEventListener('click', this.handleButtonClick);
    },

    generateDynamicContent() {
        this.elements.historyTags.innerHTML = '';
        this.historyList.forEach(history => {
            const button = document.createElement('button');
            button.dataset.value = history;
            button.textContent = history;
            this.elements.historyTags.appendChild(button);
        });

        this.elements.adlAssessmentContainer.innerHTML = '';
        this.adlItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'adl-item';
            div.innerHTML = `<label>${item.label}</label><select data-index="${index}"></select>`;
            const select = div.querySelector('select');
            item.options.forEach((opt, optIndex) => {
                select.innerHTML += `<option value="${item.points[optIndex]}">${opt} (${item.points[optIndex]}点)</option>`;
            });
            this.elements.adlAssessmentContainer.appendChild(div);
        });
    },

    load(patient) {
        this.patient = patient;
        this.render();
    },

    updateAndSave() {
        if (!this.patient) return;
        PatientDataManager.savePatient(this.patient);
        this.render(); // Re-render to reflect any derived data changes
    },

    handleInput(event) {
        if (!this.patient) return;
        const { id, value } = event.target;
        if (this.patient.data.hasOwnProperty(id)) {
            this.patient.data[id] = value;
            this.updateAndSave();
        } else if(event.target.closest('#adl-assessment')) {
             this.calculateAdlScore();
             this.updateAndSave();
        }
    },
    
    handleButtonClick(event) {
        const target = event.target;
        if (target.tagName !== 'BUTTON') return;

        if (target.id === 'add-med-row') this.addMedicationRow();
        if (target.id === 'copy-button-app1') this.copyToClipboard();
        if (target.classList.contains('delete-button')) this.deleteMedRow(target);
        if (target.parentElement.classList.contains('button-group')) {
             this.toggleButtonGroup(target);
        }
    },
    
    toggleButtonGroup(button) {
        button.classList.toggle('active');
        const group = button.parentElement;
        const key = {
            'history-tags': 'pastMedicalHistory',
            'allergy-tags': 'allergies',
            'lifestyle-tags': 'lifestyle',
            'gender': 'gender'
        }[group.id];

        if (key) {
             const values = Array.from(group.querySelectorAll('.active')).map(b => b.dataset.value);
             this.patient.data[key] = (group.id === 'gender') ? values.slice(-1)[0] || '' : values;
             this.updateAndSave();
        }
    },

    addMedicationRow(name = '', usage = '') {
        const div = document.createElement('div');
        div.className = 'med-row';
        div.innerHTML = `
            <input type="text" class="med-name" placeholder="薬剤名" value="${name}">
            <input type="text" class="med-usage" placeholder="用法・用量" value="${usage}">
            <button class="delete-button">×</button>
        `;
        this.elements.medListContainer.appendChild(div);
    },

    deleteMedRow(button) {
        button.closest('.med-row').remove();
        this.patient.data.medications = Array.from(this.elements.medListContainer.querySelectorAll('.med-row')).map(row => {
            return `${row.querySelector('.med-name').value} ${row.querySelector('.med-usage').value}`.trim();
        });
        this.updateAndSave();
    },
    
    copyToClipboard() {
        navigator.clipboard.writeText(this.elements.outputMemo.value);
    },
    
    calculateAdlScore() {
        let total = 0;
        this.elements.adlAssessmentContainer.querySelectorAll('select').forEach(select => {
            total += Number(select.value);
        });
        this.patient.data.adlScore = total;
        return total;
    },

    render() {
        if (!this.patient) return;
        const pData = this.patient.data;

        // Simple value rendering
        Object.keys(this.elements).forEach(key => {
            if (this.elements[key].nodeName === 'INPUT' || this.elements[key].nodeName === 'TEXTAREA') {
                if (pData[key] !== undefined) this.elements[key].value = pData[key];
            }
        });
        this.elements.name.value = this.patient.name;

        // Button group rendering
        const buttonGroups = {'pastMedicalHistory': this.elements.historyTags, 'allergies': this.elements.allergyTags, 'lifestyle': this.elements.lifestyleTags, 'gender': this.elements.genderGroup};
        Object.entries(buttonGroups).forEach(([key, group]) => {
            const activeValues = Array.isArray(pData[key]) ? pData[key] : [pData[key]];
            Array.from(group.children).forEach(button => {
                button.classList.toggle('active', activeValues.includes(button.dataset.value));
            });
        });

        // ADL Rendering
        this.elements.adlScoreDisplay.textContent = `ADL合計: ${pData.adlScore} / 100点`;
        
        // Final Output Rendering
        this.updateOutputMemo();
    },
    
    updateOutputMemo() {
        if (!this.patient) return;
        const p = this.patient.data;
        const recordedDiagnoses = p.recordedDiagnoses || {};

        let diagnosisText = '【鑑別疾患】\n';
        if(Object.keys(recordedDiagnoses).length > 0 && Object.values(recordedDiagnoses).some(v => v.length > 0)){
             for (const [symptom, diseases] of Object.entries(recordedDiagnoses)) {
                if (diseases && diseases.length > 0) {
                   diagnosisText += `# ${symptom}\n - ${diseases.join('\n - ')}\n`;
                }
            }
        } else {
            diagnosisText += "N/A\n";
        }
       
        const output = `【患者情報】
氏名：${this.patient.name} 様
年齢：${p.age || ''} 歳
性別：${p.gender || ''}

S)
【主訴】
${p.chiefComplaint || ''}
【現病歴】
${p.historyOfPresentIllness || ''}
【既往歴】
- ${p.pastMedicalHistory.join('、') || '特記事項なし'}
- ${p.surgeryHistory || ''}
【アレルギー】
- ${p.allergies.join('、') || '特になし'}
- ${p.otherAllergies || ''}
【内服薬】
- ${p.medications.join('\n- ') || 'なし'}
【生活歴】
- ${p.lifestyle.join('、') || ''} ${p.lifestyleDetails || ''}
【ADL】
Barthel Index: ${p.adlScore}点

O)
【バイタルサイン】
${p.vitals || ''}
【身体所見】
${p.physicalFindings || ''}
【検査結果】
${p.urinalysisFindings ? `尿検査: ${p.urinalysisFindings}\n` : ''}${p.ecgFindings ? `心電図: ${p.ecgFindings}\n` : ''}${p.imagingFindings ? `画像: ${p.imagingFindings}` : ''}

A)
${diagnosisText}
${p.assessmentNotes || ''}

P)
${p.planNotes || ''}
        `.trim().replace(/\n\s*\n/g, '\n'); // Remove empty lines
        this.elements.outputMemo.value = output;
    }
};
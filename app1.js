// app1.js
const App1 = {
    patient: null,
    elements: {},
    historyList: [],
    medSuggestions: {},
    adlItems: [
        { label: '食事', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
        { label: '移乗', points: [15, 10, 5, 0], options: ['自立', '監視/助言', '一部介助', '全介助'] },
        { label: '整容', points: [5, 0], options: ['自立', '全介助'] },
        { label: 'トイレ動作', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
        { label: '入浴', points: [5, 0], options: ['自立', '全介助'] },
        { label: '歩行', points: [15, 10, 5, 0], options: ['45m以上自立', '45m以上要介助', '歩行不能だが車椅子自立', '全介助'] },
        { label: '階段昇降', points: [10, 5, 0], options: ['自立', '要介助', '不能'] },
        { label: '着替え', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
        { label: '排便管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
        { label: '排尿管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
    ],

    async initialize() {
        this.elements = {
            container: document.querySelector('#app1 .container-app1'),
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
            lifestyleTags: document.getElementById('lifestyle-tags'),
            lifestyleDetails: document.getElementById('lifestyle-details'),
            adlAssessmentContainer: document.getElementById('adl-assessment'),
            adlScoreDisplay: document.getElementById('adl-score'),
            vitals: document.getElementById('vitals'),
            physicalFindings: document.getElementById('physical-findings'),
            assessmentNotes: document.getElementById('assessment-notes'),
            planNotes: document.getElementById('plan-notes'),
            outputMemo: document.getElementById('output-memo'),
        };

        this.updateModel = this.updateModel.bind(this);
        this.saveAndRender = this.saveAndRender.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);

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

        this.elements.container.addEventListener('input', this.updateModel);
        this.elements.container.addEventListener('change', this.saveAndRender);
        this.elements.container.addEventListener('click', this.handleButtonClick);
    },

    generateDynamicContent() {
        this.elements.historyTags.innerHTML = this.historyList.map(h => `<button data-value="${h}">${h}</button>`).join('');
        this.elements.adlAssessmentContainer.innerHTML = this.adlItems.map((item) => `
            <div class="adl-item">
                <label>${item.label}</label>
                <select>
                    ${item.options.map((opt, optIndex) => `<option value="${item.points[optIndex]}">${opt} (${item.points[optIndex]}点)</option>`).join('')}
                </select>
            </div>
        `).join('');
    },

    load(patient) {
        this.patient = patient;
        this.render();
    },
    
    updateModel(event) {
        if (!this.patient) return;
        const target = event.target;
        const { id, value, classList, parentElement } = target;
        const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());

        if (key === 'name') this.patient.name = value;
        else if (this.patient.data.hasOwnProperty(key)) this.patient.data[key] = value;
        else if (parentElement.closest('#adl-assessment')) this.calculateAdlScore();
        else if (classList.contains('med-name') || classList.contains('med-usage')) this.updateMedications();
        
        this.updateOutputMemo();
    },

    saveAndRender() {
        if (!this.patient) return;
        PatientDataManager.savePatient(this.patient);
        this.render();
        if (window.App2) App2.load(this.patient);
    },

    handleButtonClick(event) {
        const target = event.target;
        if (target.tagName !== 'BUTTON') return;
        event.preventDefault();

        const parent = target.parentElement;
        
        // ★★★ START: BUG FIX ★★★
        // ボタンの種類に応じて処理を振り分ける
        if (parent.classList.contains('button-group')) {
            this.updateButtonGroup(target);
        }
        else if (target.id === 'add-med-row') {
            this.addMedicationRow();
            this.updateMedications();
        }
        else if (target.id === 'copy-button-app1') {
            navigator.clipboard.writeText(this.elements.outputMemo.value);
            return; // コピー後は再描画しない
        }
        else if (target.classList.contains('delete-button')) {
            this.deleteMedRow(target);
        }
        // ★★★ END: BUG FIX ★★★
        
        this.saveAndRender();
    },
    
    updateButtonGroup(button) {
        const group = button.parentElement;
        const keyMap = {
            'gender': 'gender',
            'history-tags': 'pastMedicalHistory',
            'allergy-tags': 'allergies',
            'lifestyle-tags': 'lifestyle',
            'med-suggestion-tags': 'medications'
        };
        const key = keyMap[group.id];
        if (!key) return;

        if (key === 'gender') {
            this.patient.data.gender = button.dataset.value;
        } else if (key === 'medications') {
            this.addMedicationRow(button.dataset.value, '');
            this.updateMedications();
        } else {
            const currentValues = new Set(this.patient.data[key] || []);
            const buttonValue = button.dataset.value;

            if (currentValues.has(buttonValue)) {
                currentValues.delete(buttonValue);
            } else {
                currentValues.add(buttonValue);
            }
            this.patient.data[key] = [...currentValues];
        }
        
        if (key === 'pastMedicalHistory') {
            this.updateMedSuggestions();
        }
    },
    
    updateMedSuggestions() {
        if (!this.patient || !this.medSuggestions) return;
        const suggestions = new Set();
        (this.patient.data.pastMedicalHistory || []).forEach(history => {
            (this.medSuggestions[history] || []).forEach(med => suggestions.add(med));
        });
        this.elements.medSuggestionContainer.innerHTML = [...suggestions].map(med => `<button data-value="${med}">${med}</button>`).join('');
    },
    
    addMedicationRow(name = '', usage = '') {
        const exists = (this.patient.data.medications || []).some(med => med.startsWith(name + ' '));
        if (name && exists) return;

        const div = document.createElement('div');
        div.className = 'med-row';
        div.innerHTML = `<input type="text" class="med-name" placeholder="薬剤名" value="${name}"><input type="text" class="med-usage" placeholder="用法・用量" value="${usage}"><button class="delete-button">×</button>`;
        this.elements.medListContainer.appendChild(div);
    },
    deleteMedRow(button) {
        button.closest('.med-row').remove();
        this.updateMedications();
    },
    updateMedications() {
         if (!this.patient) return;
         this.patient.data.medications = Array.from(this.elements.medListContainer.querySelectorAll('.med-row')).map(row => 
            `${row.querySelector('.med-name').value} ${row.querySelector('.med-usage').value}`.trim()
        ).filter(Boolean);
    },
    
    calculateAdlScore() {
        if (!this.patient) return;
        this.patient.data.adlScore = Array.from(this.elements.adlAssessmentContainer.querySelectorAll('select')).reduce((total, select) => total + Number(select.value), 0);
    },

    render() {
        if (!this.patient) return;
        const pData = this.patient.data;
        const activeElementId = document.activeElement.id;

        this.elements.name.value = this.patient.name;
        for (const key in this.elements) {
            const element = this.elements[key];
            const dataKey = key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            if (pData[dataKey] !== undefined && element && element.matches('input, textarea')) {
                element.value = pData[dataKey];
            }
        }
        
        for (const group of this.elements.container.querySelectorAll('.button-group')) {
            const keyMap = {'gender':'gender', 'history-tags':'pastMedicalHistory', 'allergy-tags':'allergies', 'lifestyle-tags':'lifestyle'};
            const key = keyMap[group.id];
            if (!key) continue;
            const activeValues = new Set(Array.isArray(pData[key]) ? pData[key] : [pData[key]]);
            Array.from(group.children).forEach(button => button.classList.toggle('active', activeValues.has(button.dataset.value)));
        }

        this.elements.medListContainer.innerHTML = '';
        (pData.medications || []).forEach(medString => {
            const [name, ...usage] = medString.split(' ');
            this.addMedicationRow(name, usage.join(' '));
        });
        
        this.elements.adlScoreDisplay.textContent = `ADL合計: ${pData.adlScore || 0} / 100点`;
        
        this.updateMedSuggestions();
        this.updateOutputMemo();
        
        if (document.getElementById(activeElementId)) document.getElementById(activeElementId).focus();
    },
    
    updateOutputMemo() {
        if (!this.patient) return;
        const p = this.patient.data;
        const diagnoses = p.recordedDiagnoses || {};
        let diagnosisText = Object.entries(diagnoses).filter(([, diseases]) => diseases.length > 0)
            .map(([symptom, diseases]) => `# ${symptom}\n - ${diseases.join('\n - ')}`).join('\n') || "N/A";

        const sections = {
            '患者情報': `氏名：${this.patient.name || ''} 様\n年齢：${p.age || ''} 歳\n性別：${p.gender || ''}`,
            'S)': [
                `【主訴】\n${p.chiefComplaint || ''}`,
                `【現病歴】\n${p.historyOfPresentIllness || ''}`,
                `【既往歴】\n- ${(p.pastMedicalHistory || []).join('、') || '特記事項なし'}\n- ${p.surgeryHistory || ''}`,
                `【アレルギー】\n- ${(p.allergies || []).join('、') || '特になし'}\n- ${p.otherAllergies || ''}`,
                `【内服薬】\n- ${(p.medications || []).join('\n- ') || 'なし'}`,
                `【生活歴】\n- ${(p.lifestyle || []).join('、') || ''} ${p.lifestyleDetails || ''}`,
                `【ADL】\nBarthel Index: ${p.adlScore || 0}点`
            ].join('\n\n'),
            'O)': [
                `【バイタルサイン】\n${p.vitals || ''}`,
                `【身体所見】\n${p.physicalFindings || ''}`,
                `【検査結果】\n${[p.urinalysisFindings && `尿検査: ${p.urinalysisFindings}`, p.ecgFindings && `心電図: ${p.ecgFindings}`, p.imagingFindings && `画像: ${p.imagingFindings}`].filter(Boolean).join('\n') || ''}`
            ].join('\n\n'),
            'A)': `【鑑別疾患】\n${diagnosisText}\n\n${p.assessmentNotes || ''}`,
            'P)': p.planNotes || ''
        };

        this.elements.outputMemo.value = Object.entries(sections)
            .map(([header, content]) => `【${header}】\n${content}`)
            .join('\n\n').replace(/【|】/g, '').trim().replace(/\n\s*\n/g, '\n');
    }
};
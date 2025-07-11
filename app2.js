// app2.js
const App2 = {
    patient: null,
    elements: {},
    medicalData: [],
    keywordsForDetection: [],
    
    async initialize() {
        this.elements = {
            symptomSelect: document.getElementById('symptom-select'),
            resultsContainer: document.getElementById('results-container'),
            selectedKeywordsContainer: document.getElementById('selected-keywords-tags'),
            copyTextArea: document.getElementById('copy-textarea'),
            copyButton: document.getElementById('copy-button-app2')
        };
        
        this.load = this.load.bind(this);
        this.handleCardClick = this.handleCardClick.bind(this);
        // ★★★ START: BUG FIX ★★★
        this.handleKeyDown = this.handleKeyDown.bind(this); 
        this.handleKeywordSelection = this.handleKeywordSelection.bind(this);
        // ★★★ END: BUG FIX ★★★

        try {
            const [medicalResponse, keywordsResponse] = await Promise.all([
                fetch('medicalData.json'),
                fetch('symptomKeywords.json')
            ]);
            this.medicalData = await medicalResponse.json();
            this.keywordsForDetection = await keywordsResponse.json();
        } catch (error) {
            console.error('App2 data loading failed:', error);
            if (this.elements.resultsContainer) {
                this.elements.resultsContainer.innerHTML = '<p style="color: red;">データ読み込みに失敗しました。</p>';
            }
            return;
        }
        
        this.populateSymptomDropdown();
        this.elements.symptomSelect.addEventListener('change', () => this.updateAndSave(this.handleSymptomSelectionChange));
        this.elements.selectedKeywordsContainer.addEventListener('click', (e) => this.updateAndSave(() => this.handleTagClick(e)));
        this.elements.resultsContainer.addEventListener('click', this.handleCardClick);
        // ★★★ START: BUG FIX ★★★
        this.elements.resultsContainer.addEventListener('keydown', this.handleKeyDown);
        // ★★★ END: BUG FIX ★★★
        this.elements.copyButton.addEventListener('click', () => navigator.clipboard.writeText(this.elements.copyTextArea.value));
    },

    load(patient) {
        this.patient = patient;
        this.render();
    },

    // 変更処理を引数で受け取り、保存と再描画を行うヘルパー関数
    updateAndSave(changeFunction) {
        if (!this.patient) return;
        if (changeFunction) changeFunction.call(this);
        PatientDataManager.savePatient(this.patient);
        this.render();
        if (window.App1) App1.load(this.patient);
    },
    
    populateSymptomDropdown() {
        if(!this.elements.symptomSelect || this.elements.symptomSelect.options.length > 0) return;
        const uniqueSymptoms = [...new Set(this.medicalData.map(item => item.symptom))];
        uniqueSymptoms.forEach(symptom => {
            const option = document.createElement('option');
            option.value = symptom;
            option.textContent = symptom;
            this.elements.symptomSelect.appendChild(option);
        });
    },

    handleSymptomSelectionChange() {
        const selectedOptions = Array.from(this.elements.symptomSelect.selectedOptions).map(opt => opt.value);
        this.patient.data.symptoms = selectedOptions;
    },

    // ★★★ START: BUG FIX ★★★
    // キーワード選択のロジックを共通関数化
    handleKeywordSelection(keywordElement) {
        const keyword = keywordElement.dataset.keyword;
        const keywords = new Set(this.patient.data.selectedKeywords || []);
        if (keywords.has(keyword)) keywords.delete(keyword);
        else keywords.add(keyword);
        this.patient.data.selectedKeywords = [...keywords];
    },

    // キーボード操作用のハンドラを追加
    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            const keywordTarget = event.target.closest('.clickable-keyword');
            if (keywordTarget) {
                event.preventDefault(); // スペースキーでのスクロールなどを防ぐ
                this.updateAndSave(() => this.handleKeywordSelection(keywordTarget));
            }
        }
    },
    // ★★★ END: BUG FIX ★★★

    handleCardClick(event) {
        const keywordTarget = event.target.closest('.clickable-keyword');
        const checkboxTarget = event.target.closest('.diagnosis-checkbox');

        if (keywordTarget) {
            this.updateAndSave(() => this.handleKeywordSelection(keywordTarget));
        } else if (checkboxTarget) {
            this.updateAndSave(() => {
                const diseaseName = checkboxTarget.dataset.diseaseName;
                const symptomName = checkboxTarget.closest('.symptom-group').dataset.symptomName;
                this.patient.data.recordedDiagnoses = this.patient.data.recordedDiagnoses || {};
                const recordedSet = new Set(this.patient.data.recordedDiagnoses[symptomName] || []);
                if (checkboxTarget.checked) recordedSet.add(diseaseName);
                else recordedSet.delete(diseaseName);
                this.patient.data.recordedDiagnoses[symptomName] = [...recordedSet];
            });
        }
    },

    handleTagClick(event) {
        const target = event.target.closest('.keyword-tag');
        if (target) {
            const keyword = target.dataset.keyword;
            const keywords = new Set(this.patient.data.selectedKeywords || []);
            if (keyword && keywords.has(keyword)) {
                keywords.delete(keyword);
                this.patient.data.selectedKeywords = [...keywords];
            }
        }
    },

    render() {
        if (!this.patient) return;
        this.renderSymptomSelector();
        this.renderResults();
        this.renderSelectedKeywordTags();
        this.updateCopyTextArea();
    },
    
    renderSymptomSelector() {
        const selectedSymptoms = new Set(this.patient.data.symptoms || []);
        Array.from(this.elements.symptomSelect.options).forEach(opt => {
            opt.selected = selectedSymptoms.has(opt.value);
        });
    },

    renderResults() {
        this.elements.resultsContainer.innerHTML = '';
        const symptoms = this.patient.data.symptoms || [];
        if (symptoms.length === 0) {
            this.elements.resultsContainer.innerHTML = '<p>症候を選択すると、ここに関連する鑑別疾患が表示されます。</p>';
            return;
        }
        symptoms.forEach((symptomName, index) => {
            const symptomData = this.medicalData.find(d => d.symptom === symptomName);
            if (!symptomData) return;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'symptom-group';
            groupDiv.dataset.symptomName = symptomName;
            if (index === 0) groupDiv.classList.add('primary');
            let titleHTML = `<h2>${symptomName} の鑑別疾患`;
            if (index === 0) titleHTML += `<span class="primary-badge">主訴</span>`;
            titleHTML += `</h2>`;
            groupDiv.innerHTML = titleHTML;
            symptomData.differential_diagnoses.forEach(disease => {
                groupDiv.appendChild(this.createDiseaseCard(disease, symptomName));
            });
            this.elements.resultsContainer.appendChild(groupDiv);
        });
    },

    createDiseaseCard(disease, symptomName) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'disease-card';
        const recordedDiagnoses = (this.patient.data.recordedDiagnoses || {})[symptomName] || [];
        cardDiv.innerHTML = `
            <div class="disease-card-header">
                <input type="checkbox" class="diagnosis-checkbox" data-disease-name="${disease.name}" ${recordedDiagnoses.includes(disease.name) ? 'checked' : ''}>
                <h3>${disease.name}</h3>
            </div>
            <h4>医療面接のポイント</h4>
            ${disease.interview_points.map(p => `<p>${this.highlightKeywords(p)}</p>`).join('')}
            <h4>身体診察のポイント</h4>
            ${disease.physical_exam_points.map(p => `<p>${this.highlightKeywords(p)}</p>`).join('')}
        `;
        return cardDiv;
    },
    
    highlightKeywords(text) {
        let highlightedText = text;
        const selectedKeywords = new Set(this.patient.data.selectedKeywords || []);
        this.keywordsForDetection.forEach(keyword => {
            if (!keyword) return;
            const isHighlighted = selectedKeywords.has(keyword) ? 'highlighted' : '';
            try {
                const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                // ★★★ START: BUG FIX ★★★
                // キーボード操作とアクセシビリティのため属性を追加
                highlightedText = highlightedText.replace(regex, match => `<span class="clickable-keyword ${isHighlighted}" data-keyword="${match}" role="button" tabindex="0">${match}</span>`);
                // ★★★ END: BUG FIX ★★★
            } catch(e) { /* ignore regex errors */ }
        });
        return highlightedText;
    },

    renderSelectedKeywordTags() {
        const container = this.elements.selectedKeywordsContainer;
        container.innerHTML = '<span>なし</span>';
        const keywords = this.patient.data.selectedKeywords || [];
        if (keywords.length === 0) return;
        container.innerHTML = '';
        keywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.dataset.keyword = keyword;
            tag.innerHTML = `${keyword} <span class="remove-tag"></span>`;
            container.appendChild(tag);
        });
    },

    updateCopyTextArea() {
        if (!this.patient) return;
        let text = '';
        const p = this.patient.data;
        const symptoms = p.symptoms || [];
        const recordedDiagnoses = p.recordedDiagnoses || {};
        const keywords = p.selectedKeywords || [];
        
        if (symptoms.length > 0) text += `■ 症候\n主訴: ${symptoms[0]}\n${symptoms.length > 1 ? `その他: ${symptoms.slice(1).join(', ')}\n` : ''}\n`;
        if (Object.values(recordedDiagnoses).some(d => d.length > 0)) {
            text += '■ 鑑別疾患\n';
            Object.entries(recordedDiagnoses).forEach(([symptom, diseases]) => {
                if (diseases.length > 0) text += `# ${symptom}\n- ${diseases.join('\n- ')}\n`;
            });
            text += '\n';
        }
        if (keywords.length > 0) text += `■ 選択キーワード\n- ${keywords.join('\n- ')}\n`;
        this.elements.copyTextArea.value = text.trim();
    }
};
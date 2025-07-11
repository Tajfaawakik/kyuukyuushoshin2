// app3.js

const App3 = {
    patient: null,
    elements: {},
    testItemsDefinition: [],

    async initialize() {
        this.elements = {
            container: document.querySelector('#app3 .container-app3'),
            itemsContainer: document.getElementById('test-items-container'),
            urinalysis: document.getElementById('urinalysis-findings'),
            ecg: document.getElementById('ecg-findings'),
            imaging: document.getElementById('imaging-findings'),
            memo: document.getElementById('memo'),
        };

        // Bind 'this' context
        this.handleInput = this.handleInput.bind(this);

        try {
            const response = await fetch('test_items.json');
            if (!response.ok) throw new Error('Network response was not ok');
            this.testItemsDefinition = await response.json();
            this.generateForm();
        } catch (error) {
            console.error('App3 data loading failed:', error);
            this.elements.itemsContainer.innerHTML = '<p style="color: red;">検査項目定義の読み込みに失敗しました。</p>';
        }
        
        // Add event listener to the container
        this.elements.container.addEventListener('input', this.handleInput);
    },

    load(patient) {
        this.patient = patient;
        this.render();
    },
    
    updateAndSave() {
        if (!this.patient) return;
        PatientDataManager.savePatient(this.patient);
        // Notify App1 to update its view with the new lab data
        if(window.App1) {
            App1.load(this.patient);
        }
    },

    handleInput(event) {
        if (!this.patient) return;
        const { id, value, type, dataset } = event.target;
        
        this.patient.data.labResults = this.patient.data.labResults || {};
        
        // Handle textareas for other findings
        if (['urinalysis-findings', 'ecg-findings', 'imaging-findings', 'memo'].includes(id)) {
            const key = id.replace(/-/g, '_').replace(/_findings$/, 'Findings'); // urinalysis-findings -> urinalysisFindings
            this.patient.data[key] = value;
        } else if (type === 'number' && dataset.itemId) { // Handle lab results
            this.patient.data.labResults[dataset.itemId] = value;
            const item = this.findItemById(dataset.itemId);
            if (item) this.checkAbnormality(event.target, item);
        }
        
        this.updateAndSave();
    },

    render() {
        if (!this.patient) return;
        const data = this.patient.data;
        
        // Clear previous results first
        this.elements.container.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        
        // Render lab results
        Object.entries(data.labResults || {}).forEach(([itemId, value]) => {
            const input = document.getElementById(itemId);
            if (input) {
                input.value = value;
                const item = this.findItemById(itemId);
                if(item) this.checkAbnormality(input, item);
            }
        });

        // Render other findings
        this.elements.urinalysis.value = data.urinalysisFindings || '';
        this.elements.ecg.value = data.ecgFindings || '';
        this.elements.imaging.value = data.imagingFindings || '';
        this.elements.memo.value = data.memo || '';
    },
    
    findItemById(id) {
        return this.testItemsDefinition.find(item => item.id === id);
    },

    checkAbnormality(input, item) {
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            input.classList.remove('abnormal');
            return;
        }
        if (value < item.min || value > item.max) {
            input.classList.add('abnormal');
        } else {
            input.classList.remove('abnormal');
        }
    },
    
    generateForm() {
        if (!this.elements.itemsContainer) return;
        this.elements.itemsContainer.innerHTML = ''; // Clear existing
        const categories = [...new Set(this.testItemsDefinition.map(item => item.category))];
        
        categories.forEach(category => {
            const categoryItems = this.testItemsDefinition.filter(item => item.category === category);
            
            const header = document.createElement('button');
            header.textContent = category;
            header.className = 'accordion-header';
            header.type = 'button';
            this.elements.itemsContainer.appendChild(header);

            const content = document.createElement('div');
            content.className = 'accordion-content';
            const grid = document.createElement('div');
            grid.className = 'category-grid';
            content.appendChild(grid);
            this.elements.itemsContainer.appendChild(content);
            
            categoryItems.forEach(item => this.createInputItem(item, grid));

            header.addEventListener('click', () => {
                header.classList.toggle('active');
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
            });
        });
    },

    createInputItem(item, parentElement) {
        const group = document.createElement('div');
        group.className = 'item-group';
        group.innerHTML = `
            <label for="${item.id}">${item.name} (${item.unit})</label>
            <input type="number" id="${item.id}" step="${item.step}" data-item-id="${item.id}">
            <div class="reference-value">基準値: ${item.min} - ${item.max}</div>
        `;
        parentElement.appendChild(group);
    }
};
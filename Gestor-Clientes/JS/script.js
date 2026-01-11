// ==========================================
// STATE MANAGEMENT
// ==========================================
let records = [];
try {
    records = JSON.parse(localStorage.getItem('client_records')) || [];

    // MIGRATION: Ensure all records have 'types' array
    records = records.map(r => {
        if (!r.types) {
            // If legacy 'type' exists, use it. Default to ['venta'] if neither.
            return { ...r, types: r.type ? [r.type] : ['venta'] };
        }
        return r;
    });

} catch (e) {
    console.error("Error parsing records", e);
    records = [];
}

let currentTab = 'dashboard';
let editingId = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const DOM = {
    btnAddNew: document.getElementById('btn-add-new'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancel: document.getElementById('btn-cancel'),
    recordForm: document.getElementById('record-form'),
    contentArea: document.getElementById('content-area'),
    navItems: document.querySelectorAll('.nav-item[data-tab]'),
    pageTitle: document.getElementById('page-title'),
    searchInput: document.getElementById('global-search'),
    // Data Controls
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import'),
    fileInput: document.getElementById('file-input'),
    // Receipt Modal
    receiptModal: document.getElementById('receipt-modal'),
    btnCloseReceipt: document.getElementById('btn-close-receipt'),
    receiptPreviewArea: document.getElementById('receipt-preview-area'),
    btnPrintReceipt: document.getElementById('btn-print-receipt'),
    btnDownloadPdf: document.getElementById('btn-download-pdf'),
    btnEmailReceipt: document.getElementById('btn-email-receipt'),
    // History Modal
    historyModal: document.getElementById('history-modal'),
    historyList: document.getElementById('history-list'),
    historyTitle: document.getElementById('history-title'),
    historySubtitle: document.getElementById('history-subtitle'),
    btnCloseHistory: document.getElementById('btn-close-history')
};

// ==========================================
// INITIALIZATION & EVENTS
// ==========================================

// 0. Data Persistence Checks
if (records.length > 0) {
    console.log("Loaded " + records.length + " records from local database.");
}

// 1. Navigation
DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Update UI classes
        DOM.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update State
        currentTab = item.dataset.tab;

        // Update Title
        const titleText = item.innerText.trim();
        DOM.pageTitle.innerText = titleText;

        // Clear search when switching tabs (optional, but good for clarity)
        DOM.searchInput.value = '';

        render();
    });
});

// 2. Modal interactions
DOM.btnAddNew.addEventListener('click', () => openModal());
DOM.btnCloseModal.addEventListener('click', closeModal);
DOM.btnCancel.addEventListener('click', closeModal);

// 3. Form Submission
DOM.recordForm.addEventListener('submit', handleFormSubmit);

// 4. Search
DOM.searchInput.addEventListener('input', render);

// 5. Data Controls (Backup)
DOM.btnExport.addEventListener('click', () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestion_clientes_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Datos guardados en tu carpeta de Descargas.');
});

DOM.btnImport.addEventListener('click', () => DOM.fileInput.click());

DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`Se han encontrado ${importedData.length} registros. ¿Quieres reemplazar los datos actuales con estos?`)) {
                    records = importedData;
                    saveData();
                    render();
                    alert('Datos cargados correctamente.');
                }
            } else {
                alert('El archivo no tiene el formato correcto.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al leer el archivo. Asegúrate de que es un .json válido.');
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
});

// 6. Event Delegation for Edit/Delete actions in the list
DOM.contentArea.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit');
    const btnDelete = e.target.closest('.btn-delete');

    const btnReceipt = e.target.closest('.btn-receipt');
    const btnHistory = e.target.closest('.btn-history');
    const btnComplete = e.target.closest('.btn-complete');
    const btnRestore = e.target.closest('.btn-restore');

    if (btnEdit) {
        const id = btnEdit.dataset.id;
        const record = records.find(r => r.id === id);
        if (record) openModal(record);
    }

    if (btnDelete) {
        const id = btnDelete.dataset.id;
        if (confirm('¿Estás seguro de querer eliminar este registro?')) {
            deleteRecord(id);
        }
    }

    if (btnReceipt) {
        const id = btnReceipt.dataset.id;
        const record = records.find(r => r.id === id);
        if (record) openReceiptModal(record);
    }

    if (btnHistory) {
        const id = btnHistory.dataset.id;
        const record = records.find(r => r.id === id);
        if (record) openHistoryModal(record);
    }

    if (btnComplete) {
        toggleComplete(btnComplete.dataset.id, true);
    }
    if (btnRestore) {
        toggleComplete(btnRestore.dataset.id, false);
    }
});

DOM.btnCloseHistory.addEventListener('click', () => {
    DOM.historyModal.classList.add('hidden');
});

// 7. Receipt Actions
DOM.btnCloseReceipt.addEventListener('click', closeReceiptModal);
DOM.btnPrintReceipt.addEventListener('click', () => window.print());
DOM.btnDownloadPdf.addEventListener('click', downloadReceiptPDF);
DOM.btnEmailReceipt.addEventListener('click', sendReceiptEmail);

// Initialize Icons
lucide.createIcons();
render();

// ==========================================
// CORE FUNCTIONS
// ==========================================

function openModal(recordToEdit = null) {
    DOM.modal.classList.remove('hidden');

    // Reset Checkboxes
    DOM.recordForm.querySelectorAll('input[name="type"]').forEach(cb => cb.checked = false);

    if (recordToEdit) {
        // Edit Mode
        editingId = recordToEdit.id;
        DOM.modalTitle.innerText = 'Editar Registro';

        // Populate fields
        // Handle Types (Array)
        if (recordToEdit.types && Array.isArray(recordToEdit.types)) {
            recordToEdit.types.forEach(t => {
                const cb = DOM.recordForm.querySelector(`input[name="type"][value="${t}"]`);
                if (cb) cb.checked = true;
            });
        }

        // Trigger visibility check after checking boxes
        toggleVentaFields();

        DOM.recordForm.querySelector('[name="firstName"]').value = recordToEdit.firstName;
        DOM.recordForm.querySelector('[name="lastName"]').value = recordToEdit.lastName;
        DOM.recordForm.querySelector('[name="dni"]').value = recordToEdit.dni;
        DOM.recordForm.querySelector('[name="phone"]').value = recordToEdit.phone || '';
        DOM.recordForm.querySelector('[name="date"]').value = recordToEdit.date;
        DOM.recordForm.querySelector('[name="summary"]').value = recordToEdit.summary;
        DOM.recordForm.querySelector('[name="amount"]').value = recordToEdit.amount;

        // Populate Venta Fields
        if (recordToEdit.ventaDetails) {
            DOM.recordForm.querySelector('[name="productName"]').value = recordToEdit.ventaDetails.productName || '';
            DOM.recordForm.querySelector('[name="productCode"]').value = recordToEdit.ventaDetails.productCode || '';
            DOM.recordForm.querySelector('[name="quantity"]').value = recordToEdit.ventaDetails.quantity || 1;
            DOM.recordForm.querySelector('[name="paymentMethod"]').value = recordToEdit.ventaDetails.paymentMethod || 'Efectivo';
        } else {
            // Clear if not present
            DOM.recordForm.querySelector('[name="productName"]').value = '';
            DOM.recordForm.querySelector('[name="productCode"]').value = '';
            DOM.recordForm.querySelector('[name="quantity"]').value = 1;
        }
    } else {
        // Create Mode
        editingId = null;
        DOM.modalTitle.innerText = 'Nuevo Registro';
        DOM.recordForm.reset();

        // Default: Venta checked
        const ventaCb = DOM.recordForm.querySelector('input[name="type"][value="venta"]');
        ventaCb.checked = true;

        // Trigger visibility check
        toggleVentaFields();

        // Default date: Today
        const dateInput = DOM.recordForm.querySelector('[name="date"]');
        dateInput.valueAsDate = new Date();
    }
}

function toggleVentaFields() {
    // Check if 'venta' is selected
    const ventaCb = DOM.recordForm.querySelector('input[name="type"][value="venta"]');
    const ventaFields = document.getElementById('venta-fields');
    if (ventaCb && ventaCb.checked) {
        ventaFields.style.display = 'block';
    } else {
        ventaFields.style.display = 'none';
        // Optional: clear fields? No, keep data just hide
    }
}

// Listen for checkbox changes to toggle fields
DOM.recordForm.querySelectorAll('input[name="type"]').forEach(cb => {
    cb.addEventListener('change', toggleVentaFields);
});

function closeModal() {
    DOM.modal.classList.add('hidden');
    DOM.recordForm.reset();
    editingId = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(DOM.recordForm);

    // Collect all checked types
    const selectedTypes = [];
    DOM.recordForm.querySelectorAll('input[name="type"]:checked').forEach(cb => {
        selectedTypes.push(cb.value);
    });

    // Validate at least one type
    if (selectedTypes.length === 0) {
        alert("Por favor selecciona al menos un tipo (Venta, Por Pagar, etc).");
        return;
    }

    const recordData = {
        types: selectedTypes,
        // Legacy support (optional, can remove if full migration confident)
        type: selectedTypes[0],
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dni: formData.get('dni'),
        phone: formData.get('phone'),
        date: formData.get('date'),
        summary: formData.get('summary'),
        amount: parseFloat(formData.get('amount')) || 0,

        // Capture Venta Details if Venta is selected
        ventaDetails: selectedTypes.includes('venta') ? {
            productName: formData.get('productName'),
            productCode: formData.get('productCode'),
            quantity: parseInt(formData.get('quantity')) || 1,
            paymentMethod: formData.get('paymentMethod')
        } : null
    };

    if (editingId) {
        // UPDATE
        records = records.map(r => r.id === editingId ? { ...r, ...recordData, updatedAt: Date.now() } : r);
    } else {
        // CREATE
        const newRecord = {
            id: crypto.randomUUID(),
            ...recordData,
            createdAt: Date.now()
        };
        records.unshift(newRecord);
    }

    saveData();
    closeModal();
    render();
}

function toggleComplete(id, status) {
    records = records.map(r => r.id === id ? { ...r, completed: status } : r);
    saveData();
    render();
}

function deleteRecord(id) {
    records = records.filter(r => r.id !== id);
    saveData();
    render();
}

function saveData() {
    localStorage.setItem('client_records', JSON.stringify(records));
}

// ==========================================
// RENDER LOGIC
// ==========================================

function render() {
    // Clear Content
    DOM.contentArea.innerHTML = '';

    // 1. Determine which records to show
    let displayRecords = records;

    // Filter by Search Query
    const query = DOM.searchInput.value.toLowerCase().trim();
    if (query) {
        displayRecords = displayRecords.filter(r =>
            r.dni.toLowerCase().includes(query) ||
            r.firstName.toLowerCase().includes(query) ||
            r.lastName.toLowerCase().includes(query) ||
            (r.phone && r.phone.includes(query)) ||
            r.id.toLowerCase().includes(query)
        );
    }

    // Filter by Tab (if not dashboard)
    if (currentTab === 'completados') {
        // Show ONLY completed
        displayRecords = displayRecords.filter(r => r.completed === true);
    } else {
        // Show ONLY active (not completed)
        displayRecords = displayRecords.filter(r => !r.completed);

        if (currentTab !== 'dashboard') {
            displayRecords = displayRecords.filter(r => r.types && r.types.includes(currentTab));
        }
    }

    // 2. Render content based on current view
    if (currentTab === 'dashboard' && !query) {
        // DASHBOARD VIEW (Full summary + Recent list)
        // Note: Dashboard now only shows incomplete records due to filter above
        renderDashboardView(displayRecords);
    } else if (currentTab === 'completados') {
        // COMPLETADOS VIEW with Total
        renderCompletadosView(displayRecords);
    } else if (currentTab === 'estadisticas') {
        // STATS VIEW
        renderStatsView();
    } else {
        // LIST VIEW (Filtered or Specific Section)
        renderListView(displayRecords);
    }

    // Refresh Icons
    lucide.createIcons();
}

function renderDashboardView(dashRecords) {
    // Calculate Totals (Only from active records)
    const totalVentas = dashRecords.filter(r => r.types.includes('venta')).reduce((acc, r) => acc + r.amount, 0);
    const totalDeuda = dashRecords.filter(r => r.types.includes('por_pagar')).reduce((acc, r) => acc + r.amount, 0);
    const totalReparaciones = dashRecords.filter(r => r.types.includes('reparacion')).reduce((acc, r) => acc + r.amount, 0);

    // Total Ganado (Ventas + Reparaciones)
    const totalGanado = totalVentas + totalReparaciones;

    // Create Stats Container
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;";

    statsContainer.innerHTML = `
        <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
            <span style="color:var(--text-secondary); font-size: 0.9rem;">Total Ventas</span>
            <h2 style="font-size: 2rem; color: var(--success);">${formatCurrency(totalVentas)}</h2>
        </div>
        <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
            <span style="color:var(--text-secondary); font-size: 0.9rem;">Total Reparaciones</span>
            <h2 style="font-size: 2rem; color: var(--warning);">${formatCurrency(totalReparaciones)}</h2>
        </div>
        <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
            <span style="color:var(--text-secondary); font-size: 0.9rem;">Total a Pagar</span>
            <h2 style="font-size: 2rem; color: var(--danger);">${formatCurrency(totalDeuda)}</h2>
        </div>
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--accent-color);">
            <span style="color:var(--accent-color); font-size: 0.9rem; font-weight:600;">INGRESO TOTAL (Ventas + Rep.)</span>
            <h2 style="font-size: 2.2rem; color: var(--text-primary);">${formatCurrency(totalGanado)}</h2>
        </div>
    `;
    DOM.contentArea.appendChild(statsContainer);

    // Recent Header
    const header = document.createElement('h3');
    header.innerText = "Todo en General (Recientes)";
    header.style.marginBottom = "1rem";
    DOM.contentArea.appendChild(header);

    // List
    renderListView(dashRecords); // Render all keys, list view handles the empty state
}

function renderCompletadosView(compRecords) {
    // Calculate Total Earned (Ventas + Reparaciones) in Completed
    const totalVentas = compRecords.filter(r => r.types.includes('venta')).reduce((acc, r) => acc + r.amount, 0);
    const totalReparaciones = compRecords.filter(r => r.types.includes('reparacion')).reduce((acc, r) => acc + r.amount, 0);
    const totalGanado = totalVentas + totalReparaciones;

    const header = document.createElement('div');
    header.style.marginBottom = "2rem";
    header.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--success); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="color:var(--success); font-size: 0.9rem; font-weight:600;">TOTAL INGRESADO (COMPLETADOS)</span>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top:0.2rem;">Ventas: ${formatCurrency(totalVentas)} | Reparaciones: ${formatCurrency(totalReparaciones)}</div>
            </div>
            <h2 style="font-size: 2.2rem; color: var(--text-primary);">${formatCurrency(totalGanado)}</h2>
        </div>
    `;
    DOM.contentArea.appendChild(header);

    renderListView(compRecords);
}

// ==========================================
// STATS LOGIC
// ==========================================
let statsChart = null;
let currentStatsPeriod = 'week'; // 'day', 'week', 'month'

function renderStatsView() {
    DOM.contentArea.innerHTML = '';

    // 1. Controls
    const controls = document.createElement('div');
    controls.style.marginBottom = '2rem';
    controls.innerHTML = `
        <div style="display:flex; gap:0.5rem;">
            <button class="btn-period ${currentStatsPeriod === 'day' ? 'btn-primary' : 'btn-secondary'}" data-period="day">Hoy</button>
            <button class="btn-period ${currentStatsPeriod === 'week' ? 'btn-primary' : 'btn-secondary'}" data-period="week">Esta Semana</button>
            <button class="btn-period ${currentStatsPeriod === 'month' ? 'btn-primary' : 'btn-secondary'}" data-period="month">Este Mes</button>
        </div>
    `;
    DOM.contentArea.appendChild(controls);

    // Event Listeners for buttons
    controls.querySelectorAll('.btn-period').forEach(btn => {
        btn.addEventListener('click', () => {
            currentStatsPeriod = btn.dataset.period;
            renderStatsView(); // Re-render
        });
    });

    // 2. Data Aggregation
    const statsData = getStatsData(currentStatsPeriod);

    // 3. Summary Cards
    const summary = document.createElement('div');
    summary.style.display = 'grid';
    summary.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    summary.style.gap = '1.5rem';
    summary.style.marginBottom = '2rem';
    summary.innerHTML = `
        <div style="background:var(--bg-card); padding:1.5rem; border-radius:var(--radius); border:1px solid var(--border-color);">
            <div style="font-size:0.9rem; color:var(--text-secondary);">Ventas (Periodo)</div>
            <div style="font-size:1.5rem; font-weight:bold; color:var(--success);">${formatCurrency(statsData.totalVentas)}</div>
        </div>
        <div style="background:var(--bg-card); padding:1.5rem; border-radius:var(--radius); border:1px solid var(--border-color);">
            <div style="font-size:0.9rem; color:var(--text-secondary);">Reparaciones (Periodo)</div>
            <div style="font-size:1.5rem; font-weight:bold; color:var(--warning);">${formatCurrency(statsData.totalReparaciones)}</div>
        </div>
        <div style="background:var(--bg-card); padding:1.5rem; border-radius:var(--radius); border:1px solid var(--border-color);">
            <div style="font-size:0.9rem; color:var(--text-secondary);">Total Ganado</div>
            <div style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">${formatCurrency(statsData.totalVentas + statsData.totalReparaciones)}</div>
        </div>
    `;
    DOM.contentArea.appendChild(summary);

    // 4. Chart Container
    const chartContainer = document.createElement('div');
    chartContainer.style.background = 'var(--bg-card)';
    chartContainer.style.padding = '1.5rem';
    chartContainer.style.borderRadius = 'var(--radius)';
    chartContainer.style.border = '1px solid var(--border-color)';
    chartContainer.style.height = '400px';
    chartContainer.innerHTML = '<canvas id="statsChart"></canvas>';
    DOM.contentArea.appendChild(chartContainer);

    // 5. Init Chart
    initChart(statsData);
}

function getStatsData(period) {
    const now = new Date();
    let filteredRecords = [];
    let labels = [];
    let salesData = [];
    let repairsData = [];

    // Setup Ranges
    let startDate = new Date();

    if (period === 'day') {
        startDate.setHours(0, 0, 0, 0);
        // Labels: Hours 09:00 - 20:00
        for (let i = 9; i <= 20; i++) labels.push(`${i}:00`);
    } else if (period === 'week') {
        // Monday of current week
        const day = now.getDay() || 7; // Get current day number, ensure Sunday is 7
        if (day !== 1) startDate.setHours(-24 * (day - 1));
        startDate.setHours(0, 0, 0, 0);
        labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    } else if (period === 'month') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        // Labels: Days 1-31 (or current max)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) labels.push(i);
    }

    // Filter Records (Active + Completed)
    // "Ganado" implies completed or active sales? Usually "Ganado" means completed or at least "Sales made". 
    // Let's assume all records (Active + Completed) count as "Sales made" unless they are cancelled/deleted.
    // If user strict about "Ganado" = "Money in pocket", we might use 'completed'. 
    // But usually in business management, a Sale made today is revenue today even if cash collected later?
    // Let's use ALL records for "Business Volume". 
    // Actually, user said "Dinero Ganado". I'll use ALL records (assuming debts will be paid).
    // Filtering by date
    filteredRecords = records.filter(r => {
        const rDate = new Date(r.date);
        // Normalize time handling
        return rDate >= startDate;
    });

    // Initialize Data Arrays
    salesData = new Array(labels.length).fill(0);
    repairsData = new Array(labels.length).fill(0);

    // Fill Data
    filteredRecords.forEach(r => {
        const rDate = new Date(r.date);

        let index = -1;
        if (period === 'day') {
            const h = r.createdAt ? new Date(r.createdAt).getHours() : 12; // Fallback to 12 if no time
            index = h - 9; // 09:00 is index 0
        } else if (period === 'week') {
            let day = rDate.getDay(); // 0=Sun, 1=Mon
            if (day === 0) day = 7;
            index = day - 1; // 0=Mon
        } else if (period === 'month') {
            index = rDate.getDate() - 1;
        }

        if (index >= 0 && index < labels.length) {
            if (r.types.includes('venta')) {
                salesData[index] += r.amount;
            } else if (r.types.includes('reparacion')) {
                repairsData[index] += r.amount;
            }
        }
    });

    // Calculate totals for cards
    const totalVentas = filteredRecords.filter(r => r.types.includes('venta')).reduce((acc, r) => acc + r.amount, 0);
    const totalReparaciones = filteredRecords.filter(r => r.types.includes('reparacion')).reduce((acc, r) => acc + r.amount, 0);

    return { labels, salesData, repairsData, totalVentas, totalReparaciones };
}

function initChart(data) {
    const ctx = document.getElementById('statsChart').getContext('2d');

    // Destroy old if exists? Chart.js logic usually requires holding instance.
    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ventas',
                    data: data.salesData,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Reparaciones',
                    data: data.repairsData,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}



function renderListView(list) {
    if (list.length === 0) {
        DOM.contentArea.insertAdjacentHTML('beforeend', `
            <div class="empty-state" style="text-align:center; margin-top:3rem; color:var(--text-secondary)">
                <p>No se encontraron registros.</p>
            </div>
        `);
        return;
    }

    list.forEach(record => {
        const cardHTML = `
            <div class="record-card">
                <div class="card-main">
                    <div class="card-icons-wrapper" style="display:flex; gap:0.25rem;">
                        ${record.types.map(t => `
                            <div class="card-icon ${t}" style="width:36px; height:36px; font-size:0.8rem;">
                                <i data-lucide="${getIconForType(t)}" style="width:18px; height:18px;"></i>
                            </div>
                        `).join('')}
                    </div>
                    <div class="card-info">
                        <h3>${record.firstName} ${record.lastName} <span class="card-dni">${record.dni}</span> ${record.phone ? `<span class="card-phone">${record.phone}</span>` : ''}</h3>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                             <p>${record.summary || 'Sin descripción'}</p>
                             <button class="btn-icon btn-receipt" data-id="${record.id}" title="Ver Recibo" style="font-size:0.8rem; padding:0.2rem 0.5rem; border:1px solid var(--border-color); border-radius:4px;">
                                <i data-lucide="receipt" style="width:14px; height:14px; vertical-align:middle;"></i> Recibo
                             </button>
                             <button class="btn-icon btn-history" data-id="${record.id}" title="Ver Historial" style="font-size:0.8rem; padding:0.2rem 0.5rem; border:1px solid var(--border-color); border-radius:4px;">
                                <i data-lucide="book" style="width:14px; height:14px; vertical-align:middle;"></i> Historial
                             </button>
                        </div>
                    </div>
                </div>
                <div class="card-meta">
                    <div class="card-amount">${formatCurrency(record.amount)}</div>
                    <div class="card-date">${formatDate(record.date)}</div>
                    <!-- Creation Time -->
                    ${record.createdAt ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">Hora: ${formatTime(record.createdAt)}</div>` : ''}
                    <!-- Edit Time -->
                    ${record.updatedAt ? `<div style="font-size:0.7rem; color:var(--accent-color); margin-top:0.2rem; font-style:italic;">Editado: ${formatDateTime(record.updatedAt)}</div>` : ''}
                </div>
                <div class="card-actions" style="margin-left: 1rem; display:flex; gap:0.5rem;">
                    ${!record.completed ? `
                        <button class="btn-icon btn-complete" data-id="${record.id}" title="Marcar como Completado" style="color:var(--success)"><i data-lucide="check-circle"></i></button>
                    ` : `
                        <button class="btn-icon btn-restore" data-id="${record.id}" title="Restaurar" style="color:var(--warning)"><i data-lucide="rotate-ccw"></i></button>
                    `}
                    
                    <button class="btn-icon btn-edit" data-id="${record.id}" title="Editar"><i data-lucide="pencil"></i></button>
                    <button class="btn-icon btn-delete" data-id="${record.id}" title="Eliminar" style="color:var(--danger)"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
        DOM.contentArea.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// ==========================================
// HELPERS
// ==========================================

function getIconForType(type) {
    switch (type) {
        case 'venta': return 'shopping-cart';
        case 'por_pagar': return 'credit-card';
        case 'reparacion': return 'wrench';
        default: return 'file';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ==========================================
// RECEIPT LOGIC
// ==========================================
let currentReceiptRecord = null;

function openReceiptModal(record) {
    currentReceiptRecord = record;
    DOM.receiptModal.classList.remove('hidden');

    // Inject Data
    const detailsContainer = DOM.receiptPreviewArea.querySelector('.receipt-details');
    detailsContainer.innerHTML = `
        <div class="receipt-row">
            <span>Fecha:</span>
            <strong>${formatDate(record.date)} ${record.createdAt ? formatTime(record.createdAt) : ''}</strong>
        </div>
        <div class="receipt-row">
            <span>Recibo N.º:</span>
            <strong>${record.id.slice(0, 8).toUpperCase()}</strong>
        </div>
        <hr style="border-top: 1px dashed #ccc; margin: 0.5rem 0;">
        <div class="receipt-row">
            <span>Cliente:</span>
            <strong>${record.firstName} ${record.lastName}</strong>
        </div>
        <div class="receipt-row">
            <span>DNI:</span>
            <strong>${record.dni}</strong>
        </div>
        ${record.phone ? `
        <div class="receipt-row">
            <span>Teléfono:</span>
            <strong>${record.phone}</strong>
        </div>
        ` : ''}
        <div class="receipt-row">
            <span>Concepto:</span>
            <strong style="text-align:right; max-width:60%;">${record.summary || record.types.map(t => t.toUpperCase()).join(', ')}</strong>
        </div>
        <hr style="border-top: 1px solid #000; margin: 0.5rem 0;">
        
        ${(record.ventaDetails || record.types.includes('venta')) ? `
        <div class="receipt-details-table" style="margin: 1rem 0;">
             ${record.ventaDetails ? `
                <div class="receipt-row" style="margin-bottom:0.2rem;">
                    <span>Producto:</span>
                    <strong>${record.ventaDetails.productName}</strong>
                </div>
                 <div class="receipt-row" style="margin-bottom:0.2rem; font-size:0.85rem; color:#555;">
                    <span>Código:</span>
                    <span>${record.ventaDetails.productCode}</span>
                </div>
                <div class="receipt-row" style="margin-bottom:0.2rem;">
                    <span>Cantidad:</span>
                    <strong>${record.ventaDetails.quantity}</strong>
                </div>
                <div class="receipt-row" style="margin-bottom:0.2rem;">
                    <span>Método Pago:</span>
                    <strong>${record.ventaDetails.paymentMethod}</strong>
                </div>
             ` : '<div style="font-style:italic; text-align:center;">Detalles no disponibles para registros antiguos.</div>'}
        </div>
        <hr style="border-top: 1px dashed #ccc; margin: 0.5rem 0;">
        ` : ''}

        <div class="receipt-row">
            <span>TIPOS:</span>
            <strong>${record.types.map(t => t.toUpperCase()).join(', ')}</strong>
        </div>
        <hr style="border-top: 1px solid #000; margin: 0.5rem 0;">
        <div class="receipt-row" style="font-size:1.2rem; margin-top:0.5rem;">
            <span>TOTAL</span>
            <strong>${formatCurrency(record.amount)}</strong>
        </div>
    `;
}

function closeReceiptModal() {
    DOM.receiptModal.classList.add('hidden');
    currentReceiptRecord = null;
}

function downloadReceiptPDF() {
    if (!currentReceiptRecord) return;

    const element = document.getElementById('receipt-preview-area');
    const opt = {
        margin: 10,
        filename: `Recibo_${currentReceiptRecord.firstName}_${currentReceiptRecord.id.slice(0, 6)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf lib
    html2pdf().set(opt).from(element).save();
}

function sendReceiptEmail() {
    if (!currentReceiptRecord) return;

    const subject = encodeURIComponent(`Recibo de ${currentReceiptRecord.type.toUpperCase()} - xxx`);
    const body = encodeURIComponent(`Hola ${currentReceiptRecord.firstName},\n\nAdjunto encontrarás el recibo correspondiente a la operación realizada el ${formatDate(currentReceiptRecord.date)}.\n\nDetalles:\nConcepto: ${currentReceiptRecord.summary}\nImporte: ${formatCurrency(currentReceiptRecord.amount)}\n\nGracias,\nEquipo xxx`);

    // Open Mail Client
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    alert('Se ha abierto tu cliente de correo. Recuerda ADJUNTAR el PDF que acabas de descargar (si lo has hecho).');
}

// ==========================================
// HISTORY LOGIC
// ==========================================
function openHistoryModal(record) {
    DOM.historyModal.classList.remove('hidden');
    DOM.historySubtitle.innerText = `Cliente: ${record.firstName} ${record.lastName} | DNI: ${record.dni}`;

    // Filter records by DNI (Case insensitive just in case)
    const history = records.filter(r => r.dni.toLowerCase().trim() === record.dni.toLowerCase().trim());

    // Sort by Date Descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Total
    const totalSpent = history.filter(r => !r.types.includes('por_pagar')).reduce((acc, r) => acc + r.amount, 0);

    DOM.historyList.innerHTML = '';

    // Header Stats
    DOM.historyList.insertAdjacentHTML('beforeend', `
        <div style="background:var(--bg-dark); padding:1rem; border-radius:var(--radius); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color);">
            <span>Total Transacciones: <strong>${history.length}</strong></span>
            <span>Total Gastado: <strong style="color:var(--success); font-size:1.1rem;">${formatCurrency(totalSpent)}</strong></span>
        </div>
    `);

    if (history.length === 0) {
        DOM.historyList.innerHTML = '<p style="text-align:center; padding:1rem;">Sin historial.</p>';
        return;
    }

    history.forEach(h => {
        const itemHTML = `
            <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; border-bottom:1px solid var(--border-color); ${h.completed ? 'opacity:0.7;' : ''}">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="font-size:0.85rem; color:var(--text-secondary); width:80px;">${formatDate(h.date)}</div>
                    <div>
                        <div style="font-weight:600; font-size:0.95rem;">${h.summary || h.types.join(', ').toUpperCase()}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">
                             ${h.types.map(t => `<span class="badge ${t}">${t}</span>`).join(' ')}
                             ${h.completed ? '(Completado)' : ''}
                        </div>
                    </div>
                </div>
                <div style="font-weight:bold; color:var(--text-primary);">${formatCurrency(h.amount)}</div>
            </div>
        `;
        DOM.historyList.insertAdjacentHTML('beforeend', itemHTML);
    });
}

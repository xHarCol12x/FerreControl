document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth-login/login.html';
        return;
    }

    fetchCustomers();

    // UI Elements
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    const addBtn = document.getElementById('add-customer-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const searchDocBtn = document.getElementById('search-doc-btn');

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const customers = JSON.parse(event.target.result);
                    if (!Array.isArray(customers)) throw new Error("El JSON debe ser una lista de clientes.");
                    
                    toast.info(`Importando ${customers.length} clientes...`);
                    let successCount = 0;

                    for (const c of customers) {
                        const response = await fetch('/api/v1/customers', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(c)
                        });
                        if (response.ok) successCount++;
                    }

                    toast.success(`Importación finalizada: ${successCount} exitosos.`);
                    fetchCustomers();
                } catch (err) {
                    toast.error('Error al procesar el JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            // Importación vía Excel (Backend)
            const formData = new FormData();
            formData.append("file", file);

            toast.info('Subiendo y procesando Excel...');

            try {
                const response = await fetch('/api/v1/customers/import/excel', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    const count = await response.json();
                    toast.success(`Excel procesado: ${count} clientes importados.`);
                    fetchCustomers();
                } else {
                    toast.error('Error al procesar el archivo Excel en el servidor.');
                }
            } catch (error) {
                console.error('Excel import error:', error);
                toast.error('Error de conexión al importar Excel.');
            }
        } else {
            toast.warning('Formato de archivo no soportado. Use JSON o Excel (.xlsx).');
        }
        importFile.value = ''; // Reset
    });

    let isEditing = false;

    addBtn.addEventListener('click', () => {
        isEditing = false;
        document.getElementById('modal-title').innerText = 'Nuevo Cliente';
        form.reset();
        document.getElementById('c-id').value = '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    searchDocBtn.addEventListener('click', async () => {
        const docNum = document.getElementById('c-doc').value;
        const type = document.getElementById('c-type').value;
        if (!docNum) {
            toast.warning('Ingresa un número de documento.');
            return;
        }

        searchDocBtn.disabled = true;
        searchDocBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span>';

        const endpoint = type === 'RUC' ? `ruc/${docNum}` : `dni/${docNum}`;

        try {
            const response = await fetch(`/api/v1/consultas/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.result) {
                    if (type === 'RUC') {
                        document.getElementById('c-name').value = data.result.razon_social;
                        document.getElementById('c-address').value = data.result.direccion || '';
                    } else {
                        document.getElementById('c-name').value = data.result.full_name;
                        document.getElementById('c-address').value = data.result.address || '';
                    }
                    toast.success('Datos encontrados.');
                } else {
                    toast.warning('No se encontró información para este documento.');
                }
            } else {
                toast.error('Error al consultar el servicio externo.');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Error de conexión con el servicio de consulta.');
        } finally {
            searchDocBtn.disabled = false;
            searchDocBtn.innerHTML = '<span class="material-symbols-outlined text-sm">search</span>';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('c-id').value;
        const customerData = {
            documentType: document.getElementById('c-type').value,
            documentNumber: document.getElementById('c-doc').value,
            name: document.getElementById('c-name').value,
            address: document.getElementById('c-address').value,
            email: document.getElementById('c-email').value,
            phone: document.getElementById('c-phone').value
        };

        const url = isEditing ? `/api/v1/customers/${id}` : '/api/v1/customers';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            if (response.ok) {
                closeModal();
                fetchCustomers();
            } else {
                toast.error('Error al guardar el cliente.');
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    });
});

async function fetchCustomers() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">Cargando clientes...</td></tr>';

    try {
        const response = await fetch('/api/v1/customers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const customers = await response.json();
            renderCustomers(customers);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = '';

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400">No hay clientes registrados.</td></tr>';
        return;
    }

    customers.forEach(customer => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-outline-variant hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm">
                <span class="font-bold text-primary">${customer.documentType}:</span> ${customer.documentNumber}
            </td>
            <td class="px-6 py-4 text-sm font-medium text-slate-800">${customer.name}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${customer.email || '-'}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${customer.phone || '-'}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="editCustomer('${encodeURIComponent(JSON.stringify(customer))}')" class="text-slate-400 hover:text-primary p-1">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="deleteCustomer(${customer.id})" class="text-slate-400 hover:text-error p-1">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function closeModal() {
    const modal = document.getElementById('customer-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

window.editCustomer = (dataJson) => {
    const customer = JSON.parse(decodeURIComponent(dataJson));
    const modal = document.getElementById('customer-modal');
    document.getElementById('modal-title').innerText = 'Editar Cliente';
    document.getElementById('c-id').value = customer.id;
    document.getElementById('c-type').value = customer.documentType;
    document.getElementById('c-doc').value = customer.documentNumber;
    document.getElementById('c-name').value = customer.name;
    document.getElementById('c-address').value = customer.address || '';
    document.getElementById('c-email').value = customer.email || '';
    document.getElementById('c-phone').value = customer.phone || '';
    
    // Set global edit state
    // (In a real app, use a better state manager or querySelector)
    // For now, I'll just toggle the flag in the DOM scope if needed or just handle via ID
    // Actually, I'll use a hidden input for ID to determine edit mode in the submit handler
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.deleteCustomer = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/v1/customers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            fetchCustomers();
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
};

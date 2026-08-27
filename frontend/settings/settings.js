document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth-login/login.html';
        return;
    }

    // Load initial data
    fetchTenantData();
    fetchUsers();
    checkPadronStatus();

    // Padrón SUNAT Sync
    document.getElementById('sync-padron-btn').addEventListener('click', async () => {
        const btn = document.getElementById('sync-padron-btn');
        const progress = document.getElementById('padron-progress');
        const textEl = document.getElementById('sync-padron-text');

        if (!confirm('Esto descargará el padrón oficial de SUNAT (~200MB). El proceso puede tomar varios minutos. ¿Continuar?')) return;

        btn.disabled = true;
        textEl.textContent = 'Sincronizando...';
        progress.classList.remove('hidden');

        try {
            const response = await fetch('/api/v1/padron/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`Padrón sincronizado: ${data.totalRegistros.toLocaleString()} RUCs cargados.`);
                checkPadronStatus();
            } else {
                toast.error('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Error de conexión al sincronizar padrón.');
        } finally {
            btn.disabled = false;
            textEl.textContent = 'Sincronizar Padrón SUNAT';
            progress.classList.add('hidden');
        }
    });

    // Event Listeners
    document.getElementById('password-form').addEventListener('submit', handlePasswordChange);
    document.getElementById('user-form').addEventListener('submit', handleUserFormSubmit);
    
    // Logo Change
    document.getElementById('change-logo-btn').addEventListener('click', () => {
        const currentLogo = document.querySelector('img[alt="Company Logo"]').src;
        const newUrl = prompt('Ingrese la URL del nuevo logo:', currentLogo);
        if (newUrl && newUrl !== currentLogo) {
            document.querySelector('img[alt="Company Logo"]').src = newUrl;
        }
    });

    // RUC Search
    document.getElementById('search-ruc-btn').addEventListener('click', async () => {
        const ruc = document.getElementById('setting-ruc').value;
        if (ruc.length !== 11) {
            toast.warning('El RUC debe tener 11 dígitos.');
            return;
        }

        const btn = document.getElementById('search-ruc-btn');
        const icon = btn.querySelector('.material-symbols-outlined');
        icon.classList.add('animate-spin');
        btn.disabled = true;

        try {
            const response = await fetch(`/api/v1/consultas/ruc/${ruc}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.result) {
                    document.getElementById('setting-company-name').value = data.result.razon_social;
                    document.getElementById('setting-address').value = data.result.direccion;
                    toast.success('Datos recuperados de SUNAT.');
                } else {
                    toast.error('No se encontraron datos para este RUC.');
                }
            } else {
                toast.error('Error al consultar SUNAT.');
            }
        } catch (error) {
            console.error('Error consulting RUC:', error);
        } finally {
            icon.classList.remove('animate-spin');
            btn.disabled = false;
        }
    });

    // Save button (Top Right)
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (btn.innerText.includes('Guardar Cambios')) {
            btn.addEventListener('click', handleSaveTenant);
        }
    });
});

let isEditingUser = false;
let editingUserId = null;

async function checkPadronStatus() {
    const token = localStorage.getItem('token');
    const badge = document.getElementById('padron-status-badge');
    const totalEl = document.getElementById('padron-total');
    const syncBtn = document.getElementById('sync-padron-btn');
    const syncText = document.getElementById('sync-padron-text');

    try {
        const response = await fetch('/api/v1/padron/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            totalEl.textContent = data.totalRegistros.toLocaleString();

            if (data.disponible) {
                badge.textContent = 'ACTIVO';
                badge.className = 'px-2 py-1 bg-[#e6f4ea] text-[#137333] rounded font-label-caps text-label-caps font-bold';
                syncText.textContent = 'Actualizar Padrón SUNAT';
            } else {
                badge.textContent = 'SIN DATOS';
                badge.className = 'px-2 py-1 bg-amber-100 text-amber-700 rounded font-label-caps text-label-caps font-bold';
                syncText.textContent = 'Descargar Padrón SUNAT';
            }
        }
    } catch (error) {
        badge.textContent = 'ERROR';
        badge.className = 'px-2 py-1 bg-red-100 text-red-700 rounded font-label-caps text-label-caps font-bold';
        console.error('Padron status error:', error);
    }
}

async function fetchTenantData() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/v1/tenants/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const tenant = await response.json();
            document.getElementById('setting-company-name').value = tenant.name || '';
            document.getElementById('setting-ruc').value = tenant.ruc || '';
            document.getElementById('setting-phone').value = tenant.phone || '';
            document.getElementById('setting-address').value = tenant.address || '';
            
            // Billing Config
            document.getElementById('invoice-prefix').innerText = tenant.invoiceSeries || 'F001';
            document.getElementById('setting-invoice-number').value = tenant.lastInvoiceNumber || 0;
            document.getElementById('boleta-prefix').innerText = tenant.boletaSeries || 'B001';
            document.getElementById('setting-boleta-number').value = tenant.lastBoletaNumber || 0;
            
            if (tenant.logoUrl) {
                document.querySelector('img[alt="Company Logo"]').src = tenant.logoUrl;
            }
        }
    } catch (error) {
        console.error('Error fetching tenant data:', error);
    }
}

async function handleSaveTenant(e) {
    const btn = e.target.closest('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Guardando...';

    const token = localStorage.getItem('token');
    const tenantData = {
        name: document.getElementById('setting-company-name').value,
        ruc: document.getElementById('setting-ruc').value,
        phone: document.getElementById('setting-phone').value,
        address: document.getElementById('setting-address').value,
        logoUrl: document.querySelector('img[alt="Company Logo"]').src,
        invoiceSeries: document.getElementById('invoice-prefix').innerText,
        lastInvoiceNumber: parseInt(document.getElementById('setting-invoice-number').value),
        boletaSeries: document.getElementById('boleta-prefix').innerText,
        lastBoletaNumber: parseInt(document.getElementById('setting-boleta-number').value)
    };

    try {
        const response = await fetch('/api/v1/tenants/me', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tenantData)
        });

        if (response.ok) {
            toast.success('Configuración guardada correctamente.');
            localStorage.setItem('tenantName', tenantData.name);
            fetchTenantData();
        } else {
            toast.error('Error al guardar la configuración.');
        }
    } catch (error) {
        console.error('Error saving tenant data:', error);
        toast.error('Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function fetchUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/v1/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const users = await response.json();
            renderUsers(users);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

function renderUsers(users) {
    const tableBody = document.getElementById('settings-user-table');
    tableBody.innerHTML = '';

    users.forEach(user => {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-outline-variant hover:bg-surface-container-low transition-colors';
        tr.innerHTML = `
            <td class="py-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">${initials}</div>
                    <div class="flex flex-col">
                        <span class="text-on-surface font-medium truncate w-32">${user.fullName}</span>
                        <span class="text-[10px] text-on-surface-variant">@${user.username}</span>
                    </div>
                </div>
            </td>
            <td class="py-3">
                <span class="px-2 py-0.5 ${user.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'} border rounded text-[10px] font-bold">${user.role}</span>
            </td>
            <td class="py-3 text-right">
                <div class="flex justify-end gap-1">
                    <button onclick="editUser('${encodeURIComponent(JSON.stringify(user))}')" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Editar"><span class="material-symbols-outlined text-sm">edit</span></button>
                    <button onclick="deleteUser(${user.id})" class="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors" title="Eliminar"><span class="material-symbols-outlined text-sm">delete</span></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

window.editUser = (userJson) => {
    const user = JSON.parse(decodeURIComponent(userJson));
    isEditingUser = true;
    editingUserId = user.id;
    
    document.getElementById('new-user-fullname').value = user.fullName;
    document.getElementById('new-user-username').value = user.username;
    document.getElementById('new-user-username').disabled = true; // No permitir cambiar username
    document.getElementById('new-user-role').value = user.role;
    document.getElementById('new-user-password').placeholder = 'Dejar vacío para no cambiar';
    document.getElementById('new-user-password').required = false;

    const modalTitle = document.querySelector('#user-modal h3');
    if (modalTitle) modalTitle.innerText = 'Editar Empleado';
    
    const submitBtn = document.querySelector('#user-form button[type="submit"]');
    if (submitBtn) submitBtn.innerText = 'Actualizar Usuario';

    openUserModal();
};

window.deleteUser = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? No podrá acceder al sistema.')) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/v1/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast.success('Usuario eliminado.');
            fetchUsers();
        } else {
            const msg = await response.text();
            toast.error(msg || 'Error al eliminar usuario.');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
};

async function handleUserFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const userData = {
        fullName: document.getElementById('new-user-fullname').value,
        username: document.getElementById('new-user-username').value,
        role: document.getElementById('new-user-role').value
    };

    const password = document.getElementById('new-user-password').value;
    if (password) userData.password = password;

    const url = isEditingUser ? `/api/v1/users/${editingUserId}` : '/api/v1/users';
    const method = isEditingUser ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            toast.success(isEditingUser ? 'Usuario actualizado.' : 'Usuario creado.');
            closeUserModal();
            fetchUsers();
        } else {
            toast.error('Error al procesar la solicitud.');
        }
    } catch (error) {
        console.error('Error submittig user form:', error);
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const data = {
        currentPassword: document.getElementById('current-password').value,
        newPassword: document.getElementById('new-password').value
    };

    try {
        const response = await fetch('/api/v1/users/change-password', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            toast.success('Contraseña actualizada correctamente.');
            closePasswordModal();
        } else {
            const msg = await response.text();
            toast.error('Error: ' + msg);
        }
    } catch (error) {
        console.error('Error changing password:', error);
    }
}

// Modal UI Functions
function openPasswordModal() {
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('password-modal').classList.add('flex');
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.add('hidden');
    document.getElementById('password-modal').classList.remove('flex');
    document.getElementById('password-form').reset();
}

function openUserModal() {
    document.getElementById('user-modal').classList.remove('hidden');
    document.getElementById('user-modal').classList.add('flex');
}

function closeUserModal() {
    isEditingUser = false;
    editingUserId = null;
    
    document.getElementById('new-user-username').disabled = false;
    document.getElementById('new-user-password').placeholder = '';
    document.getElementById('new-user-password').required = true;
    
    const modalTitle = document.querySelector('#user-modal h3');
    if (modalTitle) modalTitle.innerText = 'Nuevo Empleado';
    
    const submitBtn = document.querySelector('#user-form button[type="submit"]');
    if (submitBtn) submitBtn.innerText = 'Crear Usuario';

    document.getElementById('user-modal').classList.add('hidden');
    document.getElementById('user-modal').classList.remove('flex');
    document.getElementById('user-form').reset();
}

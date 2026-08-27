document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth-login/login.html';
        return;
    }

    fetchSales();

    // UI Elements
    const searchInput = document.getElementById('sales-search');
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterSales(term);
    });
});

let allSales = [];

async function fetchSales() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">Cargando ventas...</td></tr>';

    try {
        const response = await fetch('/api/v1/sales', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            allSales = await response.json();
            renderSales(allSales);
            updateStats(allSales);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-error">Error al cargar datos.</td></tr>';
        }
    } catch (error) {
        console.error('Fetch sales error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-error">Error de conexión.</td></tr>';
    }
}

function renderSales(sales) {
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '';

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-400">No se encontraron ventas.</td></tr>';
        return;
    }

    // Sort by date descending
    const sortedSales = [...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sortedSales.forEach(sale => {
        const date = new Date(sale.createdAt);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-outline-variant hover:bg-slate-50 transition-colors cursor-pointer';
        tr.onclick = () => showSaleDetail(sale.id);
        
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-slate-500">${date.toLocaleString()}</td>
            <td class="px-6 py-4 text-sm font-bold text-primary">${sale.invoiceNumber}</td>
            <td class="px-6 py-4 text-sm font-medium text-slate-800">${sale.customer ? sale.customer.name : 'Público General'}</td>
            <td class="px-6 py-4 text-sm text-slate-600">
                <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">${sale.paymentMethod === 'Efectivo' ? 'payments' : 'credit_card'}</span>
                    ${sale.paymentMethod}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-right font-bold text-slate-900">S/ ${sale.totalAmount.toFixed(2)}</td>
            <td class="px-6 py-4 text-center">
                <button onclick="event.stopPropagation(); showSaleDetail(${sale.id})" class="text-slate-400 hover:text-primary p-1">
                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
                <button onclick="event.stopPropagation(); toast.info('Re-imprimiendo comprobante...')" class="text-slate-400 hover:text-slate-700 p-1">
                    <span class="material-symbols-outlined text-[18px]">print</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterSales(term) {
    const filtered = allSales.filter(s => {
        const invoice = s.invoiceNumber.toLowerCase();
        const customer = (s.customer ? s.customer.name : 'público general').toLowerCase();
        return invoice.includes(term) || customer.includes(term);
    });
    renderSales(filtered);
}

function updateStats(sales) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const todaySales = sales.filter(s => s.createdAt.startsWith(today));
    const monthSales = sales.filter(s => {
        const d = new Date(s.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const todayAmount = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const monthAmount = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);

    document.getElementById('stats-today-count').innerText = todaySales.length;
    document.getElementById('stats-today-amount').innerText = `S/ ${todayAmount.toFixed(2)}`;
    document.getElementById('stats-month-count').innerText = monthSales.length;
    document.getElementById('stats-month-amount').innerText = `S/ ${monthAmount.toFixed(2)}`;
}

window.showSaleDetail = async (id) => {
    const token = localStorage.getItem('token');
    const modal = document.getElementById('sale-detail-modal');
    
    // Find sale in local array or fetch from server
    const sale = allSales.find(s => s.id === id);
    if (!sale) return;

    document.getElementById('detail-invoice').innerText = sale.invoiceNumber;
    document.getElementById('detail-customer').innerText = sale.customer ? sale.customer.name : 'Público General';
    document.getElementById('detail-date').innerText = new Date(sale.createdAt).toLocaleString();
    document.getElementById('detail-total').innerText = `S/ ${sale.totalAmount.toFixed(2)}`;

    const itemsBody = document.getElementById('detail-items-body');
    itemsBody.innerHTML = '';

    sale.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100';
        tr.innerHTML = `
            <td class="px-4 py-2">${item.product.name}</td>
            <td class="px-4 py-2 text-center">${item.quantity}</td>
            <td class="px-4 py-2 text-right">S/ ${item.unitPrice.toFixed(2)}</td>
            <td class="px-4 py-2 text-right font-medium">S/ ${item.subtotal.toFixed(2)}</td>
        `;
        itemsBody.appendChild(tr);
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeDetailModal = () => {
    const modal = document.getElementById('sale-detail-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

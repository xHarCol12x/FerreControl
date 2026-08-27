document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    let salesChart = null;
    let productsChart = null;
    let allSales = [];
    let currentPage = 1;
    const pageSize = 5;

    // Colores para el donut
    const chartColors = [
        '#00236f', // Primary
        '#fd761a', // Secondary
        '#b6c4ff', // Primary Fixed Dim
        '#6e2c00', // Tertiary Container
        '#eff4ff'  // Surface Low
    ];

    // Elementos de UI
    const filterButtons = {
        today: document.getElementById('filter-today'),
        week: document.getElementById('filter-week'),
        month: document.getElementById('filter-month'),
        custom: document.getElementById('filter-custom')
    };

    const customModal = document.getElementById('custom-date-modal');
    const chartTitle = document.getElementById('chart-title');
    const customStartInput = document.getElementById('custom-start');
    const customEndInput = document.getElementById('custom-end');
    const applyCustomBtn = document.getElementById('apply-custom-filter');
    const closeCustomBtn = document.getElementById('close-custom-filter');
    const closeModalX = document.getElementById('close-modal-x');

    // Botones de Exportación
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');

    async function fetchData(start = null, end = null, title = "Ventas vs Compras") {
        let urlStats = '/api/v1/sales/stats';
        let urlSales = '/api/v1/sales';
        
        if (start && end) {
            const pad = (n) => n.toString().padStart(2, '0');
            const formatLocal = (d, h, m, s) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:${pad(s)}`;
            
            const startStr = formatLocal(start, 0, 0, 0);
            const endStr = formatLocal(end, 23, 59, 59);
            
            const params = `?start=${startStr}&end=${endStr}`;
            urlStats += params;
            urlSales += params;
        }

        if (chartTitle) chartTitle.innerText = title;

        try {
            // Fetch Stats
            const resStats = await fetch(urlStats, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resStats.ok) {
                const stats = await resStats.json();
                updateStatsCards(stats);
                renderChart(stats.dailySales);
                renderProductsDonut(stats.topProducts);
            }

            // Fetch Sales
            const resSales = await fetch(urlSales, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resSales.ok) {
                const sales = await resSales.json();
                allSales = sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                currentPage = 1;
                renderSalesPage();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (typeof toast !== 'undefined') toast.error('Error al conectar con el servidor.');
        }
    }

    function updateStatsCards(stats) {
        document.getElementById('rep-total-sales').innerText = `S/ ${stats.totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
        document.getElementById('rep-total-orders').innerText = stats.totalOrders;
        document.getElementById('rep-avg-ticket').innerText = `S/ ${stats.averageTicket.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

        // Renderizar Crecimiento
        const growthBadge = document.getElementById('sales-growth-badge');
        if (growthBadge && stats.salesGrowth !== undefined) {
            const val = stats.salesGrowth;
            const icon = growthBadge.querySelector('.material-symbols-outlined');
            const text = growthBadge.querySelector('.growth-value');
            
            growthBadge.classList.remove('hidden', 'flex', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-slate-100', 'text-slate-700');
            growthBadge.classList.add('flex');

            if (val > 0) {
                growthBadge.classList.add('bg-green-100', 'text-green-700');
                icon.innerText = 'trending_up';
                text.innerText = `+${val.toFixed(1)}%`;
            } else if (val < 0) {
                growthBadge.classList.add('bg-red-100', 'text-red-700');
                icon.innerText = 'trending_down';
                text.innerText = `${val.toFixed(1)}%`;
            } else {
                growthBadge.classList.add('bg-slate-100', 'text-slate-700');
                icon.innerText = 'trending_flat';
                text.innerText = '0%';
            }
        }
    }

    function renderSalesPage() {
        const tbody = document.getElementById('reports-table-body');
        const prevBtn = document.getElementById('rep-prev-btn');
        const nextBtn = document.getElementById('rep-next-btn');
        const pageInfo = document.getElementById('rep-pagination-info');
        const currentPageIndicator = document.getElementById('rep-current-page');

        if (!tbody) return;
        tbody.innerHTML = '';
        
        const totalRecords = allSales.length;
        const totalPages = Math.ceil(totalRecords / pageSize) || 1;
        
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageData = allSales.slice(start, end);

        pageData.forEach(sale => {
            const date = new Date(sale.createdAt);
            const tr = document.createElement('tr');
            tr.className = 'border-b border-outline-variant/50 hover:bg-surface-container-low h-table-row-height';
            tr.innerHTML = `
                <td class="py-2 px-4 font-mono text-xs text-primary">${sale.invoiceNumber}</td>
                <td class="py-2 px-4 text-xs">${date.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td class="py-2 px-4 truncate max-w-[150px] text-xs">${sale.customer ? sale.customer.name : 'Cliente General'}</td>
                <td class="py-2 px-4 text-xs">
                    <span class="inline-flex items-center gap-1 text-primary">
                        <span class="material-symbols-outlined text-[14px]">payments</span>
                        ${sale.paymentMethod || 'Efectivo'}
                    </span>
                </td>
                <td class="py-2 px-4 text-right font-medium text-xs">S/ ${sale.totalAmount.toFixed(2)}</td>
                <td class="py-2 px-4 text-center">
                    <span class="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded uppercase tracking-wide border border-green-200">Pagado</span>
                </td>
                <td class="py-2 px-4 text-right">
                    <button onclick="window.location.href='../pos/pos.html'" class="text-outline hover:text-primary">
                        <span class="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        for (let i = 0; i < (pageSize - pageData.length); i++) {
            const tr = document.createElement('tr');
            tr.className = 'h-table-row-height border-b border-outline-variant/10';
            tr.innerHTML = `<td colspan="7" class="py-2 px-4">&nbsp;</td>`;
            tbody.appendChild(tr);
        }

        if (pageInfo) {
            const showEnd = Math.min(start + pageData.length, totalRecords);
            pageInfo.innerText = `Mostrando ${pageData.length > 0 ? start + 1 : 0} - ${showEnd} de ${totalRecords} registros`;
        }
        if (currentPageIndicator) currentPageIndicator.innerText = `Pág. ${currentPage} de ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalRecords === 0;
    }

    // Lógica de Filtros
    function setActiveButton(id) {
        Object.keys(filterButtons).forEach(key => {
            const btn = filterButtons[key];
            if (key === id) {
                btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-medium', 'shadow-sm');
                btn.classList.remove('text-on-surface-variant');
            } else {
                btn.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-medium', 'shadow-sm');
                btn.classList.add('text-on-surface-variant');
            }
        });
        
        customModal.classList.add('hidden');
        customModal.classList.remove('flex');
    }

    filterButtons.today.onclick = () => {
        setActiveButton('today');
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        fetchData(start, end, "Ventas de Hoy");
    };

    filterButtons.week.onclick = () => {
        setActiveButton('week');
        const end = new Date(); end.setHours(23,59,59,999);
        const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0);
        fetchData(start, end, "Ventas de la Semana");
    };

    filterButtons.month.onclick = () => {
        setActiveButton('month');
        const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        fetchData(start, end, "Ventas del Mes");
    };

    filterButtons.custom.onclick = () => {
        customModal.classList.remove('hidden');
        customModal.classList.add('flex');
    };

    const closeAll = () => {
        customModal.classList.add('hidden');
        customModal.classList.remove('flex');
    };

    closeCustomBtn.onclick = closeAll;
    closeModalX.onclick = closeAll;

    applyCustomBtn.onclick = () => {
        const startVal = customStartInput.value;
        const endVal = customEndInput.value;

        if (!startVal || !endVal) {
            if (typeof toast !== 'undefined') toast.warning('Por favor seleccione ambas fechas.');
            return;
        }

        const start = new Date(startVal);
        start.setHours(0,0,0,0);
        const end = new Date(endVal);
        end.setHours(23,59,59,999);

        if (start > end) {
            if (typeof toast !== 'undefined') toast.error('La fecha de inicio no puede ser posterior a la de fin.');
            return;
        }

        setActiveButton('custom');
        const title = `Ventas del ${start.toLocaleDateString('es-PE')} al ${end.toLocaleDateString('es-PE')}`;
        fetchData(start, end, title);
    };

    // Paginación
    document.getElementById('rep-prev-btn').onclick = () => { if (currentPage > 1) { currentPage--; renderSalesPage(); } };
    document.getElementById('rep-next-btn').onclick = () => { if (currentPage < Math.ceil(allSales.length / pageSize)) { currentPage++; renderSalesPage(); } };

    function renderChart(dailySales) {
        const ctx = document.getElementById('salesChart').getContext('2d');
        if (salesChart) salesChart.destroy();
        const labels = dailySales.length > 0 ? dailySales.map(d => d.date) : ['Sin datos'];
        const data = dailySales.length > 0 ? dailySales.map(d => d.amount) : [0];
        
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas (S/)',
                    data: data,
                    borderColor: '#1d4ed8', 
                    backgroundColor: 'rgba(29, 78, 216, 0.1)',
                    fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => 'S/ ' + v } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderProductsDonut(topProducts) {
        const ctx = document.getElementById('productsDonutChart').getContext('2d');
        const listContainer = document.getElementById('top-products-list');
        const totalIndicator = document.getElementById('top-products-total');

        if (productsChart) productsChart.destroy();
        if (listContainer) listContainer.innerHTML = '';

        if (!topProducts || topProducts.length === 0) {
            if (listContainer) listContainer.innerHTML = '<li class="text-center text-xs text-slate-400 py-4">Sin datos suficientes.</li>';
            if (totalIndicator) totalIndicator.innerText = '0%';
            return;
        }

        const labels = topProducts.map(p => p.name);
        const data = topProducts.map(p => p.totalRevenue);
        const percentages = topProducts.map(p => p.percentage);

        productsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` S/ ${context.raw.toFixed(2)} (${percentages[context.dataIndex]}%)`
                        }
                    }
                }
            }
        });

        // Renderizar lista legend
        topProducts.forEach((product, index) => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between font-body-sm text-body-sm';
            li.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-sm" style="background-color: ${chartColors[index % chartColors.length]}"></div>
                    <span class="text-on-surface truncate w-32" title="${product.name}">${product.name}</span>
                </div>
                <span class="font-medium">${product.percentage}%</span>
            `;
            listContainer.appendChild(li);
        });

        if (totalIndicator) totalIndicator.innerText = '100%';
    }

    // Funciones de Exportación
    exportPdfBtn.onclick = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Reporte de Ventas - FerreControl', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Filtro actual: ${chartTitle.innerText}`, 14, 37);

        const tableData = allSales.map(s => [
            s.invoiceNumber,
            new Date(s.createdAt).toLocaleString(),
            s.customer ? s.customer.name : 'Cliente General',
            s.paymentMethod || 'Efectivo',
            `S/ ${s.totalAmount.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 45,
            head: [['Factura', 'Fecha', 'Cliente', 'Pago', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 35, 111] }
        });

        doc.save(`Reporte_Ventas_${new Date().getTime()}.pdf`);
    };

    exportExcelBtn.onclick = () => {
        const data = allSales.map(s => ({
            'Factura': s.invoiceNumber,
            'Fecha': new Date(s.createdAt).toLocaleString(),
            'Cliente': s.customer ? s.customer.name : 'Cliente General',
            'Método Pago': s.paymentMethod || 'Efectivo',
            'Total (S/)': s.totalAmount
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
        XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().getTime()}.xlsx`);
    };

    // Inicialización (Mes por defecto)
    filterButtons.month.click();
});

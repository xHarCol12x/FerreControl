document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    let weeklyChart = null;

    // Set Today's Date in Header
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = today.toLocaleDateString('es-PE', options);
    const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const dateElement = document.querySelector('h1 + p');
    if (dateElement) dateElement.innerText = `Hoy: ${capitalizedDate}`;

    async function fetchDashboardData() {
        try {
            // 1. Fetch Today's Stats
            const startToday = new Date(); startToday.setHours(0,0,0,0);
            const endToday = new Date(); endToday.setHours(23,59,59,999);
            const pad = (n) => n.toString().padStart(2, '0');
            const formatLocal = (d, h, m, s) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:${pad(s)}`;
            
            const startTodayStr = formatLocal(startToday, 0, 0, 0);
            const endTodayStr = formatLocal(endToday, 23, 59, 59);
            
            const resToday = await fetch(`/api/v1/sales/stats?start=${startTodayStr}&end=${endTodayStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resToday.ok) {
                const stats = await resToday.json();
                updateKPIs(stats);
            }

            // 2. Fetch Weekly Stats (Last 7 days)
            const startWeek = new Date(); startWeek.setDate(today.getDate() - 6); startWeek.setHours(0,0,0,0);
            const startWeekStr = formatLocal(startWeek, 0, 0, 0);
            
            const resWeek = await fetch(`/api/v1/sales/stats?start=${startWeekStr}&end=${endTodayStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resWeek.ok) {
                const weeklyStats = await resWeek.json();
                renderWeeklyChart(weeklyStats.dailySales);
            }

            // 3. Fetch Low Stock Alerts
            const resStock = await fetch(`/api/v1/products/low-stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resStock.ok) {
                const lowStock = await resStock.json();
                updateStockAlerts(lowStock);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    function updateKPIs(stats) {
        document.getElementById('dash-sales-today').innerText = `S/ ${stats.totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
        document.getElementById('dash-tickets-today').innerText = stats.totalOrders;
        document.getElementById('dash-avg-ticket').innerText = `S/ ${stats.averageTicket.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

        // Growth Badge
        const growthBadge = document.getElementById('dash-sales-growth');
        if (growthBadge && stats.salesGrowth !== undefined) {
            const val = stats.salesGrowth;
            const icon = growthBadge.querySelector('.material-symbols-outlined');
            const text = growthBadge.querySelector('.font-label-caps');
            
            growthBadge.classList.remove('hidden', 'flex', 'text-emerald-700', 'text-red-700', 'text-slate-500');
            growthBadge.classList.add('flex');

            if (val > 0) {
                growthBadge.classList.add('text-emerald-700');
                icon.innerText = 'trending_up';
                text.innerText = `+${val.toFixed(0)}% vs ayer`;
            } else if (val < 0) {
                growthBadge.classList.add('text-red-700');
                icon.innerText = 'trending_down';
                text.innerText = `${val.toFixed(0)}% vs ayer`;
            } else {
                growthBadge.classList.add('text-slate-500');
                icon.innerText = 'trending_flat';
                text.innerText = '0% vs ayer';
            }
        }
    }

    function renderWeeklyChart(dailySales) {
        const ctx = document.getElementById('dashWeeklyChart').getContext('2d');
        if (weeklyChart) weeklyChart.destroy();

        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' });
            
            labels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));
            const dayData = dailySales.find(ds => ds.date === dateStr);
            data.push(dayData ? dayData.amount : 0);
        }

        weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas (S/)',
                    data: data,
                    backgroundColor: labels.map((_, i) => i === 6 ? '#fd761a' : '#00236f'), // Azul primario, naranja hoy
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#213145',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => ` Ventas: S/ ${context.raw.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { borderDash: [4, 4], color: '#e5eeff', drawBorder: false },
                        ticks: { font: { size: 10, family: 'Inter' }, color: '#757682', callback: v => 'S/ ' + v }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: '600', family: 'Inter' }, color: '#444651' }
                    }
                }
            }
        });
    }

    function updateStockAlerts(products) {
        const badge = document.getElementById('dash-alerts-badge');
        const countKPI = document.getElementById('dash-stock-alerts-count');
        const tbody = document.getElementById('dash-stock-alerts-body');
        const cardContainer = document.getElementById('dash-stock-alerts-card');

        if (badge) badge.innerText = `${products.length} ITEMS`;
        if (countKPI) countKPI.innerText = products.length;
        
        // Update Card Colors based on count
        if (cardContainer) {
            const titleLabel = cardContainer.querySelector('.text-on-error-container');
            if (products.length > 0) {
                cardContainer.classList.add('bg-error-container', 'border-error-container');
                cardContainer.classList.remove('bg-surface-container-lowest', 'border-outline-variant');
                if (titleLabel) titleLabel.classList.replace('text-on-surface-variant', 'text-on-error-container');
            } else {
                cardContainer.classList.remove('bg-error-container', 'border-error-container');
                cardContainer.classList.add('bg-surface-container-lowest', 'border-outline-variant');
                if (titleLabel) titleLabel.classList.replace('text-on-error-container', 'text-on-surface-variant');
            }
        }

        if (tbody) {
            tbody.innerHTML = '';
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-body-sm text-on-surface-variant opacity-60">No hay alertas de stock bajo ✅</td></tr>';
                return;
            }

            products.slice(0, 10).forEach(p => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-container-low/50 transition-colors h-table-row-height border-b border-outline-variant/30';
                const statusClass = p.stock <= 5 ? 'bg-error-container text-on-error-container border-error-container' : 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim';
                const statusText = p.stock <= 5 ? 'Crítico' : 'Bajo';
                
                tr.innerHTML = `
                    <td class="py-2 px-4 text-on-background truncate max-w-[150px] font-medium" title="${p.name}">${p.name}</td>
                    <td class="py-2 px-4 text-right text-on-background font-mono font-bold">${p.stock}</td>
                    <td class="py-2 px-4 text-center">
                        <span class="inline-block px-2 py-0.5 ${statusClass} text-[10px] font-bold rounded uppercase border">${statusText}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    fetchDashboardData();
});

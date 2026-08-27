// ========================================
// Global Toast Notification System
// ========================================
(function () {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .toast-notification {
            pointer-events: all;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 340px;
            max-width: 440px;
            padding: 14px 18px;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
            backdrop-filter: blur(12px);
            transform: translateX(120%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .toast-notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        .toast-notification.hide {
            transform: translateX(120%);
            opacity: 0;
        }
        .toast-notification .toast-icon {
            font-size: 22px;
            flex-shrink: 0;
            margin-top: 1px;
        }
        .toast-notification .toast-body {
            flex: 1;
            min-width: 0;
        }
        .toast-notification .toast-title {
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 2px;
        }
        .toast-notification .toast-message {
            opacity: 0.9;
            font-size: 12.5px;
            word-break: break-word;
        }
        .toast-notification .toast-close {
            flex-shrink: 0;
            background: none;
            border: none;
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            padding: 2px;
            font-size: 18px;
            line-height: 1;
            transition: color 0.2s;
        }
        .toast-notification .toast-close:hover {
            color: #fff;
        }
        .toast-notification .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            border-radius: 0 0 12px 12px;
            background: rgba(255,255,255,0.35);
            animation: toastProgress linear forwards;
        }
        @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
        }
        .toast-success { background: linear-gradient(135deg, #059669, #047857); }
        .toast-error { background: linear-gradient(135deg, #dc2626, #b91c1c); }
        .toast-warning { background: linear-gradient(135deg, #d97706, #b45309); }
        .toast-info { background: linear-gradient(135deg, #1e3a8a, #1e40af); }
    `;
    document.head.appendChild(style);

    // Create container
    let container = null;
    function getContainer() {
        if (!container || !document.body.contains(container)) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    const ICONS = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    const TITLES = {
        success: '¡Éxito!',
        error: 'Error',
        warning: 'Atención',
        info: 'Información'
    };

    function createToast(type, message, options = {}) {
        const duration = options.duration || 4000;
        const title = options.title || TITLES[type];

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.position = 'relative';
        toast.style.overflow = 'hidden';
        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon" style="font-variation-settings: 'FILL' 1;">${ICONS[type]}</span>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
            <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        const dismiss = () => {
            toast.classList.add('hide');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };

        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
        toast.addEventListener('click', dismiss);

        getContainer().appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        // Auto dismiss
        setTimeout(dismiss, duration);

        // Limit visible toasts
        const toasts = getContainer().querySelectorAll('.toast-notification');
        if (toasts.length > 5) toasts[0].remove();
    }

    window.toast = {
        success: (msg, opts) => createToast('success', msg, opts),
        error: (msg, opts) => createToast('error', msg, opts),
        warning: (msg, opts) => createToast('warning', msg, opts),
        info: (msg, opts) => createToast('info', msg, opts)
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // 0. Auth Check
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');
    
    if (isLoginPage) { window.location.href = 'auth.html#login'; return; }
    if (isRegisterPage) { window.location.href = '../auth-login/auth.html#register'; return; }

    if (!token && !isLoginPage && !isRegisterPage && !window.location.pathname.includes('auth.html')) {
        window.location.href = '../auth-login/auth.html#login';
        return;
    }

    // Update Header/Sidebar Info
    async function syncIdentity() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/v1/tenants/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const tenant = await response.json();
                
                // Update Side Nav Title & Logo
                const sideNavLogo = document.querySelector('nav img[alt="Store Logo"]');
                if (sideNavLogo && tenant.logoUrl) sideNavLogo.src = tenant.logoUrl;

                const sideNavName = document.querySelector('nav .flex.flex-col span.font-bold');
                if (sideNavName) sideNavName.innerText = tenant.name;

                const sideNavTenantId = document.querySelector('nav .flex.flex-col span.lowercase');
                if (sideNavTenantId) sideNavTenantId.innerText = `RUC: ${tenant.ruc || '---'}`;

                // Update Top Nav User info (optional but good)
                const userSpan = document.querySelector('header span.text-blue-900.dark\\:text-blue-400');
                if (userSpan) {
                    const fullName = localStorage.getItem('fullName') || 'Usuario';
                    userSpan.innerText = fullName;
                }

                localStorage.setItem('tenantName', tenant.name);
            }
        } catch (error) {
            console.error('Error syncing identity:', error);
        }
    }

    syncIdentity();

    // 1. Navigation Logic
    const navLinks = document.querySelectorAll('nav a, header button, header a');
    navLinks.forEach(link => {
        const text = (link.innerText || '').trim().toLowerCase();
        
        // Modules
        if (text.includes('dashboard')) link.href = '../dashboard/dashboard.html';
        if (text.includes('punto de venta') || text.includes('pos')) link.href = '../pos/pos.html';
        if (text.includes('inventario')) link.href = '../inventory/inventory.html';
        if (text.includes('clientes')) link.href = '../customers/customers.html';
        if (text.includes('reportes')) link.href = '../reports/reports.html';
        if (text.includes('configuración')) link.href = '../settings/settings.html';
        
        // Actions
        if (text.includes('cerrar sesión')) {
            link.href = '#';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../auth-login/login.html';
            });
        }
    });

    // 2. Global Button Handlers
    document.querySelectorAll('button').forEach(btn => {
        const text = btn.innerText.trim().toLowerCase();
        if (text.includes('nuevo pedido') || text.includes('nueva venta') || text.includes('agregar producto')) {
            btn.addEventListener('click', () => {
                // Redirect to POS for sales, or open modal (simulated) for products
                if (text.includes('venta') || text.includes('pedido')) {
                    window.location.href = '../pos/pos.html';
                }
            });
        }
    });

    // 3. Simple Search Simulation (if search input exists)
    const searchInput = document.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                toast.info('Buscando: ' + searchInput.value + '...');
            }
        });
    }

    console.log('FerreControl Global Interactivity Loaded');
});

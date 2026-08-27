document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth-login/login.html';
        return;
    }

    // State Management
    let cart = [];
    let products = [];
    let allProducts = []; // For filtering
    let currentCategory = "";
    let currentDocType = 'boleta';
    let currentPaymentMethod = null;
    let selectedCustomer = null;

    const posSearch = document.getElementById('pos-search');
    posSearch.addEventListener('input', applyFilters);

    function applyFilters() {
        const searchTerm = posSearch.value.toLowerCase().trim();
        
        const filtered = allProducts.filter(p => {
            const productName = (p.name || "").toLowerCase();
            const productSku = (p.sku || "").toLowerCase();
            const productCategory = p.category || "General";

            const matchesSearch = productName.includes(searchTerm) || productSku.includes(searchTerm);
            const matchesCategory = currentCategory === "" || productCategory === currentCategory;
            return matchesSearch && matchesCategory;
        });

        renderProducts(filtered);
    }

    // Category Buttons Logic
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-white');
                b.classList.add('bg-surface-container-lowest', 'text-on-surface');
            });
            btn.classList.add('active', 'bg-primary', 'text-white');
            btn.classList.remove('bg-surface-container-lowest', 'text-on-surface');
            
            currentCategory = btn.dataset.category;
            applyFilters();
        });
    });

    loadProducts();
    let tenant = null;

    async function fetchTenantData() {
        try {
            const response = await fetch('/api/v1/tenants/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                tenant = await response.json();
            }
        } catch (error) {
            console.error('Error fetching tenant:', error);
        }
    }
    fetchTenantData();

    // UI Elements
    const productGrid = document.getElementById('productGrid');
    const cartItemsEl = document.getElementById('cartItems');
    const emptyCartEl = document.getElementById('emptyCart');
    const subtotalEl = document.getElementById('subtotal');
    const igvEl = document.getElementById('igv');
    const totalEl = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutText = document.getElementById('checkoutText');
    
    const customerInput = document.getElementById('customerIdentifier');
    const searchCustomerBtn = document.getElementById('searchCustomerBtn');
    const customerDisplay = document.getElementById('customerNameDisplay');
    const customerNameSpan = document.getElementById('selectedCustomerName');
    const clearCustomerBtn = document.getElementById('clearCustomerBtn');

    // Customer Logic
    searchCustomerBtn.addEventListener('click', async () => {
        const docNum = customerInput.value;
        if (!docNum) return;

        searchCustomerBtn.disabled = true;
        searchCustomerBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span>';

        try {
            // Paso 1: Buscar localmente en nuestra tabla de clientes (Costo 0)
            const localResponse = await fetch(`/api/v1/customers/search/${docNum}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (localResponse.ok) {
                selectedCustomer = await localResponse.json();
                updateCustomerDisplay(selectedCustomer.name);
                toast.success('Cliente seleccionado.');
            } else {
                // Paso 2: No existe local, abrir modal premium de confirmación
                openCustomerConfirmModal(docNum);
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Error al buscar cliente.');
        } finally {
            searchCustomerBtn.disabled = false;
            searchCustomerBtn.innerHTML = '<span class="material-symbols-outlined text-sm">search</span>';
        }
    });

    // ========================================
    // Customer Confirmation Modal Logic
    // ========================================
    function openCustomerConfirmModal(docNum) {
        const modal = document.getElementById('customerConfirmModal');
        const content = document.getElementById('customerConfirmContent');
        const docDisplay = document.getElementById('confirmDocDisplay');
        
        docDisplay.textContent = docNum;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Trigger animation
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Buttons
        const confirmBtn = document.getElementById('btnConfirmExternal');
        const cancelBtn = document.getElementById('btnCancelExternal');

        const handleConfirm = async () => {
            closeCustomerConfirmModal();
            await registerCustomerExternally(docNum);
        };

        const handleCancel = () => {
            closeCustomerConfirmModal();
        };

        confirmBtn.onclick = handleConfirm;
        cancelBtn.onclick = handleCancel;
    }

    function closeCustomerConfirmModal() {
        const modal = document.getElementById('customerConfirmModal');
        const content = document.getElementById('customerConfirmContent');
        
        content.classList.add('scale-95', 'opacity-0');
        content.classList.remove('scale-100', 'opacity-100');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }

    async function registerCustomerExternally(docNum) {
        const type = docNum.length === 11 ? 'RUC' : 'DNI';
        const endpoint = type === 'RUC' ? `ruc/${docNum}` : `dni/${docNum}`;
        
        toast.info('Consultando servicio externo...');
        
        try {
            const extResponse = await fetch(`/api/v1/consultas/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (extResponse.ok) {
                const extData = await extResponse.json();
                if (extData.success && extData.result) {
                    // Mapear datos según el tipo
                    const newCustomer = {
                        documentType: type,
                        documentNumber: docNum,
                        name: type === 'RUC' ? extData.result.razon_social : extData.result.full_name,
                        address: type === 'RUC' ? extData.result.direccion : extData.result.address || '',
                        email: '',
                        phone: ''
                    };

                    // Registrar en nuestra DB automáticamente
                    const saveResponse = await fetch('/api/v1/customers', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newCustomer)
                    });

                    if (saveResponse.ok) {
                        selectedCustomer = await saveResponse.json();
                        updateCustomerDisplay(selectedCustomer.name);
                        toast.success('Cliente registrado y seleccionado con éxito.');
                    } else {
                        toast.error('Error al guardar el cliente en la base de datos local.');
                    }
                } else {
                    toast.warning('No se encontró información externa para este documento.');
                }
            } else {
                toast.error('Error en el servicio de consulta externa.');
            }
        } catch (error) {
            console.error('External register error:', error);
            toast.error('Error de conexión con el servicio externo.');
        }
    }

    function updateCustomerDisplay(name) {
        customerNameSpan.innerText = name;
        customerDisplay.classList.remove('hidden');
        customerInput.classList.add('hidden');
    }

    clearCustomerBtn.addEventListener('click', () => {
        selectedCustomer = null;
        customerDisplay.classList.add('hidden');
        customerInput.classList.remove('hidden');
        customerInput.value = '';
        customerInput.focus();
    });

    // Fetch Products from Backend
    async function loadProducts() {
        try {
            const response = await fetch('/api/v1/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                allProducts = await response.json();
                applyFilters();
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    function renderProducts(productList) {
        productGrid.innerHTML = productList.map(product => `
            <div class="product-card bg-surface-container-lowest border border-outline-variant rounded p-2 flex flex-col gap-2 hover:border-primary transition-colors cursor-pointer group" 
                 onclick="window.addToCart('${product.id}', '${product.name}', ${product.price}, ${product.stock})">
                <div class="h-24 bg-surface-container rounded overflow-hidden relative">
                    <div class="w-full h-full bg-surface-container-low flex items-center justify-center">
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/400x300?text=Error+Imagen'">` : 
                            `<span class="material-symbols-outlined text-outline-variant text-4xl">hardware</span>`
                        }
                    </div>
                    <span class="absolute top-1 right-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded font-label-caps text-label-caps text-on-surface border border-outline-variant">SKU: ${product.sku}</span>
                </div>
                <div class="flex flex-col flex-1">
                    <h3 class="font-table-data text-table-data text-on-surface line-clamp-2 leading-tight">${product.name}</h3>
                    <div class="mt-auto pt-2 flex justify-between items-end">
                        <div>
                            <span class="block font-label-caps text-label-caps ${product.stock < 10 ? 'text-error' : 'text-secondary-container'}">Stock: ${product.stock}</span>
                            <span class="font-h3 text-h3 text-primary-container">S/ ${product.price.toFixed(2)}</span>
                        </div>
                        <button class="add-to-cart-btn w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                            <span class="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Cart Logic
    window.addToCart = (id, name, price, stock) => {
        const existing = cart.find(item => item.id === id);
        if (existing) {
            if (existing.quantity < stock) {
                existing.quantity++;
            } else {
                toast.warning('No hay más stock disponible para este producto.');
            }
        } else {
            if (stock > 0) {
                cart.push({ id, name, price, quantity: 1, stock });
            } else {
                toast.error('Este producto está agotado.');
            }
        }
        renderCart();
    };

    window.removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        renderCart();
    };

    window.updateQuantity = (id, qty) => {
        const item = cart.find(item => item.id === id);
        if (item) {
            const newQty = Math.max(1, parseInt(qty) || 1);
            if (newQty <= item.stock) {
                item.quantity = newQty;
            } else {
                toast.warning('Stock insuficiente para la cantidad solicitada.');
                item.quantity = item.stock;
            }
            renderCart();
        }
    };

    function renderCart() {
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '';
            emptyCartEl.classList.remove('hidden');
            checkoutBtn.disabled = true;
        } else {
            emptyCartEl.classList.add('hidden');
            checkoutBtn.disabled = false;
            cartItemsEl.innerHTML = cart.map(item => `
                <tr class="border-b border-outline-variant/50 hover:bg-surface-container-low/50 group h-table-row-height">
                    <td class="px-3 align-middle">
                        <input class="w-12 px-1 py-0.5 border border-outline-variant rounded text-center font-table-data focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-surface-container-lowest" 
                               type="number" value="${item.quantity}" onchange="window.updateQuantity('${item.id}', this.value)">
                    </td>
                    <td class="px-3 align-middle truncate max-w-[150px]">${item.name}</td>
                    <td class="px-3 align-middle text-right">S/ ${(item.price * item.quantity).toFixed(2)}</td>
                    <td class="px-2 align-middle text-center">
                        <button onclick="window.removeFromCart('${item.id}')" class="text-outline hover:text-error transition-opacity">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        updateTotals();
    }

    function updateTotals() {
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        // En Perú el IGV está incluido en el precio de venta usualmente, 
        // pero aquí lo calcularemos como extra para el resumen.
        const igv = subtotal * 0.18;
        const total = subtotal; // Suponiendo precio incluye IGV

        subtotalEl.textContent = `S/ ${(subtotal / 1.18).toFixed(2)}`;
        igvEl.textContent = `S/ ${(subtotal - (subtotal / 1.18)).toFixed(2)}`;
        totalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    }

    // Payment & Checkout
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('border-primary', 'bg-surface-container-low', 'ring-2'));
            btn.classList.add('border-primary', 'bg-surface-container-low', 'ring-2');
            currentPaymentMethod = btn.dataset.method;
        });
    });

    document.querySelectorAll('.doc-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.doc-type-btn').forEach(b => b.classList.remove('bg-surface-container-lowest', 'shadow-sm', 'text-primary-container', 'border'));
            btn.classList.add('bg-surface-container-lowest', 'shadow-sm', 'text-primary-container', 'border');
            currentDocType = btn.dataset.type;
        });
    });

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            toast.info('Añada productos al carrito antes de emitir.');
            return;
        }
        if (!currentPaymentMethod) {
            toast.info('Seleccione un método de pago primero.');
            return;
        }
        window.openPreviewModal();
    });

    // ========================================
    // Preview Modal Logic
    // ========================================
    let previewCart = []; // Temporary state for the modal
    let previewDocType = 'boleta';
    let previewPaymentMethod = null;

    window.openPreviewModal = () => {
        const modal = document.getElementById('previewModal');
        previewCart = cart.map(item => ({ ...item })); // Deep copy
        previewDocType = currentDocType;
        previewPaymentMethod = currentPaymentMethod;

        // Date & Time
        const now = new Date();
        document.getElementById('preview-date').textContent = `Fecha: ${now.toLocaleDateString('es-PE')}`;
        document.getElementById('preview-time').textContent = `Hora: ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;

        // Document Number
        updatePreviewDocType(previewDocType);

        // Customer
        const customerSection = document.getElementById('preview-customer-section');
        if (selectedCustomer) {
            customerSection.classList.remove('hidden');
            document.getElementById('preview-customer-name').textContent = selectedCustomer.name;
            document.getElementById('preview-customer-doc').textContent = `Doc: ${selectedCustomer.documentNumber || customerInput.value || '---'}`;
        } else {
            customerSection.classList.remove('hidden');
            document.getElementById('preview-customer-name').textContent = 'Cliente General';
            document.getElementById('preview-customer-doc').textContent = '';
        }

        // Payment method
        updatePreviewPayment(previewPaymentMethod);

        // Render items & totals
        renderPreviewItems();
        updatePreviewTotals();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closePreviewModal = () => {
        const modal = document.getElementById('previewModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    function updatePreviewDocType(type) {
        previewDocType = type;
        
        let prefix = 'B001';
        let lastNum = 0;

        if (tenant) {
            if (type === 'boleta') {
                prefix = tenant.boletaSeries || 'B001';
                lastNum = tenant.lastBoletaNumber || 0;
            } else {
                prefix = tenant.invoiceSeries || 'F001';
                lastNum = tenant.lastInvoiceNumber || 0;
            }
        } else {
            prefix = type === 'boleta' ? 'B001' : 'F001';
        }

        // Simular siguiente número (esto lo hace el backend de forma segura, pero para el preview sumamos 1)
        const nextNum = String(lastNum + 1).padStart(8, '0');
        document.getElementById('preview-doc-number').textContent = `${prefix}-${nextNum}`;

        document.querySelectorAll('.preview-doc-btn').forEach(btn => {
            btn.classList.toggle('active-doc', btn.dataset.type === type);
        });
    }

    function updatePreviewPayment(method) {
        previewPaymentMethod = method;
        document.querySelectorAll('.preview-pay-btn').forEach(btn => {
            btn.classList.toggle('active-pay', btn.dataset.method === method);
        });
    }

    // Doc type buttons in modal
    document.querySelectorAll('.preview-doc-btn').forEach(btn => {
        btn.addEventListener('click', () => updatePreviewDocType(btn.dataset.type));
    });

    // Payment buttons in modal
    document.querySelectorAll('.preview-pay-btn').forEach(btn => {
        btn.addEventListener('click', () => updatePreviewPayment(btn.dataset.method));
    });

    function renderPreviewItems() {
        const container = document.getElementById('preview-items');
        if (previewCart.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-[12px] py-4">No hay productos</p>`;
            return;
        }
        container.innerHTML = previewCart.map((item, idx) => `
            <div class="group grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center px-1 py-1.5 rounded hover:bg-slate-50 transition-colors relative">
                <input type="number" min="1" max="${item.stock}" value="${item.quantity}" 
                    class="w-10 text-center border border-slate-200 rounded text-[12px] py-0.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white font-mono font-bold"
                    onchange="window.updatePreviewQty(${idx}, this.value)">
                <span class="text-[12px] text-on-surface truncate pr-2">${item.name}</span>
                <span class="text-[11px] text-slate-400 font-mono text-right">S/${item.price.toFixed(2)}</span>
                <div class="flex items-center gap-1">
                    <span class="text-[12px] font-bold text-on-surface font-mono text-right min-w-[60px]">S/ ${(item.price * item.quantity).toFixed(2)}</span>
                    <button onclick="window.removePreviewItem(${idx})" 
                        class="text-slate-300 hover:text-error transition-colors ml-1 opacity-0 group-hover:opacity-100">
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.updatePreviewQty = (idx, val) => {
        const qty = Math.max(1, parseInt(val) || 1);
        if (qty > previewCart[idx].stock) {
            toast.warning('Stock insuficiente.');
            previewCart[idx].quantity = previewCart[idx].stock;
        } else {
            previewCart[idx].quantity = qty;
        }
        renderPreviewItems();
        updatePreviewTotals();
    };

    window.removePreviewItem = (idx) => {
        previewCart.splice(idx, 1);
        renderPreviewItems();
        updatePreviewTotals();
        if (previewCart.length === 0) {
            document.getElementById('confirmEmitBtn').disabled = true;
        }
    };

    function updatePreviewTotals() {
        const total = previewCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const baseImponible = total / 1.18;
        const igv = total - baseImponible;

        document.getElementById('preview-subtotal').textContent = `S/ ${baseImponible.toFixed(2)}`;
        document.getElementById('preview-igv').textContent = `S/ ${igv.toFixed(2)}`;
        document.getElementById('preview-total').textContent = `S/ ${total.toFixed(2)}`;

        const confirmBtn = document.getElementById('confirmEmitBtn');
        confirmBtn.disabled = previewCart.length === 0;
    }

    // Confirm & Emit
    document.getElementById('confirmEmitBtn').addEventListener('click', async () => {
        if (previewCart.length === 0) return;
        if (!previewPaymentMethod) {
            toast.info('Seleccione un método de pago en la vista previa.');
            return;
        }

        const confirmBtn = document.getElementById('confirmEmitBtn');
        const confirmText = document.getElementById('confirmEmitText');
        confirmBtn.disabled = true;
        confirmText.textContent = 'Procesando...';

        const saleData = {
            paymentMethod: previewPaymentMethod,
            documentType: previewDocType,
            customerId: selectedCustomer ? selectedCustomer.id : null,
            items: previewCart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            }))
        };

        try {
            const response = await fetch('/api/v1/sales', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            if (response.ok) {
                const sale = await response.json();
                window.closePreviewModal();
                
                // Sync cart with preview changes
                cart = [];
                renderCart();
                loadProducts(); // Refresh stock

                // Success notification
                toast.success(`Comprobante ${sale.invoiceNumber} emitido por S/ ${sale.totalAmount.toFixed(2)}`, { title: '¡Venta Finalizada!', duration: 6000 });
            } else {
                const error = await response.json();
                toast.error('Error al procesar venta: ' + (error.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Error de conexión con el servidor.');
        } finally {
            confirmBtn.disabled = false;
            confirmText.textContent = 'Confirmar y Emitir';
        }
    });

    // Close modal on backdrop click
    document.getElementById('previewBackdrop').addEventListener('click', () => {
        window.closePreviewModal();
    });

    loadProducts();
});


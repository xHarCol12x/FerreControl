// State
let allProducts = [];
let isEditing = false;
let searchInput, categoryFilter;
let token;

document.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '../auth-login/login.html';
        return;
    }

    fetchProducts(token);

    // UI Elements
    const modal = document.getElementById('add-product-modal');
    const modalTitle = modal.querySelector('h3');
    const addBtn = document.getElementById('add-product-btn');
    const form = document.getElementById('add-product-form');

    searchInput = document.getElementById('inventory-search');
    categoryFilter = document.getElementById('category-filter');

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);

    // Check for action=add in URL to auto-open modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        setTimeout(() => {
            isEditing = false;
            modalTitle.innerText = 'Nuevo Producto';
            form.reset();
            document.getElementById('p-category').value = 'Construcción';
            document.getElementById('p-id').value = '';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }, 500); // Small delay to ensure everything is loaded
    }

    addBtn.addEventListener('click', () => {
        isEditing = false;
        modalTitle.innerText = 'Nuevo Producto';
        form.reset();
        document.getElementById('p-category').value = 'Construcción';
        document.getElementById('scrape-url').value = '';
        document.getElementById('p-id').value = '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    const scrapeBtn = document.getElementById('scrape-btn');
    scrapeBtn.addEventListener('click', async () => {
        const url = document.getElementById('scrape-url').value;
        if (!url) {
            toast.info('Por favor ingrese una URL válida.');
            return;
        }

        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = `<span class="material-symbols-outlined text-[14px] animate-spin">sync</span> Procesando...`;

        try {
            const response = await fetch('/api/v1/products/scrape', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.name) document.getElementById('p-name').value = data.name;
                if (data.price) document.getElementById('p-price').value = data.price;
                if (data.imageUrl) document.getElementById('p-image').value = data.imageUrl;
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.message || 'No se pudo obtener la información de esta URL. Verifique el enlace.');
            }
        } catch (error) {
            console.error('Scrape error:', error);
            toast.error('Error de conexión con el servidor al intentar extraer datos.');
        } finally {
            scrapeBtn.disabled = false;
            scrapeBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">auto_fix_high</span> Auto-llenar`;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';

        const productId = document.getElementById('p-id').value;
        const productData = {
            sku: document.getElementById('p-sku').value,
            name: document.getElementById('p-name').value,
            category: document.getElementById('p-category').value,
            price: parseFloat(document.getElementById('p-price').value),
            stock: parseInt(document.getElementById('p-stock').value),
            imageUrl: document.getElementById('p-image').value
        };

        const url = isEditing ? `/api/v1/products/${productId}` : '/api/v1/products';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                closeModal();
                form.reset();
                fetchProducts(token);
            } else {
                const error = await response.json();
                toast.error(error.message || 'No se pudo guardar el producto.');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error de conexión con el servidor.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Guardar Producto';
        }
    });

    // Handle global clicks for edit/delete
    window.editProduct = (productJson) => {
        const product = JSON.parse(decodeURIComponent(productJson));
        isEditing = true;
        modalTitle.innerText = 'Editar Producto';
        
        document.getElementById('p-id').value = product.id;
        document.getElementById('p-sku').value = product.sku;
        document.getElementById('p-name').value = product.name;
        document.getElementById('p-category').value = product.category || 'Construcción';
        document.getElementById('p-price').value = product.price;
        document.getElementById('p-stock').value = product.stock;
        document.getElementById('p-image').value = product.imageUrl || '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.deleteProduct = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            const response = await fetch(`/api/v1/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchProducts(token);
            } else {
                toast.error('No se pudo eliminar el producto.');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    // Kardex Sidebar Logic
    const sidebar = document.querySelector('aside');
    const closeKardexBtn = document.getElementById('close-kardex');
    const addStockBtn = document.getElementById('add-stock-btn');

    if (closeKardexBtn) {
        closeKardexBtn.addEventListener('click', () => {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('xl:flex');
        });
    }

    if (addStockBtn) {
        addStockBtn.addEventListener('click', () => {
            const productId = document.getElementById('stock-p-id').value;
            if (!productId) {
                toast.info('Seleccione un producto primero.');
                return;
            }
            window.openStockModal();
        });
    }

    const stockForm = document.getElementById('stock-entry-form');
    if (stockForm) {
        stockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('stock-p-id').value;
            const quantity = parseInt(document.getElementById('stock-qty').value);
            const reference = document.getElementById('stock-ref').value;

            const submitBtn = stockForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            try {
                const response = await fetch(`/api/v1/products/${productId}/stock`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ quantity, type: 'ENTRY', reference })
                });

                if (response.ok) {
                    window.closeStockModal();
                    stockForm.reset();
                    const updatedProduct = await response.json();
                    
                    // Update the product in allProducts to keep filters consistent
                    const idx = allProducts.findIndex(p => p.id === updatedProduct.id);
                    if (idx !== -1) allProducts[idx] = updatedProduct;
                    
                    renderProducts(allProducts); // Refresh table
                    window.updateKardexSidebar(encodeURIComponent(JSON.stringify(updatedProduct))); // Refresh sidebar
                } else {
                    toast.error('Error al registrar ingreso.');
                }
            } catch (error) {
                console.error('Stock entry error:', error);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
});

function applyFilters() {
    if (!searchInput || !categoryFilter) return;
    const searchTerm = searchInput.value.toLowerCase().trim();
    const categoryTerm = categoryFilter.value;

    const filtered = allProducts.filter(p => {
        const productName = (p.name || "").toLowerCase();
        const productSku = (p.sku || "").toLowerCase();
        const productCategory = p.category || "General";
        
        const matchesSearch = productName.includes(searchTerm) || productSku.includes(searchTerm);
        const matchesCategory = categoryTerm === "" || productCategory === categoryTerm;
        
        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

function closeModal() {
    const modal = document.getElementById('add-product-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function fetchProducts(authToken) {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '<tr><td colspan="8" class="px-3 py-4 text-center text-outline">Cargando inventario...</td></tr>';

    try {
        const response = await fetch('/api/v1/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '../auth-login/login.html';
                return;
            }
            throw new Error('Error al cargar los productos');
        }

        const products = await response.json();
        allProducts = products; // Store for filtering
        renderProducts(products);
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="8" class="px-3 py-4 text-center text-error font-bold">Error de conexión con el servidor.</td></tr>`;
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-3 py-4 text-center text-outline">El inventario está vacío o no hay resultados para el filtro.</td></tr>';
        return;
    }

    products.forEach(product => {
        let stockBadge = '';
        let stockClass = '';
        
        if (product.stock <= 0) {
            stockBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-error-container text-on-error-container font-label-caps text-[10px] uppercase border border-error/20">Agotado</span>`;
            stockClass = 'text-error font-bold';
        } else if (product.stock <= 20) {
            stockBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-[10px] uppercase border border-secondary/20">Bajo Stock</span>`;
            stockClass = 'text-error font-bold';
        } else {
            stockBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-container-high text-primary font-label-caps text-[10px] uppercase border border-primary/20">En Stock</span>`;
            stockClass = '';
        }

        const productJson = encodeURIComponent(JSON.stringify(product));
        const tr = document.createElement('tr');
        tr.className = 'h-table-row-height bg-surface-container-lowest border-b border-outline-variant/50 cursor-pointer hover:bg-surface-container transition-colors group';
        tr.onclick = () => window.updateKardexSidebar(productJson);
        
        tr.innerHTML = `
            <td class="px-3 font-mono text-[12px] text-primary">${product.sku}</td>
            <td class="px-3 font-medium text-on-background flex items-center gap-2">
                ${product.imageUrl ? `<img src="${product.imageUrl}" class="w-6 h-6 rounded object-cover border border-outline-variant">` : `<span class="material-symbols-outlined text-[18px] text-outline">image_not_supported</span>`}
                <span class="truncate max-w-[200px]" title="${product.name}">${product.name}</span>
            </td>
            <td class="px-3 text-on-surface-variant">${product.category || 'General'}</td>
            <td class="px-3 text-right ${stockClass}">${product.stock}</td>
            <td class="px-3 text-outline">und</td>
            <td class="px-3 text-right font-medium">S/ ${product.price.toFixed(2)}</td>
            <td class="px-3">${stockBadge}</td>
            <td class="px-3 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="event.stopPropagation(); window.showProductDetail('${productJson}')" class="p-1 text-outline hover:text-secondary transition-colors" title="Ver Detalles">
                        <span class="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button onclick="event.stopPropagation(); window.editProduct('${productJson}')" class="p-1 text-outline hover:text-primary transition-colors" title="Editar">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="event.stopPropagation(); window.deleteProduct('${product.id}')" class="p-1 text-outline hover:text-error transition-colors" title="Eliminar">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Auto-select first product for Kardex if none selected or on load
    if (products.length > 0) {
        const firstProductJson = encodeURIComponent(JSON.stringify(products[0]));
        window.updateKardexSidebar(firstProductJson);
    }
}

window.updateKardexSidebar = (productJson) => {
    const product = JSON.parse(decodeURIComponent(productJson));
    
    // Ensure sidebar is visible
    const sidebar = document.querySelector('aside');
    sidebar.classList.remove('hidden');
    sidebar.classList.add('xl:flex');

    // Update Kardex Sidebar
    document.getElementById('kardex-sku').innerText = product.sku;
    document.getElementById('kardex-name').innerText = product.name;
    document.getElementById('kardex-stock').innerText = product.stock;
    document.getElementById('kardex-price').innerText = `S/ ${product.price.toFixed(2)}`;
    
    // Set product ID for stock entry
    document.getElementById('stock-p-id').value = product.id;
    
    fetchKardex(product.id);
};

window.showProductDetail = (productJson) => {
    const product = JSON.parse(decodeURIComponent(productJson));
    const modal = document.getElementById('product-detail-modal');
    
    // Update Detail Modal
    document.getElementById('detail-p-image').src = product.imageUrl || 'https://via.placeholder.com/400x400?text=Sin+Imagen';
    document.getElementById('detail-p-name').innerText = product.name;
    document.getElementById('detail-p-category').innerText = product.category || 'General';
    document.getElementById('detail-p-sku').innerText = `SKU: ${product.sku}`;
    document.getElementById('detail-p-price').innerText = `S/ ${product.price.toFixed(2)}`;
    document.getElementById('detail-p-stock').innerText = product.stock;
    
    const editBtn = document.getElementById('edit-from-detail');
    editBtn.onclick = () => {
        window.closeDetailModal();
        window.editProduct(productJson);
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

async function fetchKardex(productId) {
    const timeline = document.getElementById('kardex-timeline');
    timeline.innerHTML = '<li class="px-4 py-8 text-center text-xs text-slate-400">Cargando movimientos...</li>';

    try {
        const response = await fetch(`/api/v1/products/${productId}/kardex`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const movements = await response.json();
            renderKardex(movements);
        } else {
            timeline.innerHTML = '<li class="px-4 py-8 text-center text-xs text-error">Error al cargar historial.</li>';
        }
    } catch (error) {
        console.error('Kardex fetch error:', error);
        timeline.innerHTML = '<li class="px-4 py-8 text-center text-xs text-error">Error de conexión.</li>';
    }
}

function renderKardex(movements) {
    const timeline = document.getElementById('kardex-timeline');
    timeline.innerHTML = '';

    if (movements.length === 0) {
        timeline.innerHTML = '<li class="px-4 py-8 text-center text-xs text-slate-400">Sin movimientos registrados.</li>';
        return;
    }

    // Limit to only the first 4 movements
    const displayMovements = movements.slice(0, 4);

    displayMovements.forEach(m => {
        const date = new Date(m.createdAt);
        const isExit = m.type === 'EXIT';
        const iconClass = isExit ? 'bg-error' : 'bg-primary';
        const qtyPrefix = isExit ? '-' : '+';
        const qtyClass = isExit ? 'text-error' : 'text-primary';

        const li = document.createElement('li');
        li.className = 'relative pl-8 pb-4';
        li.innerHTML = `
            <div class="absolute left-2.5 top-1.5 w-2 h-2 rounded-full ${iconClass} border border-surface-container-lowest z-10"></div>
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-table-data text-[12px] text-on-surface leading-tight">${m.reference || 'Ajuste manual'}</p>
                    <p class="font-body-sm text-[10px] text-on-surface-variant">${date.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div class="text-right">
                    <span class="font-table-data text-[12px] ${qtyClass} font-bold">${qtyPrefix}${m.quantity}</span>
                    <p class="text-[9px] text-slate-400">Saldo: ${m.balanceAfter}</p>
                </div>
            </div>
        `;
        timeline.appendChild(li);
    });
}

window.closeDetailModal = () => {
    const modal = document.getElementById('product-detail-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.openStockModal = () => {
    const modal = document.getElementById('stock-entry-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeStockModal = () => {
    const modal = document.getElementById('stock-entry-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

let cart = [];

// Inputs
const inputs = {
    name: document.getElementById('clientName'),
    dni: document.getElementById('clientDni'),
    phone: document.getElementById('clientPhone'),
    concept: document.getElementById('saleConcept'),
    type: document.getElementById('saleType'),
    code: document.getElementById('prodCode'),
    price: document.getElementById('prodPrice')
};

function addToCart() {
    const code = inputs.code.value.trim();
    const price = parseFloat(inputs.price.value);

    if (!code || !price) return alert('Ingrese código y precio');

    cart.push({ code, price });
    inputs.code.value = '';
    inputs.price.value = '';
    inputs.code.focus();
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cartList');
    if (cart.length === 0) {
        list.innerHTML = '<div style="padding:1rem; text-align:center; color:#666">Carrito vacío</div>';
        document.getElementById('displayTotal').innerText = '0.00 €';
        return;
    }

    list.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        list.innerHTML += `
                    <div class="cart-item">
                        <span>${item.code}</span>
                        <div>
                            <span style="margin-right:1rem;">${item.price.toFixed(2)} €</span>
                            <span style="color:#ef4444; cursor:pointer;" onclick="removeItem(${index})">x</span>
                        </div>
                    </div>
                `;
    });
    document.getElementById('displayTotal').innerText = total.toFixed(2) + ' €';
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function generateReceiptId() {
    return 'C1' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function showReceiptModal() {
    if (cart.length === 0) return alert('Agregue productos primero');

    // Fill Data
    const now = new Date();
    const dateStr = now.getDate() + ' ene ' + now.getFullYear() + ' ' +
        now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    document.getElementById('rDate').innerText = dateStr;
    document.getElementById('rId').innerText = generateReceiptId();

    document.getElementById('rClient').innerText = inputs.name.value || 'Generico';
    document.getElementById('rDni').innerText = inputs.dni.value || '-';
    document.getElementById('rPhone').innerText = inputs.phone.value || '-';
    document.getElementById('rConcept').innerText = inputs.concept.value || '-';
    document.getElementById('rType').innerText = inputs.type.value;

    const itemsContainer = document.getElementById('rItemsList');
    itemsContainer.innerHTML = '';

    if (cart.length > 0) {
        itemsContainer.innerHTML += '<div class="r-divider"></div><div style="font-weight:bold; margin-bottom:0.5rem; font-size:0.9rem;">DETALLES PRODUCTOS</div>';
        cart.forEach(item => {
            itemsContainer.innerHTML += `
                        <div class="r-row">
                            <span class="r-label" style="color:#222;">${item.code}</span>
                            <span class="r-value">${item.price.toFixed(2)} €</span>
                        </div>
                     `;
        });
    }

    let total = cart.reduce((acc, item) => acc + item.price, 0);
    document.getElementById('rTotal').innerText = total.toFixed(2).replace('.', ',') + ' €';

    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function sendEmail() {
    const subject = "Recibo de Venta - " + document.getElementById('rId').innerText;
    const total = document.getElementById('rTotal').innerText;
    const body = `Hola ${inputs.name.value},\n\nAdjuntamos el resumen de su recibo:\n\nConcepto: ${inputs.concept.value}\nTotal: ${total}\n\nGracias por su confianza.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Close modal on click outside
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});
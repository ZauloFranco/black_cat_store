const API_URL = 'https://fakestoreapi.com';

// Referencias a los contenedores y controles definidos en index.html.
const productGrid = document.querySelector('#productGrid');
const featuredGrid = document.querySelector('#featuredGrid');
const recommendationList = document.querySelector('#recommendationList');
const catalogCount = document.querySelector('#catalogCount');
const searchInput = document.querySelector('#productSearch');
const productModalElement = document.querySelector('#productModal');
const productModal = bootstrap.Modal.getOrCreateInstance(productModalElement);
const productModalTitle = document.querySelector('#productModalTitle');
const productModalBody = document.querySelector('#productModalBody');

let products = [];

// Crea elementos de forma segura usando textContent para el texto visible.
// La usan createProductCard, renderCatalog, renderRecommendations, showCatalogError,
// loadProducts, renderProductDetails y openProductDetails.
function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

// Construye una tarjeta reutilizable para el catálogo o los destacados.
// La llaman renderCatalog y renderFeatured; sus botones abren openProductDetails
// mediante el listener delegado de clics del documento.
function createProductCard(product, compact = false) {
    const button = createElement(
        'button',
        compact ? 'product-card compact-product-card' : 'product-card'
    );
    button.type = 'button';
    button.dataset.productId = product.id;
    button.setAttribute('aria-label', `Ver detalles de ${product.title}`);

    const image = createElement('img', 'product-image');
    image.src = product.image;
    image.alt = product.title;
    image.loading = 'lazy';
    image.onerror = () => {
        image.classList.add('image-unavailable');
        image.removeAttribute('src');
        image.alt = 'Imagen no disponible';
    };

    const details = createElement('span', 'product-card-details');
    const category = createElement('span', 'product-category', product.category);
    const title = createElement('span', 'product-title', product.title);
    const price = createElement('span', 'product-price', `$${Number(product.price).toFixed(2)}`);

    details.append(category, title, price);
    button.append(image, details);
    return button;
}

// Filtra y dibuja los productos según el campo de búsqueda.
// Se ejecuta al cargar productos desde loadProducts y al escribir en productSearch.
// Cada tarjeta creada usa createProductCard.
function renderCatalog() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const visibleProducts = products.filter((product) =>
        `${product.title} ${product.category}`.toLocaleLowerCase().includes(query)
    );

    productGrid.replaceChildren();
    catalogCount.textContent = `${visibleProducts.length} productos`;

    if (visibleProducts.length === 0) {
        productGrid.append(createElement('p', 'catalog-status', 'No encontramos productos con esa búsqueda.'));
        return;
    }

    const fragment = document.createDocumentFragment();
    visibleProducts.forEach((product) => fragment.append(createProductCard(product)));
    productGrid.append(fragment);
}

// Dibuja los cuatro productos con mejor puntuación.
// La llama loadProducts después de recibir el catálogo; createProductCard genera
// las tarjetas compactas que abren los mismos detalles que las del catálogo.
function renderFeatured() {
    featuredGrid.replaceChildren();
    const featuredProducts = [...products]
        .sort((first, second) => (second.rating?.rate ?? 0) - (first.rating?.rate ?? 0))
        .slice(0, 4);
    const fragment = document.createDocumentFragment();

    featuredProducts.forEach((product) => fragment.append(createProductCard(product, true)));
    featuredGrid.append(fragment);
}

// Dibuja en la barra lateral los cuatro productos mejor valorados.
// La llama loadProducts; sus botones comparten el listener delegado que llama
// openProductDetails, igual que las tarjetas del catálogo y los destacados.
function renderRecommendations() {
    recommendationList.replaceChildren();
    const recommendedProducts = [...products]
        .sort((first, second) => (second.rating?.rate ?? 0) - (first.rating?.rate ?? 0))
        .slice(0, 4);
    const fragment = document.createDocumentFragment();

    recommendedProducts.forEach((product) => {
        const button = createElement('button', 'recommendation-item');
        button.type = 'button';
        button.dataset.productId = product.id;
        button.setAttribute('aria-label', `Ver detalles de ${product.title}`);

        const image = createElement('img', 'recommendation-image');
        image.src = product.image;
        image.alt = '';
        image.loading = 'lazy';
        image.onerror = () => {
            image.classList.add('image-unavailable');
            image.removeAttribute('src');
        };

        const title = createElement('span', 'recommendation-title', product.title);
        button.append(image, title);
        fragment.append(button);
    });

    recommendationList.append(fragment);
}

// Muestra el estado de error y permite volver a solicitar el catálogo.
// La llama loadProducts si falla la API o la validación; el botón de reintento
// vuelve a ejecutar loadProducts.
function showCatalogError() {
    productGrid.replaceChildren();
    featuredGrid.replaceChildren();
    recommendationList.replaceChildren();

    const errorMessage = 'No fue posible cargar los productos. Revisa tu conexión e inténtalo de nuevo.';
    productGrid.append(createElement('p', 'catalog-status catalog-error', errorMessage));
    featuredGrid.append(createElement('p', 'catalog-status catalog-error', errorMessage));
    recommendationList.append(createElement('p', 'sidebar-status catalog-error', 'No se pudieron cargar las recomendaciones.'));

    const retryButton = createElement('button', 'btn btn-outline-light retry-button', 'Reintentar');
    retryButton.type = 'button';
    retryButton.addEventListener('click', loadProducts, { once: true });
    productGrid.append(retryButton);
}

// Consulta Get all products, valida la respuesta y actualiza las tres vistas.
// Se ejecuta al iniciar el archivo y también al pulsar Reintentar.
// En éxito llama renderCatalog, renderFeatured y renderRecommendations;
// en error llama showCatalogError.
async function loadProducts() {
    productGrid.replaceChildren(createElement('p', 'catalog-status', 'Cargando productos...'));
    featuredGrid.replaceChildren(createElement('p', 'catalog-status', 'Preparando recomendaciones...'));
    recommendationList.replaceChildren(createElement('p', 'sidebar-status', 'Cargando...'));

    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
            throw new Error(`La API respondió con el estado ${response.status}.`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('La respuesta de productos no tiene el formato esperado.');
        }

        products = data.filter((product) =>
            product &&
            Number.isFinite(Number(product.id)) &&
            typeof product.title === 'string' &&
            typeof product.category === 'string' &&
            Number.isFinite(Number(product.price)) &&
            typeof product.image === 'string'
        );

        if (products.length === 0) {
            throw new Error('La API no devolvió productos válidos.');
        }

        renderCatalog();
        renderFeatured();
        renderRecommendations();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        showCatalogError();
    }
}

// Inserta en el modal los datos completos de un producto.
// La llama openProductDetails después de consultar Get a single product.
function renderProductDetails(product) {
    productModalTitle.textContent = product.title;
    productModalBody.replaceChildren();

    const layout = createElement('div', 'product-detail');
    const image = createElement('img', 'product-detail-image');
    image.src = product.image;
    image.alt = product.title;
    image.onerror = () => {
        image.classList.add('image-unavailable');
        image.removeAttribute('src');
        image.alt = 'Imagen no disponible';
    };

    const content = createElement('div', 'product-detail-content');
    content.append(
        createElement('span', 'product-category', product.category),
        createElement('p', 'product-detail-description', product.description || 'Sin descripción disponible.'),
        createElement('p', 'product-detail-price', `$${Number(product.price).toFixed(2)}`)
    );

    if (Number.isFinite(Number(product.rating?.rate))) {
        const rating = createElement(
            'p',
            'product-detail-rating',
            `★ ${Number(product.rating.rate).toFixed(1)} / 5 (${product.rating.count ?? 0} reseñas)`
        );
        content.append(rating);
    }

    layout.append(image, content);
    productModalBody.append(layout);
}

// Consulta Get a single product y presenta el modal con sus datos o un error.
// La invoca el listener delegado de clics en los botones con data-product-id,
// creados por createProductCard y renderRecommendations; al tener éxito llama
// renderProductDetails.
async function openProductDetails(productId) {
    productModalTitle.textContent = 'Detalles del producto';
    productModalBody.replaceChildren(createElement('p', 'modal-description', 'Cargando producto...'));
    productModal.show();

    try {
        const response = await fetch(`${API_URL}/products/${encodeURIComponent(productId)}`);
        if (!response.ok) {
            throw new Error(`La API respondió con el estado ${response.status}.`);
        }

        const product = await response.json();
        if (!product || Number(product.id) !== Number(productId) || typeof product.title !== 'string') {
            throw new Error('La respuesta del producto no tiene el formato esperado.');
        }

        renderProductDetails(product);
    } catch (error) {
        console.error(`Error al cargar el producto ${productId}:`, error);
        productModalBody.replaceChildren(
            createElement('p', 'modal-error', 'No fue posible cargar los detalles. Cierra esta ventana e inténtalo de nuevo.')
        );
    }
}

// Delegación de clics: cualquier tarjeta con data-product-id abre sus detalles.
// Conecta las tarjetas creadas por createProductCard y renderRecommendations
// con openProductDetails sin registrar un listener por cada producto.
document.addEventListener('click', (event) => {
    const productButton = event.target.closest('[data-product-id]');
    if (productButton) {
        openProductDetails(productButton.dataset.productId);
    }
});

// Mantiene sincronizado el catálogo con el texto introducido en la búsqueda.
// Cada cambio vuelve a ejecutar renderCatalog.
searchInput.addEventListener('input', renderCatalog);

// Inicializa las dos barras laterales con el botón, hover y foco de escritorio.
// Los elementos .sidebar y .sidebar-toggle están definidos en index.html;
// setExpanded controla la clase .is-expanded estilizada en index.css.
document.querySelectorAll('.sidebar').forEach((sidebar) => {
    const toggle = sidebar.querySelector('.sidebar-toggle');
    const desktopHover = () => window.matchMedia(
        '(min-width: 768px) and (hover: hover) and (pointer: fine)'
    ).matches;

    // Sincroniza el estado visual y accesible de una barra lateral.
    // La usan los listeners de clic, pointerenter, pointerleave, focusin y focusout.
    function setExpanded(expanded) {
        sidebar.classList.toggle('is-expanded', expanded);
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.setAttribute(
            'aria-label',
            `${expanded ? 'Contraer' : 'Expandir'} ${sidebar.classList.contains('sidebar-social') ? 'redes sociales' : 'productos recomendados'}`
        );
    }

    toggle.addEventListener('click', () => {
        setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
    });

    sidebar.addEventListener('pointerenter', () => {
        if (desktopHover()) {
            setExpanded(true);
        }
    });

    sidebar.addEventListener('pointerleave', () => {
        if (desktopHover()) {
            setExpanded(false);
        }
    });

    sidebar.addEventListener('focusin', () => {
        if (desktopHover()) {
            setExpanded(true);
        }
    });
    sidebar.addEventListener('focusout', (event) => {
        if (!sidebar.contains(event.relatedTarget) && desktopHover()) {
            setExpanded(false);
        }
    });
});

// Primera carga del catálogo; loadProducts prepara también los destacados y la barra.
loadProducts();

/**
 * Витрина AudioDream: главная, каталог с фильтрами, карточка товара.
 */

(function () {
  'use strict';

  const S = window.AudioStore;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function productCard(product) {
    const inStock = product.stock > 0;
    return '' +
      '<div class="product-card">' +
        '<div class="product-card__image">' +
          '<span class="product-card__badge">' + (inStock ? 'В наличии' : 'Нет в наличии') + '</span>' +
          '<button class="product-card__fav" type="button" data-fav="' + product.id + '" aria-label="В избранное">♡</button>' +
          '<a class="product-card__img-link" href="product.html?id=' + product.id + '">' +
            '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '">' +
          '</a>' +
        '</div>' +
        '<div class="product-card__info">' +
          '<div class="product-card__brand">' + esc(product.brand) + '</div>' +
          '<a class="product-card__name" href="product.html?id=' + product.id + '">' + esc(product.name) + '</a>' +
          '<div class="product-card__desc">' + esc(product.description) + '</div>' +
          '<div class="product-card__price">' + S.formatPrice(product.price) + '</div>' +
          '<button class="btn btn--primary btn--full" type="button" data-add-to-cart="' + product.id + '"' +
            (inStock ? '' : ' disabled') + '>' + (inStock ? 'В корзину' : 'Нет в наличии') + '</button>' +
        '</div>' +
      '</div>';
  }

  function renderInto(container, products) {
    if (!container) return;
    container.innerHTML = products.map(productCard).join('');
    if (window.AudioApp) window.AudioApp.refreshFavButtons(container);
  }

  // ===== ГЛАВНАЯ =====

  function initIndex() {
    const featured = document.getElementById('featuredProducts');
    const fresh = document.getElementById('newProducts');
    if (!featured && !fresh) return;

    const products = S.getProducts();
    if (featured) renderInto(featured, products.slice(0, 3));
    if (fresh) renderInto(fresh, products.slice(3, 6).length ? products.slice(3, 6) : products.slice(0, 3));
  }

  // ===== КАТАЛОГ =====

  function initCatalog() {
    const grid = document.getElementById('catalogProducts');
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const state = {
      search: params.get('search') || '',
      category: Number(params.get('category')) || 0,
      brands: new Set(),
      connections: new Set((params.get('connection') || '').split(',').filter(Boolean)),
      min: params.get('min') ? Number(params.get('min')) : null,
      max: params.get('max') ? Number(params.get('max')) : null,
      stockOnly: params.get('stock') !== 'all',
      sort: params.get('sort') || 'popular',
      shown: 6,
      pageSize: 6
    };

    const searchInput = document.querySelector('.search__input');
    const tabsEl = document.getElementById('catalogTabs');
    const brandsEl = document.getElementById('brandFilters');
    const connectionsEl = document.getElementById('connectionFilters');
    const minInput = document.getElementById('priceMin');
    const maxInput = document.getElementById('priceMax');
    const stockInput = document.getElementById('stockOnly');
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const sortSelect = document.getElementById('sortSelect');
    const countEl = document.getElementById('catalogHeaderCount');
    const shownEl = document.getElementById('catalogShown');
    const loadMoreBtn = document.getElementById('loadMore');

    const products = S.getProducts();
    const categories = S.getCategories();
    const brands = S.getBrands();

    if (searchInput) searchInput.value = state.search;
    if (minInput && state.min != null) minInput.value = state.min;
    if (maxInput && state.max != null) maxInput.value = state.max;
    if (stockInput) stockInput.checked = state.stockOnly;
    if (sortSelect) sortSelect.value = state.sort;

    // Вкладки категорий
    if (tabsEl) {
      tabsEl.innerHTML =
        '<button class="catalog-tab' + (state.category === 0 ? ' catalog-tab--active' : '') + '" data-category="0">Все товары</button>' +
        categories.map(c =>
          '<button class="catalog-tab' + (state.category === c.id ? ' catalog-tab--active' : '') + '" data-category="' + c.id + '">' + esc(c.name) + '</button>'
        ).join('');

      tabsEl.addEventListener('click', (e) => {
        const tab = e.target.closest('.catalog-tab');
        if (!tab) return;
        state.category = Number(tab.dataset.category) || 0;
        state.shown = state.pageSize;
        tabsEl.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('catalog-tab--active'));
        tab.classList.add('catalog-tab--active');
        render();
      });
    }

    // Бренды
    if (brandsEl) {
      brandsEl.innerHTML = brands.map(b =>
        '<label class="filter-check"><input type="checkbox" value="' + b.id + '" data-brand><span>' + esc(b.name) + '</span></label>'
      ).join('');

      brandsEl.addEventListener('change', (e) => {
        const input = e.target.closest('[data-brand]');
        if (!input) return;
        const id = Number(input.value);
        if (input.checked) state.brands.add(id);
        else state.brands.delete(id);
        state.shown = state.pageSize;
        render();
      });
    }

    // Тип подключения
    if (connectionsEl) {
      connectionsEl.innerHTML = S.CONNECTION_TYPES.map(type =>
        '<label class="filter-check"><input type="checkbox" value="' + esc(type) + '" data-connection' +
          (state.connections.has(type) ? ' checked' : '') + '><span>' + esc(type) + '</span></label>'
      ).join('');

      connectionsEl.addEventListener('change', (e) => {
        const input = e.target.closest('[data-connection]');
        if (!input) return;
        if (input.checked) state.connections.add(input.value);
        else state.connections.delete(input.value);
        state.shown = state.pageSize;
        render();
      });
    }

    function readPriceInputs() {
      state.min = minInput && minInput.value !== '' ? Math.max(0, Number(minInput.value) || 0) : null;
      state.max = maxInput && maxInput.value !== '' ? Math.max(0, Number(maxInput.value) || 0) : null;
      state.stockOnly = stockInput ? stockInput.checked : true;
      state.sort = sortSelect ? sortSelect.value : 'popular';
    }

    function filtered() {
      const query = state.search.trim().toLowerCase();
      let list = products.filter(product => {
        if (query) {
          const haystack = (product.name + ' ' + product.brand + ' ' + product.category + ' ' + product.connection_type + ' ' + product.description).toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (state.category && product.category_id !== state.category) return false;
        if (state.brands.size && !state.brands.has(product.brand_id)) return false;
        if (state.connections.size && !state.connections.has(product.connection_type)) return false;
        if (state.min != null && product.price < state.min) return false;
        if (state.max != null && state.max > 0 && product.price > state.max) return false;
        if (state.stockOnly && product.stock <= 0) return false;
        return true;
      });

      switch (state.sort) {
        case 'price-asc':
          list.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          list.sort((a, b) => b.price - a.price);
          break;
        case 'name':
          list.sort((a, b) => (a.brand + ' ' + a.name).localeCompare(b.brand + ' ' + b.name, 'ru'));
          break;
        default:
          list.sort((a, b) => Number(a.id) - Number(b.id));
      }
      return list;
    }

    function syncUrl() {
      const next = new URLSearchParams();
      if (state.search) next.set('search', state.search);
      if (state.category) next.set('category', String(state.category));
      if (state.connections.size) next.set('connection', Array.from(state.connections).join(','));
      if (state.min != null) next.set('min', String(state.min));
      if (state.max != null) next.set('max', String(state.max));
      if (!state.stockOnly) next.set('stock', 'all');
      if (state.sort !== 'popular') next.set('sort', state.sort);
      const query = next.toString();
      history.replaceState(null, '', query ? '?' + query : window.location.pathname);
    }

    function render() {
      const list = filtered();
      const visible = list.slice(0, state.shown);

      grid.innerHTML = visible.length
        ? visible.map(productCard).join('')
        : '<div class="empty-state"><div class="empty-state__title">Ничего не найдено</div><p class="empty-state__text">Попробуйте изменить фильтры или строку поиска.</p></div>';

      if (countEl) countEl.textContent = list.length + ' ' + S.plural(list.length, ['товар', 'товара', 'товаров']);
      if (shownEl) shownEl.textContent = 'Показаны ' + visible.length + ' из ' + list.length + ' товаров';
      if (applyBtn) applyBtn.textContent = 'Показать ' + list.length + ' ' + S.plural(list.length, ['товар', 'товара', 'товаров']);
      if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', visible.length >= list.length);

      if (window.AudioApp) window.AudioApp.refreshFavButtons(grid);
      syncUrl();
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        state.shown = state.pageSize;
        render();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        readPriceInputs();
        state.shown = state.pageSize;
        render();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        readPriceInputs();
        state.shown = state.pageSize;
        render();
      });
    }

    if (minInput) minInput.addEventListener('change', () => { readPriceInputs(); state.shown = state.pageSize; render(); });
    if (maxInput) maxInput.addEventListener('change', () => { readPriceInputs(); state.shown = state.pageSize; render(); });
    if (stockInput) stockInput.addEventListener('change', () => { readPriceInputs(); state.shown = state.pageSize; render(); });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.search = '';
        state.category = 0;
        state.brands.clear();
        state.connections.clear();
        state.min = null;
        state.max = null;
        state.stockOnly = true;
        state.sort = 'popular';
        state.shown = state.pageSize;

        if (searchInput) searchInput.value = '';
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        if (stockInput) stockInput.checked = true;
        if (sortSelect) sortSelect.value = 'popular';
        if (tabsEl) tabsEl.querySelectorAll('.catalog-tab').forEach((t, i) => t.classList.toggle('catalog-tab--active', i === 0));
        if (brandsEl) brandsEl.querySelectorAll('input').forEach(input => { input.checked = false; });
        if (connectionsEl) connectionsEl.querySelectorAll('input').forEach(input => { input.checked = false; });
        render();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        state.shown += state.pageSize;
        render();
      });
    }

    render();
  }

  // ===== КАРТОЧКА ТОВАРА =====

  function initProduct() {
    const page = document.getElementById('productPage');
    if (!page) return;

    const params = new URLSearchParams(window.location.search);
    const product = S.getProduct(Number(params.get('id')));
    const notFound = document.getElementById('productNotFound');
    const similarSection = document.getElementById('similarSection');

    if (!product) {
      page.classList.add('hidden');
      if (similarSection) similarSection.classList.add('hidden');
      if (notFound) notFound.classList.remove('hidden');
      return;
    }

    document.title = product.brand + ' ' + product.name + ' — AudioDream';

    const image = document.getElementById('productImage');
    const brand = document.getElementById('productBrand');
    const name = document.getElementById('productName');
    const price = document.getElementById('productPrice');
    const description = document.getElementById('productDesc');
    const stock = document.getElementById('productStock');
    const specs = document.getElementById('productSpecs');
    const crumb = document.getElementById('productCrumb');
    const qtyValue = document.getElementById('productQty');
    const addBtn = document.getElementById('productAddBtn');
    const favBtn = document.getElementById('productFavBtn');

    if (image) {
      image.src = product.image;
      image.alt = product.name;
    }
    if (brand) brand.textContent = product.brand;
    if (name) name.textContent = product.name;
    if (price) price.textContent = S.formatPrice(product.price);
    if (description) description.textContent = product.description;
    if (crumb) crumb.textContent = product.name;
    if (stock) {
      stock.textContent = product.stock > 0
        ? 'В наличии: ' + product.stock + ' ' + S.plural(product.stock, ['шт.', 'шт.', 'шт.'])
        : 'Нет в наличии';
      stock.classList.toggle('product-details__stock--out', product.stock <= 0);
    }
    if (specs) {
      specs.innerHTML =
        '<div class="product-spec"><dt>Бренд</dt><dd>' + esc(product.brand) + '</dd></div>' +
        '<div class="product-spec"><dt>Категория</dt><dd>' + esc(product.category) + '</dd></div>' +
        '<div class="product-spec"><dt>Тип подключения</dt><dd>' + esc(product.connection_type) + '</dd></div>' +
        '<div class="product-spec"><dt>Артикул</dt><dd>AD-' + String(product.id).padStart(4, '0') + '</dd></div>' +
        '<div class="product-spec"><dt>Наличие</dt><dd>' + (product.stock > 0 ? product.stock + ' шт.' : 'Под заказ') + '</dd></div>';
    }

    let qty = 1;
    if (qtyValue) qtyValue.textContent = '1';

    const qtyMinus = document.getElementById('productQtyMinus');
    const qtyPlus = document.getElementById('productQtyPlus');

    if (qtyMinus) qtyMinus.addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      if (qtyValue) qtyValue.textContent = String(qty);
    });
    if (qtyPlus) qtyPlus.addEventListener('click', () => {
      qty = Math.min(Math.max(1, product.stock), qty + 1);
      if (qtyValue) qtyValue.textContent = String(qty);
    });

    if (addBtn) {
      if (product.stock <= 0) {
        addBtn.disabled = true;
        addBtn.textContent = 'Нет в наличии';
      }
      addBtn.addEventListener('click', () => {
        if (S.addToCart(product.id, qty)) {
          if (window.AudioAuth) window.AudioAuth.showToast('Товар добавлен в корзину', 'success');
          if (window.AudioApp) window.AudioApp.updateCartBadge();
        } else {
          if (window.AudioAuth) window.AudioAuth.showToast('Этого товара нет в наличии', 'error');
        }
      });
    }

    if (favBtn) {
      favBtn.setAttribute('data-fav', String(product.id));
      favBtn.setAttribute('data-fav-label', '');
      if (window.AudioApp) window.AudioApp.refreshFavButtons();
    }

    if (similarSection) {
      const similar = S.getProducts()
        .filter(item => item.category_id === product.category_id && item.id !== product.id)
        .slice(0, 3);
      if (similar.length) {
        renderInto(document.getElementById('similarProducts'), similar);
        similarSection.classList.remove('hidden');
      } else {
        similarSection.classList.add('hidden');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await S.ready;
    initIndex();
    initCatalog();
    initProduct();
  });
})();

/**
 * Админ-панель AudioDream: обзор, управление товарами и заказами.
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

  const ICONS = {
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    remove: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>'
  };

  function statusBadge(status) {
    return '<span class="status ' + S.statusClass(status) + '">' + esc(status) + '</span>';
  }

  function init() {
    const user = window.AudioAuth ? window.AudioAuth.getCurrentUser() : null;
    if (!user || user.role !== 'admin') return;

    const toast = (message, type) => {
      if (window.AudioAuth) window.AudioAuth.showToast(message, type || 'success');
    };

    // ===== ЭЛЕМЕНТЫ =====

    const views = Array.from(document.querySelectorAll('[data-admin-view]'));
    const menuItems = Array.from(document.querySelectorAll('[data-admin-section]'));
    const menuButtons = Array.from(document.querySelectorAll('.admin-menu [data-admin-section]'));
    const productsBody = document.getElementById('adminProductsBody');
    const productsTitle = document.getElementById('adminProductsTitle');
    const productSearch = document.getElementById('adminProductSearch');
    const ordersBody = document.getElementById('adminOrdersBody');
    const ordersTitle = document.getElementById('adminOrdersTitle');
    const orderFilter = document.getElementById('adminOrderFilter');
    const statsProducts = document.getElementById('adminStatProducts');
    const statsOrders = document.getElementById('adminStatOrders');
    const statsActive = document.getElementById('adminStatActive');

    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const productModalTitle = document.getElementById('productModalTitle');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productBrandInput = document.getElementById('productBrand');
    const productCategoryInput = document.getElementById('productCategory');
    const productConnectionInput = document.getElementById('productConnection');
    const productPriceInput = document.getElementById('productPrice');
    const productStockInput = document.getElementById('productStock');
    const productImageInput = document.getElementById('productImage');
    const productDescInput = document.getElementById('productDescription');
    const addProductBtn = document.getElementById('addProductBtn');

    const adminOrderModal = document.getElementById('adminOrderModal');
    const adminOrderBody = document.getElementById('adminOrderBody');

    let productQuery = '';
    let orderStatus = 'all';
    let editingProductId = null;
    let activeSection = 'overview';

    // ===== МОДАЛЬНЫЕ ОКНА =====

    function openModal(modal) {
      if (!modal) return;
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (!document.querySelector('.modal:not(.hidden)')) {
        document.body.classList.remove('modal-open');
      }
    }

    document.querySelectorAll('.modal').forEach(modal => {
      modal.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(modal));
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
    });

    // ===== РАЗДЕЛЫ =====

    function showSection(name) {
      if (!views.some(view => view.dataset.adminView === name)) name = 'overview';
      activeSection = name;

      views.forEach(view => {
        view.classList.toggle('hidden', view.dataset.adminView !== name);
      });

      menuButtons.forEach(item => {
        item.classList.toggle('admin-menu__item--active', item.dataset.adminSection === name);
      });

      if (name === 'products') renderProducts();
      if (name === 'orders') renderOrders();
      if (name === 'overview') renderStats();

      history.replaceState(null, '', '#' + name);
    }

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(item.dataset.adminSection);
      });
    });

    window.addEventListener('hashchange', () => {
      const name = String(window.location.hash || '').replace('#', '');
      if (name) showSection(name);
    });

    // ===== СТАТИСТИКА =====

    function renderStats() {
      const products = S.getProducts();
      const orders = S.getOrders();
      const active = orders.filter(order => order.status !== 'Доставлен');

      if (statsProducts) statsProducts.textContent = products.length;
      if (statsOrders) statsOrders.textContent = orders.length;
      if (statsActive) statsActive.textContent = active.length;
    }

    // ===== ТОВАРЫ =====

    function renderProducts() {
      if (!productsBody) return;

      const query = productQuery.trim().toLowerCase();
      const all = S.getProducts();
      const list = all.filter(product => {
        if (!query) return true;
        return (product.name + ' ' + product.brand + ' ' + product.category).toLowerCase().includes(query);
      });

      if (productsTitle) productsTitle.textContent = 'Товары · ' + all.length;

      if (!list.length) {
        productsBody.innerHTML = '<tr><td colspan="4"><div class="empty-state empty-state--table">' +
          '<div class="empty-state__title">Товары не найдены</div>' +
          '<p class="empty-state__text">Измените поисковый запрос или добавьте новый товар.</p></div></td></tr>';
        return;
      }

      productsBody.innerHTML = list.map(product => {
        const image = product.image
          ? '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '">'
          : '';
        return '<tr>' +
          '<td>' +
            '<div class="admin-product">' +
              '<div class="admin-product__img">' + image + '</div>' +
              '<div>' +
                '<div class="admin-product__brand">' + esc(product.brand) + ' · ' + esc(product.category) + '</div>' +
                '<div class="admin-product__name">' + esc(product.name) + '</div>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td>' + S.formatPrice(product.price) + '</td>' +
          '<td>' + product.stock + ' ' + S.plural(product.stock, ['шт.', 'шт.', 'шт.']) + '</td>' +
          '<td class="admin-actions-cell">' +
            '<button class="admin-action" type="button" data-product-edit="' + product.id + '" title="Редактировать">' + ICONS.edit + '</button>' +
            '<button class="admin-action admin-action--delete" type="button" data-product-delete="' + product.id + '" title="Удалить">' + ICONS.remove + '</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function openProductModal(productId) {
      editingProductId = productId || null;
      const product = productId ? S.getProduct(productId) : null;
      if (!productForm) return;

      productForm.reset();

      if (productBrandInput) {
        productBrandInput.innerHTML = S.getBrands()
          .map(brand => '<option value="' + brand.id + '">' + esc(brand.name) + '</option>')
          .join('');
      }

      if (productCategoryInput) {
        productCategoryInput.innerHTML = S.getCategories()
          .map(category => '<option value="' + category.id + '">' + esc(category.name) + '</option>')
          .join('');
      }

      if (productConnectionInput) {
        productConnectionInput.innerHTML = S.CONNECTION_TYPES
          .map(type => '<option value="' + esc(type) + '">' + esc(type) + '</option>')
          .join('');
      }

      if (productModalTitle) {
        productModalTitle.textContent = product ? 'Редактировать товар' : 'Добавить товар';
      }

      if (productIdInput) productIdInput.value = product ? String(product.id) : '';
      if (productNameInput) productNameInput.value = product ? product.name : '';
      if (productBrandInput && product) productBrandInput.value = String(product.brand_id);
      if (productCategoryInput && product) productCategoryInput.value = String(product.category_id);
      if (productConnectionInput) productConnectionInput.value = product ? product.connection_type : S.CONNECTION_TYPES[0];
      if (productPriceInput) productPriceInput.value = product ? String(product.price) : '';
      if (productStockInput) productStockInput.value = product ? String(product.stock) : '0';
      if (productImageInput) productImageInput.value = product ? product.image : '';
      if (productDescInput) productDescInput.value = product ? product.description : '';

      openModal(productModal);
      if (productNameInput) setTimeout(() => productNameInput.focus(), 100);
    }

    if (addProductBtn) addProductBtn.addEventListener('click', () => openProductModal(null));

    if (productsBody) {
      productsBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-product-edit]');
        if (editBtn) {
          openProductModal(Number(editBtn.dataset.productEdit));
          return;
        }

        const deleteBtn = e.target.closest('[data-product-delete]');
        if (!deleteBtn) return;

        const product = S.getProduct(Number(deleteBtn.dataset.productDelete));
        if (!product) return;

        if (!window.confirm('Удалить товар «' + product.name + '»? Действие нельзя отменить.')) return;

        S.deleteProduct(product.id);
        renderProducts();
        renderStats();
        toast('Товар удалён', 'info');
      });
    }

    if (productSearch) {
      productSearch.addEventListener('input', () => {
        productQuery = productSearch.value;
        renderProducts();
      });
    }

    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = {
          name: productNameInput ? productNameInput.value.trim() : '',
          brand_id: productBrandInput ? Number(productBrandInput.value) : null,
          category_id: productCategoryInput ? Number(productCategoryInput.value) : null,
          connection_type: productConnectionInput ? productConnectionInput.value : S.CONNECTION_TYPES[0],
          price: productPriceInput ? Number(productPriceInput.value) : 0,
          stock: productStockInput ? parseInt(productStockInput.value, 10) : 0,
          image: productImageInput ? productImageInput.value.trim() : '',
          description: productDescInput ? productDescInput.value.trim() : ''
        };

        if (!data.name) {
          toast('Введите название товара', 'error');
          if (productNameInput) productNameInput.focus();
          return;
        }
        if (!Number.isFinite(data.price) || data.price <= 0) {
          toast('Укажите цену больше нуля', 'error');
          if (productPriceInput) productPriceInput.focus();
          return;
        }
        if (!Number.isFinite(data.stock) || data.stock < 0) {
          toast('Остаток не может быть отрицательным', 'error');
          if (productStockInput) productStockInput.focus();
          return;
        }

        if (editingProductId) {
          S.updateProduct(editingProductId, data);
          toast('Товар обновлён', 'success');
        } else {
          S.addProduct(data);
          toast('Товар добавлен', 'success');
        }

        closeModal(productModal);
        renderProducts();
        renderStats();
      });
    }

    // ===== ЗАКАЗЫ =====

    function renderOrders() {
      if (!ordersBody) return;

      const all = S.getOrders();
      const users = S.getUsers();
      const list = orderStatus === 'all' ? all : all.filter(order => order.status === orderStatus);

      if (ordersTitle) ordersTitle.textContent = 'Заказы · ' + all.length;

      if (orderFilter) orderFilter.value = orderStatus;

      if (!list.length) {
        ordersBody.innerHTML = '<tr><td colspan="6"><div class="empty-state empty-state--table">' +
          '<div class="empty-state__title">Заказов нет</div>' +
          '<p class="empty-state__text">В этом статусе пока нет ни одного заказа.</p></div></td></tr>';
        return;
      }

      ordersBody.innerHTML = list.map(order => {
        const buyer = users.find(item => Number(item.id) === Number(order.user_id));
        const statusOptions = S.STATUSES.map(status =>
          '<option value="' + esc(status) + '"' + (status === order.status ? ' selected' : '') + '>' + esc(status) + '</option>'
        ).join('');

        return '<tr>' +
          '<td class="order-num">№ ' + order.id + '</td>' +
          '<td>' + S.formatDate(order.date) + '</td>' +
          '<td>' + esc(buyer ? buyer.name : 'Пользователь удалён') + '</td>' +
          '<td>' + S.formatPrice(order.total_price) + '</td>' +
          '<td><select class="admin-status-select" data-order-status="' + order.id + '" aria-label="Статус заказа">' + statusOptions + '</select></td>' +
          '<td><a href="#" class="link" data-order-view="' + order.id + '">Открыть</a></td>' +
        '</tr>';
      }).join('');
    }

    if (orderFilter) {
      orderFilter.addEventListener('change', () => {
        orderStatus = orderFilter.value;
        renderOrders();
      });
    }

    if (ordersBody) {
      ordersBody.addEventListener('change', (e) => {
        const select = e.target.closest('[data-order-status]');
        if (!select) return;

        const orderId = Number(select.dataset.orderStatus);
        const order = S.getOrder(orderId);
        if (!order) return;

        if (S.updateOrderStatus(orderId, select.value)) {
          toast('Статус заказа № ' + orderId + ' изменён на «' + select.value + '»', 'success');
          renderOrders();
          renderStats();
        } else {
          toast('Не удалось изменить статус', 'error');
        }
      });

      ordersBody.addEventListener('click', (e) => {
        const link = e.target.closest('[data-order-view]');
        if (!link) return;

        e.preventDefault();
        const order = S.getOrder(Number(link.dataset.orderView));
        if (!order || !adminOrderBody) return;

        const buyer = S.getUsers().find(item => Number(item.id) === Number(order.user_id));
        const items = S.getOrderItems(order.id);

        adminOrderBody.innerHTML =
          '<div class="order-details__meta">' +
            '<div><span>Заказ</span><strong>№ ' + order.id + '</strong></div>' +
            '<div><span>Дата</span><strong>' + S.formatDate(order.date) + '</strong></div>' +
            '<div><span>Покупатель</span><strong>' + esc(buyer ? buyer.name : '—') + '</strong></div>' +
            '<div><span>Статус</span>' + statusBadge(order.status) + '</div>' +
            '<div><span>Трек-номер</span><strong>' + esc(order.track_number) + '</strong></div>' +
            '<div><span>Телефон</span><strong>' + esc(buyer ? buyer.phone : '—') + '</strong></div>' +
          '</div>' +
          '<div class="order-details__items">' +
            items.map(item =>
              '<div class="order-details__item">' +
                '<span>' + esc(item.name) + ' × ' + item.quantity + '</span>' +
                '<span>' + S.formatPrice(item.sum) + '</span>' +
              '</div>'
            ).join('') +
          '</div>' +
          '<div class="order-details__total"><span>Итого</span><strong>' + S.formatPrice(order.total_price) + '</strong></div>';

        openModal(adminOrderModal);
      });
    }

    // ===== СТАРТ =====

    renderStats();
    renderProducts();
    renderOrders();

    const hash = String(window.location.hash || '').replace('#', '');
    showSection(hash || activeSection);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await S.ready;
    init();
  });
})();

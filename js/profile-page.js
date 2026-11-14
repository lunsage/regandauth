/**
 * Личный кабинет: история заказов, трекер, избранное, повтор заказа.
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

  function init() {
    const user = window.AudioAuth ? window.AudioAuth.getCurrentUser() : null;
    if (!user || user.role !== 'client') return;

    // данные пользователя
    const nameEl = document.getElementById('profileName');
    const phoneEl = document.getElementById('profilePhone');
    const avatarEl = document.getElementById('profileAvatar');
    if (nameEl) nameEl.textContent = user.name;
    if (phoneEl) phoneEl.textContent = user.phone;
    if (avatarEl) {
      avatarEl.textContent = user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase();
    }

    const ordersEl = document.getElementById('ordersTableBody');
    const trackerEl = document.getElementById('trackerContent');
    const trackerNote = document.getElementById('trackerNote');
    const favList = document.getElementById('favoritesList');
    const favEmpty = document.getElementById('favoritesEmpty');
    const favTitle = document.getElementById('favoritesTitle');

    const orders = S.getOrdersByUser(user.id);

    // ===== ИСТОРИЯ ЗАКАЗОВ =====

    function statusBadge(status) {
      return '<span class="status ' + S.statusClass(status) + '">' + esc(status) + '</span>';
    }

    function renderOrders() {
      if (!ordersEl) return;
      if (!orders.length) {
        ordersEl.innerHTML = '<tr class="empty-row"><td colspan="5">' +
          '<div class="empty-state"><div class="empty-state__title">Заказов пока нет</div>' +
          '<p class="empty-state__text">Выберите технику в каталоге — заказ появится здесь.</p></div></td></tr>';
        return;
      }

      ordersEl.innerHTML = orders.map(order =>
        '<tr>' +
          '<td class="order-num">№ ' + order.id + '</td>' +
          '<td>' + S.formatDate(order.date) + '</td>' +
          '<td>' + S.formatPrice(order.total_price) + '</td>' +
          '<td>' + statusBadge(order.status) + '</td>' +
          '<td><a href="#" class="link" data-order-details="' + order.id + '">Подробнее →</a></td>' +
        '</tr>'
      ).join('');
    }

    // ===== ТРЕКЕР =====

    function renderTracker() {
      if (!trackerEl) return;

      const active = orders.find(order => order.status !== 'Доставлен') || orders[0];
      if (!active) {
        trackerEl.innerHTML = '<div class="empty-state"><div class="empty-state__title">Нет активных заказов</div>' +
          '<p class="empty-state__text">Оформите заказ, и здесь появится трекер доставки.</p></div>';
        if (trackerNote) trackerNote.textContent = '0 активных заказов';
        return;
      }

      const activeCount = orders.filter(order => order.status !== 'Доставлен').length;
      if (trackerNote) {
        trackerNote.textContent = activeCount + ' ' + S.plural(activeCount, ['активный заказ', 'активных заказа', 'активных заказов']);
      }

      const currentIndex = S.STATUSES.indexOf(active.status);
      const steps = S.STATUSES.map((status, index) => {
        const done = index < currentIndex || active.status === 'Доставлен';
        const current = index === currentIndex && active.status !== 'Доставлен';
        const cls = done ? 'tracker-step--done' : (current ? 'tracker-step--current' : '');
        const icon = done ? '✓' : String(index + 1);
        return '<div class="tracker-step ' + cls + '">' +
          '<div class="tracker-step__icon">' + icon + '</div>' +
          '<div class="tracker-step__info">' +
            '<div class="tracker-step__title">' + status + '</div>' +
            '<div class="tracker-step__date">' + (done || current ? S.formatDate(active.date) : '—') + '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      trackerEl.innerHTML =
        '<div class="tracker-card">' +
          '<div class="tracker-header">' +
            '<div>' +
              '<h3>Заказ № ' + active.id + '</h3>' +
              '<p>Трек-номер: ' + esc(active.track_number) + '</p>' +
            '</div>' +
            statusBadge(active.status) +
          '</div>' +
          '<div class="tracker-steps">' + steps + '</div>' +
          '<div class="tracker-actions">' +
            '<span class="tracker-address"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Курьером · Москва</span>' +
            '<button class="btn btn--outline" type="button" data-repeat-order="' + active.id + '">Повторить заказ</button>' +
          '</div>' +
        '</div>';
    }

    // ===== ИЗБРАННОЕ =====

    function renderFavorites() {
      if (!favList) return;

      const ids = S.getFavorites(user.id);
      const products = S.getProducts().filter(product => ids.includes(Number(product.id)));

      if (favTitle) favTitle.textContent = 'Избранное · ' + products.length;

      if (!products.length) {
        favList.innerHTML = '';
        if (favEmpty) favEmpty.classList.remove('hidden');
        return;
      }

      if (favEmpty) favEmpty.classList.add('hidden');
      favList.innerHTML = products.map(product =>
        '<div class="favorite-card">' +
          '<a class="favorite-card__image" href="product.html?id=' + product.id + '">' +
            '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '">' +
          '</a>' +
          '<div class="favorite-card__info">' +
            '<div class="product-card__brand">' + esc(product.brand) + '</div>' +
            '<a class="product-card__name" href="product.html?id=' + product.id + '">' + esc(product.name) + '</a>' +
            '<div class="product-card__desc">' + esc(product.description) + '</div>' +
          '</div>' +
          '<div class="favorite-card__right">' +
            '<div class="product-card__price">' + S.formatPrice(product.price) + '</div>' +
            '<button class="btn btn--primary" type="button" data-add-to-cart="' + product.id + '"' +
              (product.stock > 0 ? '' : ' disabled') + '>' + (product.stock > 0 ? 'В корзину' : 'Нет в наличии') + '</button>' +
            '<button class="link favorite-card__remove" type="button" data-remove-fav="' + product.id + '">Убрать</button>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    // ===== ПОВТОР ЗАКАЗА =====

    function repeatOrder(orderId) {
      const items = S.getOrderItems(orderId);
      let added = 0;

      items.forEach(item => {
        if (S.addToCart(item.product_id, item.quantity)) added++;
      });

      if (!added) {
        if (window.AudioAuth) window.AudioAuth.showToast('Товары из этого заказа недоступны', 'error');
        return;
      }

      if (window.AudioApp) window.AudioApp.updateCartBadge();
      if (window.AudioAuth) window.AudioAuth.showToast('Товары добавлены в корзину', 'success');
      setTimeout(() => { window.location.href = 'cart.html'; }, 500);
    }

    // ===== МОДАЛКА ЗАКАЗА =====

    const orderModal = document.getElementById('orderDetailsModal');
    const orderModalBody = document.getElementById('orderDetailsBody');
    const repeatBtn = document.getElementById('repeatOrderBtn');

    function openModal(modal) {
      if (!modal) return;
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }

    function showOrder(orderId) {
      const order = S.getOrder(orderId);
      if (!order) return;
      const items = S.getOrderItems(orderId);

      if (orderModalBody) {
        orderModalBody.innerHTML =
          '<div class="order-details__meta">' +
            '<div><span>Заказ</span><strong>№ ' + order.id + '</strong></div>' +
            '<div><span>Дата</span><strong>' + S.formatDate(order.date) + '</strong></div>' +
            '<div><span>Статус</span>' + statusBadge(order.status) + '</div>' +
            '<div><span>Трек-номер</span><strong>' + esc(order.track_number) + '</strong></div>' +
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
      }

      if (repeatBtn) repeatBtn.dataset.repeatOrder = String(order.id);
      openModal(orderModal);
    }

    if (orderModal) {
      orderModal.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(orderModal));
      });
      orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) closeModal(orderModal);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
    });

    document.addEventListener('click', (e) => {
      const details = e.target.closest('[data-order-details]');
      if (details) {
        e.preventDefault();
        showOrder(Number(details.dataset.orderDetails));
        return;
      }

      const repeat = e.target.closest('[data-repeat-order]');
      if (repeat) {
        e.preventDefault();
        repeatOrder(Number(repeat.dataset.repeatOrder));
        return;
      }

      const removeFav = e.target.closest('[data-remove-fav]');
      if (removeFav) {
        e.preventDefault();
        S.toggleFavorite(user.id, Number(removeFav.dataset.removeFav));
        renderFavorites();
        if (window.AudioApp) window.AudioApp.refreshFavButtons();
        if (window.AudioAuth) window.AudioAuth.showToast('Удалено из избранного', 'info');
      }
    });

    // ===== ВКЛАДКИ =====

    const tabs = Array.from(document.querySelectorAll('.profile-tab'));
    const sections = {
      orders: document.getElementById('orders'),
      tracker: document.getElementById('tracker'),
      favorites: document.getElementById('favorites')
    };

    function activateTab(hash) {
      const key = String(hash || 'orders').replace('#', '');
      const activeKey = sections[key] ? key : 'orders';

      tabs.forEach(tab => {
        tab.classList.toggle('profile-tab--active', tab.getAttribute('href') === '#' + activeKey);
      });

      Object.keys(sections).forEach(name => {
        if (!sections[name]) return;
        sections[name].classList.toggle('hidden', name !== activeKey);
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = tab.getAttribute('href');
        activateTab(hash);
        history.replaceState(null, '', hash);
      });
    });

    window.addEventListener('hashchange', () => activateTab(window.location.hash));

    // ===== СТАРТ =====

    renderOrders();
    renderTracker();
    renderFavorites();
    activateTab(window.location.hash);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await S.ready;
    init();
  });
})();

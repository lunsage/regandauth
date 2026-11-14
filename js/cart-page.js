/**
 * Страница корзины: количество, удаление, оформление заказа, модалка входа.
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
    const itemsEl = document.getElementById('cartItems');
    if (!itemsEl) return;

    const layout = document.getElementById('cartLayout');
    const empty = document.getElementById('cartEmpty');
    const subtitle = document.getElementById('cartSubtitle');
    const summaryCount = document.getElementById('cartSummaryCount');
    const summaryTotal = document.getElementById('cartSummaryTotal');
    const grandTotal = document.getElementById('cartGrandTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    function render() {
      const items = S.getCartItemsDetailed();
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      const total = items.reduce((sum, item) => sum + item.sum, 0);

      if (!items.length) {
        itemsEl.innerHTML = '';
        if (layout) layout.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
        if (subtitle) subtitle.textContent = 'Пока пусто · Самое время выбрать свой звук';
      } else {
        if (layout) layout.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
        if (subtitle) {
          subtitle.textContent = count + ' ' + S.plural(count, ['товар', 'товара', 'товаров']) + ' · Всё для вашей музыки';
        }

        itemsEl.innerHTML = items.map(item => {
          const product = item.product;
          return '' +
            '<div class="cart-item" data-cart-item="' + product.id + '">' +
              '<a class="cart-item__image" href="product.html?id=' + product.id + '">' +
                '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '">' +
              '</a>' +
              '<div class="cart-item__info">' +
                '<div class="cart-item__brand">' + esc(product.brand) + '</div>' +
                '<a class="cart-item__name" href="product.html?id=' + product.id + '">' + esc(product.name) + '</a>' +
                '<div class="cart-item__desc">' + esc(product.description) + '</div>' +
                '<div class="cart-item__price-unit">' + S.formatPrice(product.price) + ' / шт. · в наличии ' + product.stock + ' шт.</div>' +
              '</div>' +
              '<div class="cart-item__right">' +
                '<div class="cart-item__total">' + S.formatPrice(item.sum) + '</div>' +
                '<div class="cart-item__bottom">' +
                  '<div class="qty">' +
                    '<button class="qty__btn" type="button" data-cart-minus="' + product.id + '">−</button>' +
                    '<span class="qty__value">' + item.quantity + '</span>' +
                    '<button class="qty__btn" type="button" data-cart-plus="' + product.id + '">+</button>' +
                  '</div>' +
                  '<button class="cart-item__delete" type="button" data-cart-remove="' + product.id + '" aria-label="Удалить товар">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>';
        }).join('');
      }

      if (summaryCount) summaryCount.textContent = 'Товары, ' + count + ' шт.';
      if (summaryTotal) summaryTotal.textContent = S.formatPrice(total);
      if (grandTotal) grandTotal.textContent = S.formatPrice(total);

      if (window.AudioApp) window.AudioApp.updateCartBadge();
    }

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
    }

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
      }
    });

    // ===== ИЗМЕНЕНИЕ КОЛИЧЕСТВА =====

    itemsEl.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-cart-minus]');
      const plus = e.target.closest('[data-cart-plus]');
      const remove = e.target.closest('[data-cart-remove]');

      if (minus) {
        const id = Number(minus.dataset.cartMinus);
        const item = S.getCart().find(i => i.product_id === id);
        if (item) S.setCartQty(id, item.quantity - 1);
        render();
        return;
      }

      if (plus) {
        const id = Number(plus.dataset.cartPlus);
        const item = S.getCart().find(i => i.product_id === id);
        const product = S.getProduct(id);
        if (!item || !product) return;
        if (item.quantity >= product.stock) {
          if (window.AudioAuth) window.AudioAuth.showToast('Больше нет на складе', 'error');
          return;
        }
        S.setCartQty(id, item.quantity + 1);
        render();
        return;
      }

      if (remove) {
        S.removeFromCart(Number(remove.dataset.cartRemove));
        render();
        if (window.AudioAuth) window.AudioAuth.showToast('Товар удалён из корзины', 'info');
      }
    });

    // ===== ОФОРМЛЕНИЕ ЗАКАЗА =====

    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authModalForm');
    const authLogin = document.getElementById('authModalLogin');
    const authPassword = document.getElementById('authModalPassword');
    const authError = document.getElementById('authModalError');

    function placeOrder(user) {
      try {
        const items = S.getCartItemsDetailed().map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }));
        const order = S.createOrder(user.id, items);
        S.clearCart();
        render();
        window.location.href = 'success.html?order=' + encodeURIComponent(order.id);
      } catch (err) {
        if (window.AudioAuth) window.AudioAuth.showToast(err.message || 'Не удалось оформить заказ', 'error');
      }
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!S.getCartCount()) {
          if (window.AudioAuth) window.AudioAuth.showToast('Корзина пуста', 'error');
          return;
        }

        const user = window.AudioAuth ? window.AudioAuth.getCurrentUser() : null;
        if (!user) {
          if (authError) authError.textContent = '';
          openModal(authModal);
          if (authLogin) setTimeout(() => authLogin.focus(), 100);
          return;
        }

        placeOrder(user);
      });
    }

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const login = authLogin ? authLogin.value.trim() : '';
        const password = authPassword ? authPassword.value : '';

        if (!login || !password) {
          if (authError) authError.textContent = 'Введите email/телефон и пароль';
          return;
        }

        const result = await window.AudioAuth.login(login, password, true);
        if (!result.ok) {
          if (authError) authError.textContent = result.error;
          return;
        }

        if (authError) authError.textContent = '';
        if (authPassword) authPassword.value = '';
        closeModal(authModal);
        if (window.AudioApp && window.AudioApp.refreshHeader) window.AudioApp.refreshHeader();
        if (window.AudioAuth) window.AudioAuth.showToast('Добро пожаловать, ' + result.user.name + '!', 'success');
        placeOrder(result.user);
      });
    }

    render();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await S.ready;
    init();
  });
})();

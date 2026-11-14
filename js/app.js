/**
 * Общие функции AudioDream: шапка, корзина, поиск, избранное, защита страниц.
 */

(function () {
  'use strict';

  // ===== СЕССИЯ =====

  function getCurrentUser() {
    if (window.AudioAuth && window.AudioAuth.getCurrentUser) {
      return window.AudioAuth.getCurrentUser();
    }
    try {
      return JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
    } catch (e) {
      return null;
    }
  }

  function clearCurrentUser() {
    if (window.AudioAuth && window.AudioAuth.clearUser) {
      window.AudioAuth.clearUser();
    } else {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    }
  }

  function showToast(message, type) {
    if (window.AudioAuth && window.AudioAuth.showToast) {
      window.AudioAuth.showToast(message, type || 'info');
      return;
    }
    alert(message);
  }

  // ===== ЗАЩИТА СТРАНИЦ =====

  function protectPage(requiredRole) {
    const user = getCurrentUser();

    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname.split('/').pop() || 'profile.html');
      window.location.href = 'auth.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
      return null;
    }

    return user;
  }

  // ===== ШАПКА =====

  function updateUserHeader() {
    const user = getCurrentUser();
    const navLinks = document.querySelectorAll('.nav a, .mobile-nav a');

    navLinks.forEach(link => {
      if (link.textContent.trim() === 'Кабинет') {
        link.href = user ? (user.role === 'admin' ? 'admin.html' : 'profile.html') : 'auth.html';
      }

      if (link.textContent.trim() === 'Вход') {
        if (user) {
          link.textContent = 'Выйти';
          link.href = '#';
          link.onclick = (e) => {
            e.preventDefault();
            clearCurrentUser();
            showToast('Вы вышли из аккаунта', 'info');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 500);
          };
        } else {
          link.textContent = 'Вход';
          link.href = 'auth.html';
          link.onclick = null;
        }
      }
    });
  }

  function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearCurrentUser();
      showToast('Вы вышли из аккаунта', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    });
  }

  function initBurger() {
    const burger = document.querySelector('.header__burger');
    if (!burger) return;

    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function updateCartBadge() {
    if (!window.AudioStore) return;
    const count = window.AudioStore.getCartCount();
    const label = count + ' ' + window.AudioStore.plural(count, ['товар', 'товара', 'товаров']);
    document.querySelectorAll('.header__cart-count').forEach(el => {
      el.textContent = label;
    });
  }

  function initCartLinks() {
    document.querySelectorAll('.header__cart').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = 'cart.html';
      });
    });
  }

  // ===== ГЛОБАЛЬНЫЙ ПОИСК =====

  function initSearch() {
    document.querySelectorAll('.search__input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const query = input.value.trim();
        if (!query) return;
        if (/catalog\.html$/i.test(window.location.pathname)) return;
        window.location.href = 'catalog.html?search=' + encodeURIComponent(query);
      });
    });
  }

  // ===== ДОБАВЛЕНИЕ В КОРЗИНУ =====

  function initAddToCart() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-add-to-cart]');
      if (!button || button.disabled) return;

      e.preventDefault();
      const productId = Number(button.dataset.addToCart);
      const quantity = Number(button.dataset.qty) || 1;
      const added = window.AudioStore.addToCart(productId, quantity);

      if (added) {
        showToast('Товар добавлен в корзину', 'success');
        updateCartBadge();
      } else {
        showToast('Этого товара нет в наличии', 'error');
      }
    });
  }

  // ===== ИЗБРАННОЕ =====

  function paintFavButton(button, active) {
    const isCard = button.classList.contains('product-card__fav');
    if (isCard) {
      button.textContent = active ? '♥' : '♡';
      button.classList.toggle('product-card__fav--active', active);
    } else if (button.hasAttribute('data-fav-label')) {
      button.textContent = active ? '♥ В избранном' : '♡ В избранное';
      button.classList.toggle('btn--outline', !active);
      button.classList.toggle('btn--primary', active);
    } else {
      button.classList.toggle('product-card__fav--active', active);
      button.textContent = active ? '♥' : '♡';
    }
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function refreshFavButtons(root) {
    if (!window.AudioStore) return;
    const user = getCurrentUser();
    const list = root || document;
    list.querySelectorAll('[data-fav]').forEach(button => {
      const active = Boolean(user) && window.AudioStore.isFavorite(user.id, Number(button.dataset.fav));
      paintFavButton(button, active);
    });
  }

  function initFavorites() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-fav]');
      if (!button) return;

      e.preventDefault();
      const user = getCurrentUser();
      if (!user) {
        showToast('Войдите, чтобы добавлять товары в избранное', 'info');
        return;
      }

      const productId = Number(button.dataset.fav);
      const active = window.AudioStore.toggleFavorite(user.id, productId);
      refreshFavButtons();
      showToast(active ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    });
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.AudioStore) await window.AudioStore.ready;

    updateUserHeader();
    initLogout();
    initBurger();
    updateCartBadge();
    initCartLinks();
    initSearch();
    initAddToCart();
    initFavorites();
    refreshFavButtons();

    if (document.querySelector('.admin-layout')) {
      protectPage('admin');
    } else if (document.querySelector('.profile-top')) {
      protectPage('client');
    }
  });

  window.AudioApp = {
    protectPage,
    showToast,
    getCurrentUser,
    updateUserHeader,
    updateCartBadge,
    refreshFavButtons,
    refreshHeader() {
      updateUserHeader();
      updateCartBadge();
      refreshFavButtons();
    }
  };
})();

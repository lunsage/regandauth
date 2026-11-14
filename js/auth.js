/**
 * Модуль авторизации и регистрации AudioDream
 * Пользователи читаются и сохраняются через AudioStore (data/db.json + localStorage).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'currentUser';
  const REDIRECT_KEY = 'redirectAfterLogin';

  // ===== СЕССИЯ =====

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveUser(user, remember) {
    clearUser();
    const storage = remember === false ? sessionStorage : localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function publicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };
  }

  // ===== TOAST-УВЕДОМЛЕНИЯ =====

  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    const container = document.getElementById('toastContainer');
    if (!container) {
      alert(message);
      return;
    }

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.innerHTML =
      '<span class="toast__icon">' + (icons[type] || 'ℹ') + '</span>' +
      '<span class="toast__message">' + message + '</span>';

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ===== ВАЛИДАЦИЯ =====

  const validators = {
    email: (value) => {
      const v = value.trim();
      if (!v) return 'Введите email или телефон';
      if (v.toLowerCase() === 'admin') return '';
      if (v.includes('@')) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(v)) return 'Некорректный формат email';
        return '';
      }
      const phoneDigits = v.replace(/\D/g, '');
      if (phoneDigits.length !== 11) return 'Телефон должен содержать 11 цифр';
      if (!/^[78]\d{10}$/.test(phoneDigits)) return 'Телефон должен начинаться с +7 или 8';
      return '';
    },

    loginPassword: (value) => {
      if (!value) return 'Введите пароль';
      if (value.length > 32) return 'Пароль не должен превышать 32 символа';
      if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
      return '';
    },

    password: (value) => {
      if (!value) return 'Введите пароль';
      if (value.length < 6) return 'Пароль должен содержать минимум 6 символов';
      if (value.length > 32) return 'Пароль не должен превышать 32 символа';
      if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
      return '';
    },

    name: (value) => {
      const v = value.trim();
      if (!v) return 'Введите имя';
      if (v.length < 2) return 'Имя должно содержать минимум 2 символа';
      if (v.length > 50) return 'Имя не должно превышать 50 символов';
      if (/^\d/.test(v)) return 'Имя не может начинаться с цифры';
      return '';
    },

    emailReg: (value) => {
      const v = value.trim();
      if (!v) return 'Введите электронную почту';
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(v)) return 'Некорректный формат email (пример: user@mail.ru)';
      return '';
    },

    phone: (value) => {
      const v = value.trim();
      if (!v) return 'Введите телефон';

      const digits = v.replace(/\D/g, '');
      if (digits.length !== 11) return 'Телефон должен содержать 11 цифр';
      if (!/^[78]\d{10}$/.test(digits)) return 'Телефон должен начинаться с +7';

      const formats = [
        /^\+7\s?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/,
        /^\+7\d{10}$/,
        /^8\d{10}$/
      ];
      if (!formats.some(re => re.test(v))) return 'Формат: +7 (XXX) XXX-XX-XX';
      return '';
    }
  };

  function validateField(input, errorEl, validator) {
    const error = validator(input.value);
    if (error) {
      input.classList.add('error');
      if (errorEl) errorEl.textContent = error;
      return false;
    }
    input.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
    return true;
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.form-input').forEach(i => i.classList.remove('error'));
    form.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  }

  function applyPhoneMask(input) {
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.startsWith('8')) value = '7' + value.slice(1);
      if (!value.startsWith('7') && value.length > 0) value = '7' + value;
      value = value.slice(0, 11);

      let formatted = '';
      if (value.length > 0) formatted = '+7';
      if (value.length > 1) formatted += ' (' + value.slice(1, 4);
      if (value.length >= 4) formatted += ') ' + value.slice(4, 7);
      if (value.length >= 7) formatted += '-' + value.slice(7, 9);
      if (value.length >= 9) formatted += '-' + value.slice(9, 11);
      e.target.value = formatted;
    });

    input.addEventListener('focus', (e) => {
      if (!e.target.value) e.target.value = '+7';
    });

    input.addEventListener('blur', (e) => {
      if (e.target.value === '+7') e.target.value = '';
    });
  }

  function initTabs() {
    const tabs = document.querySelectorAll('.auth-tabs__btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('auth-tabs__btn--active'));
        btn.classList.add('auth-tabs__btn--active');

        if (btn.dataset.tab === 'login') {
          loginForm.classList.remove('hidden');
          registerForm.classList.add('hidden');
        } else {
          loginForm.classList.add('hidden');
          registerForm.classList.remove('hidden');
        }
        clearFormErrors(loginForm);
        clearFormErrors(registerForm);
      });
    });
  }

  // ===== ВХОД =====

  async function performLogin(loginValue, password, remember) {
    if (!window.AudioStore) {
      return { ok: false, error: 'Модуль данных не загружен' };
    }

    await window.AudioStore.ready;
    const user = window.AudioStore.findUserByLogin(loginValue);

    if (!user || !(await window.AudioStore.verifyPassword(user, password))) {
      return { ok: false, error: 'Неверный email/телефон или пароль' };
    }

    const sessionUser = publicUser(user);
    saveUser(sessionUser, remember !== false);
    return { ok: true, user: sessionUser };
  }

  function redirectPath(user) {
    if (user.role === 'admin') return 'admin.html';

    const redirect = sessionStorage.getItem(REDIRECT_KEY);
    if (redirect) {
      sessionStorage.removeItem(REDIRECT_KEY);
      return redirect;
    }
    return 'profile.html';
  }

  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');

    emailInput.addEventListener('blur', () => {
      validateField(emailInput, emailError, validators.email);
    });
    passwordInput.addEventListener('blur', () => {
      validateField(passwordInput, passwordError, validators.loginPassword);
    });

    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('error')) {
        emailInput.classList.remove('error');
        emailError.textContent = '';
      }
    });
    passwordInput.addEventListener('input', () => {
      if (passwordInput.classList.contains('error')) {
        passwordInput.classList.remove('error');
        passwordError.textContent = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const isEmailValid = validateField(emailInput, emailError, validators.email);
      const isPasswordValid = validateField(passwordInput, passwordError, validators.loginPassword);

      if (!isEmailValid || !isPasswordValid) {
        showToast('Проверьте правильность заполнения полей', 'error');
        return;
      }

      const rememberInput = document.getElementById('rememberMe');
      const result = await performLogin(
        emailInput.value.trim(),
        passwordInput.value,
        rememberInput ? rememberInput.checked : true
      );

      if (!result.ok) {
        showToast(result.error, 'error');
        passwordInput.value = '';
        return;
      }

      showToast('Добро пожаловать, ' + result.user.name + '!', 'success');
      setTimeout(() => {
        window.location.href = redirectPath(result.user);
      }, 700);
    });
  }

  // ===== РЕГИСТРАЦИЯ =====

  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const passwordInput = document.getElementById('regPassword');

    const nameError = document.getElementById('regNameError');
    const emailError = document.getElementById('regEmailError');
    const phoneError = document.getElementById('regPhoneError');
    const passwordError = document.getElementById('regPasswordError');

    applyPhoneMask(phoneInput);

    nameInput.addEventListener('blur', () => validateField(nameInput, nameError, validators.name));
    emailInput.addEventListener('blur', () => validateField(emailInput, emailError, validators.emailReg));
    phoneInput.addEventListener('blur', () => validateField(phoneInput, phoneError, validators.phone));
    passwordInput.addEventListener('blur', () => validateField(passwordInput, passwordError, validators.password));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const v1 = validateField(nameInput, nameError, validators.name);
      const v2 = validateField(emailInput, emailError, validators.emailReg);
      const v3 = validateField(phoneInput, phoneError, validators.phone);
      const v4 = validateField(passwordInput, passwordError, validators.password);

      if (!v1 || !v2 || !v3 || !v4) {
        showToast('Проверьте правильность заполнения полей', 'error');
        return;
      }

      if (!window.AudioStore) {
        showToast('Модуль данных не загружен', 'error');
        return;
      }

      await window.AudioStore.ready;

      try {
        const user = await window.AudioStore.addUser({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          phone: phoneInput.value,
          password: passwordInput.value,
          role: 'client'
        });

        saveUser(publicUser(user), true);
        showToast('Регистрация успешна! Добро пожаловать!', 'success');
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 700);
      } catch (err) {
        showToast(err.message || 'Не удалось зарегистрировать пользователя', 'error');
      }
    });
  }

  // ===== НЕЛЬЗЯ ВОЙТИ ПОВТОРНО =====

  function checkAlreadyAuth() {
    const user = getCurrentUser();
    if (!user) return;
    window.location.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
  }

  function init() {
    if (!document.getElementById('loginForm')) return;
    checkAlreadyAuth();
    initTabs();
    initLoginForm();
    initRegisterForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ===== ЭКСПОРТ =====

  window.AudioAuth = {
    getCurrentUser,
    saveUser,
    clearUser,
    showToast,
    login: performLogin,
    requireAuth(redirectUrl) {
      const user = getCurrentUser();
      if (!user) {
        sessionStorage.setItem(REDIRECT_KEY, redirectUrl || window.location.pathname);
        window.location.href = 'auth.html';
        return null;
      }
      return user;
    },
    requireRole(role) {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = 'auth.html';
        return null;
      }
      if (user.role !== role) {
        showToast('Доступ запрещён', 'error');
        window.location.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
        return null;
      }
      return user;
    }
  };
})();

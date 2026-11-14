/**
 * AudioDream — слой данных магазина.
 * Источник: data/db.json, рабочая база — localStorage (audiodreamDB).
 * Структура соответствует ТЗ: users, brands, categories, products, orders, order_items.
 */

(function () {
  'use strict';

  const DB_KEY = 'audiodreamDB';
  const DB_VERSION = 2;
  const CART_KEY = 'audiodreamCart';
  const FAV_KEY = 'audiodreamFavorites';

  const STATUSES = ['Новый', 'Сборка', 'В пути', 'Доставлен'];
  const CONNECTION_TYPES = ['Беспроводное', 'Проводное', 'Комбинированное'];
  const MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  // Резервная копия data/db.json — нужна, если fetch недоступен (file://)
  const FALLBACK_DB = {
    users: [
      { id: 1, name: 'Администратор', email: 'admin@audiodream.ru', phone: '+7-900-000-00-01', password: '123', role: 'admin' },
      { id: 2, name: 'Иван Петров', email: 'ivan@mail.ru', phone: '+7-900-000-00-02', password: 'client1', role: 'client' },
      { id: 3, name: 'Мария Сидорова', email: 'maria@mail.ru', phone: '+7-900-000-00-03', password: 'client2', role: 'client' }
    ],
    brands: [
      { id: 1, name: 'Sony', country: 'Япония' },
      { id: 2, name: 'Sennheiser', country: 'Германия' },
      { id: 3, name: 'JBL', country: 'США' },
      { id: 4, name: 'Marshall', country: 'Великобритания' },
      { id: 5, name: 'HiBy', country: 'Китай' },
      { id: 6, name: 'Fiio', country: 'Китай' },
      { id: 7, name: 'Fosi Audio', country: 'Китай' },
      { id: 8, name: 'Yamaha', country: 'Япония' }
    ],
    categories: [
      { id: 1, name: 'Наушники', description: 'Для музыки, работы и тишины' },
      { id: 2, name: 'Колонки', description: 'Большой звук для любого пространства' },
      { id: 3, name: 'Плееры', description: 'Музыка всегда с собой' },
      { id: 4, name: 'Усилители', description: 'Мощь и чистота звука' },
      { id: 5, name: 'Аксессуары', description: 'Всё для вашей аудиосистемы' }
    ],
    products: [
      { id: 1, name: 'Sony WH-1000XM5', brand_id: 1, price: 29990, category_id: 1, stock: 15, image: 'assets/img/product-sony.png', description: 'Беспроводные наушники с шумоподавлением', connection_type: 'Беспроводное' },
      { id: 2, name: 'Sennheiser HD 660S', brand_id: 2, price: 49990, category_id: 1, stock: 8, image: 'assets/img/product-sennheiser.png', description: 'Открытые студийные наушники', connection_type: 'Проводное' },
      { id: 3, name: 'JBL Charge 5', brand_id: 3, price: 9990, category_id: 2, stock: 30, image: 'assets/img/product-jbl.png', description: 'Портативная колонка с защитой от воды', connection_type: 'Беспроводное' },
      { id: 4, name: 'Marshall Stanmore II', brand_id: 4, price: 24990, category_id: 2, stock: 12, image: 'assets/img/product-marshall-home.png', description: 'Домашняя колонка в ретро-стиле', connection_type: 'Беспроводное' },
      { id: 5, name: 'HiBy R3 Pro', brand_id: 5, price: 15990, category_id: 3, stock: 10, image: 'assets/img/product-hiby.svg', description: 'Цифровой аудиоплеер', connection_type: 'Проводное' },
      { id: 6, name: 'Fiio M11S', brand_id: 6, price: 45990, category_id: 3, stock: 5, image: 'assets/img/product-fiio.svg', description: 'Плеер Hi-Res аудио', connection_type: 'Проводное' },
      { id: 7, name: 'Fosi Audio BT20A', brand_id: 7, price: 6990, category_id: 4, stock: 20, image: 'assets/img/product-fosi.svg', description: 'Усилитель для колонок', connection_type: 'Комбинированное' },
      { id: 8, name: 'Yamaha A-S301', brand_id: 8, price: 39990, category_id: 4, stock: 7, image: 'assets/img/product-yamaha.svg', description: 'Интегральный усилитель', connection_type: 'Проводное' }
    ],
    orders: [
      { id: 1, user_id: 2, date: '2024-01-15', status: 'Доставлен', track_number: 'TRK-000001', total_price: 39980 },
      { id: 2, user_id: 3, date: '2024-01-20', status: 'В пути', track_number: 'TRK-000002', total_price: 24990 }
    ],
    order_items: [
      { id: 1, order_id: 1, product_id: 1, product_name: 'Sony WH-1000XM5', product_image: 'assets/img/product-sony.png', quantity: 1, price_at_moment: 29990 },
      { id: 2, order_id: 1, product_id: 3, product_name: 'JBL Charge 5', product_image: 'assets/img/product-jbl.png', quantity: 1, price_at_moment: 9990 },
      { id: 3, order_id: 2, product_id: 4, product_name: 'Marshall Stanmore II', product_image: 'assets/img/product-marshall-home.png', quantity: 1, price_at_moment: 24990 }
    ]
  };

  let db = null;
  const ready = init();

  // ===== СЛУЖЕБНЫЕ =====

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalize(data) {
    if (!data || typeof data !== 'object') data = clone(FALLBACK_DB);
    return {
      users: toArray(data.users),
      brands: toArray(data.brands),
      categories: toArray(data.categories),
      products: toArray(data.products),
      orders: toArray(data.orders),
      order_items: toArray(data.order_items)
    };
  }

  function persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify({ version: DB_VERSION, data: db }));
    } catch (e) {
      console.error('Не удалось сохранить базу:', e);
    }
  }

  async function loadSeed() {
    try {
      const res = await fetch('data/db.json', { cache: 'no-store' });
      if (res.ok) {
        const seed = await res.json();
        if (seed && Array.isArray(seed.products)) return seed;
      }
    } catch (e) {
      console.warn('data/db.json недоступен, используется встроенная копия:', e);
    }
    return clone(FALLBACK_DB);
  }

  // Хеширование паролей: SHA-256 там, где доступен Web Crypto
  async function hashPassword(password) {
    const value = String(password == null ? '' : password);
    if (/^(sha256|fallback):/.test(value)) return value;

    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const bytes = new TextEncoder().encode('audiodream:' + value);
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        const hex = Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return 'sha256:' + hex;
      }
    } catch (e) {
      console.warn('Web Crypto недоступен, используется резервный хеш:', e);
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return 'fallback:' + hash.toString(16);
  }

  async function verifyPassword(user, password) {
    const stored = String(user && user.password != null ? user.password : '');
    if (/^(sha256|fallback):/.test(stored)) {
      return stored === await hashPassword(password);
    }
    return stored === String(password);
  }

  async function hashUsers() {
    for (const user of db.users) {
      if (user.password && !/^(sha256|fallback):/.test(String(user.password))) {
        user.password = await hashPassword(user.password);
      }
    }
  }

  function migrateLegacyUsers() {
    try {
      const raw = JSON.parse(localStorage.getItem('registeredUsers'));
      if (!Array.isArray(raw) || !raw.length) return;
      let maxId = Math.max(0, ...db.users.map(u => Number(u.id) || 0));
      raw.forEach(user => {
        if (!user || !user.email) return;
        const exists = db.users.some(u =>
          String(u.email).toLowerCase() === String(user.email).toLowerCase() ||
          normalizePhone(u.phone) === normalizePhone(user.phone)
        );
        if (!exists) {
          db.users.push(Object.assign({ role: 'client' }, user, { id: Number(user.id) || ++maxId }));
        }
      });
      localStorage.removeItem('registeredUsers');
    } catch (e) {
      // старый формат не критичен
    }
  }

  // Заполняем снимки названия и фото в уже сохранённых заказах
  function backfillOrderItemSnapshots() {
    db.order_items.forEach(item => {
      if (item.product_name && item.product_image) return;
      const product = db.products.find(p => Number(p.id) === Number(item.product_id));
      if (!product) return;
      if (!item.product_name) item.product_name = product.name;
      if (!item.product_image) item.product_image = product.image;
    });
  }

  async function init() {
    let data = null;
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY));
      if (saved && saved.version === DB_VERSION && saved.data) {
        data = normalize(saved.data);
      }
    } catch (e) {
      // повреждённые данные перезапишем из db.json
    }

    if (!data) data = await loadSeed();

    db = normalize(data);
    migrateLegacyUsers();
    backfillOrderItemSnapshots();
    await hashUsers();
    persist();
    return db;
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====

  function normalizePhone(value) {
    const digits = String(value == null ? '' : value).replace(/\D/g, '');
    if (!digits) return '';
    return '+' + digits.replace(/^8/, '7');
  }

  function getUsers() {
    return db.users.map(u => Object.assign({}, u));
  }

  function findUserByLogin(login) {
    const value = String(login || '').trim().toLowerCase();
    const phone = normalizePhone(login);

    // Совместимость с демо-доступом admin / 123 из документа
    if (value === 'admin') {
      return db.users.find(u => u.role === 'admin') || null;
    }

    return db.users.find(u =>
      String(u.email || '').toLowerCase() === value ||
      (phone && normalizePhone(u.phone) === phone)
    ) || null;
  }

  async function addUser(data) {
    const email = String(data.email || '').trim().toLowerCase();
    const phone = normalizePhone(data.phone);
    const exists = db.users.some(u =>
      String(u.email || '').toLowerCase() === email ||
      (phone && normalizePhone(u.phone) === phone)
    );
    if (exists) throw new Error('Пользователь с таким email или телефоном уже существует');

    const user = {
      id: nextId(db.users),
      name: String(data.name || '').trim(),
      email: email,
      phone: phone,
      password: await hashPassword(data.password),
      role: data.role === 'admin' ? 'admin' : 'client'
    };
    db.users.push(user);
    persist();
    return Object.assign({}, user);
  }

  function updateUser(id, patch) {
    const user = db.users.find(u => Number(u.id) === Number(id));
    if (!user) return null;
    Object.assign(user, patch, { id: user.id });
    persist();
    return Object.assign({}, user);
  }

  // ===== КАТАЛОГ =====

  function nextId(list) {
    return Math.max(0, ...list.map(item => Number(item.id) || 0)) + 1;
  }

  function getBrands() {
    return db.brands.map(b => Object.assign({}, b));
  }

  function getCategories() {
    return db.categories.map(c => Object.assign({}, c));
  }

  function enrichProduct(product) {
    const brand = db.brands.find(b => Number(b.id) === Number(product.brand_id));
    const category = db.categories.find(c => Number(c.id) === Number(product.category_id));
    return Object.assign({}, product, {
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      brand: brand ? brand.name : 'Без бренда',
      brand_id: Number(product.brand_id) || null,
      category: category ? category.name : 'Без категории',
      category_id: Number(product.category_id) || null,
      connection_type: CONNECTION_TYPES.includes(product.connection_type)
        ? product.connection_type
        : CONNECTION_TYPES[0]
    });
  }

  function getProducts() {
    return db.products.map(enrichProduct);
  }

  function getProduct(id) {
    const product = db.products.find(p => Number(p.id) === Number(id));
    return product ? enrichProduct(product) : null;
  }

  function addProduct(data) {
    const product = {
      id: nextId(db.products),
      name: String(data.name || '').trim(),
      brand_id: Number(data.brand_id) || (db.brands[0] ? db.brands[0].id : 1),
      price: Math.max(0, Number(data.price) || 0),
      category_id: Number(data.category_id) || (db.categories[0] ? db.categories[0].id : 1),
      stock: Math.max(0, parseInt(data.stock, 10) || 0),
      image: String(data.image || '').trim() || 'assets/img/product-sony.png',
      description: String(data.description || '').trim(),
      connection_type: CONNECTION_TYPES.includes(data.connection_type) ? data.connection_type : CONNECTION_TYPES[0]
    };
    db.products.push(product);
    persist();
    return enrichProduct(product);
  }

  function updateProduct(id, data) {
    const product = db.products.find(p => Number(p.id) === Number(id));
    if (!product) return null;

    product.name = String(data.name != null ? data.name : product.name).trim();
    product.brand_id = Number(data.brand_id != null ? data.brand_id : product.brand_id);
    product.category_id = Number(data.category_id != null ? data.category_id : product.category_id);
    product.price = Math.max(0, Number(data.price != null ? data.price : product.price) || 0);
    product.stock = Math.max(0, parseInt(data.stock != null ? data.stock : product.stock, 10) || 0);
    product.image = String(data.image != null ? data.image : product.image).trim() || 'assets/img/product-sony.png';
    product.description = String(data.description != null ? data.description : product.description).trim();
    if (data.connection_type != null) {
      product.connection_type = CONNECTION_TYPES.includes(data.connection_type)
        ? data.connection_type
        : CONNECTION_TYPES[0];
    }

    persist();
    return enrichProduct(product);
  }

  function deleteProduct(id) {
    const productId = Number(id);
    const exists = db.products.some(p => Number(p.id) === productId);
    if (!exists) return false;

    db.products = db.products.filter(p => Number(p.id) !== productId);
    writeCart(getCart().filter(item => Number(item.product_id) !== productId));
    persist();
    return true;
  }

  // ===== КОРЗИНА =====

  function getCart() {
    try {
      const items = JSON.parse(localStorage.getItem(CART_KEY));
      return toArray(items)
        .filter(item => item && item.product_id != null && Number(item.quantity) > 0)
        .map(item => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) }));
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function addToCart(productId, quantity) {
    const product = db.products.find(p => Number(p.id) === Number(productId));
    if (!product || Number(product.stock) <= 0) return false;

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const cart = getCart();
    const item = cart.find(i => i.product_id === Number(productId));

    if (item) {
      item.quantity = Math.min(Number(product.stock), item.quantity + qty);
    } else {
      cart.push({ product_id: Number(productId), quantity: Math.min(Number(product.stock), qty) });
    }
    writeCart(cart);
    return true;
  }

  function setCartQty(productId, quantity) {
    const product = db.products.find(p => Number(p.id) === Number(productId));
    const qty = parseInt(quantity, 10) || 0;
    let cart = getCart();

    if (!product || qty <= 0) {
      cart = cart.filter(i => i.product_id !== Number(productId));
    } else {
      const max = Math.max(0, Number(product.stock));
      const item = cart.find(i => i.product_id === Number(productId));
      if (item) item.quantity = Math.min(max, qty);
      else if (max > 0) cart.push({ product_id: Number(productId), quantity: Math.min(max, qty) });
    }

    cart = cart.filter(i => i.quantity > 0 && db.products.some(p => Number(p.id) === i.product_id));
    writeCart(cart);
    return getCart();
  }

  function removeFromCart(productId) {
    writeCart(getCart().filter(i => i.product_id !== Number(productId)));
  }

  function clearCart() {
    writeCart([]);
  }

  function getCartItemsDetailed() {
    return getCart()
      .map(item => {
        const product = getProduct(item.product_id);
        if (!product) return null;
        const quantity = Math.min(item.quantity, Math.max(0, product.stock));
        return { product, quantity, sum: product.price * quantity };
      })
      .filter(Boolean)
      .filter(item => item.quantity > 0);
  }

  function getCartCount() {
    return getCartItemsDetailed().reduce((sum, item) => sum + item.quantity, 0);
  }

  function getCartTotal() {
    return getCartItemsDetailed().reduce((sum, item) => sum + item.sum, 0);
  }

  // ===== ИЗБРАННОЕ =====

  function readFavorites() {
    try {
      const data = JSON.parse(localStorage.getItem(FAV_KEY));
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  function getFavorites(userId) {
    const data = readFavorites();
    const key = String(userId || 'guest');
    return toArray(data[key]).map(Number);
  }

  function isFavorite(userId, productId) {
    return getFavorites(userId).includes(Number(productId));
  }

  function toggleFavorite(userId, productId) {
    const data = readFavorites();
    const key = String(userId || 'guest');
    const list = toArray(data[key]).map(Number);
    const id = Number(productId);
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1);
    else list.push(id);
    data[key] = list;
    localStorage.setItem(FAV_KEY, JSON.stringify(data));
    return index < 0;
  }

  // ===== ЗАКАЗЫ =====

  function getOrders() {
    return db.orders
      .map(o => Object.assign({}, o))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id));
  }

  function getOrdersByUser(userId) {
    return getOrders().filter(o => Number(o.user_id) === Number(userId));
  }

  function getOrder(id) {
    const order = db.orders.find(o => Number(o.id) === Number(id));
    return order ? Object.assign({}, order) : null;
  }

  function getOrderItems(orderId) {
    return db.order_items
      .filter(item => Number(item.order_id) === Number(orderId))
      .map(item => {
        const product = db.products.find(p => Number(p.id) === Number(item.product_id));
        return Object.assign({}, item, {
          name: item.product_name || (product ? product.name : 'Товар удалён'),
          image: item.product_image || (product ? product.image : ''),
          product: product ? enrichProduct(product) : null,
          sum: Number(item.price_at_moment) * Number(item.quantity)
        });
      });
  }

  function makeTrackNumber() {
    let digits = '';
    for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
    return 'TRK-' + digits;
  }

  function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function createOrder(userId, cartItems) {
    const user = db.users.find(u => Number(u.id) === Number(userId));
    if (!user) throw new Error('Для оформления заказа необходимо авторизоваться');
    if (user.role !== 'client') throw new Error('Оформление заказа доступно только клиентам');

    const items = toArray(cartItems)
      .map(item => ({ product_id: Number(item.product_id), quantity: parseInt(item.quantity, 10) || 0 }))
      .filter(item => item.product_id && item.quantity > 0);

    if (!items.length) throw new Error('Корзина пуста');

    const orderId = nextId(db.orders);
    const lines = [];
    let total = 0;

    for (const item of items) {
      const product = db.products.find(p => Number(p.id) === item.product_id);
      if (!product) throw new Error('Один из товаров больше недоступен');
      if (Number(product.stock) < item.quantity) {
        throw new Error('Недостаточно товара «' + product.name + '» на складе');
      }
      total += Number(product.price) * item.quantity;
      lines.push({
        order_id: orderId,
        product_id: Number(product.id),
        product_name: product.name,
        product_image: product.image,
        quantity: item.quantity,
        price_at_moment: Number(product.price)
      });
    }

    let itemId = nextId(db.order_items);
    lines.forEach(line => { line.id = itemId++; });

    const order = {
      id: orderId,
      user_id: Number(user.id),
      date: todayISO(),
      status: 'Новый',
      track_number: makeTrackNumber(),
      total_price: total
    };

    lines.forEach(line => {
      const product = db.products.find(p => Number(p.id) === line.product_id);
      if (product) product.stock = Math.max(0, Number(product.stock) - line.quantity);
    });

    db.orders.push(order);
    db.order_items.push.apply(db.order_items, lines);
    persist();

    return Object.assign({}, order, { items: getOrderItems(orderId) });
  }

  function updateOrderStatus(id, status) {
    if (!STATUSES.includes(status)) return false;
    const order = db.orders.find(o => Number(o.id) === Number(id));
    if (!order) return false;
    order.status = status;
    persist();
    return true;
  }

  // ===== ФОРМАТИРОВАНИЕ =====

  function formatPrice(value) {
    const number = Math.round(Number(value) || 0);
    return new Intl.NumberFormat('ru-RU').format(number) + ' ₽';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(String(value).slice(0, 10) + 'T00:00:00');
    if (isNaN(date.getTime())) return String(value);
    return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  function plural(number, forms) {
    const n = Math.abs(Number(number) || 0) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }

  function statusClass(status) {
    switch (status) {
      case 'Новый': return 'status--new';
      case 'Сборка': return 'status--assembly';
      case 'В пути': return 'status--transit';
      case 'Доставлен': return 'status--delivered';
      default: return 'status--pending';
    }
  }

  // ===== ЭКСПОРТ =====

  window.AudioStore = {
    ready,
    STATUSES,
    CONNECTION_TYPES,
    getDB: () => db,
    getUsers,
    findUserByLogin,
    addUser,
    updateUser,
    verifyPassword,
    normalizePhone,
    getBrands,
    getCategories,
    getProducts,
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    getCart,
    addToCart,
    setCartQty,
    removeFromCart,
    clearCart,
    getCartItemsDetailed,
    getCartCount,
    getCartTotal,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getOrders,
    getOrdersByUser,
    getOrder,
    getOrderItems,
    createOrder,
    updateOrderStatus,
    formatPrice,
    formatDate,
    plural,
    statusClass
  };
})();

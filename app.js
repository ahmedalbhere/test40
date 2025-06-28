// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update, 
  get,
  off
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ4VhGD49H3RNifMf9VCRPnkALAxNpsOU",
  authDomain: "project-2980864980936907935.firebaseapp.com",
  databaseURL: "https://project-2980864980936907935-default-rtdb.firebaseio.com",
  projectId: "project-2980864980936907935",
  storageBucket: "project-2980864980936907935.appspot.com",
  messagingSenderId: "580110751353",
  appId: "1:580110751353:web:8f039f9b34e1709d4126a8",
  measurementId: "G-R3JNPHCFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// State management
const state = {
  currentUser: null,
  currentUserType: null,
  barbers: {},
  queueListeners: {},
  barbersListener: null,
  currentRating: null
};

// DOM elements
const elements = {
  screens: {
    roleSelection: document.getElementById('roleSelection'),
    clientLogin: document.getElementById('clientLogin'),
    barberLogin: document.getElementById('barberLogin'),
    clientDashboard: document.getElementById('clientDashboard'),
    barberDashboard: document.getElementById('barberDashboard')
  },
  client: {
    name: document.getElementById('clientName'),
    phone: document.getElementById('clientPhone'),
    error: document.getElementById('clientError'),
    avatar: document.getElementById('clientAvatar'),
    bookingContainer: document.getElementById('currentBookingContainer'),
    bookingBarber: document.getElementById('bookingBarber'),
    bookingPosition: document.getElementById('bookingPosition'),
    bookingTime: document.getElementById('bookingTime'),
    cancelBookingBtn: document.getElementById('cancelBookingBtn'),
    barbersList: document.getElementById('barbersList'),
    citySearch: document.getElementById('citySearch')
  },
  barber: {
    phone: document.getElementById('barberPhone'),
    password: document.getElementById('barberPassword'),
    name: document.getElementById('barberName'),
    newPhone: document.getElementById('newBarberPhone'),
    city: document.getElementById('barberCity'),
    location: document.getElementById('barberLocation'),
    newPassword: document.getElementById('newBarberPassword'),
    confirmPassword: document.getElementById('confirmBarberPassword'),
    error: document.getElementById('barberError'),
    avatar: document.getElementById('barberAvatar'),
    queue: document.getElementById('barberQueue'),
    statusToggle: document.getElementById('statusToggle'),
    statusText: document.getElementById('statusText'),
    formTitle: document.getElementById('barberFormTitle'),
    loginForm: document.getElementById('barberLoginForm'),
    signupForm: document.getElementById('barberSignupForm')
  },
  rating: {
    container: document.getElementById('ratingContainer'),
    stars: document.querySelectorAll('.stars i'),
    comment: document.getElementById('ratingComment')
  }
};

// Utility functions
const utils = {
  generateId: () => 'id-' + Math.random().toString(36).substr(2, 9),
  
  showError: (element, message) => {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
  },
  
  validatePhone: (phone) => /^[0-9]{10,15}$/.test(phone),
  
  clearForm: (formElements) => {
    Object.values(formElements).forEach(element => {
      if (element && element.value) element.value = '';
    });
  },
  
  debounce: (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  },
  
  adjustLayoutForMobile: () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    const roleSelection = document.getElementById('roleSelection');
    const loginContainers = document.querySelectorAll('.login-container');
    const dashboards = document.querySelectorAll('.dashboard');
    
    if (roleSelection) {
      roleSelection.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    }
    
    loginContainers.forEach(container => {
      container.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
    
    dashboards.forEach(dashboard => {
      dashboard.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
  }
};

// Screen management
function showScreen(screenId) {
  Object.values(elements.screens).forEach(screen => {
    screen.classList.add('hidden');
  });
  elements.screens[screenId].classList.remove('hidden');
  
  window.scrollTo(0, 0);
  utils.adjustLayoutForMobile();
}

// Barber form management
function showBarberSignup() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب حلاق جديد';
  elements.barber.loginForm.classList.add('hidden');
  elements.barber.signupForm.classList.remove('hidden');
}

function showBarberLogin() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-cut"></i> تسجيل الدخول للحلاقين';
  elements.barber.signupForm.classList.add('hidden');
  elements.barber.loginForm.classList.remove('hidden');
}

// Authentication functions
async function clientLogin() {
  const name = elements.client.name.value.trim();
  const phone = elements.client.phone.value.trim();
  const rememberMe = document.getElementById('rememberMeClient').checked;
  
  if (!name) {
    utils.showError(elements.client.error, 'الرجاء إدخال الاسم');
    return;
  }
  
  if (!phone || !utils.validatePhone(phone)) {
    utils.showError(elements.client.error, 'الرجاء إدخال رقم هاتف صحيح (10-15 رقمًا)');
    return;
  }
  
  try {
    // إنشاء أو استعادة معرف العميل الفريد من localStorage إذا كان موجودًا
    let clientId = localStorage.getItem(`client_id_${phone}`);
    if (!clientId) {
      clientId = utils.generateId();
      localStorage.setItem(`client_id_${phone}`, clientId);
    }
    
    state.currentUser = {
      id: clientId,
      name,
      phone,
      type: 'client'
    };
    state.currentUserType = 'client';
    
    elements.client.avatar.textContent = name.charAt(0);
    showClientDashboard();
    await loadBarbers();
    await checkExistingBooking();
    
    if (rememberMe) {
      localStorage.setItem('client_data', JSON.stringify({ name, phone, remember: true }));
    } else {
      localStorage.removeItem('client_data');
    }
  } catch (error) {
    utils.showError(elements.client.error, 'حدث خطأ أثناء تسجيل الدخول');
    console.error('Client login error:', error);
  }
}

// باقي دوال المصادقة (barberSignup و barberLogin) تبقى كما هي بدون تغيير

// Dashboard functions
function showClientDashboard() {
  showScreen('clientDashboard');
}

function showBarberDashboard() {
  showScreen('barberDashboard');
  
  onValue(ref(database, 'barbers/' + state.currentUser.id + '/status'), (snapshot) => {
    const status = snapshot.val() || 'open';
    elements.barber.statusToggle.checked = status === 'open';
    elements.barber.statusText.textContent = status === 'open' ? 'مفتوح' : 'مغلق';
  });
  
  elements.barber.statusToggle.addEventListener('change', function() {
    const newStatus = this.checked ? 'open' : 'closed';
    update(ref(database, 'barbers/' + state.currentUser.id), { status: newStatus });
  });
}

// Barber management
async function loadBarbers() {
  elements.client.barbersList.innerHTML = '<div class="loading">جارٍ تحميل قائمة الحلاقين...</div>';
  
  if (state.barbersListener) {
    off(state.barbersListener);
  }
  
  state.barbersListener = onValue(ref(database, 'barbers'), (snapshot) => {
    state.barbers = snapshot.val() || {};
    renderBarbersList();
  }, (error) => {
    elements.client.barbersList.innerHTML = '<div class="error">حدث خطأ أثناء تحميل الحلاقين</div>';
    console.error('Load barbers error:', error);
  });
}

function renderBarbersList() {
  if (!elements.client.barbersList) return;
  
  elements.client.barbersList.innerHTML = '';
  
  if (!state.barbers || Object.keys(state.barbers).length === 0) {
    elements.client.barbersList.innerHTML = '<div class="no-results">لا يوجد حلاقون مسجلون حالياً</div>';
    return;
  }
  
  const sortedBarbers = Object.entries(state.barbers)
    .sort(([, a], [, b]) => (b.averageRating || 0) - (a.averageRating || 0));
  
  sortedBarbers.forEach(([id, barber], index) => {
    const isTopRated = index < 3 && barber.averageRating >= 4;
    
    // التحقق مما إذا كان العميل لديه حجز نشط لدى هذا الحلاق
    const hasActiveBooking = barber.queue && 
      Object.values(barber.queue).some(
        booking => booking.clientId === state.currentUser?.id && booking.isActive !== false
      );
    
    const barberCard = document.createElement('div');
    barberCard.className = `barber-card ${isTopRated ? 'top-rated' : ''}`;
    
    const statusClass = barber.status === 'open' ? 'status-open' : 'status-closed';
    const statusText = barber.status === 'open' ? 'مفتوح' : 'مغلق';
    const queueLength = barber.queue ? 
      Object.values(barber.queue).filter(b => b.isActive !== false).length : 0;
    
    const ratingStars = barber.averageRating ? 
      `<div class="barber-rating">
        ${'<i class="fas fa-star"></i>'.repeat(Math.round(barber.averageRating))}
        <span class="barber-rating-count">(${barber.ratingCount || 0})</span>
      </div>` : '';
    
    barberCard.innerHTML = `
      <div class="barber-info">
        <div class="barber-header">
          <div class="barber-avatar">${barber.name.charAt(0)}</div>
          <div class="barber-name">${barber.name}</div>
        </div>
        <div class="barber-status ${statusClass}">${statusText}</div>
        ${ratingStars}
        <div class="barber-details">
          <div><i class="fas fa-city"></i> المدينة: <span class="city-name">${barber.city || 'غير متوفر'}</span></div>
          <div><i class="fas fa-phone"></i> رقم الهاتف: ${barber.phone || 'غير متوفر'}</div>
          <div><i class="fas fa-map-marker-alt"></i> الموقع: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barber.location)}" target="_blank" class="location-link">${barber.location || 'غير متوفر'}</a></div>
          <div><i class="fas fa-users"></i> عدد المنتظرين: ${queueLength}</div>
          <div><i class="fas fa-clock"></i> وقت الانتظار التقريبي: ${queueLength * 15} دقيقة</div>
        </div>
      </div>
      <button class="book-btn" ${barber.status === 'closed' || hasActiveBooking ? 'disabled' : ''}" 
              onclick="bookAppointment('${id}', '${barber.name.replace(/'/g, "\\'")}')">
        ${hasActiveBooking ? '<i class="fas fa-calendar-check"></i> لديك حجز بالفعل' : 
          (barber.status === 'open' ? '<i class="fas fa-calendar-plus"></i> احجز الآن' : '<i class="fas fa-calendar-times"></i> غير متاح')}
      </button>
    `;
    
    elements.client.barbersList.appendChild(barberCard);
  });
}

// Booking management
async function bookAppointment(barberId, barberName) {
  if (!state.currentUser) return;
  
  try {
    // إنشاء حجز جديد مع وضع العميل في أعلى القائمة
    const newBookingRef = push(ref(database, `barbers/${barberId}/queue`));
    await set(newBookingRef, {
      clientId: state.currentUser.id,
      clientName: state.currentUser.name,
      clientPhone: state.currentUser.phone,
      timestamp: Date.now(),
      isActive: true
    });
    
    state.currentUser.booking = {
      barberId,
      barberName,
      bookingId: newBookingRef.key,
      timestamp: new Date().toLocaleString('ar-EG')
    };
    
    // حفظ بيانات الحجز في localStorage
    localStorage.setItem(`client_booking_${state.currentUser.phone}`, JSON.stringify({
      barberId,
      bookingId: newBookingRef.key,
      barberName,
      timestamp: Date.now()
    }));
    
    showCurrentBooking();
    renderBarbersList();
    
    alert(`تم الحجز بنجاح مع الحلاق ${barberName}`);
  } catch (error) {
    alert('حدث خطأ أثناء الحجز: ' + error.message);
    console.error('Booking error:', error);
  }
}

async function checkExistingBooking() {
  if (!state.currentUser || state.currentUser.type !== 'client') return;
  
  // التحقق من وجود حجز محفوظ في localStorage
  const savedBooking = localStorage.getItem(`client_booking_${state.currentUser.phone}`);
  if (savedBooking) {
    const bookingData = JSON.parse(savedBooking);
    
    // التحقق من أن الحجز لا يزال نشطًا في قاعدة البيانات
    const bookingRef = ref(database, `barbers/${bookingData.barberId}/queue/${bookingData.bookingId}`);
    const snapshot = await get(bookingRef);
    
    if (snapshot.exists() && snapshot.val().isActive !== false) {
      state.currentUser.booking = {
        barberId: bookingData.barberId,
        barberName: bookingData.barberName,
        bookingId: bookingData.bookingId,
        timestamp: new Date(bookingData.timestamp).toLocaleString('ar-EG')
      };
      showCurrentBooking();
      return;
    } else {
      // إذا كان الحجز غير موجود أو غير نشط، نقوم بحذفه من localStorage
      localStorage.removeItem(`client_booking_${state.currentUser.phone}`);
    }
  }
  
  // البحث في قاعدة البيانات عن حجوزات نشطة للعميل
  for (const [barberId, barber] of Object.entries(state.barbers)) {
    if (barber.queue) {
      for (const [bookingId, booking] of Object.entries(barber.queue)) {
        if (booking.clientId === state.currentUser.id && booking.isActive !== false) {
          state.currentUser.booking = {
            barberId,
            barberName: barber.name,
            bookingId,
            timestamp: new Date(booking.timestamp).toLocaleString('ar-EG')
          };
          
          // حفظ بيانات الحجز في localStorage
          localStorage.setItem(`client_booking_${state.currentUser.phone}`, JSON.stringify({
            barberId,
            bookingId,
            barberName: barber.name,
            timestamp: booking.timestamp
          }));
          
          showCurrentBooking();
          return;
        }
      }
    }
  }
}

function showCurrentBooking() {
  if (!state.currentUser?.booking) return;
  
  const { booking } = state.currentUser;
  elements.client.bookingBarber.textContent = booking.barberName;
  elements.client.bookingTime.textContent = booking.timestamp;
  
  if (state.queueListeners[booking.barberId]) {
    off(state.queueListeners[booking.barberId]);
  }
  
  state.queueListeners[booking.barberId] = onValue(
    ref(database, `barbers/${booking.barberId}/queue`), 
    (snapshot) => {
      const queue = snapshot.val() || {};
      // تصفية الحجوزات النشطة فقط وفرزها حسب الوقت
      const queueArray = Object.entries(queue)
        .filter(([_, value]) => value.isActive !== false)
        .map(([key, value]) => ({
          id: key,
          ...value
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const position = queueArray.findIndex(item => item.id === booking.bookingId) + 1;
      elements.client.bookingPosition.textContent = position > 0 ? position : '--';
    },
    (error) => {
      console.error('Queue listener error:', error);
    }
  );
  
  elements.client.bookingContainer.classList.remove('hidden');
  elements.client.cancelBookingBtn.onclick = cancelBooking;
}

async function cancelBooking() {
  if (!state.currentUser?.booking) return;
  
  const { barberId, bookingId } = state.currentUser.booking;
  
  if (!confirm('هل أنت متأكد من إلغاء الحجز؟')) return;
  
  try {
    // بدلاً من الحذف، نقوم بتحديث حالة الحجز إلى غير نشط
    await update(ref(database, `barbers/${barberId}/queue/${bookingId}`), {
      isActive: false
    });
    
    // حذف بيانات الحجز من localStorage
    localStorage.removeItem(`client_booking_${state.currentUser.phone}`);
    
    delete state.currentUser.booking;
    elements.client.bookingContainer.classList.add('hidden');
    renderBarbersList();
    
    alert('تم إلغاء الحجز بنجاح');
  } catch (error) {
    alert('حدث خطأ أثناء إلغاء الحجز: ' + error.message);
    console.error('Cancel booking error:', error);
  }
}

// باقي الدوال (setupRatingStars, submitRating, updateBarberRating, showRatingForm, loadBarberQueue, completeClient, filterBarbers) تبقى كما هي بدون تغيير

// Logout function
async function logout() {
  try {
    Object.values(state.queueListeners).forEach(off);
    if (state.barbersListener) off(state.barbersListener);
    
    await signOut(auth);
    state.currentUser = null;
    state.currentUserType = null;
    state.queueListeners = {};
    state.barbersListener = null;
    state.currentRating = null;
    
    utils.clearForm(elements.client);
    utils.clearForm(elements.barber);
    
    showScreen('roleSelection');
  } catch (error) {
    alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
    console.error('Logout error:', error);
  }
}

// Initialize app
function init() {
  elements.client.citySearch.addEventListener('input', utils.debounce(filterBarbers, 300));
  
  setupRatingStars();
  
  // Load saved login data
  const savedBarberLogin = JSON.parse(localStorage.getItem('barber_login'));
  if (savedBarberLogin) {
    elements.barber.phone.value = savedBarberLogin.phone;
    elements.barber.password.value = savedBarberLogin.password;
    document.getElementById('rememberMeBarber').checked = true;
  }
  
  const savedClientData = JSON.parse(localStorage.getItem('client_data'));
  if (savedClientData) {
    elements.client.name.value = savedClientData.name;
    elements.client.phone.value = savedClientData.phone;
    document.getElementById('rememberMeClient').checked = true;
  }
  
  // Make functions available globally
  window.showScreen = showScreen;
  window.clientLogin = clientLogin;
  window.barberLogin = barberLogin;
  window.barberSignup = barberSignup;
  window.showBarberSignup = showBarberSignup;
  window.showBarberLogin = showBarberLogin;
  window.bookAppointment = bookAppointment;
  window.completeClient = completeClient;
  window.filterBarbers = filterBarbers;
  window.logout = logout;
  window.cancelBooking = cancelBooking;
  window.submitRating = submitRating;
  
  onAuthStateChanged(auth, (user) => {
    if (user && state.currentUserType === 'barber') {
      showBarberDashboard();
      loadBarberQueue();
    }
  });
  
  utils.adjustLayoutForMobile();
  window.addEventListener('resize', utils.adjustLayoutForMobile);
  
  showScreen('roleSelection');
}

// Start the app
init();

// view.js

const DOMElements = {
    // Properti akan diisi saat init() dipanggil
    locationInfo: null, countdown: null, jadwal: null, calibrationMenu: null,
    notificationMenu: null, feedbackMenu: null, btnCalibration: null,
    btnNotification: null, btnFeedback: null, btnTestNotification: null,
    calibrationForm: null, toggleNotification: null, audioSelect: null,
    downloadAudio: null,

    init: function() {
        this.locationInfo = document.getElementById('location-info');
        this.countdown = document.getElementById('countdown');
        this.jadwal = document.getElementById('jadwal');
        this.calibrationMenu = document.getElementById('calibration-menu');
        this.notificationMenu = document.getElementById('notification-menu');
        this.feedbackMenu = document.getElementById('feedback-menu');
        this.btnCalibration = document.getElementById('btn-calibration');
        this.btnNotification = document.getElementById('btn-notification');
        this.btnFeedback = document.getElementById('btn-feedback');
        this.btnTestNotification = document.getElementById('btn-test-notification');
        this.calibrationForm = document.getElementById('calibration-form');
        this.toggleNotification = document.getElementById('toggle-notification');
        this.audioSelect = document.getElementById('audio-select');
        this.downloadAudio = document.getElementById('btn-download-audio');
    }
};

const NotificationManager = {
    init: function() {
        this._setupEventListeners();
        this._loadSettings();
    },

    _loadSettings: function() {
        DOMElements.toggleNotification.checked = localStorage.getItem("notificationsEnabled") === "true";
        const savedAudio = localStorage.getItem("selectedAudio") || "adzan1.mp3";
        DOMElements.audioSelect.value = savedAudio;
        if(DOMElements.downloadAudio) DOMElements.downloadAudio.href = savedAudio;
    },

    _setupEventListeners: function() {
        DOMElements.toggleNotification.addEventListener("change", (e) => this._handleToggle(e));
        DOMElements.audioSelect.addEventListener("change", (e) => this._handleAudioSelect(e));
        if(DOMElements.btnTestNotification) {
            DOMElements.btnTestNotification.addEventListener("click", () => this.testNotification());
        }
    },

    _handleToggle: function(e) {
        if (e.target.checked) {
            Notification.requestPermission().then(permission => {
                const isGranted = permission === "granted";
                localStorage.setItem("notificationsEnabled", isGranted ? "true" : "false");
                if (!isGranted) e.target.checked = false;
            });
        } else {
            localStorage.setItem("notificationsEnabled", "false");
        }
    },

    _handleAudioSelect: function(e) {
        localStorage.setItem("selectedAudio", e.target.value);
        if(DOMElements.downloadAudio) DOMElements.downloadAudio.href = e.target.value;
    },
    
    scheduleNext: function(nextPrayer) {
        if (this.timeout) clearTimeout(this.timeout);
        if (!nextPrayer || !nextPrayer.time) return;
        
        const diff = nextPrayer.time - new Date();
        if (diff > 0) {
            this.timeout = setTimeout(() => {
                this.trigger(nextPrayer.name, nextPrayer.time);
            }, diff);
        }
    },

    trigger: function(prayerName, prayerTime) {
        if (localStorage.getItem("notificationsEnabled") === "true" && Notification.permission === "granted") {
            const title = `Waktu Sholat ${AppConfig.prayerNames[prayerName]} Telah Tiba`;
            const options = { body: `Waktu: ${prayerTime.toLocaleTimeString()}`, icon: "favicon.png" };
            new Notification(title, options);
        }
        this._playAudio();
    },

    testNotification: function() {
        const testTime = new Date();
        testTime.setSeconds(testTime.getSeconds() + 1);
        this.trigger("Uji Coba", testTime);
    },

    _playAudio: function() {
        const audioSrc = localStorage.getItem("selectedAudio") || "adzan1.mp3";
        const audio = new Audio(audioSrc);
        audio.play().catch(error => console.error("Gagal memutar audio:", error));
    }
};

const UIManager = {
    init: function(app) {
        this.app = app;
        // PERBAIKAN: Tidak lagi menginisialisasi modul lain di sini
        this._setupMenuToggles();
        this._setupCalibrationForm();
    },

    _setupMenuToggles: function() {
        const setup = (btn, menu) => {
            if (btn && menu) {
                btn.addEventListener("click", () => {
                    menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "block" : "none";
                });
            }
        };
        setup(DOMElements.btnCalibration, DOMElements.calibrationMenu);
        setup(DOMElements.btnNotification, DOMElements.notificationMenu);
        setup(DOMElements.btnFeedback, DOMElements.feedbackMenu);
    },

    _setupCalibrationForm: function() {
        const form = DOMElements.calibrationForm;
        if (!form) return;

        const userCalibration = JSON.parse(localStorage.getItem("userCalibration")) || AppConfig.defaultCalibration;
        for (const key in userCalibration) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = userCalibration[key];
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newCalibration = {};
            for (const [key, value] of formData.entries()) {
                newCalibration[key] = parseFloat(value) || 0;
            }
            localStorage.setItem("userCalibration", JSON.stringify(newCalibration));
            DOMElements.calibrationMenu.style.display = "none";
            this.app.run(newCalibration);
        });
    },

    updateLocation: function(locationData) {
        DOMElements.locationInfo.innerHTML = `<strong>Lokasi:</strong> ${locationData.text}<br><small>(Lat: ${locationData.lat.toFixed(4)}, Lng: ${locationData.lng.toFixed(4)}, Alt: ${locationData.altitude.toFixed(0)}m)</small>`;
    },

    updatePrayerTimes: function(times) {
        const jadwalDiv = DOMElements.jadwal;
        jadwalDiv.innerHTML = "";
        const prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
        
        prayers.forEach(prayer => {
            const p = document.createElement('div');
            p.className = 'prayer-time';
            p.innerHTML = `<strong>${AppConfig.prayerNames[prayer]}:</strong> ${times[prayer]}`;
            jadwalDiv.appendChild(p);
        });
    },

    updateCountdown: function(diff) {
        const pad = num => ("0" + Math.floor(num)).slice(-2);
        const hours = diff / (1000 * 60 * 60);
        const minutes = (diff % (1000 * 60 * 60)) / (1000 * 60);
        const seconds = (diff % (1000 * 60)) / 1000;
        
        const nextPrayer = PrayerTimeManager.getNextPrayer();
        if(nextPrayer && nextPrayer.name){
            DOMElements.countdown.innerHTML = `<strong>Hitung Mundur:</strong> ${AppConfig.prayerNames[nextPrayer.name]} dalam ${pad(hours)}:${pad(minutes)}:${pad(seconds)} lagi`;
        }
    },

    showError: function(message) {
        DOMElements.locationInfo.innerHTML = "<strong>Terjadi Kesalahan</strong>";
        DOMElements.countdown.innerHTML = message;
        DOMElements.jadwal.innerHTML = "";
    }
};
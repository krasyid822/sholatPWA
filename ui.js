const UI = {
  init: function(app) {
    this.app = app;
    this.initAudioSelector();
    this.initNotificationSettings();
    this.initMenuToggles();
    this.initTestNotificationButton();
    this.initCalibrationForm();
  },
  
  initCalibrationForm: function() {
    const calibMenu = document.getElementById("calibration-menu");
    const calibForm = document.getElementById("calibration-form");
    const userCalibration = JSON.parse(localStorage.getItem("userCalibration")) || AppConfig.defaultCalibration;

    for (const key in userCalibration) {
      const input = calibForm.querySelector(`[name="${key}"]`);
      if (input) input.value = userCalibration[key];
    }
    
    document.getElementById("btn-calibration").addEventListener("click", () => {
      calibMenu.style.display = (calibMenu.style.display === "none" || calibMenu.style.display === "") ? "block" : "none";
    });

    calibForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const newCalibration = {};
      for(const [key, value] of formData.entries()){
        newCalibration[key] = parseFloat(value) || 0;
      }
      
      localStorage.setItem("userCalibration", JSON.stringify(newCalibration));
      calibMenu.style.display = "none";
      
      if (window.currentLocationData) {
        this.app.updateSchedule(window.currentLocationData, newCalibration);
      }
    });
  },

  displayPrayerTimes: function(times, locationData) {
    document.getElementById('location-info').innerHTML = 
      `<strong>Lokasi:</strong> ${locationData.text}<br><small>(Lat: ${locationData.lat.toFixed(4)}, Lng: ${locationData.lng.toFixed(4)}, Alt: ${locationData.altitude.toFixed(0)}m)</small>`;
      
    const jadwalDiv = document.getElementById('jadwal');
    jadwalDiv.innerHTML = "";
    
    const prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    prayers.forEach(prayer => {
      const p = document.createElement('div');
      p.className = 'prayer-time';
      p.innerHTML = `<strong>${AppConfig.prayerNames[prayer]}:</strong> ${times[prayer]}`;
      jadwalDiv.appendChild(p);
    });

    this.startCountdown(times);
    this.scheduleNextNotification(times);
  },

  startCountdown: function(times) {
    const countdownElem = document.getElementById("countdown");
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    
    window.countdownInterval = setInterval(() => {
      const next = this.getNextPrayer(times);
      const now = new Date();
      const diff = next.time - now;
      if (diff < 0) return;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      countdownElem.innerHTML = 
        `<strong>Hitung Mundur:</strong> ${AppConfig.prayerNames[next.name]} dalam ${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)} lagi`;
    }, 1000);
  },

  getNextPrayer: function(times) {
    const now = new Date();
    const prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    
    for (const prayer of prayers) {
      const prayerDate = this.parseTime(times[prayer]);
      if (prayerDate > now) {
        return { name: prayer, time: prayerDate };
      }
    }
    
    const nextPrayerTime = this.parseTime(times["imsak"]);
    nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
    return { name: "imsak", time: nextPrayerTime };
  },

  scheduleNextNotification: function(times) {
      if (window.notificationTimeout) clearTimeout(window.notificationTimeout);
      
      const next = this.getNextPrayer(times);
      const diff = next.time - new Date();

      if (diff > 0) {
        window.notificationTimeout = setTimeout(() => {
          this.triggerNotification(next.name, next.time);
          this.playAdzanAudio();
          this.scheduleNextNotification(times);
        }, diff);
      }
  },

  triggerNotification: function(prayerName, prayerTime) {
    if (localStorage.getItem("notificationsEnabled") === "true" && Notification.permission === "granted") {
      const title = `Waktu Sholat ${AppConfig.prayerNames[prayerName]} Telah Tiba`;
      const options = {
        body: `Waktu: ${prayerTime.toLocaleTimeString()}`,
        icon: "favicon.png"
      };
      new Notification(title, options);
    }
  },

  playAdzanAudio: function() {
    const audioSrc = localStorage.getItem("selectedAudio") || "adzan1.mp3";
    const audio = new Audio(audioSrc);
    audio.play().catch(error => console.error("Gagal memutar audio:", error));
  },
  
  initMenuToggles: function() {
    document.querySelectorAll('.btn[id]').forEach(button => {
      if (button.id !== 'btn-calibration') { // Kalibrasi ditangani terpisah
        const menuId = button.id.replace('btn-', '');
        const menu = document.getElementById(menuId) || document.getElementById(menuId.replace('-settings', ''));
        if (menu) {
          button.addEventListener("click", () => {
            menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "block" : "none";
          });
        }
      }
    });
  },

  initAudioSelector: function() {
    const savedAudio = localStorage.getItem("selectedAudio") || "adzan1.mp3";
    const audioSelectElem = document.getElementById("audio-select");
    const downloadLink = document.getElementById("btn-download-audio");
    
    audioSelectElem.value = savedAudio;
    if(downloadLink) downloadLink.href = savedAudio;
    
    audioSelectElem.addEventListener("change", function() {
      localStorage.setItem("selectedAudio", this.value);
      if(downloadLink) downloadLink.href = this.value;
    });
  },

  initNotificationSettings: function() {
    const toggleNotif = document.getElementById("toggle-notification");
    toggleNotif.checked = localStorage.getItem("notificationsEnabled") === "true";
    
    toggleNotif.addEventListener("change", function(e) {
      if (e.target.checked) {
        Notification.requestPermission().then(permission => {
          localStorage.setItem("notificationsEnabled", permission === "granted" ? "true" : "false");
          if (permission !== "granted") e.target.checked = false;
        });
      } else {
        localStorage.setItem("notificationsEnabled", "false");
      }
    });
  },

  initTestNotificationButton: function() {
      const testBtn = document.getElementById("btn-test-notification");
      if(testBtn) {
        testBtn.addEventListener("click", () => {
            const testTime = new Date();
            testTime.setSeconds(testTime.getSeconds() + 1);
            this.triggerNotification("Uji Coba", testTime);
            this.playAdzanAudio();
        });
      }
  },

  pad: num => ("0" + num).slice(-2),
  parseTime: timeStr => {
    const parts = timeStr.split(":");
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0]), parseInt(parts[1]), 0);
  }
};
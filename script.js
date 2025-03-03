document.addEventListener("DOMContentLoaded", function(){
  // Inisialisasi PrayTimes
  var prayerNames = {
    imsak: "Imsak",
    fajr: "Subuh",
    sunrise: "Terbit",
    dhuhr: "Zuhur",
    asr: "Ashar",
    maghrib: "Maghrib",
    isha: "Isya"
  };

  // Inisialisasi kalibrasi (offset dalam menit) dengan default
  var calibrationOffsets = {
    imsak: -5,  // nilai default imsak
    fajr: -5,
    sunrise: -3,
    dhuhr: 4,
    asr: 2,
    maghrib: 3,
    isha: 6,
    hijriDate: -2
  };

  // Jika ada data kalibrasi tersimpan di localStorage, gunakan itu
  if(localStorage.getItem("calibrationOffsets")){
    calibrationOffsets = JSON.parse(localStorage.getItem("calibrationOffsets"));
    document.querySelectorAll("#calibration-form input").forEach(function(input){
      input.value = calibrationOffsets[input.name] || 0;
    });
  }

  // **Assign ke global**
  window.calibrationOffsets = calibrationOffsets;

  // Cek dan ambil pilihan audio yang tersimpan (default: "audio/adzan1.mp3")
  var savedAudio = localStorage.getItem("selectedAudio") || "adzan1";
  var audioSelectElem = document.getElementById("audio-select");
  audioSelectElem.value = savedAudio;
  // Update link download audio
  var downloadLink = document.getElementById("btn-download-audio");
  downloadLink.href = savedAudio;

  // Simpan pilihan audio ketika user mengubah dropdown
  audioSelectElem.addEventListener("change", function(){
    localStorage.setItem("selectedAudio", audioSelectElem.value);
    // Update link download
    downloadLink.href = audioSelectElem.value;
  });

  // Fungsi untuk menampilkan jadwal sholat
  function tampilkanJadwal(lat, lng, lokasiText) {
    document.getElementById('location-info').innerHTML =
      `<strong>Lokasi:</strong> ${lokasiText} (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
    var today = new Date();
    var timezone = 7; // Contoh: Jakarta GMT+7

    // Atur metode perhitungan dan offset kalibrasi
    prayTimes.setMethod('MWL');
    prayTimes.tune(calibrationOffsets);
    var times = prayTimes.getTimes(today, [lat, lng], timezone);

    // Tampilkan jadwal sholat
    var jadwalDiv = document.getElementById('jadwal');
    jadwalDiv.innerHTML = "";

    // Tambahkan "imsak" ke daftar waktu
    var prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

    // Menampilkan jadwal sholat dengan label lokal
    prayers.forEach(function(prayer){
      var p = document.createElement('div');
      p.className = 'prayer-time';
      p.innerHTML = `<strong>${prayerNames[prayer]}:</strong> ${times[prayer]}`;
      jadwalDiv.appendChild(p);
    });

    // Fungsi untuk menambahkan nol di depan angka
    function pad(num) {
      return ("0" + num).slice(-2);
    }

    // Fungsi untuk mengupdate tampilan countdown setiap detik
    function startCountdown(times) {
      var countdownElem = document.getElementById("countdown");
      setInterval(function(){
        var next = getNextPrayer(times);
        var nextPrayerName = next.name;
        var nextPrayerTime = next.time;
        var now = new Date();
        var diff = nextPrayerTime - now;
        if(diff < 0) diff = 0;
        var hours = Math.floor(diff / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((diff % (1000 * 60)) / 1000);
        countdownElem.innerHTML =
          `<strong>Hitung Mundur:</strong> ${prayerNames[nextPrayerName]} dalam ${pad(hours)}:${pad(minutes)}:${pad(seconds)} lagi`;
      }, 1000);
    }
    // Fungsi untuk menjadwalkan notifikasi otomatis saat waktu sholat tiba
    function scheduleNotification(times) {
      var next = getNextPrayer(times);
      var nextPrayerName = next.name;
      var nextPrayerTime = next.time;
      var diff = nextPrayerTime - new Date();
      if(diff > 0) {
        setTimeout(function(){
          triggerNotification(nextPrayerName, nextPrayerTime);
          playAdzanAudio();
          scheduleNotification(times); // menjadwalkan notifikasi berikutnya
        }, diff);
      }
    }

      // Mulai countdown dan jadwalkan notifikasi otomatis
      startCountdown(times);
      scheduleNotification(times);
    }

  // Fungsi konversi waktu string (misal "05:30") menjadi objek Date hari ini
  function parseTime(timeStr) {
    var parts = timeStr.split(":");
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0]), parseInt(parts[1]), 0);
  }


  // Fungsi untuk mendapatkan sholat berikutnya
  function getNextPrayer(times) {
    var now = new Date();
    // Sertakan "imsak" di sini, sehingga jika waktu sekarang sebelum imsak, maka imsak akan menjadi target berikutnya.
    var prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    var nextPrayer = null;
    var nextPrayerTime = null;
    for (var i = 0; i < prayers.length; i++) {
      var prayer = prayers[i];
      var prayerDate = parseTime(times[prayer]);
      if (prayerDate > now) {
         nextPrayer = prayer;
         nextPrayerTime = prayerDate;
         break;
      }
    }
    if (!nextPrayer) {
      nextPrayer = "imsak";
      nextPrayerTime = parseTime(times["imsak"]);
      nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
    }
    return { name: nextPrayer, time: nextPrayerTime };
  }

  // Handler untuk menu kalibrasi
  var btnCalib = document.getElementById("btn-calibration");
  var calibMenu = document.getElementById("calibration-menu");
  btnCalib.addEventListener("click", function(){
    calibMenu.style.display =
      (calibMenu.style.display === "none" || calibMenu.style.display === "") ? "block" : "none";
  });
  document.getElementById("calibration-form").addEventListener("submit", function(e){
    e.preventDefault();
    var formData = new FormData(e.target);
    calibrationOffsets = {
      imsak: parseFloat(formData.get("imsak")) || -5,
      fajr: parseFloat(formData.get("fajr")) || -5,
      sunrise: parseFloat(formData.get("sunrise")) || -3,
      dhuhr: parseFloat(formData.get("dhuhr")) || 4,
      asr: parseFloat(formData.get("asr")) || 2,
      maghrib: parseFloat(formData.get("maghrib")) || 3,
      isha: parseFloat(formData.get("isha")) || 6
    };
    localStorage.setItem("calibrationOffsets", JSON.stringify(calibrationOffsets));
    calibMenu.style.display = "none";
    if(window.currentLat && window.currentLng && window.currentLokasiText){
      tampilkanJadwal(window.currentLat, window.currentLng, window.currentLokasiText);
    }
  });

  // Pengaturan Notifikasi: simpan preferensi di localStorage
  var toggleNotif = document.getElementById("toggle-notification");
  var notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
  toggleNotif.checked = notificationsEnabled;
  toggleNotif.addEventListener("change", function(e) {
    if(e.target.checked) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission().then(function(permission) {
          if (permission === "granted") {
             localStorage.setItem("notificationsEnabled", "true");
          } else {
             e.target.checked = false;
             localStorage.setItem("notificationsEnabled", "false");
          }
        });
      } else {
        localStorage.setItem("notificationsEnabled", "true");
      }
    } else {
      localStorage.setItem("notificationsEnabled", "false");
    }
  });

  // Fungsi untuk menampilkan notifikasi
  function triggerNotification(prayerName, prayerTime) {
    if(localStorage.getItem("notificationsEnabled") === "true" && Notification.permission === "granted") {
      var title = `Waktu Sholat ${prayerNames[prayerName]} Telah Tiba`;
      var options = {
        body: `Waktu: ${prayerTime.toLocaleTimeString()}`,
        icon: "favicon.png"
      };
      new Notification(title, options);
    }
  }

  // Fungsi untuk memutar audio adzan sesuai pilihan user
  function playAdzanAudio() {
    var audioSelect = document.getElementById("audio-select");
    var audioSrc = audioSelect.value;
    var audio = new Audio(audioSrc);
    audio.play().catch(function(error){
      console.error("Gagal memutar audio:", error);
    });
  }


  // Tombol uji notifikasi yang mengacu ke waktu sholat berikutnya
  document.getElementById("btn-test-notification").addEventListener("click", function() {
    var times = prayTimes.getTimes(new Date(), [window.currentLat || -6.200000, window.currentLng || 106.816666], 7);
    var next = getNextPrayer(times);
    triggerNotification(next.name, next.time);
    playAdzanAudio();
  });

  // Fungsi untuk melakukan reverse geocoding menggunakan API Nominatim
  function reverseGeocode(lat, lng) {
    var url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    return fetch(url, { headers: { 'Accept': 'application/json' } })
          .then(response => response.json());
  }


  // Cek Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        window.currentLat = lat;
        window.currentLng = lng;
        reverseGeocode(lat, lng)
          .then(data => {
            var lokasiText = data.address.city || data.address.town || data.address.village || data.display_name || "Lokasi Anda";
            window.currentLokasiText = lokasiText;
            tampilkanJadwal(lat, lng, lokasiText);
          })
          .catch(error => {
            console.error("Reverse geocoding error:", error);
            window.currentLokasiText = "Lokasi Anda";
            tampilkanJadwal(lat, lng, "Lokasi Anda");
          });
      },
      function(error) {
        console.log("Gagal mendapatkan lokasi: ", error.message);
        var lat = -6.200000;
        var lng = 106.816666;
        window.currentLat = lat;
        window.currentLng = lng;
        window.currentLokasiText = "Jakarta (Default)";
        tampilkanJadwal(lat, lng, "Jakarta (Default)");
      }
    );
  } else {
    console.log("Geolocation tidak didukung browser ini.");
    var lat = -6.200000;
    var lng = 106.816666;
    window.currentLat = lat;
    window.currentLng = lng;
    window.currentLokasiText = "Jakarta (Default)";
    tampilkanJadwal(lat, lng, "Jakarta (Default)");
  }

  // Handler untuk menu notifikasi
  var btnNotif = document.getElementById("btn-notification-settings");
  var notifMenu = document.getElementById("notification-settings");
  btnNotif.addEventListener("click", function(){
    notifMenu.style.display =
      (notifMenu.style.display === "none" || notifMenu.style.display === "") ? "block" : "none";
  });

  // Handler untuk menu feedback
  var btnFed = document.getElementById("btn-feedback");
  var fedMenu = document.getElementById("usr-feedback");
  btnFed.addEventListener("click", function(){
    fedMenu.style.display =
      (fedMenu.style.display === "none" || fedMenu.style.display === "") ? "block" : "none";
  });

  
  // Jangan diluar dari event listener DOMContentLoaded
});
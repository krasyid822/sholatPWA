(function(){
    // Ambil offset tanggal Hijriah dari calibrationOffsets (jika sudah ada), default 0
    var hijriDateOffset = -2;
    if (window.calibrationOffsets && typeof window.calibrationOffsets.hijriDate === "number") {
      hijriDateOffset = window.calibrationOffsets.hijriDate;
    }
    // Cek offset yang tersimpan di localStorage untuk tanggal Hijriah
    var storedHijriOffset = localStorage.getItem("hijriDateOffset");
    if (storedHijriOffset !== null) {
      hijriDateOffset = parseInt(storedHijriOffset);
    }
    
    // Fungsi konversi tanggal Gregorian ke Hijriah (algoritma Umm al-Qura) dengan offset hari
    function gregorianToHijri(date) {
      var m = date.getMonth() + 1;
      var y = date.getFullYear();
      var d = date.getDate();
      // Hitung Julian Day Number (jd)
      var jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
               Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
               Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
               d - 32075;
      // Terapkan offset hari untuk tanggal Hijriah
      jd += hijriDateOffset;
      var l = jd - 1948440 + 10632;
      var n = Math.floor((l - 1) / 10631);
      l = l - 10631 * n + 354;
      var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) +
              (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
      l = l - Math.floor((30 - j) / 15) * (Math.floor((17719 * j) / 50)) -
          Math.floor(j / 16) * (Math.floor((15238 * j) / 43)) + 29;
      var hijriMonth = Math.floor((24 * l) / 709);
      var hijriDay = l - Math.floor((709 * hijriMonth) / 24);
      var hijriYear = 30 * n + j - 30;
      return { day: hijriDay, month: hijriMonth, year: hijriYear };
    }
    
    // Array nama bulan Hijriah dan Gregorian (bahasa Indonesia)
    var hijriMonthNames = [
      "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
      "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
      "Ramadan", "Syawal", "Dzul Qaidah", "Dzul Hijjah"
    ];
    var gregorianMonthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    
    /***** Menyisipkan Tombol Toggle untuk Menu Kalibrasi *****/
    function injectToggleCalibrationButton() {
      var toggleBtn = document.getElementById("toggle-calibration-btn");
      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "toggle-calibration-btn";
        // Karena menu tersembunyi secara default, tombol menampilkan "Tampilkan Kalibrasi"
        toggleBtn.innerText = "Tampilkan Kalibrasi";
        // Sisipkan tombol di atas container preview
        var container = document.getElementById("preview-container");
        if (container) {
          container.insertBefore(toggleBtn, container.firstChild);
        } else {
          document.body.insertBefore(toggleBtn, document.body.firstChild);
        }
        toggleBtn.addEventListener("click", function(){
          var hijriMenu = document.getElementById("calibration-menu-container");
          var prayerMenu = document.getElementById("prayer-calibration-menu");
          var isHidden = hijriMenu && hijriMenu.style.display === "none";
          if (isHidden) {
            if (hijriMenu) hijriMenu.style.display = "";
            if (prayerMenu) prayerMenu.style.display = "";
            toggleBtn.innerText = "Sembunyikan Kalibrasi";
          } else {
            if (hijriMenu) hijriMenu.style.display = "none";
            if (prayerMenu) prayerMenu.style.display = "none";
            toggleBtn.innerText = "Tampilkan Kalibrasi";
          }
        });
      }
    }
    
    /***** Menu Kalibrasi Tanggal Hijriah *****/
    function injectHijriCalibrationMenu() {
      var menuDiv = document.getElementById("calibration-menu-container");
      if (!menuDiv) {
        menuDiv = document.createElement("div");
        menuDiv.id = "calibration-menu-container";
        menuDiv.style.marginBottom = "10px";
        // Tersembunyi secara default
        menuDiv.style.display = "none";
        var container = document.getElementById("preview-container");
        if (container) {
          container.insertBefore(menuDiv, container.firstChild.nextSibling);
        } else {
          document.body.insertBefore(menuDiv, document.body.firstChild);
        }
      }
      menuDiv.innerHTML =
        '<label for="hijriCalibrationInput">Kalibrasi tanggal Hijriah (offset hari): </label>' +
        '<input type="number" id="hijriCalibrationInput" value="' + hijriDateOffset + '">' +
        '<button id="applyHijriCalibration">Terapkan</button>';
      document.getElementById("applyHijriCalibration").addEventListener("click", function(){
        var offset = parseInt(document.getElementById("hijriCalibrationInput").value) || 0;
        localStorage.setItem("hijriDateOffset", offset);
        hijriDateOffset = offset;
        previewJadwalHijri();
      });
    }
    
    /***** Menu Kalibrasi Waktu Sholat *****/
    function injectPrayerTimesCalibrationMenu() {
      var menuDiv = document.getElementById("prayer-calibration-menu");
      if (!menuDiv) {
        menuDiv = document.createElement("div");
        menuDiv.id = "prayer-calibration-menu";
        menuDiv.style.marginBottom = "10px";
        // Tersembunyi secara default
        menuDiv.style.display = "none";
        var container = document.getElementById("preview-container");
        if (container) {
          container.insertBefore(menuDiv, container.firstChild.nextSibling);
        } else {
          document.body.insertBefore(menuDiv, document.body.firstChild);
        }
      }
      // Default offset waktu sholat
      var defaultPrayerOffsets = { imsak: -5, fajr: -5, sunrise: -3, dhuhr: 4, asr: 2, maghrib: 3, isha: 6 };
      var storedOffsets = localStorage.getItem("prayerTimesCalibration");
      var prayerOffsets = storedOffsets ? JSON.parse(storedOffsets) : defaultPrayerOffsets;
      
      var keys = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
      var innerHtml = '<h3>Kalibrasi Waktu Sholat</h3>';
      innerHtml += '<table>';
      keys.forEach(function(key) {
        innerHtml += '<tr>';
        innerHtml += '<td><label for="pt_' + key + '">' + key.charAt(0).toUpperCase() + key.slice(1) + ':</label></td>';
        innerHtml += '<td><input type="number" id="pt_' + key + '" value="' + prayerOffsets[key] + '"></td>';
        innerHtml += '</tr>';
      });
      innerHtml += '</table>';
      innerHtml += '<button id="applyPrayerCalibration">Terapkan Kalibrasi Waktu Sholat</button>';
      menuDiv.innerHTML = innerHtml;
      
      document.getElementById("applyPrayerCalibration").addEventListener("click", function(){
        var newOffsets = {};
        keys.forEach(function(key) {
          var value = parseInt(document.getElementById("pt_" + key).value);
          newOffsets[key] = isNaN(value) ? defaultPrayerOffsets[key] : value;
        });
        // Simpan kalibrasi waktu sholat di localStorage
        localStorage.setItem("prayerTimesCalibration", JSON.stringify(newOffsets));
        // Update global calibrationOffsets agar digunakan oleh prayTimes
        window.calibrationOffsets = newOffsets;
        // Terapkan kalibrasi pada prayTimes
        prayTimes.tune(newOffsets);
        // Perbarui jadwal sholat
        previewJadwalHijri();
      });
    }
    
    /***** Update Judul Halaman *****/
    function updateHeaderTitle() {
      var today = new Date();
      var hijri = gregorianToHijri(today);
      var monthName = hijriMonthNames[hijri.month - 1];
      var header = document.getElementById("preview-heading");
      if (!header) {
        header = document.createElement("h1");
        header.id = "preview-heading";
        var container = document.getElementById("preview-container");
        if (container) {
          container.parentNode.insertBefore(header, container);
        } else {
          document.body.insertBefore(header, document.body.firstChild);
        }
      }
      header.innerText = "Preview Jadwal Sholat Bulan " + monthName;
    }
    
    /***** Menyisipkan Informasi Lokasi *****/
    function injectLocationInfo() {
      var locationDiv = document.getElementById("location-info");
      if (!locationDiv) {
        locationDiv = document.createElement("div");
        locationDiv.id = "location-info";
        locationDiv.style.marginBottom = "10px";
        var container = document.getElementById("preview-container");
        if (container) {
          container.insertBefore(locationDiv, container.firstChild);
        } else {
          document.body.insertBefore(locationDiv, document.body.firstChild);
        }
      }
      if (window.currentLat && window.currentLng) {
        locationDiv.innerText = "Lokasi: " + window.currentLat.toFixed(4) + ", " + window.currentLng.toFixed(4);
      } else {
        locationDiv.innerText = "Lokasi tidak diketahui.";
      }
    }
    
    /***** Preview Jadwal Sholat Bulan Hijriah *****/
    function previewJadwalHijri() {
      updateHeaderTitle();
      injectLocationInfo();
      injectToggleCalibrationButton();
      injectHijriCalibrationMenu();
      injectPrayerTimesCalibrationMenu();
      
      var container = document.getElementById("preview-jadwal");
      if (!container) return;
      container.innerHTML = "";
      
      // Terapkan kalibrasi waktu sholat jika tersedia
      if(window.calibrationOffsets) {
        prayTimes.tune(window.calibrationOffsets);
      } else {
        // Jika belum ada, gunakan default
        prayTimes.tune({ imsak: -5, fajr: -5, sunrise: -3, dhuhr: 4, asr: 2, maghrib: 3, isha: 6 });
      }
      
      var table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      
      // Header tabel
      var headerRow = document.createElement("tr");
      var headerLabels = ["Hijriah", "Masehi", "Imsak", "Subuh", "Terbit", "Zuhur", "Ashar", "Maghrib", "Isya"];
      headerLabels.forEach(function(text) {
        var th = document.createElement("th");
        th.innerText = text;
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
      
      // Filter: tampilkan hari-hari dalam bulan Hijriah yang sama dengan hari ini
      var today = new Date();
      var currentHijriDate = gregorianToHijri(today);
      var filterMonth = currentHijriDate.month;
      var filterYear = currentHijriDate.year;
      
      var day = new Date(today);
      while(gregorianToHijri(day).month === filterMonth && gregorianToHijri(day).year === filterYear) {
        var hijri = gregorianToHijri(day);
        var row = document.createElement("tr");
        
        // Sel Hijriah: format "dd NamaBulanHijriah yyyy"
        var cellHijri = document.createElement("td");
        cellHijri.innerText = hijri.day + " " + hijriMonthNames[hijri.month - 1] + " " + hijri.year;
        cellHijri.style.border = "1px solid #ddd";
        cellHijri.style.padding = "8px";
        row.appendChild(cellHijri);
        
        // Sel Masehi: format "dd NamaBulanMasehi yyyy"
        var cellMasehi = document.createElement("td");
        cellMasehi.innerText = day.getDate() + " " + gregorianMonthNames[day.getMonth()] + " " + day.getFullYear();
        cellMasehi.style.border = "1px solid #ddd";
        cellMasehi.style.padding = "8px";
        row.appendChild(cellMasehi);
        
        // Waktu sholat
        var keys = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
        var lat = window.currentLat || -6.2000;
        var lng = window.currentLng || 106.816666;
        var times = prayTimes.getTimes(day, [lat, lng], 7);
        keys.forEach(function(key) {
          var cell = document.createElement("td");
          cell.innerText = times[key] || "";
          cell.style.border = "1px solid #ddd";
          cell.style.padding = "8px";
          row.appendChild(cell);
        });
        
        table.appendChild(row);
        day.setDate(day.getDate() + 1);
      }
      
      container.appendChild(table);
    }
    
    // --- Dapatkan lokasi secara akurat menggunakan Geolocation API ---
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          window.currentLat = position.coords.latitude;
          window.currentLng = position.coords.longitude;
          console.log("Lokasi diperoleh:", window.currentLat, window.currentLng);
          previewJadwalHijri();
        },
        function(error) {
          console.error("Gagal mendapatkan lokasi:", error);
          previewJadwalHijri();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation tidak didukung oleh browser ini.");
      previewJadwalHijri();
    }
    
    // Ekspor fungsi preview agar bisa dipanggil ulang dari menu kalibrasi
    window.previewJadwalHijri = previewJadwalHijri;
  })();
  
(function(){
    const prayerMethodParams = { fajr: 20, isha: 18 };
    const ihtiyat = { imsak: 2, fajr: 2, sunrise: 0, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
    let hijriDateOffset = parseInt(localStorage.getItem("hijriDateOffset")) || -1;
    let currentLocation = null;

    // PERBAIKAN: Variabel yang hilang telah ditambahkan kembali
    const hijriMonthNames = ["Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadan", "Syawal", "Dzul Qaidah", "Dzul Hijjah"];
    const gregorianMonthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // --- Helper Functions ---
    function gregorianToHijri(date) {
        var m = date.getMonth() + 1, y = date.getFullYear(), d = date.getDate();
        var jd = Math.floor((1461*(y+4800+Math.floor((m-14)/12)))/4)+Math.floor((367*(m-2-12*Math.floor((m-14)/12)))/12)-Math.floor((3*Math.floor((y+4900+Math.floor((m-14)/12))/100))/4)+d-32075;
        jd += hijriDateOffset;
        var l = jd-1948440+10632, n = Math.floor((l-1)/10631);
        l = l-10631*n+354;
        var j = (Math.floor((10985-l)/5316))*(Math.floor((50*l)/17719))+(Math.floor(l/5670))*(Math.floor((43*l)/15238));
        l = l - Math.floor((30-j)/15) * Math.floor((17719*j)/50) - Math.floor(j/16) * Math.floor((15238*j)/43)+29;
        var hijriMonth = Math.floor((24*l)/709), hijriDay = l-Math.floor((709*hijriMonth)/24), hijriYear = 30*n+j-30;
        return { day: hijriDay, month: hijriMonth, year: hijriYear };
    }
    
    function applyIhtiyat(times) {
        let adjustedTimes = {};
        const pad = num => ("0" + num).slice(-2);
        for (const prayer in times) {
            const time = times[prayer];
            const adjustment = ihtiyat[prayer] || 0;
            if (adjustment === 0) {
              adjustedTimes[prayer] = time;
              continue;
            }
            const [hour, minute] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(hour, minute + adjustment, 0);
            adjustedTimes[prayer] = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
        return adjustedTimes;
    }

    // --- Location Functions ---
    function getAltitude(lat, lng, callback) {
        fetch(`${AppConfig.elevationApiUrl}${lat},${lng}`)
          .then(res => res.json())
          .then(data => callback(data.results && data.results.length > 0 ? data.results[0].elevation : 0))
          .catch(() => callback(0));
    }

    function reverseGeocode(lat, lng, callback) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const ad = data.address;
            callback(ad.city || ad.town || ad.village || data.display_name || "Lokasi Anda");
          })
          .catch(() => callback("Lokasi Anda"));
    }

    // --- UI Update Functions ---
    function updateHeaderTitle() {
        const hijri = gregorianToHijri(new Date());
        const monthName = hijriMonthNames[hijri.month - 1];
        document.getElementById("preview-heading").innerText = "Preview Jadwal Bulan " + monthName;
    }

    function updateLocationInfo(locationData) {
        document.getElementById('location-info').innerHTML = `<strong>Lokasi:</strong> ${locationData.text}<br><small>(Lat: ${locationData.lat.toFixed(4)}, Lng: ${locationData.lng.toFixed(4)}, Alt: ${locationData.altitude.toFixed(0)}m)</small>`;
    }

    // --- Main Rendering Function ---
    function renderPrayerTable(location, hidePastDays) {
        updateLocationInfo(location);
        const container = document.getElementById("preview-jadwal");
        container.innerHTML = "";
        
        prayTimes.setMethod('MWL');
        prayTimes.adjust(prayerMethodParams);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive-wrapper';

        const table = document.createElement("table");
        table.className = "preview-table"; 
        
        const headerRow = document.createElement("tr");
        ["Hijriah", "Masehi", "Imsak", "Subuh", "Terbit", "Zuhur", "Ashar", "Maghrib", "Isya"].forEach(text => {
            const th = document.createElement("th");
            th.innerText = text;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
        
        const today = new Date();
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const currentHijri = gregorianToHijri(today);
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i);
            
            if (hidePastDays && day < todayDateOnly) {
                continue;
            }

            const hijri = gregorianToHijri(day);
            if (hijri.month === currentHijri.month && hijri.year === currentHijri.year) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${hijri.day} ${hijriMonthNames[hijri.month - 1]}</td>
                    <td>${day.getDate()} ${gregorianMonthNames[day.getMonth()]}</td>
                `;
                
                const rawTimes = prayTimes.getTimes(day, [location.lat, location.lng, location.altitude], 7);
                const finalTimes = applyIhtiyat(rawTimes);

                ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].forEach(key => {
                    const cell = document.createElement("td");
                    cell.innerText = finalTimes[key] || "";
                    row.appendChild(cell);
                });
                table.appendChild(row);
            }
        }
        
        wrapper.appendChild(table);
        container.appendChild(wrapper);
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        const calibBtn = document.getElementById('btn-hijri-calibration');
        const calibMenu = document.getElementById('hijri-calibration-menu');
        calibBtn.addEventListener('click', () => {
            calibMenu.style.display = (calibMenu.style.display === 'none' || calibMenu.style.display === '') ? 'block' : 'none';
        });

        const calibInput = document.getElementById('hijri-calibration-input');
        calibInput.value = hijriDateOffset;
        document.getElementById('apply-hijri-calibration').addEventListener('click', () => {
            hijriDateOffset = parseInt(calibInput.value) || 0;
            localStorage.setItem("hijriDateOffset", hijriDateOffset);
            location.reload();
        });

        const togglePastDaysCheckbox = document.getElementById('toggle-past-days');
        togglePastDaysCheckbox.addEventListener('change', (e) => {
            if (currentLocation) {
                renderPrayerTable(currentLocation, e.target.checked);
            }
        });
    }

    // --- App Initialization ---
    function init() {
        updateHeaderTitle();
        setupEventListeners();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    getAltitude(latitude, longitude, altitude => {
                        reverseGeocode(latitude, longitude, text => {
                            currentLocation = { lat: latitude, lng: longitude, altitude, text };
                            renderPrayerTable(currentLocation, false);
                        });
                    });
                },
                () => {
                    currentLocation = AppConfig.defaultLocation;
                    renderPrayerTable(currentLocation, false);
                }
            );
        } else {
            currentLocation = AppConfig.defaultLocation;
            renderPrayerTable(currentLocation, false);
        }
    }

    init();
})();
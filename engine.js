// engine.js

const LocationService = {
  getUserLocation: function(callback) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          this.getAltitude(latitude, longitude, altitude => {
            this.reverseGeocode(latitude, longitude, locationText => {
              const locationData = { lat: latitude, lng: longitude, altitude: altitude, text: locationText };
              callback(locationData);
            });
          });
        },
        error => {
          console.log("Gagal mendapatkan lokasi, menggunakan default:", error.message);
          callback(AppConfig.defaultLocation);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      console.log("Geolocation tidak didukung, menggunakan default.");
      callback(AppConfig.defaultLocation);
    }
  },

  getAltitude: function(lat, lng, callback) {
    const url = `${AppConfig.elevationApiUrl}${lat},${lng}`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          callback(data.results[0].elevation);
        } else {
          callback(0);
        }
      })
      .catch(error => {
        console.error("Gagal mengambil data ketinggian:", error);
        callback(0);
      });
  },

  reverseGeocode: function(lat, lng, callback) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        const address = data.address;
        const locationText = address.city || address.town || address.village || data.display_name || "Lokasi Anda";
        callback(locationText);
      })
      .catch(error => {
        console.error("Reverse geocoding error:", error);
        callback("Lokasi Anda");
      });
  }
};

const PrayerTimeManager = {
    init: function() {
        this.prayTimes = new PrayTimes();
        this.prayTimes.setMethod('MWL');
        this.prayTimes.adjust(AppConfig.prayerMethodParams);
        this.times = {};
    },

    calculateTimes: function(locationData, userCalibration) {
        const today = new Date();
        const calibration = userCalibration || 
                            JSON.parse(localStorage.getItem("userCalibration")) || 
                            AppConfig.defaultCalibration;
        
        this.prayTimes.tune(calibration);

        const rawTimes = this.prayTimes.getTimes(
            today, 
            [locationData.lat, locationData.lng, locationData.altitude], 
            AppConfig.timezone
        );
        
        this.times = this._applyIhtiyat(rawTimes);
        return this.times;
    },

    _applyIhtiyat: function(times) {
        let adjustedTimes = {};
        const pad = num => ("0" + num).slice(-2);
        for (const prayer in times) {
            const time = times[prayer];
            const adjustment = AppConfig.ihtiyat[prayer] || 0;
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
    },

    getNextPrayer: function() {
        const now = new Date();
        const prayers = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
        
        const parseTime = (timeStr) => {
            if (!timeStr || timeStr.includes('-')) return null;
            const parts = timeStr.split(":");
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0]), parseInt(parts[1]), 0);
        };
        
        for (const prayer of prayers) {
            const prayerDate = parseTime(this.times[prayer]);
            if (prayerDate && prayerDate > now) {
                return { name: prayer, time: prayerDate };
            }
        }
        
        const nextPrayerTime = parseTime(this.times["imsak"]);
        if (nextPrayerTime) {
            nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
        }
        return { name: "imsak", time: nextPrayerTime };
    },

    getCountdownDiff: function() {
        const next = this.getNextPrayer();
        if (!next || !next.time) return 0;
        const diff = next.time - new Date();
        return diff < 0 ? 0 : diff;
    }
};
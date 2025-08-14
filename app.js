// app.js

const App = {
    countdownInterval: null,

    init: function() {
        document.addEventListener("DOMContentLoaded", () => {
            // PERBAIKAN: Inisialisasi semua modul dari sini dalam urutan yang benar
            DOMElements.init();
            PrayerTimeManager.init();
            NotificationManager.init();
            UIManager.init(this); // UIManager diinisialisasi terakhir setelah yang lain siap

            // Jalankan aplikasi
            this.run();
        });
    },

    run: function(userCalibration = null) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        LocationService.getUserLocation(locationData => {
            UIManager.updateLocation(locationData);
            
            const times = PrayerTimeManager.calculateTimes(locationData, userCalibration);

            if (!times || !times.fajr) {
                UIManager.showError("Gagal memuat jadwal. Pastikan izin lokasi diberikan dan koneksi internet stabil.");
                return;
            }
            
            UIManager.updatePrayerTimes(times);
            
            const nextPrayer = PrayerTimeManager.getNextPrayer();
            NotificationManager.scheduleNext(nextPrayer);

            this.countdownInterval = setInterval(() => {
                const diff = PrayerTimeManager.getCountdownDiff();

                if (diff <= 0) {
                    clearInterval(this.countdownInterval);
                    setTimeout(() => this.run(), 2000); // Tunggu 2 detik agar tidak terlalu cepat refresh
                    return;
                }
                
                UIManager.updateCountdown(diff);
            }, 1000);
        });
    }
};

App.init();
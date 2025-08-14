const AppConfig = {
  prayerMethodParams: {
    fajr: 20,
    isha: 18,
    dhuhr: '0 min',
    asr: 'Standard',
    highLats: 'NightMiddle'
  },
  
  ihtiyat: {
    imsak: 2, fajr: 2, sunrise: 0, dhuhr: 2,
    asr: 2, maghrib: 2, isha: 2
  },
  
  defaultCalibration: {
    imsak: 0, fajr: 0, sunrise: 0, dhuhr: 0,
    asr: 0, maghrib: 0, isha: 0
  },

  prayerNames: {
    imsak: "Imsak", fajr: "Subuh", sunrise: "Terbit", dhuhr: "Zuhur",
    asr: "Ashar", maghrib: "Maghrib", isha: "Isya"
  },
  
  defaultLocation: {
    lat: -6.200000,
    lng: 106.816666,
    altitude: 8,
    text: "Jakarta (Default)"
  },
  
  timezone: 7,

  elevationApiUrl: 'https://api.open-elevation.com/api/v1/lookup?locations='
};
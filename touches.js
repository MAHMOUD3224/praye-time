//  Api keys For accessing
// fda492a531f044948a712cb170acb4c5

const openCageApiKey = "fda492a531f044948a712cb170acb4c5";

let clockIntervalId = null;

// script.js
async function fetchCityData(cityName) {
  const url =
    `https://api.opencagedata.com/geocode/v1/json?key=${openCageApiKey}` +
    `&q=${encodeURIComponent(cityName)}` +
    `&limit=1&no_annotations=0`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || !data.results.length) {
    throw new Error("لم يتم ألعثور على المدينة");
  }
  const r = data.results[0];
  return {
    latitude: r.geometry.lat,
    longitude: r.geometry.lng,
    timeZone: r.annotations.timezone.name,
    countryCode: r.components.country_code.toUpperCase(),
    city:
      r.components.city ||
      r.components.town ||
      r.components.village ||
      cityName,
  };
}

// تعريف طرق حساب مواقيت الصلاة لكل دولة
const prayerMethods = {
  EG: 5, // Egyptian General Authority of Survey
  SA: 4, // Umm Al-Qura University, Makkah
  AE: 3, // Dubai/UAE
  KW: 3, // Kuwait
  QA: 3, // Qatar
  BH: 3, // Bahrain
  OM: 3, // Oman
  YE: 4, // Yemen
  SD: 4, // Sudan
  IQ: 3, // Iraq
  SY: 4, // Syria
  JO: 4, // Jordan
  LB: 4, // Lebanon
  PS: 4, // Palestine
  LY: 4, // Libya
  TN: 4, // Tunisia
  DZ: 4, // Algeria
  MA: 4, // Morocco
  MR: 4, // Mauritania
  SO: 4, // Somalia
  DJ: 4, // Djibouti
  KM: 4, // Comoros
};

// دالة جلب مواقيت الصلاة من Aladhan API
async function fetchPrayerTimes(lat, lon, tz, countryCode) {
  try {
    // استخدام الطريقة المناسبة حسب الدولة
    const method = prayerMethods[countryCode] || 4; // استخدام طريقة أم القرى كافتراضية

    const url =
      `https://api.aladhan.com/v1/timings` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&method=${method}` +
      `&timezonestring=${encodeURIComponent(tz)}` +
      `&school=0` + // استخدام طريقة جمهور المذاهب لحساب العصر
      `&adjustment=1`; // تعديل دقيقة واحدة للدقة

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(json.data || "خطأ في جلب مواقيت الصلاة");
    }
    return json.data.timings;
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    throw new Error("حدث خطأ أثناء جلب مواقيت الصلاة. يرجى المحاولة مرة أخرى");
  }
}

// دالة جلب التاريخ الهجري من Aladhan API
async function fetchHijriDate(city, country) {
  const url =
    `https://api.aladhan.com/v1/timingsByCity` +
    `?city=${encodeURIComponent(city)}` +
    `&country=${encodeURIComponent(country)}` +
    `&method=2`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.code !== 200) throw new Error("خطأ في جلب التاريخ الهجري");
  return json.data.date.hijri.date + " هـ";
}

// اختيار locale و-hour12 بناءً على country_code
function getDisplayOptions(countryCode) {
  // تعريف الإعدادات لكل دولة
  const settings = {
    EG: { locale: "ar-EG-u-nu-arab", hour12: true },
    SA: { locale: "ar-SA-u-nu-arab", hour12: true },
    US: { locale: "en-US-u-nu-latn", hour12: false },
    GB: { locale: "en-GB-u-nu-latn", hour12: false },
  };
  return (
    settings[countryCode] || { locale: navigator.language, hour12: undefined }
  );
}
// عرض الساعة الحالية وتحديثها كل ثانية
function startClock(timeZone) {
  const timeEl = document.getElementById("currentTime");
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
  }
  function update() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
  }
  update();
  clockIntervalId = setInterval(update, 1000);
}

// دالة لتحويل الوقت من 24 إلى 12 ساعة مع AM/PM
function convertTo12Hour(time24) {
  let [hour, minute] = time24.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 => 12
  return `${hour}:${minute} ${ampm}`;
}

// قائمة الدول العربية التي تستخدم نظام 12 ساعة غالباً
const arabicCountries = [
  "EG",
  "SA",
  "AE",
  "SD",
  "IQ",
  "JO",
  "LB",
  "SY",
  "MA",
  "DZ",
  "TN",
  "LY",
  "YE",
  "OM",
  "KW",
  "PS",
  "MR",
];

// دالة جلب المدن المتشابهة
async function fetchSimilarCities(cityName) {
  const url =
    `https://api.opencagedata.com/geocode/v1/json?key=${openCageApiKey}` +
    `&q=${encodeURIComponent(cityName)}` +
    `&limit=5&no_annotations=0`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || !data.results.length) {
    return [];
  }
  return data.results.map((r) => ({
    city:
      r.components.city ||
      r.components.town ||
      r.components.village ||
      r.formatted ||
      "غير معروف",
    country: r.components.country || "غير معروف",
    countryCode: r.components.country_code
      ? r.components.country_code.toUpperCase()
      : "--",
  }));
}

// دالة تغيير اللغة
function switchLanguage() {
  const languageButton = document.querySelector(".language");
  const currentLang = languageButton.textContent;
  const newLang = currentLang === "English" ? "Arabic" : "English";

  // تغيير اتجاه الصفحة
  document.body.classList.toggle("active");

  // تحميل ملف اللغة
  fetch("language.json")
    .then((response) => response.json())
    .then((data) => {
      const langData = data.find((item) => item.language === newLang);
      if (langData) {
        // تحديث النصوص مع التحقق من وجود العناصر
        const elements = {
          ".Adhan": langData.logoName,
          ".moaquet": langData["Prayer times"],
          ".p": langData.desc,
          ".input__search": langData.placholder,
          ".Fajr-title": langData.Fajr,
          ".Sunrise-title": langData.Sunrise,
          ".Dhuhr-title": langData.Dhuhr,
          ".Asr-title": langData.Asr,
          ".Maghrib-title": langData.Maghrib,
          ".Isha-title": langData.Isha,
        };

        // تحديث كل عنصر مع التحقق من وجوده
        Object.entries(elements).forEach(([selector, text]) => {
          const element = document.querySelector(selector);
          if (element) {
            if (selector === ".input__search") {
              element.placeholder = text;
            } else if (selector === ".p") {
              // تحديث النص مع الحفاظ على الرابط
              const searchLink = element.querySelector(".sea");
              if (searchLink) {
                element.innerHTML = `${text} <a href="#search-inp" class="sea" aria-live="polite" tabindex="0">${langData.searchNow}</a>`;
              }
            } else {
              element.textContent = text;
            }
          }
        });

        // تحديث الـ footer
        const footer = document.querySelector("footer");
        if (footer) {
          footer.innerHTML = `${langData.footer} <a href="https://www.linkedin.com/in/mahmoud-rashad-2353b0252/" target="_blank">${langData.link}</a>`;
        }

        // تحديث زر اللغة
        languageButton.textContent = newLang;

        // حفظ اللغة المختارة
        localStorage.setItem("selectedLanguage", newLang);
      }
    })
    .catch((error) => {
      console.error("Error loading language file:", error);
    });
}

// التعامل مع حدث الضغط على زر "عرض"
document.getElementById("submit").addEventListener("click", async () => {
  const input =
    document.querySelector(".input__search").value.trim() || "Cairo";
  const submitButton = document.getElementById("submit");
  const cityNameElement = document.querySelector(".cityName");

  try {
    // Disable button and show loading state
    submitButton.disabled = true;
    cityNameElement.textContent = "جاري البحث...";

    // جلب المدن المتشابهة
    const similarCities = await fetchSimilarCities(input);

    // إنشاء قائمة المدن المتشابهة
    let similarCitiesHTML = "";
    if (similarCities.length > 1) {
      similarCitiesHTML = '<div class="similar-cities">';
      similarCities.forEach((city) => {
        const cityName =
          city.city && city.city !== "undefined" ? city.city : "غير معروف";
        const countryName =
          city.country && city.country !== "undefined"
            ? city.country
            : "غير معروف";
        similarCitiesHTML += `<div class="similar-city" data-city="${cityName}"  data-country="${city.countryCode}">
          ${cityName} - ${countryName}
        </div>`;
      });
      similarCitiesHTML += "</div>";
    }

    // إضافة القائمة للصفحة
    const existingList = document.querySelector(".similar-cities");
    if (existingList) {
      existingList.remove();
    }
    if (similarCitiesHTML) {
      cityNameElement.insertAdjacentHTML("afterend", similarCitiesHTML);
      
      // إضافة مستمعي الأحداث للمدن المتشابهة
      document.querySelectorAll(".similar-city").forEach((city) => {
        city.addEventListener("click", () => {
          document.querySelector(".input__search").value = city.dataset.city;
          document.getElementById("submit").click();
        });
      });
    }

    const cityData = await fetchCityData(input);
    cityNameElement.textContent = cityData.city;

    // الخيارات الخاصة بالعرض (locale و hour12)
    const displayOpts = getDisplayOptions(cityData.countryCode);
    startClock(cityData.timeZone);

    // عرض التاريخ الهجري
    const hijriDate = await fetchHijriDate(cityData.city, cityData.countryCode);
    document.getElementById("hijriDate").textContent = hijriDate;

    // عرض مواقيت الصلاة باستخدام الطريقة المناسبة للدولة
    const times = await fetchPrayerTimes(
      cityData.latitude,
      cityData.longitude,
      cityData.timeZone,
      cityData.countryCode
    );

    // إذا كانت الدولة عربية، اعرض الوقت بنظام 12 ساعة
    const use12Hour = arabicCountries.includes(cityData.countryCode);
    ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((prayer) => {
      let time = times[prayer];
      if (use12Hour) {
        time = convertTo12Hour(time);
      }
      document.querySelector(`.${prayer}`).textContent = time;
    });

    // Save last successful search to localStorage
    localStorage.setItem("lastCity", input);
    localStorage.setItem(
      "lastPrayerTimes",
      JSON.stringify({
        city: cityData.city,
        times: times,
        timestamp: new Date().getTime(),
      })
    );
  } catch (err) {
    console.error("Error:", err);
    alert("خطأ: " + err.message);
  } finally {
    submitButton.disabled = false;
  }
});

// إضافة مستمع حدث لزر تغيير اللغة
document.querySelector(".language").addEventListener("click", switchLanguage);

// تحميل اللغة المحفوظة عند تحميل الصفحة
window.addEventListener("DOMContentLoaded", () => {
  const lastCity = localStorage.getItem("lastCity");
  const savedLanguage = localStorage.getItem("selectedLanguage");

  if (lastCity) {
    document.querySelector(".input__search").value = lastCity;
  }

  if (savedLanguage) {
    const languageButton = document.querySelector(".language");
    if (languageButton.textContent !== savedLanguage) {
      switchLanguage();
    }
  }

  document.getElementById("submit").click();
});

// convert page to rtl/ltr on click button language
// give body active class or remove it and use json file
// and save any update in local storage


const $ = (id) => document.getElementById(id);

const map = L.map("map").setView([-2.5, 118], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let marker = null;
let accuracyCircle = null;
let watchId = null;
let latest = null;

function updateMap(lat, lon, accuracy, timestamp) {
  latest = { lat, lon, accuracy, timestamp };

  if (marker) map.removeLayer(marker);
  if (accuracyCircle) map.removeLayer(accuracyCircle);

  marker = L.marker([lat, lon]).addTo(map)
    .bindPopup("Lokasi yang dibagikan oleh perangkat")
    .openPopup();

  if (accuracy) {
    accuracyCircle = L.circle([lat, lon], {
      radius: accuracy,
      color: "#08baff",
      fillColor: "#08baff",
      fillOpacity: 0.1,
      weight: 1
    }).addTo(map);
  }

  map.setView([lat, lon], 16);
  $("coords").textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  $("updated").textContent = new Date(timestamp).toLocaleString("id-ID");
  $("statusTitle").textContent = "Lokasi tersedia";
  $("statusText").textContent =
    `Perkiraan akurasi GPS: ±${Math.round(accuracy)} meter.`;
  $("deviceStatus").textContent = "Lokasi dibagikan";
  $("mapBadge").textContent = "LOKASI TERSEDIA";
  $("mapInfo").textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function showError(error) {
  const messages = {
    1: "Izin lokasi ditolak oleh browser.",
    2: "Lokasi belum tersedia. Periksa GPS perangkat.",
    3: "Permintaan lokasi kehabisan waktu. Coba lagi."
  };

  $("statusTitle").textContent = "Lokasi belum tersedia";
  $("statusText").textContent =
    messages[error.code] || "Tidak dapat membaca lokasi.";
  $("deviceStatus").textContent = "Tidak terhubung";
}

function getShareUrl() {
  if (!latest) return "";
  const data = btoa(JSON.stringify(latest));
  return `${location.origin}${location.pathname}#location=${data}`;
}

function readSharedLink() {
  const prefix = "#location=";
  if (!location.hash.startsWith(prefix)) return;

  try {
    const data = JSON.parse(
      atob(location.hash.slice(prefix.length))
    );

    if (
      Number.isFinite(data.lat) &&
      Number.isFinite(data.lon) &&
      data.lat >= -90 && data.lat <= 90 &&
      data.lon >= -180 && data.lon <= 180
    ) {
      updateMap(data.lat, data.lon, data.accuracy || 0, data.timestamp);
      $("statusText").textContent =
        "Ini lokasi yang dibagikan melalui tautan. Lokasi mungkin sudah tidak terbaru.";
    }
  } catch {
    $("statusText").textContent = "Tautan lokasi tidak valid.";
  }
}

$("shareBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    $("statusText").textContent = "Browser tidak mendukung GPS.";
    return;
  }

  $("shareBtn").disabled = true;
  $("shareBtn").textContent = "Meminta izin lokasi...";

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      updateMap(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy,
        position.timestamp
      );
      $("shareBtn").textContent = "Lokasi sedang dibagikan";
      $("shareBtn").disabled = false;
    },
    (error) => {
      showError(error);
      $("shareBtn").textContent = "Coba bagikan lokasi lagi";
      $("shareBtn").disabled = false;
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
});

$("stopBtn").addEventListener("click", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  $("shareBtn").disabled = false;
  $("shareBtn").textContent = "Bagikan lokasi perangkat ini";
  $("statusTitle").textContent = "Berbagi dihentikan";
  $("statusText").textContent =
    "Website tidak lagi meminta pembaruan lokasi.";
  $("deviceStatus").textContent = "Berbagi dihentikan";
});

$("copyBtn").addEventListener("click", async () => {
  if (!latest) {
    $("statusText").textContent =
      "Bagikan lokasi terlebih dahulu sebelum menyalin tautan.";
    return;
  }

  try {
    await navigator.clipboard.writeText(getShareUrl());
    $("copyBtn").textContent = "Tautan tersalin!";
    setTimeout(() => $("copyBtn").textContent = "Salin tautan lokasi", 2000);
  } catch {
    prompt("Salin tautan lokasi ini:", getShareUrl());
  }
});

readSharedLink();
setTimeout(() => map.invalidateSize(), 300);

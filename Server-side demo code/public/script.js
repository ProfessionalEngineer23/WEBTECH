let selectedHouse = "Seaview1";
const API_BASE_URL = window.location.origin; // Points to your deployed server

// Initialize charts
const sensorCtx = document.getElementById("sensorGraph").getContext("2d");
const sensorChart = new Chart(sensorCtx, {
  type: "line",
  data: { labels: [], datasets: [{ label: "", data: [], borderColor: "blue", fill: false, tension: 0.4 }] },
  options: { responsive: true, plugins: { title: { display: true, text: "Sensor Data" } } }
});

const compareCtx = document.getElementById("comparisonChart").getContext("2d");
const compareChart = new Chart(compareCtx, {
  type: "line",
  data: { labels: [], datasets: [] },
  options: { responsive: true, plugins: { title: { display: true, text: "Compare Houses" } } }
});

// Helper function to format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Fetch latest sensor readings for the selected house
async function fetchLatestReadings(house) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/latest/${house}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching latest readings:', error);
    return null;
  }
}

// Fetch historical data for a specific sensor and house
async function fetchHistoricalData(house, sensor, days) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/${house}/${sensor}/${days}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return null;
  }
}

// Update sensor cards with real data
async function updateSensorCards() {
  const readings = await fetchLatestReadings(selectedHouse);
  if (!readings) return;

  // Update each sensor card if the data exists
  if (readings.co) {
    document.getElementById("coSensor").innerHTML = `CO:<br>${readings.co} PPM`;
  }
  if (readings.smoke) {
    document.getElementById("smokeSensor").innerHTML = `Smoke:<br>${readings.smoke ? 'Detected' : 'None'}`;
  }
  if (readings.temperature) {
    document.getElementById("tempSensor").innerHTML = `Temp:<br>${readings.temperature}°C`;
  }
  if (readings.humidity) {
    document.getElementById("humiditySensor").innerHTML = `Humidity:<br>${readings.humidity}%`;
  }
  if (readings.light) {
    document.getElementById("lightSensor").innerHTML = `Light:<br>${readings.light} Lux`;
  }
  if (readings.motion) {
    document.getElementById("motionSensor").innerHTML = `Motion:<br>${readings.motion ? 'Detected' : 'None'}`;
  }
  if (readings.water) {
    document.getElementById("waterSensor").innerHTML = `Water:<br>${readings.water ? 'Leak detected' : 'No leak'}`;
  }
}

// Update sensor graph with real data
async function updateSensorGraph() {
  const sensor = document.getElementById("sensorSelect").value;
  const days = parseInt(document.getElementById("timeRange").value);
  
  const data = await fetchHistoricalData(selectedHouse, sensor, days);
  if (!data || !data.length) return;

  // Process the data for the chart
  const labels = data.map(item => formatDate(item.timestamp));
  const values = data.map(item => item.value);

  sensorChart.data.labels = labels;
  sensorChart.data.datasets[0].label = `${sensor} - ${selectedHouse}`;
  sensorChart.data.datasets[0].data = values;
  sensorChart.update();
}

// Compare two houses' sensor data
async function updateComparisonGraph() {
  const h1 = document.getElementById("compareHouse1").value;
  const h2 = document.getElementById("compareHouse2").value;
  const sensor = document.getElementById("compareSensor").value;
  const days = 7; // Fixed for comparison to keep it simple

  // Fetch data for both houses
  const [data1, data2] = await Promise.all([
    fetchHistoricalData(h1, sensor, days),
    fetchHistoricalData(h2, sensor, days)
  ]);

  if (!data1 || !data2) return;

  // Use the timestamps from the first house for labels
  const labels = data1.map(item => formatDate(item.timestamp));
  const values1 = data1.map(item => item.value);
  const values2 = data2.map(item => item.value);

  compareChart.data.labels = labels;
  compareChart.data.datasets = [
    { label: `${sensor} - ${h1}`, data: values1, borderColor: "red", fill: false },
    { label: `${sensor} - ${h2}`, data: values2, borderColor: "green", fill: false }
  ];
  compareChart.update();
}

// Event listeners
document.getElementById("compareGraph").addEventListener("click", updateComparisonGraph);
document.getElementById("generateGraph").addEventListener("click", updateSensorGraph);

document.querySelectorAll(".house-button").forEach(btn => {
  btn.addEventListener("click", async () => {
    selectedHouse = btn.dataset.house;
    document.getElementById("houseTitle").textContent = `Overview: ${selectedHouse}`;
    await updateSensorCards();
    await updateSensorGraph();
  });
});

document.getElementById("toggleSidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("hidden");
});

// Initialize the dashboard
(async function init() {
  await updateSensorCards();
  await updateSensorGraph();
})();
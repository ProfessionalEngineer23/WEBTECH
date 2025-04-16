document.addEventListener('DOMContentLoaded', function() {
  // Debugging
  console.log("Dashboard initialized");
  
  // Initialize chart
  const ctx = document.getElementById('sensorChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{
      label: 'Select sensor and click Update',
      data: [],
      borderColor: '#4a89dc',
      tension: 0.1
    }]},
    options: { responsive: true }
  });

  // DOM elements
  const houseSelect = document.getElementById('houseSelect');
  const sensorSelect = document.getElementById('sensorSelect');
  const timeRange = document.getElementById('timeRange');
  const updateBtn = document.getElementById('updateGraph');
  
  // Sensor elements
  const sensors = {
    temp: document.getElementById('tempSensor'),
    humidity: document.getElementById('humiditySensor'),
    co: document.getElementById('coSensor'),
    smoke: document.getElementById('smokeSensor')
  };

  // Current selections
  let currentHouse = houseSelect.value;
  let currentSensor = sensorSelect.value;

  // Fetch latest sensor data
  async function fetchLatestData() {
    console.log(`Fetching latest data for ${currentHouse}`);
    
    try {
      // First test with mock endpoint
      const testResponse = await fetch('/api/test-data');
      if (!testResponse.ok) throw new Error('Test API failed');
      const testData = await testResponse.json();
      console.log('Test data received:', testData);
      
      // Then try real endpoint
      const response = await fetch(`/api/latest/${currentHouse}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log('Sensor data received:', data);
      
      // Update UI
      if (data.temperature !== undefined) {
        sensors.temp.textContent = `Temperature: ${data.temperature}°C`;
      }
      if (data.humidity !== undefined) {
        sensors.humidity.textContent = `Humidity: ${data.humidity}%`;
      }
      if (data.co !== undefined) {
        sensors.co.textContent = `CO: ${data.co} PPM`;
      }
      if (data.smoke !== undefined) {
        sensors.smoke.textContent = `Smoke: ${data.smoke ? 'Detected!' : 'None'}`;
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      // Show error state
      Object.values(sensors).forEach(el => {
        el.textContent = el.textContent.replace('--', 'Error');
      });
    }
  }

  // Fetch historical data
  async function fetchHistoricalData() {
    console.log(`Fetching ${timeRange.value} days of ${currentSensor} data`);
    
    try {
      // First test with mock endpoint
      const testResponse = await fetch('/api/test-history');
      if (!testResponse.ok) throw new Error('Test history API failed');
      const testData = await testResponse.json();
      console.log('Test history received:', testData);
      
      // Then try real endpoint
      const response = await fetch(
        `/api/history/${currentHouse}/${currentSensor}/${timeRange.value}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log('History data received:', data);
      
      // Update chart
      chart.data.labels = data.map(item => 
        new Date(item.timestamp).toLocaleDateString()
      );
      chart.data.datasets[0].data = data.map(item => item.value);
      chart.data.datasets[0].label = `${currentSensor} - ${currentHouse}`;
      chart.update();
      
    } catch (error) {
      console.error('Fetch error:', error);
      chart.data.datasets[0].label = 'Error loading data';
      chart.update();
    }
  }

  // Event listeners
  houseSelect.addEventListener('change', () => {
    currentHouse = houseSelect.value;
    fetchLatestData();
    fetchHistoricalData();
  });

  sensorSelect.addEventListener('change', () => {
    currentSensor = sensorSelect.value;
  });

  updateBtn.addEventListener('click', fetchHistoricalData);

  // Initial load
  fetchLatestData();
  fetchHistoricalData();
});
document.addEventListener('DOMContentLoaded', function() {
    const chartCtx = document.getElementById('sensorChart').getContext('2d');
    const sensorChart = new Chart(chartCtx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: false } }
      }
    });
  
    // Load initial data
    updateChart();
    fetchCurrentReadings();
  
    // Event listeners
    document.getElementById('updateChart').addEventListener('click', updateChart);
    
    function updateChart() {
      const buildingId = document.getElementById('building').value;
      const sensorType = document.getElementById('sensor').value;
      const days = document.getElementById('timeRange').value;
  
      fetch(`/api/sensor-data?building=${buildingId}&sensor=${sensorType}&days=${days}`)
        .then(response => response.json())
        .then(data => {
          const labels = data.map(item => new Date(item.timestamp).toLocaleString());
          const values = data.map(item => item.value);
          
          sensorChart.data.labels = labels;
          sensorChart.data.datasets = [{
            label: `${sensorType} - Seaview${buildingId}`,
            data: values,
            borderColor: getSensorColor(sensorType),
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            tension: 0.1
          }];
          sensorChart.update();
        });
    }
  
    function fetchCurrentReadings() {
      const buildingId = document.getElementById('building').value;
      
      fetch(`/api/current-readings?building=${buildingId}`)
        .then(response => response.json())
        .then(data => {
          let html = '<div class="sensor-grid">';
          for (const [sensor, value] of Object.entries(data)) {
            html += `
              <div class="sensor-card ${sensor.toLowerCase()}">
                <h3>${sensor}</h3>
                <p>${formatSensorValue(sensor, value)}</p>
              </div>
            `;
          }
          html += '</div>';
          document.getElementById('currentData').innerHTML = html;
        });
    }
  
    function formatSensorValue(sensor, value) {
      switch(sensor) {
        case 'Temperature': return `${value} °C`;
        case 'Humidity': return `${value} %`;
        case 'CO': return `${value} ppm`;
        case 'Smoke': return value ? '⚠️ Detected' : '✅ Normal';
        default: return value;
      }
    }
  
    function getSensorColor(sensor) {
      const colors = {
        'Temperature': '#FF6384',
        'Humidity': '#36A2EB',
        'CO': '#FFCE56',
        'Smoke': '#4BC0C0'
      };
      return colors[sensor] || '#000000';
    }
  });
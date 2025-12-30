let populationCurve = [];
let players = [];
let populationChart, playerChart;

// -----------------------------
// Load population curve CSV
// -----------------------------
Papa.parse('data/population_curve.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function (results) {
    populationCurve = results.data.filter(d => d.Age !== null);
    initPopulationChart();
  }
});

// -----------------------------
// Load precomputed player JSON
// -----------------------------
fetch('data/players_forecast.json')
  .then(response => response.json())
  .then(data => {
    players = data;

    // Populate datalist for controlled search
    const list = document.getElementById('playerList');
    if (!list) return;

    list.innerHTML = '';
    players.forEach(p => {
      if (!p.name) return;
      const option = document.createElement('option');
      option.value = p.name;
      list.appendChild(option);
    });
  });

// -----------------------------
// Initialize population curve chart
// -----------------------------
function initPopulationChart() {
  const ctx = document.getElementById('populationChart').getContext('2d');
  populationChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Population Curve',
        data: populationCurve.map(d => ({ x: Number(d.Age), y: Number(d.AgeFactor) })),
        borderColor: 'blue',
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Age' }, ticks: { stepSize: 1 } },
        y: { type: 'linear', title: { display: true, text: 'Age Factor' }, min: 0, max: 1.1 }
      }
    }
  });
}

// -----------------------------
// Initialize empty player chart
// -----------------------------
function initPlayerChart() {
  const ctx = document.getElementById('playerChart').getContext('2d');
  playerChart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Age' },
          ticks: { stepSize: 1 },
          min: 18,
          max: 40
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'wRC+' }
        }
      }
    }
  });
}
initPlayerChart();

// -----------------------------
// Handle player search
// -----------------------------
document.getElementById('playerSearch').addEventListener('change', function () {
  const selectedName = this.value;
  const player = players.find(p => p.name === selectedName);
  if (player) plotPlayer(player);
});

// -----------------------------
// Plot player: history + forecast with dynamic y-axis
// -----------------------------
function plotPlayer(player) {
  console.log("Plotting player:", player);

  // Clear previous datasets
  playerChart.data.datasets = [];

  // Historical points
  const historyData = player.history.map(h => ({ x: h.age, y: h.wRCPlus }));

  // Forecast points
  const forecastData = player.forecast.map(f => ({ x: f.age, y: f.wRCPlus }));

  // Combine all Y values for dynamic axis
  const allY = [...historyData.map(d => d.y), ...forecastData.map(d => d.y), 100]; // include league avg
  const minY = Math.floor(Math.min(...allY) / 10) * 10 - 10;
  const maxY = Math.ceil(Math.max(...allY) / 10) * 10 + 10;

  // Update y-axis scale dynamically
  playerChart.options.scales.y.min = minY;
  playerChart.options.scales.y.max = maxY;

  // League average line at 100
  playerChart.data.datasets.push({
    label: 'League Avg (100 wRC+)',
    data: [
      { x: 18, y: 100 },
      { x: 40, y: 100 }
    ],
    borderColor: 'gray',
    borderDash: [5, 5],
    fill: false,
    pointRadius: 0
  });

  // Add historical dataset
  playerChart.data.datasets.push({
    label: player.name + ' History',
    data: historyData,
    borderColor: 'red',
    backgroundColor: 'red',
    pointRadius: 6,
    type: 'scatter'
  });

  // Add forecast dataset
  playerChart.data.datasets.push({
    label: player.name + ' Forecast',
    data: forecastData,
    borderColor: 'red',
    borderDash: [5, 5],
    fill: false,
    tension: 0.2
  });

  playerChart.update();
}

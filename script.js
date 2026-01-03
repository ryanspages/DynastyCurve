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
    populateDatalist();
    updateOutliers();
    loadRandomPlayer();
  });

// -----------------------------
// Populate datalist
// -----------------------------
function populateDatalist() {
  const list = document.getElementById('playerList');
  if (!list) return;

  list.innerHTML = '';
  players.forEach(p => {
    if (!p.name) return;
    const option = document.createElement('option');
    option.value = p.name;
    list.appendChild(option);
  });
}

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
// Initialize player chart
// -----------------------------
function initPlayerChart() {
  const ctx = document.getElementById('playerChart').getContext('2d');
  playerChart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      plugins: { legend: { display: true, position: 'bottom'},
      title: {
        display: true,
        text: 'Select a player',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 10
        }
      }
      },
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

// Load random player first
function loadRandomPlayer() {
  if (!players.length) return;

  const randomPlayer = players[Math.floor(Math.random() * players.length)];

  // Populate input field
  const input = document.getElementById('playerSearch');
  if (input) {
    input.value = randomPlayer.name;
  }

  // Plot chart
  plotPlayer(randomPlayer);
}

// -----------------------------
// Plot player: history, forecast, backtest
// -----------------------------
function plotPlayer(player) {
  console.log("Plotting player:", player);

  // Update chart title
playerChart.options.plugins.title.text = player.name;

  // Clear previous datasets
  playerChart.data.datasets = [];

  const historyData = player.history.map(h => ({ x: h.age, y: h.wRCPlus }));
  const forecastData = player.forecast.map(f => ({ x: f.age, y: f.wRCPlus }));

  // Collect all y-values for dynamic axis
  const allY = [
    ...historyData.map(d => d.y),
    ...forecastData.map(d => d.y),
    100
  ];

  if (player.backtest) {
    allY.push(player.backtest.expected_wRCPlus, player.backtest.actual_wRCPlus);
  }

  const minY = Math.floor(Math.min(...allY) / 10) * 10 - 10;
  const maxY = Math.ceil(Math.max(...allY) / 10) * 10 + 10;
  playerChart.options.scales.y.min = minY;
  playerChart.options.scales.y.max = maxY;

  // League average line
  playerChart.data.datasets.push({
    label: 'League Avg (100 wRC+)',
    data: [{ x: 18, y: 100 }, { x: 40, y: 100 }],
    borderColor: 'gray',
    borderDash: [5, 5],
    fill: false,
    pointRadius: 0
  });

  // Historical points
  playerChart.data.datasets.push({
    label: player.name + ' History',
    data: historyData,
    borderColor: 'red',
    backgroundColor: 'red',
    pointRadius: 6,
    type: 'scatter'
  });

  // Forecast points
  playerChart.data.datasets.push({
    label: player.name + ' Forecast',
    data: forecastData,
    borderColor: 'red',
    borderDash: [5, 5],
    fill: false,
    tension: 0.2
  });

  // Backtest: expected vs actual
  if (player.backtest) {
    const bt = player.backtest;

    playerChart.data.datasets.push({
      label: 'Expected (model)',
      data: [{ x: bt.age, y: bt.expected_wRCPlus }],
      borderColor: 'orange',
      backgroundColor: 'white',
      pointBorderColor: 'orange',
      pointRadius: 7,
      pointStyle: 'circle',
      type: 'scatter'
    });

    playerChart.data.datasets.push({
      label: 'Expected → Actual',
      data: [
        { x: bt.age, y: bt.expected_wRCPlus },
        { x: bt.age, y: bt.actual_wRCPlus }
      ],
      borderColor: 'orange',
      borderDash: [2, 2],
      fill: false,
      pointRadius: 0
    });
  }

  playerChart.update();
}

// -----------------------------
// Compute and populate top over/under performers
// -----------------------------
function updateOutliers() {
  const diffs = players.map(p => {
    const lastSeason = p.history[p.history.length - 1];
    const predicted = p.backtest ? p.backtest.expected_wRCPlus : p.forecast[0]?.wRCPlus;
    const delta = lastSeason && predicted ? lastSeason.wRCPlus - predicted : 0;
    return { player: p, delta };
  });

  const topOver = diffs.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
  const topUnder = diffs.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

  const overList = document.getElementById('overperformers');
  const underList = document.getElementById('underperformers');

  overList.innerHTML = '';
  topOver.forEach(d => {
    const li = document.createElement('li');
    li.textContent = `${d.player.name} (+${d.delta.toFixed(1)})`;
    li.addEventListener('click', () => plotPlayer(d.player));
    overList.appendChild(li);
  });

  underList.innerHTML = '';
  topUnder.forEach(d => {
    const li = document.createElement('li');
    li.textContent = `${d.player.name} (${d.delta.toFixed(1)})`;
    li.addEventListener('click', () => plotPlayer(d.player));
    underList.appendChild(li);
  });
}

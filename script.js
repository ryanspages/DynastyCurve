let populationCurve = [];
let players = [];
let chart;

/* -----------------------------
   Load population curve CSV
------------------------------ */
Papa.parse('data/population_curve.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function (results) {
    populationCurve = results.data.filter(d => d.Age !== null);
    initChart();
  }
});

/* -----------------------------
   Load precomputed player JSON
------------------------------ */
fetch('data/players_forecast.json')
  .then(response => response.json())
  .then(data => {
    players = data;
    console.log("Loaded players:", players.length);

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

/* -----------------------------
   Initialize Chart
------------------------------ */
function initChart() {
  const ctx = document.getElementById('ageChart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Population Curve',
          data: populationCurve.map(d => ({
            x: Number(d.Age),
            y: Number(d.AgeFactor)
          })),
          borderColor: 'blue',
          fill: false,
          tension: 0.2,
          yAxisID: 'y' // Primary axis
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        // Primary axis for population curve
        y: {
          type: 'linear',
          title: { display: true, text: 'Age Factor' },
          min: 0,
          max: 1.1,
          position: 'left'
        },
        // Secondary axis for player wRC+
        y1: {
          type: 'linear',
          title: { display: true, text: 'wRC+' },
          min: 50,  // adjust as needed
          max: 200, // adjust as needed
          position: 'right',
          grid: { drawOnChartArea: false } // avoid grid overlap
        },
        x: {
          type: 'linear',
          title: { display: true, text: 'Age' },
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

/* -----------------------------
   Handle player search via datalist
------------------------------ */
document.getElementById('playerSearch').addEventListener('change', function () {
  const selectedName = this.value;
  const player = players.find(p => p.name === selectedName);
  if (player) {
    plotPlayer(player);
  }
});

/* -----------------------------
   Plot player: history + forecast
------------------------------ */
function plotPlayer(player) {
  console.log("Plotting player:", player);

  // Remove old player datasets
  chart.data.datasets = chart.data.datasets.filter(
    ds => ds.label === 'Population Curve'
  );

  // Historical points
  const historyData = player.history.map(h => ({
    x: h.age,
    y: h.wRCPlus
  }));

  // Forecast points
  const forecastData = player.forecast.map(f => ({
    x: f.age,
    y: f.wRCPlus
  }));

  chart.data.datasets.push(
    {
      label: player.name + ' History',
      data: historyData,
      borderColor: 'red',
      backgroundColor: 'red',
      pointRadius: 6,
      type: 'scatter',
      yAxisID: 'y1' // secondary axis
    },
    {
      label: player.name + ' Forecast',
      data: forecastData,
      borderColor: 'red',
      borderDash: [5, 5],
      fill: false,
      tension: 0.2,
      yAxisID: 'y1' // secondary axis
    }
  );

  chart.update();
}

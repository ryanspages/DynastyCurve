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
   Load player JSON
------------------------------ */
fetch('data/players_sample.json')
  .then(response => response.json())
  .then(data => {
    players = data;
    console.log("Loaded players:", players.length);
  });

/* -----------------------------
   Initialize Chart
------------------------------ */
function initChart() {
  const ctx = document.getElementById('ageChart').getContext('2d');

  const ages = populationCurve.map(d => d.Age);
  const factors = populationCurve.map(d => d.AgeFactor);

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        {
          label: 'Population Curve',
          data: factors,
          borderColor: 'blue',
          fill: false,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          title: { display: true, text: 'Age Factor / Indexed wRC+' },
          min: 0,
          max: 1.1
        },
        x: {
          title: { display: true, text: 'Age' }
        }
      }
    }
  });
}

/* -----------------------------
   Handle player search
------------------------------ */
document.getElementById('playerSearch').addEventListener('input', function () {
  const query = this.value.toLowerCase();
  if (query.length < 2) return;

  const player = players.find(p =>
    p.name && p.name.toLowerCase().includes(query)
  );

  if (player) {
    plotPlayer(player);
  }
});

/* -----------------------------
   Plot player on curve
------------------------------ */
function plotPlayer(player) {
  console.log("Plotting player:", player);

  const playerName = player.name;
  const playerAge = Number(player.age);
  const playerWRC = Number(player.wRCPlus);

  if (isNaN(playerAge) || isNaN(playerWRC)) {
    console.warn("Invalid player data:", player);
    return;
  }

  // Remove old player datasets
  chart.data.datasets = chart.data.datasets.filter(
    ds => ds.label === 'Population Curve'
  );

  const ages = populationCurve.map(d => d.Age);
  const factors = populationCurve.map(d => d.AgeFactor);

  const ageIndex = ages.indexOf(playerAge);
  if (ageIndex === -1) {
    console.warn("Player age not found in population curve:", playerAge);
    return;
  }

  // Forecast future values
  const forecastData = ages.map((age, i) => {
    if (age < playerAge) return null;
    return {
      x: age,
      y: playerWRC * factors[i] / factors[ageIndex]
    };
  }).filter(Boolean);

  // Add datasets
  chart.data.datasets.push(
    {
      label: `${playerName} (Current)`,
      data: [{ x: playerAge, y: playerWRC }],
      borderColor: 'red',
      backgroundColor: 'red',
      pointRadius: 6,
      type: 'scatter'
    },
    {
      label: `${playerName} (Forecast)`,
      data: forecastData,
      borderColor: 'red',
      borderDash: [5, 5],
      fill: false,
      tension: 0.2
    }
  );

  chart.update();
}

let populationCurve = [];
let players = [];
let chart;

// Load population curve CSV
Papa.parse('data/population_curve.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function(results) {
    populationCurve = results.data;
    initChart();
  }
});

// Load player JSON
fetch('data/players_sample.json')
  .then(response => response.json())
  .then(data => players = data);

// Initialize Chart.js
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
      plugins: { legend: { display: true } },
      scales: {
        y: { title: { display: true, text: 'Age Factor' }, min: 0, max: 1.1 },
        x: { title: { display: true, text: 'Age' } }
      }
    }
  });
}

// Handle player search input
document.getElementById('playerSearch').addEventListener('input', function() {
  const query = this.value.toLowerCase();
  const player = players.find(p => p.name.toLowerCase().includes(query));
  if(player) {
    plotPlayer(player);
  }
});

function plotPlayer(player) {
  // Remove previous player datasets
  chart.data.datasets = chart.data.datasets.filter(ds => ds.label === 'Population Curve');

  const ages = populationCurve.map(d => d.Age);
  const factors = populationCurve.map(d => d.AgeFactor);

  // Calculate forecasted wRC+ for future ages
  const futureValues = ages.map(age => {
    if(age < player.age) return null;
    return player.wRCPlus * factors[ages.indexOf(age)] / factors[ages.indexOf(player.age)];
  });

  // Current player point
  const currentPoint = { x: player.age, y: player.wRCPlus };

  // Add to chart
  chart.data.datasets.push(
    {
      label: player.name + ' Current',
      data: [{ x: player.age, y: player.wRCPlus }],
      borderColor: 'red',
      backgroundColor: 'red',
      pointRadius: 6,
      type: 'scatter'
    },
    {
      label: player.name + ' Forecast',
      data: futureValues.map((v, i) => v !== null ? {x: ages[i], y: v} : null).filter(v=>v),
      borderColor: 'red',
      borderDash: [5,5],
      fill: false,
      tension: 0.2
    }
  );

  chart.update();
}

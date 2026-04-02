let bmpChart = null;
let dhtChart = null;
let updating = false;

function formatValue(value, unit = "") {
  if (
    value === undefined ||
    value === null ||
    value === "unknown" ||
    value === "unavailable"
  ) {
    return "--";
  }

  const number = Number(value);
  if (!Number.isNaN(number)) {
    return `${number.toFixed(1).replace(".", ",")} ${unit}`.trim();
  }

  return `${value} ${unit}`.trim();
}

function setGauge(gaugeId, min, max, value) {
  const gauge = document.getElementById(gaugeId);
  if (!gauge) return;

  const needle = gauge.querySelector(".needle");
  if (!needle) return;

  const number = Number(value);
  if (Number.isNaN(number)) return;

  const clamped = Math.max(min, Math.min(max, number));
  const ratio = (clamped - min) / (max - min);
  const degrees = -90 + ratio * 180;

  needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
}

function directionToDegrees(direction) {
  const map = {
    Norte: 0,
    Nordeste: 45,
    Leste: 90,
    Sudeste: 135,
    Sul: 180,
    Sudoeste: 225,
    Oeste: 270,
    Noroeste: 315,
    Indefinida: 0,
  };

  return map[direction] ?? 0;
}

function buildChart(canvasId, label, points, existingChart) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = points.map((p) =>
    new Date(p.x).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  const values = points.map((p) => p.y);

  if (existingChart) {
    existingChart.data.labels = labels;
    existingChart.data.datasets[0].data = values;
    existingChart.update();
    return existingChart;
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: "#ccc" },
          grid: { color: "#333" },
        },
        y: {
          ticks: { color: "#ccc" },
          grid: { color: "#333" },
        },
      },
    },
  });
}

async function loadData() {
  try {
    const response = await fetch("/api/estacao", {
      cache: "no-store",
    });

    const data = await response.json();

    if (data.error) {
      console.error(data.message);
      return;
    }

    document.getElementById("temp-dht-value").textContent = formatValue(
      data.current.temperatura_dht.state,
      data.current.temperatura_dht.unit
    );

    document.getElementById("temp-bmp-value").textContent = formatValue(
      data.current.temperatura_bmp.state,
      data.current.temperatura_bmp.unit
    );

    document.getElementById("umidade-value").textContent = formatValue(
      data.current.umidade.state,
      data.current.umidade.unit
    );

    document.getElementById("pressao-value").textContent = formatValue(
      data.current.pressao.state,
      data.current.pressao.unit
    );

    document.getElementById("vento-direcao-text").textContent =
      `Direção: ${data.current.vento_dir.state || "--"}`;

    document.getElementById("vento-vel-text").textContent =
      `Velocidade: ${formatValue(
        data.current.vento_vel.state,
        data.current.vento_vel.unit
      )}`;

    document.getElementById("chuva-text").textContent =
      `Chuva: ${formatValue(
        data.current.chuva.state,
        data.current.chuva.unit
      )}`;

    document.getElementById("last-update").textContent =
      `Última atualização: ${new Date(data.updated_at).toLocaleString("pt-BR")}`;

    setGauge("gauge-temp-dht", 0, 50, data.current.temperatura_dht.state);
    setGauge("gauge-temp-bmp", 0, 50, data.current.temperatura_bmp.state);
    setGauge("gauge-umidade", 0, 100, data.current.umidade.state);
    setGauge("gauge-pressao", 900, 1100, data.current.pressao.state);

    const compassDegrees = directionToDegrees(data.current.vento_dir.state);
    document.getElementById("compass-arrow").style.transform =
      `translate(-50%, -100%) rotate(${compassDegrees}deg)`;

    bmpChart = buildChart(
      "chartBmp",
      "Temperatura BMP280",
      data.history?.temperatura_bmp || [],
      bmpChart
    );

    dhtChart = buildChart(
      "chartDht",
      "Temperatura DHT22",
      data.history?.temperatura_dht || [],
      dhtChart
    );
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

async function refreshData() {
  if (updating) return;
  updating = true;

  try {
    await loadData();
  } finally {
    updating = false;
  }
}

// 🚀 Atualização automática
refreshData();
setInterval(refreshData, 5000);

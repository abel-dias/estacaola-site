let bmpChart = null;
let dhtChart = null;
let updating = false;

async function loadData() {
  try {
    const response = await fetch("/api/estacao", {
      cache: "no-store"
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

refreshData();
setInterval(refreshData, 5000);

const HA_URL = "https://ha.estacaola.com.br";
const HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZjMyMzE0YzM0OGU0MjNiOTEzMGViNGFjOWZlMTM4NSIsImlhdCI6MTc3NjEwODk3MSwiZXhwIjoyMDkxNDY4OTcxfQ.GfHs4OY_VbaqGloq16Xb4qIeg7FeCxwiaJ8huwrdhTE";

// Entidades
const ENTIDADES = {
  temperatura: "sensor.estacao_meteorologica_temperatura_dht22",
  umidade: "sensor.estacao_meteorologica_umidade",
  pressao: "sensor.estacao_meteorologica_pressao_atmosferica",
  vento: "sensor.estacao_meteorologica_velocidade_do_vento",
  chuva: "sensor.estacao_meteorologica_pluviometro_volume",
  direcao: "text_sensor.estacao_meteorologica_direcao_do_vento"
};

let graficoTemperatura = null;

function marcarBotaoAtivo(periodo) {
  document.querySelectorAll(".filtros-periodo button").forEach(btn => {
    btn.classList.remove("ativo");
  });

  const mapa = {
    "24h": "btn-24h",
    "7d": "btn-7d",
    "30d": "btn-30d"
  };

  const botao = document.getElementById(mapa[periodo]);
  if (botao) botao.classList.add("ativo");
}

function calcularInicio(periodo) {
  const agora = new Date();
  const inicio = new Date(agora);

  if (periodo === "24h") {
    inicio.setHours(agora.getHours() - 24);
  } else if (periodo === "7d") {
    inicio.setDate(agora.getDate() - 7);
  } else if (periodo === "30d") {
    inicio.setDate(agora.getDate() - 30);
  }

  return { inicio, agora };
}

async function buscarEstadoAtual(entityId) {
  const resposta = await fetch(`${HA_URL}/api/states/${entityId}`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Erro ao buscar estado de ${entityId}`);
  }

  return await resposta.json();
}

async function buscarHistorico(entityId, periodo) {
  const { inicio, agora } = calcularInicio(periodo);

  const url =
    `${HA_URL}/api/history/period/${inicio.toISOString()}` +
    `?filter_entity_id=${entityId}` +
    `&end_time=${agora.toISOString()}`;

  const resposta = await fetch(url, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Erro ao buscar histórico de ${entityId}`);
  }

  const dados = await resposta.json();
  return dados[0] || [];
}

function formatarData(dataIso, periodo) {
  const data = new Date(dataIso);

  if (periodo === "24h") {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function reduzirHistorico(historico, periodo) {
  if (periodo === "24h") {
    return historico.filter((_, i) => i % 5 === 0);
  }

  if (periodo === "7d") {
    return historico.filter((_, i) => i % 12 === 0);
  }

  if (periodo === "30d") {
    return historico.filter((_, i) => i % 24 === 0);
  }

  return historico;
}

function atualizarGraficoTemperatura(labels, valores, periodo) {
  const ctx = document.getElementById("graficoTemperatura").getContext("2d");

  if (graficoTemperatura) {
    graficoTemperatura.destroy();
  }

  graficoTemperatura = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Temperatura (${periodo})`,
          data: valores,
          borderWidth: 2,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

async function trocarPeriodo(periodo) {
  try {
    marcarBotaoAtivo(periodo);

    const historicoBruto = await buscarHistorico(ENTIDADES.temperatura, periodo);
    const historico = reduzirHistorico(historicoBruto, periodo);

    const labels = [];
    const valores = [];

    historico.forEach(item => {
      const valor = parseFloat(item.state);
      if (!isNaN(valor)) {
        labels.push(formatarData(item.last_changed, periodo));
        valores.push(valor);
      }
    });

    atualizarGraficoTemperatura(labels, valores, periodo);
  } catch (erro) {
    console.error("Erro ao trocar período:", erro);
  }
}

async function carregarValoresAtuais() {
  try {
    const [
      temperatura,
      umidade,
      pressao,
      vento,
      chuva,
      direcao
    ] = await Promise.all([
      buscarEstadoAtual(ENTIDADES.temperatura),
      buscarEstadoAtual(ENTIDADES.umidade),
      buscarEstadoAtual(ENTIDADES.pressao),
      buscarEstadoAtual(ENTIDADES.vento),
      buscarEstadoAtual(ENTIDADES.chuva),
      buscarEstadoAtual(ENTIDADES.direcao)
    ]);

    document.getElementById("temperatura-atual").textContent =
      `${parseFloat(temperatura.state).toFixed(1)} °C`;

    document.getElementById("umidade-atual").textContent =
      `${parseFloat(umidade.state).toFixed(1)} %`;

    document.getElementById("pressao-atual").textContent =
      `${parseFloat(pressao.state).toFixed(1)} hPa`;

    document.getElementById("vento-atual").textContent =
      `${parseFloat(vento.state).toFixed(2)} km/h`;

    document.getElementById("chuva-atual").textContent =
      `${parseFloat(chuva.state).toFixed(2)} mL`;

    document.getElementById("direcao-atual").textContent =
      `${direcao.state}`;
  } catch (erro) {
    console.error("Erro ao carregar valores atuais:", erro);
  }
}

async function iniciarPainel() {
  await carregarValoresAtuais();
  await trocarPeriodo("24h");
}

iniciarPainel();

// Atualiza os cards atuais a cada 30 segundos
setInterval(carregarValoresAtuais, 30000);

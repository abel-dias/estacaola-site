let graficoTemperatura = null;
let periodoAtual = "24h";

function marcarBotaoAtivo(periodo) {
  document.querySelectorAll(".filtros-periodo button").forEach((btn) => {
    btn.classList.remove("ativo");
  });

  const mapa = {
    "24h": "btn-24h",
    "7d": "btn-7d",
    "30d": "btn-30d",
  };

  const botao = document.getElementById(mapa[periodo]);
  if (botao) botao.classList.add("ativo");
}

function formatarRotulo(dataIso, periodo) {
  const data = new Date(dataIso);

  if (periodo === "24h") {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function reduzirPontos(historico, periodo) {
  if (periodo === "24h") return historico.filter((_, i) => i % 3 === 0);
  if (periodo === "7d") return historico.filter((_, i) => i % 6 === 0);
  if (periodo === "30d") return historico.filter((_, i) => i % 12 === 0);
  return historico;
}

function atualizarGraficoTemperatura(labels, valores, periodo) {
  const canvas = document.getElementById("graficoTemperatura");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

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
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

async function carregarDados(periodo = "24h") {
  try {
    const resposta = await fetch(`/api/estacao?period=${periodo}`, {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || dados.error) {
      console.error("Erro da API:", dados);
      return;
    }

    const temperaturaEl = document.getElementById("temperatura-atual");
    const umidadeEl = document.getElementById("umidade-atual");
    const pressaoEl = document.getElementById("pressao-atual");
    const ventoEl = document.getElementById("vento-atual");
    const chuvaEl = document.getElementById("chuva-atual");

    if (!temperaturaEl || !umidadeEl || !pressaoEl || !ventoEl || !chuvaEl) {
      console.error("Um ou mais elementos do HTML não foram encontrados.");
      return;
    }

    temperaturaEl.textContent = `${parseFloat(dados.current.temperatura_bmp.state).toFixed(1)} ${dados.current.temperatura_bmp.unit}`;
    umidadeEl.textContent = `${parseFloat(dados.current.umidade.state).toFixed(1)} ${dados.current.umidade.unit}`;
    pressaoEl.textContent = `${parseFloat(dados.current.pressao.state).toFixed(1)} ${dados.current.pressao.unit}`;
    ventoEl.textContent = `${parseFloat(dados.current.vento_vel.state).toFixed(2)} ${dados.current.vento_vel.unit}`;
    chuvaEl.textContent = `${parseFloat(dados.current.chuva.state).toFixed(2)} ${dados.current.chuva.unit}`;

    const historicoBruto = dados.history.temperatura_bmp || [];
    const historico = reduzirPontos(historicoBruto, periodo);

    const labels = historico.map((item) => formatarRotulo(item.x, periodo));
    const valores = historico.map((item) => item.y);

    atualizarGraficoTemperatura(labels, valores, periodo);
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
  }
}

async function trocarPeriodo(periodo) {
  periodoAtual = periodo;
  marcarBotaoAtivo(periodo);
  await carregarDados(periodo);
}

document.addEventListener("DOMContentLoaded", async () => {
  await trocarPeriodo("24h");
  setInterval(() => carregarDados(periodoAtual), 30000);
});

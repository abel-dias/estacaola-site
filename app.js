let graficoTemperatura = null;

let periodoAtual = "24h";

const infoSensores = {
  temperatura: {
    titulo: "🌡️ Temperatura",
    texto: `
<p><strong>Sensor utilizado:</strong>
BMP280 / DHT22</p>

<p><strong>Como funciona:</strong><br>
O sensor mede a temperatura do ambiente usando um elemento eletrônico extremamente sensível às mudanças térmicas.</p>

<p><strong>Importância:</strong><br>
A temperatura influencia previsão do tempo, agricultura, conforto térmico e monitoramento climático.</p>
`
  },

  umidade: {
    titulo: "💧 Umidade",
    texto: `
<p><strong>Sensor utilizado:</strong>
DHT22</p>

<p><strong>Como funciona:</strong><br>
Detecta a quantidade de vapor de água presente no ar.</p>

<p><strong>Importância:</strong><br>
Ajuda a prever chuva, sensação térmica e condições ambientais.</p>
`
  },

  pressao: {
    titulo: "🌪️ Pressão Atmosférica",
    texto: `
<p><strong>Sensor utilizado:</strong>
BMP280</p>

<p><strong>Como funciona:</strong><br>
Mede a força exercida pela atmosfera sobre o sensor.</p>

<p><strong>Importância:</strong><br>
Mudanças na pressão ajudam a prever tempestades e alterações climáticas.</p>
`
  },

  vento: {
    titulo: "💨 Vento",
    texto: `
<p><strong>Sensor utilizado:</strong>
Anemômetro</p>

<p><strong>Como funciona:</strong><br>
Calcula velocidade do vento através da rotação das pás.</p>

<p><strong>Importância:</strong><br>
Essencial para agricultura, segurança climática e monitoramento meteorológico.</p>
`
  },

  chuva: {
    titulo: "🌧️ Chuva",
    texto: `
<p><strong>Sensor utilizado:</strong>
Pluviômetro</p>

<p><strong>Como funciona:</strong><br>
Mede quantidade acumulada de precipitação.</p>

<p><strong>Importância:</strong><br>
Auxilia agricultura, prevenção de enchentes e monitoramento ambiental.</p>
`
  }
};

function marcarBotaoAtivo(periodo) {
  document
    .querySelectorAll(".filtros-periodo button")
    .forEach(btn => {
      btn.classList.remove("ativo");
    });

  const mapa = {
    "24h": "btn-24h",
    "7d": "btn-7d",
    "30d": "btn-30d"
  };

  document
    .getElementById(mapa[periodo])
    ?.classList.add("ativo");
}

function formatarRotulo(dataIso, periodo) {
  const data = new Date(dataIso);

  if (periodo === "24h") {
    return data.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  return data.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  );
}

function reduzirPontos(historico, periodo) {
  if (periodo === "24h")
    return historico.filter((_, i) => i % 3 === 0);

  if (periodo === "7d")
    return historico.filter((_, i) => i % 6 === 0);

  if (periodo === "30d")
    return historico.filter((_, i) => i % 12 === 0);

  return historico;
}

function atualizarGrafico(labels, valores, periodo) {
  const ctx =
    document
      .getElementById("graficoTemperatura")
      .getContext("2d");

  if (graficoTemperatura) {
    graficoTemperatura.destroy();
  }

  graficoTemperatura =
    new Chart(ctx, {
      type: "line",

      data: {
        labels,

        datasets: [{
          label: `Temperatura (${periodo})`,
          data: valores,
          borderWidth: 2,
          tension: .3
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
          y: {
            ticks: {
              callback: function (value) {
                return Number(value).toFixed(1);
              }
            }
          }
        },

        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Temperatura: ${Number(context.parsed.y).toFixed(1)} °C`;
              }
            }
          }
        }
      }
    });
}

async function carregarDados(periodo = "24h") {
  try {
    const resposta =
      await fetch(
        `/api/estacao?period=${periodo}`
      );

    const dados =
      await resposta.json();

    document
      .getElementById("temperatura-atual")
      .textContent =
      `${parseFloat(dados.current.temperatura_bmp.state).toFixed(1)} °C`;

    document
      .getElementById("umidade-atual")
      .textContent =
      `${parseFloat(dados.current.umidade.state).toFixed(1)} %`;

    document
      .getElementById("pressao-atual")
      .textContent =
      `${parseFloat(dados.current.pressao.state).toFixed(1)} hPa`;

    document
      .getElementById("vento-atual")
      .textContent =
      `${parseFloat(dados.current.vento_vel.state).toFixed(2)} km/h`;

    document
      .getElementById("chuva-atual")
      .textContent =
      `${parseFloat(dados.current.chuva.state).toFixed(2)} mL`;

    const hist =
      reduzirPontos(
        dados.history.temperatura_bmp,
        periodo
      );

    atualizarGrafico(
      hist.map(x => formatarRotulo(x.x, periodo)),

      hist.map(x => Number(parseFloat(x.y).toFixed(1))),

      periodo
    );

  } catch (erro) {
    console.log(erro);
  }
}

async function trocarPeriodo(periodo) {
  periodoAtual = periodo;

  marcarBotaoAtivo(periodo);

  await carregarDados(periodo);
}

document
  .addEventListener(
    "DOMContentLoaded",

    async () => {
      await trocarPeriodo("24h");

      setInterval(
        () => carregarDados(periodoAtual),
        30000
      );

      const modal =
        document.getElementById("modal-info");

      document
        .querySelectorAll(".info-card")
        .forEach(card => {
          card.onclick = () => {
            const tipo =
              card.dataset.info;

            document
              .getElementById("modal-titulo")
              .innerHTML =
              infoSensores[tipo].titulo;

            document
              .getElementById("modal-texto")
              .innerHTML =
              infoSensores[tipo].texto;

            modal.style.display = "block";
          };
        });

      document
        .getElementById("fechar-modal")
        .onclick = () => {
          modal.style.display = "none";
        };

      window.onclick = (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      };
    }
  );

export async function onRequestGet(context) {
  const HA_URL = context.env.HA_URL;
  const HA_TOKEN = context.env.HA_TOKEN;

  if (!HA_URL || !HA_TOKEN) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "Variáveis HA_URL ou HA_TOKEN não configuradas no Cloudflare.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const url = new URL(context.request.url);
  const period = url.searchParams.get("period") || "24h";

  const ENTITIES = {
    temperatura_bmp: "sensor.estacao_meteorologica_temperatura_bmp280",
    temperatura_dht: "sensor.estacao_meteorologica_temperatura_dht22",
    umidade: "sensor.estacao_meteorologica_umidade",
    pressao: "sensor.estacao_meteorologica_pressao_atmosferica",
    vento_vel: "sensor.estacao_meteorologica_velocidade_do_vento",
    chuva: "sensor.estacao_meteorologica_pluviometro_volume",
  };

  function getHoursFromPeriod(p) {
    if (p === "24h") return 24;
    if (p === "7d") return 24 * 7;
    if (p === "30d") return 24 * 30;
    return 24;
  }

  async function getState(entityId) {
    const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao buscar ${entityId}: ${res.status}`);
    }

    return res.json();
  }

  async function getHistory(entityId, hours = 24) {
    const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();

    const res = await fetch(
      `${HA_URL}/api/history/period/${start}?filter_entity_id=${encodeURIComponent(entityId)}&end_time=${encodeURIComponent(end)}&minimal_response&no_attributes`,
      {
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Erro ao buscar histórico de ${entityId}: ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : [];
  }

  try {
    const hours = getHoursFromPeriod(period);

    const [
      temperaturaBmp,
      temperaturaDht,
      umidade,
      pressao,
      ventoVel,
      chuva,
      histBmp,
    ] = await Promise.all([
      getState(ENTITIES.temperatura_bmp),
      getState(ENTITIES.temperatura_dht),
      getState(ENTITIES.umidade),
      getState(ENTITIES.pressao),
      getState(ENTITIES.vento_vel),
      getState(ENTITIES.chuva),
      getHistory(ENTITIES.temperatura_bmp, hours),
    ]);

    return new Response(
      JSON.stringify({
        updated_at: new Date().toISOString(),
        period,
        current: {
          temperatura_bmp: {
            state: temperaturaBmp.state,
            unit: temperaturaBmp.attributes?.unit_of_measurement || "°C",
          },
          temperatura_dht: {
            state: temperaturaDht.state,
            unit: temperaturaDht.attributes?.unit_of_measurement || "°C",
          },
          umidade: {
            state: umidade.state,
            unit: umidade.attributes?.unit_of_measurement || "%",
          },
          pressao: {
            state: pressao.state,
            unit: pressao.attributes?.unit_of_measurement || "hPa",
          },
          vento_vel: {
            state: ventoVel.state,
            unit: ventoVel.attributes?.unit_of_measurement || "km/h",
          },
          chuva: {
            state: chuva.state,
            unit: chuva.attributes?.unit_of_measurement || "mL",
          },
        },
        history: {
          temperatura_bmp: histBmp
            .map((item) => ({
              x: item.last_changed,
              y: Number(item.state),
            }))
            .filter((item) => !Number.isNaN(item.y)),
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

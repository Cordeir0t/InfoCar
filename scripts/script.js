// ================= ELEMENTOS =================
const nome = document.getElementById("nome");
const placa = document.getElementById("placa");
const reparo = document.getElementById("reparo");
const obs = document.getElementById("observacoes");
const descricaoProcesso = document.getElementById("descricaoProcesso");
const lista = document.getElementById("lista");

const btnSalvar = document.getElementById("salvar");
const btnLimparForm = document.getElementById("limparForm");
const btnIniciarVoz = document.getElementById("iniciarVoz");
const btnExportar = document.getElementById("exportarExcel");

const iconeRobo = document.getElementById("iconeRobo");
const iconeMic = document.getElementById("iconeMic");

let editandoId = null;
let etapaVoz = 0;
let timeoutSilencio = null;

// ================= VOZ =================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  btnIniciarVoz.style.display = "none";
  btnIniciarVoz.title = "Reconhecimento de voz não suportado";
}

const rec = new SpeechRecognition();
rec.lang = "pt-BR";
rec.interimResults = false;
rec.continuous = false;

const synth = window.speechSynthesis;

// ================= MAPA DE REPAROS =================
const mapaReparos = {
  "troca de óleo": "Troca de óleo",
  "óleo": "Troca de óleo",
  "freio": "Freio",
  "freios": "Freio",
  "suspensão": "Suspensão",
  "elétrica": "Elétrica",
  "eletrica": "Elétrica",
  "motor": "Motor",
  "alinhamento": "Alinhamento e balanceamento",
  "balanceamento": "Alinhamento e balanceamento",
  "outro": "Outro"
};

// ================= VISUAL =================
function mostrarRobo() {
  iconeRobo.hidden = false;
  iconeMic.hidden = true;
}

function mostrarMic() {
  iconeRobo.hidden = true;
  iconeMic.hidden = false;
}

function esconderIcones() {
  iconeRobo.hidden = true;
  iconeMic.hidden = true;
}

// ================= FALA =================
function falar(texto, callback) {
  synth.cancel();
  rec.abort();
  mostrarRobo();

  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.9;

  fala.onend = () => {
    setTimeout(() => {
      mostrarMic();
      if (callback) callback();
    }, 200);
  };

  synth.speak(fala);
}

// ================= OUVIR CAMPO =================
function ouvirCampo(campo, repetirPergunta, callbackSucesso) {
  rec.abort();
  rec.start();

  timeoutSilencio = setTimeout(() => {
    rec.abort();
    falar(repetirPergunta, () => ouvirCampo(campo, repetirPergunta, callbackSucesso));
  }, 6000);

  rec.onresult = (e) => {
    clearTimeout(timeoutSilencio);
    const texto = e.results[0][0].transcript;
    campo.value = texto;
    rec.abort();
    if (callbackSucesso) callbackSucesso(texto);
    else proximaEtapa();
  };
}

// ================= OUVIR REPARO =================
function ouvirReparo() {
  rec.abort();
  rec.start();

  timeoutSilencio = setTimeout(() => {
    rec.abort();
    falar("Óleo, freio, suspensão, elétrica, motor, alinhamento ou outro?", ouvirReparo);
  }, 6000);

  rec.onresult = (e) => {
    clearTimeout(timeoutSilencio);
    const texto = e.results[0][0].transcript.toLowerCase();
    
    for (let chave in mapaReparos) {
      if (texto.includes(chave)) {
        reparo.value = mapaReparos[chave];
        rec.abort();
        proximaEtapa();
        return;
      }
    }
    
    falar("Não entendi. Óleo, freio, suspensão, elétrica, motor ou outro?", ouvirReparo);
  };
}

// ================= FLUXO VOZ =================
function iniciarFluxoVoz() {
  etapaVoz = 0;
  limparFormulario();
  falar("Iniciando registro por voz...", proximaEtapa);
}

function proximaEtapa() {
  if (etapaVoz === 0) {
    falar("Qual o nome do responsável?", () =>
      ouvirCampo(nome, "Nome do responsável?")
    );
    etapaVoz++;
  } else if (etapaVoz === 1) {
    falar("Qual a placa do veículo?", () =>
      ouvirCampo(placa, "Qual a placa?")
    );
    etapaVoz++;
  } else if (etapaVoz === 2) {
    falar("Tipo de reparo? Óleo, freio, suspensão, elétrica, motor, alinhamento ou outro?", 
      ouvirReparo
    );
    etapaVoz++;
  } else if (etapaVoz === 3) {
    falar("Alguma observação?", () =>
      ouvirCampo(obs, "Observações?")
    );
    etapaVoz++;
  } else if (etapaVoz === 4) {
    falar("Descreva o processo realizado", () =>
      ouvirCampo(descricaoProcesso, "Descreva o processo")
    );
    etapaVoz++;
  } else {
    esconderIcones();
    falar("Salvando registro...", () => {
      btnSalvar.click();
    });
  }
}

// ================= SALVAR =================
btnSalvar.onclick = () => {
  if (!nome.value?.trim() || !placa.value?.trim() || !reparo.value) {
    alert("Preencha nome, placa e reparo!");
    return;
  }

  let dados = JSON.parse(localStorage.getItem("registros")) || [];

  if (editandoId) {
    dados = dados.map(r =>
      r.id === editandoId ? {
        ...r,
        nome: nome.value.trim(),
        placa: placa.value.trim().toUpperCase(),
        reparo: reparo.value,
        obs: obs.value,
        descricaoProcesso: descricaoProcesso.value
      } : r
    );
    editandoId = null;
    btnSalvar.textContent = "Salvar";
  } else {
    dados.push({
      id: Date.now(),
      nome: nome.value.trim(),
      placa: placa.value.trim().toUpperCase(),
      reparo: reparo.value,
      obs: obs.value,
      descricaoProcesso: descricaoProcesso.value,
      data: new Date().toLocaleString("pt-BR")
    });
  }

  localStorage.setItem("registros", JSON.stringify(dados));
  limparFormulario();
  renderizar();
};

// ================= RENDER =================
function renderizar() {
  lista.innerHTML = "";
  const dados = JSON.parse(localStorage.getItem("registros")) || [];
  dados.reverse(); // Mais recentes primeiro

  dados.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${r.placa}</strong> — ${r.reparo}<br>
      <span style="color: #93c5fd;">${r.nome}</span><br>
      ${r.obs ? `<small style="color: #94a3b8;">${r.obs}</small><br>` : ''}
      ${r.descricaoProcesso ? `<small style="color: #cbd5f5;"><strong>Processo:</strong> ${r.descricaoProcesso}</small><br>` : ''}
      <small style="color: #64748b;">${r.data}</small><br>
      <button onclick="editar(${r.id})">Editar</button>
      <button onclick="excluir(${r.id})">Excluir</button>
    `;
    lista.appendChild(div);
  });
}

// ================= EDITAR/EXCLUIR =================
function editar(id) {
  const dados = JSON.parse(localStorage.getItem("registros")) || [];
  const r = dados.find(item => item.id === id);
  if (!r) return;

  nome.value = r.nome;
  placa.value = r.placa;
  reparo.value = r.reparo;
  obs.value = r.obs || '';
  descricaoProcesso.value = r.descricaoProcesso || '';

  editandoId = id;
  btnSalvar.textContent = "Atualizar";
  nome.focus();
}

function excluir(id) {
  if (confirm("Excluir este registro?")) {
    let dados = JSON.parse(localStorage.getItem("registros")) || [];
    dados = dados.filter(r => r.id !== id);
    localStorage.setItem("registros", JSON.stringify(dados));
    renderizar();
  }
}

// ================= LIMPAR =================
function limparFormulario() {
  nome.value = placa.value = reparo.value = obs.value = descricaoProcesso.value = "";
  editandoId = null;
  btnSalvar.textContent = "Salvar";
}

btnLimparForm.onclick = limparFormulario;

// ================= EXPORT CSV CORRIGIDO =================
btnExportar.onclick = () => {
  const dados = JSON.parse(localStorage.getItem("registros")) || [];
  if (!dados.length) return alert("Sem registros!");

  let csv = "\uFEFFResponsável;Placa;Tipo de Reparo;Observações;Descrição do Processo;Data\r\n";

  dados.forEach(r => {
    csv += `"${r.nome.replace(/"/g,'""')}";"${r.placa}";"${r.reparo.replace(/"/g,'""')}";"${(r.obs||'').replace(/"/g,'""')}";"${(r.descricaoProcesso||'').replace(/"/g,'""')}";"${r.data}"\r\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `registros_manutencao_${new Date().toISOString().slice(0,10)}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
};

// ================= INICIALIZAÇÃO =================
btnIniciarVoz.onclick = iniciarFluxoVoz;
renderizar();


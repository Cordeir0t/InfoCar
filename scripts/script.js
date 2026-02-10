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

const iconeRobo = document.getElementById("iconeRobo");
const iconeMic = document.getElementById("iconeMic");

let editandoId = null;
let etapaVoz = 0;
let timeoutSilencio = null;

// ================= VOZ =================
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  btnIniciarVoz.style.display = "none";
  btnIniciarVoz.title = "Reconhecimento de voz não suportado";
}

const rec = new SpeechRecognition();
rec.lang = "pt-BR";
rec.interimResults = false;
rec.continuous = false;

const synth = window.speechSynthesis;

// ================= MAPA DE REPAROS (para voz) =================
const mapaReparos = {
  "troca de óleo": "Troca de óleo",
  "freio": "Freio",
  "suspensão": "Suspensão",
  "elétrica": "Elétrica",
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

  fala.onend = () => {
    setTimeout(() => {
      mostrarMic();
      if (callback) callback();
    }, 100);
  };

  synth.speak(fala);
}

// ================= OUVIR CAMPO COMUM =================
function ouvirCampo(campo, repetirPergunta, callbackSucesso) {
  rec.abort();
  rec.start();

  timeoutSilencio = setTimeout(() => {
    rec.abort();
    falar(repetirPergunta, () => ouvirCampo(campo, repetirPergunta, callbackSucesso));
  }, 5000);

  rec.onresult = (e) => {
    clearTimeout(timeoutSilencio);
    const texto = e.results[0][0].transcript.toLowerCase();
    campo.value = texto;
    rec.abort();
    if (callbackSucesso) callbackSucesso(texto);
    else proximaEtapa();
  };
}

// ================= OUVIR SELECT REPARO =================
function ouvirReparo() {
  rec.abort();
  rec.start();

  timeoutSilencio = setTimeout(() => {
    rec.abort();
    falar("Diga: óleo, freio, suspensão, elétrica, motor, alinhamento ou outro", 
      ouvirReparo
    );
  }, 5000);

  rec.onresult = (e) => {
    clearTimeout(timeoutSilencio);
    const texto = e.results[0][0].transcript.toLowerCase();
    
    // Mapeia fala para opção do select
    for (let chave in mapaReparos) {
      if (texto.includes(chave)) {
        reparo.value = mapaReparos[chave];
        rec.abort();
        proximaEtapa();
        return;
      }
    }
    
    // Se não reconheceu, repete
    falar("Não entendi. Diga óleo, freio, suspensão, elétrica, motor, alinhamento ou outro", 
      ouvirReparo
    );
  };
}

// ================= FLUXO VOZ =================
function iniciarFluxoVoz() {
  etapaVoz = 0;
  limparFormulario(); // Limpa antes de começar
  proximaEtapa();
}

function proximaEtapa() {
  console.log("Etapa voz:", etapaVoz); // Debug
  
  if (etapaVoz === 0) {
    falar("Olá! Informe o nome do responsável", () =>
      ouvirCampo(nome, "Não ouvi. Qual o nome do responsável?")
    );
    etapaVoz++;
  }
  else if (etapaVoz === 1) {
    falar("Agora informe a placa do veículo", () =>
      ouvirCampo(placa, "Não ouvi a placa. Repita a placa")
    );
    etapaVoz++;
  }
  else if (etapaVoz === 2) {
    falar("Qual o tipo de reparo? Óleo, freio, suspensão, elétrica, motor, alinhamento ou outro?", 
      ouvirReparo
    );
    etapaVoz++;
  }
  else if (etapaVoz === 3) {
    falar("Alguma observação importante?", () =>
      ouvirCampo(obs, "Pode repetir as observações?")
    );
    etapaVoz++;
  }
  else if (etapaVoz === 4) {
    falar("Descreva o processo do reparo realizado", () =>
      ouvirCampo(descricaoProcesso, "Descreva o processo do reparo")
    );
    etapaVoz++;
  }
  else {
    esconderIcones();
    falar("Perfeito! Salvando o registro...", () => {
      btnSalvar.click();
      falar("Registro salvo com sucesso!");
    });
    etapaVoz = 0;
  }
}

// ================= EVENTOS =================
btnIniciarVoz.onclick = iniciarFluxoVoz;

// ================= SALVAR / ATUALIZAR =================
btnSalvar.onclick = () => {
  if (!nome.value?.trim() || !placa.value?.trim() || !reparo.value) {
    alert("Preencha responsável, placa e tipo de reparo.");
    return;
  }

  let dados = JSON.parse(localStorage.getItem("registros")) || [];

  if (editandoId) {
    dados = dados.map(r =>
      r.id === editandoId
        ? { 
            ...r, 
            nome: nome.value.trim(),
            placa: placa.value.trim().toUpperCase(),
            reparo: reparo.value,
            obs: obs.value,
            descricaoProcesso: descricaoProcesso.value
          }
        : r
    );
    editandoId = null;
    btnSalvar.textContent = "Salvar";
    alert("Registro atualizado!");
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

// Resto do código permanece igual (renderizar, editar, excluir, limparFormulario, exportar)
function renderizar() {
  lista.innerHTML = "";
  const dados = JSON.parse(localStorage.getItem("registros")) || [];

  dados.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${r.placa}</strong> — ${r.reparo}<br>
      <span style="color: #93c5fd;">${r.nome}</span><br>
      ${r.obs ? `<small style="color: #94a3b8;">Obs: ${r.obs}</small><br>` : ''}
      ${r.descricaoProcesso ? `<small style="color: #cbd5f5;"><strong>Processo:</strong> ${r.descricaoProcesso}</small>` : ''}<br>
      <small style="color: #64748b;">${r.data}</small><br>
      <button onclick="editar(${r.id})">Editar</button>
      <button onclick="excluir(${r.id})">Excluir</button>
    `;
    lista.appendChild(div);
  });
}

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
  if (!confirm("Deseja excluir este registro?")) return;

  let dados = JSON.parse(localStorage.getItem("registros")) || [];
  dados = dados.filter(r => r.id !== id);
  localStorage.setItem("registros", JSON.stringify(dados));
  renderizar();
}

function limparFormulario() {
  nome.value = "";
  placa.value = "";
  reparo.value = "";
  obs.value = "";
  descricaoProcesso.value = "";
  editandoId = null;
  btnSalvar.textContent = "Salvar";
}

const btnExportar = document.getElementById("exportarExcel");
btnExportar.onclick = () => {
  const dados = JSON.parse(localStorage.getItem("registros")) || [];

  if (dados.length === 0) {
    alert("Não há registros para exportar.");
    return;
  }

  let csv = "Responsável;Placa;Tipo de Reparo;Observações;Descrição do Processo;Data\n";

  dados.forEach(r => {
    csv += `"${r.nome.replace(/"/g, '""')}";"${r.placa}";"${r.reparo.replace(/"/g, '""')}";"${(r.obs || '').replace(/"/g, '""')}";"${(r.descricaoProcesso || '').replace(/"/g, '""')}";"${r.data}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_manutencao_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

// ================= INIT =================
renderizar();

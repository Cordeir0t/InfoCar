// ================= ELEMENTOS =================
const nome = document.getElementById("nome");
const placa = document.getElementById("placa");
const reparo = document.getElementById("reparo");
const obs = document.getElementById("observacoes");
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
  alert("Use Google Chrome ou Edge para usar o reconhecimento de voz.");
}

const rec = new SpeechRecognition();
rec.lang = "pt-BR";
rec.interimResults = false;
rec.continuous = false;

const synth = window.speechSynthesis;

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
    }, 100); // tempo visual entre robô e mic
  };

  synth.speak(fala);
}

// ================= OUVIR =================
function ouvirCampo(campo, repetirPergunta) {
  rec.abort();
  rec.start();

  timeoutSilencio = setTimeout(() => {
    rec.abort();
    falar(repetirPergunta, () =>
      ouvirCampo(campo, repetirPergunta)
    );
  }, 5000);

  rec.onresult = (e) => {
    clearTimeout(timeoutSilencio);
    campo.value = e.results[0][0].transcript;
    rec.abort();
    proximaEtapa();
  };
}

// ================= FLUXO =================
function iniciarFluxoVoz() {
  etapaVoz = 0;
  proximaEtapa();
}

function proximaEtapa() {
  if (etapaVoz === 0) {
    falar("Informe o responsável", () =>
      ouvirCampo(nome, "Não ouvi. Informe o responsável")
    );
    etapaVoz++;
  }

  else if (etapaVoz === 1) {
    falar("Informe a placa do veículo", () =>
      ouvirCampo(placa, "Não ouvi. Informe a placa do veículo")
    );
    etapaVoz++;
  }

  else if (etapaVoz === 2) {
    falar("Deseja informar observações?", () =>
      ouvirCampo(obs, "Pode informar as observações agora")
    );
    etapaVoz++;
  }

  else {
    esconderIcones();
    falar("Atendimento por voz finalizado.");
    etapaVoz = 0;
  }
}

// ================= BOTÃO INICIAR =================
btnIniciarVoz.onclick = iniciarFluxoVoz;

// ================= SALVAR / ATUALIZAR =================
btnSalvar.onclick = () => {
  if (!nome.value || !placa.value || !reparo.value) {
    alert("Preencha responsável, placa e tipo de reparo.");
    return;
  }

  let dados = JSON.parse(localStorage.getItem("registros")) || [];

  if (editandoId) {
    dados = dados.map(r =>
      r.id === editandoId
        ? { ...r, nome: nome.value, placa: placa.value, reparo: reparo.value, obs: obs.value }
        : r
    );
    editandoId = null;
    btnSalvar.textContent = "Salvar";
  } else {
    dados.push({
      id: Date.now(),
      nome: nome.value,
      placa: placa.value,
      reparo: reparo.value,
      obs: obs.value,
      data: new Date().toLocaleString()
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

  dados.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${r.placa}</strong> — ${r.reparo}<br>
      ${r.nome}<br>
      <small>${r.data}</small><br><br>
      <button onclick="editar(${r.id})">Editar</button>
      <button onclick="excluir(${r.id})">Excluir</button>
    `;
    lista.appendChild(div);
  });
}

// ================= EDITAR =================
function editar(id) {
  const dados = JSON.parse(localStorage.getItem("registros")) || [];
  const r = dados.find(item => item.id === id);
  if (!r) return;

  nome.value = r.nome;
  placa.value = r.placa;
  reparo.value = r.reparo;
  obs.value = r.obs;

  editandoId = id;
  btnSalvar.textContent = "Atualizar";
}

// ================= EXCLUIR =================
function excluir(id) {
  if (!confirm("Deseja excluir este registro?")) return;

  let dados = JSON.parse(localStorage.getItem("registros")) || [];
  dados = dados.filter(r => r.id !== id);
  localStorage.setItem("registros", JSON.stringify(dados));
  renderizar();
}

// ================= LIMPAR FORM =================
btnLimparForm.onclick = limparFormulario;

function limparFormulario() {
  nome.value = "";
  placa.value = "";
  reparo.value = "";
  obs.value = "";
  editandoId = null;
  btnSalvar.textContent = "Salvar";
}

// ================= EXPORTAR PARA EXCEL =================
const btnExportar = document.getElementById("exportarExcel");

btnExportar.onclick = () => {
  const dados = JSON.parse(localStorage.getItem("registros")) || [];

  if (dados.length === 0) {
    alert("Não há registros para exportar.");
    return;
  }

  let csv = "Responsável;Placa;Tipo de Reparo;Observações;Data\n";

  dados.forEach(r => {
    csv += `"${r.nome}";"${r.placa}";"${r.reparo}";"${r.obs}";"${r.data}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "registros_manutencao.csv";
  link.click();

  URL.revokeObjectURL(url);
};

// ================= INIT =================
renderizar();

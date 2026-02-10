// ================= ELEMENTOS =================
const nome = document.getElementById("nome");
const placa = document.getElementById("placa");
const reparo = document.getElementById("reparo");
const obs = document.getElementById("observacoes");
const descricaoProcesso = document.getElementById("descricaoProcesso"); // Novo campo
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

// ================= FLUXO VOZ =================
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
    falar("Informe o tipo de reparo", () =>
      ouvirCampo(reparo, "Informe o tipo de reparo")
    );
    etapaVoz++;
  }
  else if (etapaVoz === 3) {
    falar("Deseja informar observações?", () =>
      ouvirCampo(obs, "Pode informar as observações")
    );
    etapaVoz++;
  }
  else if (etapaVoz === 4) {
    falar("Descreva o processo realizado", () =>
      ouvirCampo(descricaoProcesso, "Descreva o processo")
    );
    etapaVoz++;
  }
  else {
    esconderIcones();
    falar("Registro salvo com sucesso!");
    etapaVoz = 0;
    btnSalvar.click(); // Auto-salva após voz
  }
}

// ================= EVENTOS =================
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
        ? { 
            ...r, 
            nome: nome.value, 
            placa: placa.value, 
            reparo: reparo.value, 
            obs: obs.value,
            descricaoProcesso: descricaoProcesso.value  // Novo campo
          }
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
      descricaoProcesso: descricaoProcesso.value,  // Novo campo
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
      <strong>${r.placa.toUpperCase()}</strong> — ${r.reparo}<br>
      <span>${r.nome}</span><br>
      ${r.obs ? `<small>${r.obs}</small><br>` : ''}
      ${r.descricaoProcesso ? `<small><strong>Processo:</strong> ${r.descricaoProcesso}</small>` : ''}<br>
      <small>Data: ${r.data}</small><br>
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
  obs.value = r.obs || '';
  descricaoProcesso.value = r.descricaoProcesso || '';

  editandoId = id;
  btnSalvar.textContent = "Atualizar";
  nome.focus();
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
  descricaoProcesso.value = "";  // Limpar novo campo
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

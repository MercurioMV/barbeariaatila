// ===============================
// FUNÇÃO DE UTILIDADE: DATA CORRETA
// ===============================
function getTodayDateString() {
    const today = new Date();
    today.setHours(today.getHours() - today.getTimezoneOffset() / 60);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ===============================
// PERSISTÊNCIA E CONFIGURAÇÃO
// ===============================
const SENHA_PADRAO = "4t1l4";
const STORAGE_KEY_SENHA = "senhaAdminBarbearia";

function getSenhaAdmin() {
    return localStorage.getItem(STORAGE_KEY_SENHA) || SENHA_PADRAO;
}

function setSenhaAdmin(novaSenha) {
    localStorage.setItem(STORAGE_KEY_SENHA, novaSenha);
}

document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.min = getTodayDateString();
    }
});

const etapa1 = document.getElementById("etapa1");
const etapa2 = document.getElementById("etapa2");
const btnProxima = document.getElementById("proximaEtapa");
const btnVoltar = document.getElementById("voltarEtapa");
const form = document.getElementById("form-agendamento");
const totalSpan = document.getElementById("total");

function carregarAgendamentos() {
    const dadosSalvos = localStorage.getItem('agendamentosBarbearia');
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
}

function salvarAgendamentos() {
    localStorage.setItem('agendamentosBarbearia', JSON.stringify(agendamentos));
}

let agendamentos = carregarAgendamentos();

// ===============================
// LÓGICA DE DURAÇÃO (30 min por serviço)
// ===============================
function calcularDuracaoTotal(servicosArray) {
    return servicosArray.length * 30;
}

function criarObjetoAgendamento(nome, telefone, data, hora, servicos, total, servicosArray) {
    const duracaoTotal = calcularDuracaoTotal(servicosArray);
    return {
        nome, telefone, data, hora, servicos, total,
        duracao: duracaoTotal
    };
}

// ===============================
// VERIFICAÇÃO DE CONFLITO (Intervalo Completo)
// ===============================
function verificarConflito(novoData, novoHora, duracaoNova, listaExistente) {
    const inicioNovo = new Date(`${novoData}T${novoHora}`);
    const fimNovo = new Date(inicioNovo.getTime() + duracaoNova * 60000);

    for (const ag of listaExistente) {
        if (ag.data !== novoData) continue;

        const inicioExistente = new Date(`${ag.data}T${ag.hora}`);
        const duracaoExistente = ag.duracao || 30;
        const fimExistente = new Date(inicioExistente.getTime() + duracaoExistente * 60000);

        // Se sobrepõe?
        if (inicioNovo < fimExistente && fimNovo > inicioExistente) {
            return true;
        }
    }
    return false;
}

// ===============================
// INICIALIZAÇÃO (Lógica separada por página)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    const urlAtual = window.location.pathname;

    // Se estiver no ADMIN.HTML
    if (urlAtual.includes('admin.html')) {
        const lista = document.getElementById("lista-agendamentos");

        function renderizarAgendamento(agendamento, index) {
            if (!lista) return;
            const item = document.createElement("div");
            item.classList.add("agendamento-card");
            item.innerHTML = `
                <h4>${agendamento.nome} <button onclick="removerAgendamento(${index})" class="btn-remover">X</button></h4>
                <p><b>Serviços:</b> ${agendamento.servicos}</p>
                <p><b>Duração:</b> ${agendamento.duracao || 30} min</p>
                <p><b>Data:</b> ${new Date(agendamento.data + "T00:00").toLocaleDateString('pt-BR')} às ${agendamento.hora}</p>
                <p><b>Telefone:</b> ${agendamento.telefone}</p>
                <p><b>Total:</b> R$ ${agendamento.total}</p>
            `;
            lista.appendChild(item);
        }

        function inicializarLista() {
            if (!lista) return;
            lista.innerHTML = '';
            agendamentos = carregarAgendamentos();
            if (agendamentos.length === 0) {
                lista.innerHTML = '<p style="color:#999;text-align:center;">Nenhum agendamento.</p>';
            } else {
                agendamentos.sort((a, b) => new Date(a.data+'T'+a.hora) - new Date(b.data+'T'+b.hora));
                agendamentos.forEach((a, i) => renderizarAgendamento(a, i));
            }
        }

        window.removerAgendamento = function(index) {
            if (confirm("Remover agendamento?")) {
                agendamentos.splice(index, 1);
                salvarAgendamentos();
                inicializarLista();
            }
        };

        inicializarLista();

        // Troca de Senha
        const formTroca = document.getElementById('form-troca-senha');
        if (formTroca) {
            formTroca.addEventListener('submit', (e) => {
                e.preventDefault();
                const atual = document.getElementById('senha-atual').value.trim();
                const nova = document.getElementById('nova-senha').value.trim();
                const confirm = document.getElementById('confirmar-senha').value.trim();

                if (atual !== getSenhaAdmin()) return alert("Senha atual incorreta.");
                if (nova.length < 4) return alert("Senha muito curta.");
                if (nova !== confirm) return alert("Senhas não conferem.");

                setSenhaAdmin(nova);
                alert("Senha atualizada!");
                formTroca.reset();
            });
        }
    }
});

// ===============================
// INTERAÇÃO DO FORMULÁRIO (CLIENTE)
// ===============================
if (btnProxima) {
    btnProxima.addEventListener("click", () => {
        const nome = document.getElementById("nome").value.trim();
        const tel = document.getElementById("telefone").value.trim();
        if (!nome || !tel) return alert("Preencha nome e telefone.");
        etapa1.classList.remove("ativa");
        etapa2.classList.add("ativa");
    });
}

if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
        etapa2.classList.remove("ativa");
        etapa1.classList.add("ativa");
    });
}

document.querySelectorAll('.servicos input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", () => {
        let total = 0;
        document.querySelectorAll('.servicos input[type="checkbox"]:checked').forEach(item => {
            total += parseFloat(item.value);
        });
        totalSpan.textContent = total.toFixed(2).replace('.', ',');
    });
});

if (form) {
    form.addEventListener("submit", e => {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const data = document.getElementById("data").value.trim();
        const hora = document.getElementById("hora").value.trim();
        const totalStr = totalSpan.textContent;
        const servicosArray = Array.from(document.querySelectorAll('.servicos input[type="checkbox"]:checked'));
        const servicos = servicosArray.map(s => s.parentElement.textContent.trim().split('-')[0].trim()).join(", ");

        if (!servicos) return alert("Selecione um serviço.");

        // Regra: Bloqueio de Segunda-feira (1)
        const diaSemana = new Date(data + "T00:00").getDay();
        if (diaSemana === 1) return alert("A Barbearia não funciona às segundas-feiras.");

        const horaInt = parseInt(hora.split(':')[0]);
        if (horaInt < 9 || horaInt >= 19) return alert("Horário de funcionamento: 09:00 às 19:00.");
        if (horaInt === 12) return alert("Intervalo entre 12:00 e 13:00.");

        const duracao = calcularDuracaoTotal(servicosArray);

        if (verificarConflito(data, hora, duracao, agendamentos)) {
            return alert(`Horário indisponível! O serviço levará ${duracao} min e conflita com outro cliente.`);
        }

        const novo = criarObjetoAgendamento(nome, telefone, data, hora, servicos, totalStr, servicosArray);
        agendamentos.push(novo);
        salvarAgendamentos();

        const msg = encodeURIComponent(`*Novo Agendamento*\n👤 ${nome}\n📞 ${telefone}\n🗓 ${new Date(data).toLocaleDateString('pt-BR')}\n⏰ ${hora} (${duracao} min)\n💈 ${servicos}\n💵 R$ ${totalStr}`);
        window.open(`https://wa.me/5561984911379?text=${msg}`, "_blank");

        alert("Agendamento realizado!");
        window.location.reload();
    });
}

/*
Javascript
========== Funções de máscara e validação ==========
*/

// Permite apenas números inteiros
function permitirApenasNumeros(campo) {
    campo.value = campo.value.replace(/\D/g, '');
}

// Formata data no padrão dd/mm/aaaa
function formatarData(campo) {
    let valor = campo.value.replace(/\D/g, '');
    if (valor.length > 2 && valor.length <= 4)
        campo.value = valor.replace(/(\d{2})(\d{1,2})/, '$1/$2');
    else if (valor.length > 4)
        campo.value = valor.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    else
        campo.value = valor;
}

// Máscara de CPF: 000.000.000-00
function formatarCPF(campo) {
    let valor = campo.value.replace(/\D/g, '');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})/, '$1-$2');
    campo.value = valor;
}

// Máscara de telefone: (00) 00000-0000
function formatarTelefone(campo) {
    let valor = campo.value.replace(/\D/g, '');
    valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
    valor = valor.replace(/(\d{5})(\d{4})$/, '$1-$2');
    campo.value = valor;
}
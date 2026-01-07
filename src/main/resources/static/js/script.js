// ===============================
// ROTINA DE LIMPEZA (GARBAGE COLLECTION)
// ===============================
function limparAgendamentosAntigos() {
    const agora = new Date();
    // Define o limite como "ontem"
    agora.setDate(agora.getDate() - 1);

    let agendamentos = carregarAgendamentos();
    const totalAntes = agendamentos.length;

    // Filtra: Mantém apenas agendamentos futuros ou de hoje
    agendamentos = agendamentos.filter(ag => {
        const dataAgendamento = new Date(ag.data + "T" + ag.hora);
        return dataAgendamento > agora;
    });

    if (agendamentos.length !== totalAntes) {
        console.log(`Limpando ${totalAntes - agendamentos.length} agendamentos antigos...`);
        localStorage.setItem('agendamentosBarbearia', JSON.stringify(agendamentos));
        // Se estiver na tela de admin, recarrega a lista
        if (typeof inicializarLista === "function") {
            inicializarLista();
        }
    }
}

// Chame isso assim que o script carregar
document.addEventListener('DOMContentLoaded', () => {
    limparAgendamentosAntigos();
    // ... resto do seu código ...
});

// ===============================
// CONFIGURAÇÃO: DIAS E DATAS FECHADAS
// ===============================
// 0 = Domingo, 1 = Segunda, ... 6 = Sábado
const DIAS_SEMANA_FECHADOS = [0, 1]; // Fechado Domingo e Segunda

// Datas específicas (Feriados ou folgas manuais)
const DATAS_BLOQUEADAS = [
    "2026-12-25", // Exemplo: Natal
    "2026-01-01"  // Exemplo: Ano Novo
];

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

// ===============================
// NOVA LÓGICA COM FIREBASE (ONLINE)
// ===============================

// 1. Verificar conflito direto na nuvem
async function verificarConflitoReal(data, hora, duracaoNova) {
    // Busca agendamentos DAQUELA DATA no servidor
    const q = window.query(
        window.collection(window.db, "agendamentos"),
        window.where("data", "==", data)
    );

    const querySnapshot = await window.getDocs(q);
    let conflito = false;

    const inicioNovo = new Date(`${data}T${hora}`);
    const fimNovo = new Date(inicioNovo.getTime() + duracaoNova * 60000);

    querySnapshot.forEach((doc) => {
        const ag = doc.data();
        // Recria as datas do agendamento que veio do banco
        const inicioExistente = new Date(`${ag.data}T${ag.hora}`);
        const duracaoExistente = ag.duracao || 30;
        const fimExistente = new Date(inicioExistente.getTime() + duracaoExistente * 60000);

        // A mesma matemática de colisão, mas agora com dados reais
        if (inicioNovo < fimExistente && fimNovo > inicioExistente) {
            conflito = true;
        }
    });

    return conflito;
}

// 2. Salvar na nuvem
async function salvarNoFirebase(agendamento) {
    try {
        await window.addDoc(window.collection(window.db, "agendamentos"), agendamento);
        return true;
    } catch (e) {
        console.error("Erro Firebase:", e);
        alert("Erro de conexão. Tente novamente.");
        return false;
    }
}

// 3. Atualize o Listener do Botão (Tem que ser ASYNC agora)
if (form) {
    form.addEventListener("submit", async (e) => { // <--- Adicione ASYNC aqui
        e.preventDefault();

        // ... (pegue os valores dos inputs: nome, telefone, data, hora normalmente) ...
        // (Mantenha suas validações de dia fechado e horário aqui)

        const duracao = calcularDuracaoTotal(servicosArray);

        // VERIFICAÇÃO PODEROSA NA NUVEM
        // Mostra um "Carregando..." (opcional, mas bom pra UX)
        const botaoSubmit = form.querySelector('button[type="submit"]');
        botaoSubmit.textContent = "Verificando...";
        botaoSubmit.disabled = true;

        const existeConflito = await verificarConflitoReal(data, hora, duracao);

        if (existeConflito) {
            botaoSubmit.textContent = "Agendar";
            botaoSubmit.disabled = false;
            return alert(`Horário indisponível! Já existe um cliente agendado.`);
        }

        // Se passou, cria o objeto
        const novo = criarObjetoAgendamento(nome, telefone, data, hora, servicos, totalStr, servicosArray);

        // Salva na nuvem
        const salvou = await salvarNoFirebase(novo);

        if (salvou) {
            // Manda pro Zap
            const msg = encodeURIComponent(`*Novo Agendamento*\n👤 ${nome}...`); // (seu código do zap)
            window.open(`https://wa.me/5561984911379?text=${msg}`, "_blank");

            alert("Agendamento Confirmado!");
            window.location.reload();
        }
    });
}

// ===============================
// LÓGICA DE DURAÇÃO (30 min por serviço)
// ===============================
function calcularDuracaoTotal(servicosArray) {
    return servicosArray.length * 40;
}

function criarObjetoAgendamento(nome, telefone, data, hora, servicos, total, servicosArray) {
    const duracaoTotal = calcularDuracaoTotal(servicosArray);
    return {
        nome, telefone, data, hora, servicos, total,
        duracao: duracaoTotal
    };
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

        // === NOVA LÓGICA DE BLOQUEIO DE DATAS ===
        const dataObj = new Date(data + "T00:00");
        const diaSemana = dataObj.getDay();

        // 1. Verifica se é Domingo (0) ou Segunda (1)
        if (DIAS_SEMANA_FECHADOS.includes(diaSemana)) {
            return alert("A Barbearia não funciona aos Domingos e Segundas-feiras.");
        }

        // 2. Verifica se a data está na lista de bloqueados
        if (DATAS_BLOQUEADAS.includes(data)) {
            return alert("A Barbearia estará fechada nesta data específica.");
        }
        // =========================================

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

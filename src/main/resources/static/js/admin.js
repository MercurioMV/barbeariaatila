// ===============================
// CONSTANTES E PERSISTÊNCIA (Local Storage)
// ===============================
const SENHA_PADRAO = "Atila"; // Senha padrão inicial
const STORAGE_KEY_SENHA = "senhaAdminBarbearia";
const STORAGE_KEY_AGENDAMENTOS = 'agendamentosBarbearia';

// Elementos DOM
const listaAgendamentos = document.getElementById("lista-agendamentos");
const adminContent = document.getElementById("admin-content");
const loginFormAdmin = document.getElementById("login-form-admin");
const btnLoginAdmin = document.getElementById("btn-login-admin");
const senhaAdminInput = document.getElementById("senha-admin-input");
const loginMessage = document.getElementById("login-message");

// Funções de Persistência
function getSenhaAdmin() {
    // Retorna a senha salva ou a padrão
    return localStorage.getItem(STORAGE_KEY_SENHA) || SENHA_PADRAO;
}

function setSenhaAdmin(novaSenha) {
    localStorage.setItem(STORAGE_KEY_SENHA, novaSenha);
}

function carregarAgendamentos() {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY_AGENDAMENTOS);
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
}

function salvarAgendamentos(agendamentos) {
    localStorage.setItem(STORAGE_KEY_AGENDAMENTOS, JSON.stringify(agendamentos));
}

let agendamentos = carregarAgendamentos();

// ===============================
// LÓGICA DE RENDERIZAÇÃO E EXCLUSÃO
// ===============================

// Cria o HTML de um único agendamento
function renderizarAgendamento(agendamento, index) {
    const item = document.createElement("div");
    item.classList.add("agendamento-card");

    // O onclick chama a função removerAgendamento globalmente
    const botaoRemover = `<button onclick="removerAgendamento(${index})" class="btn-remover">X</button>`;

    item.innerHTML = `
        <h4>${agendamento.nome} ${botaoRemover}</h4>
        <p><b>Serviços:</b> ${agendamento.servicos}</p>
        <p><b>Data:</b> ${new Date(agendamento.data + "T00:00").toLocaleDateString('pt-BR')} às ${agendamento.hora}</p>
        <p><b>Telefone:</b> ${agendamento.telefone}</p>
        <p><b>Total:</b> R$ ${agendamento.total}</p>
    `;
    listaAgendamentos.appendChild(item);
}

// Limpa e lista todos os agendamentos
function inicializarLista() {
    if (!listaAgendamentos) return;

    // Recarrega do storage antes de renderizar
    agendamentos = carregarAgendamentos();
    listaAgendamentos.innerHTML = '';

    if (agendamentos.length === 0) {
         listaAgendamentos.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">Nenhum agendamento encontrado.</p>';
    } else {
         // Renderiza os agendamentos em ordem da data mais próxima
         agendamentos.sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.hora);
            const dateB = new Date(b.data + 'T' + b.hora);
            return dateA - dateB;
         });
         agendamentos.forEach((a, index) => renderizarAgendamento(a, index));
    }
}

// Função de exclusão (disponível globalmente para o HTML)
window.removerAgendamento = function(index) {
    if (confirm("Tem certeza que deseja remover este agendamento?")) {
        agendamentos.splice(index, 1); // Remove o item no índice
        salvarAgendamentos(agendamentos); // Salva a lista atualizada
        inicializarLista(); // Renderiza a lista novamente
        alert("Agendamento removido com sucesso!");
    }
}


// ===============================
// LÓGICA DE LOGIN
// ===============================
function fazerLogin() {
    const senhaDigitada = senhaAdminInput.value.trim();
    const senhaCorreta = getSenhaAdmin();

    if (senhaDigitada === senhaCorreta) {
        loginFormAdmin.style.display = 'none';
        adminContent.style.display = 'block';
        loginMessage.style.display = 'none';
        inicializarLista(); // Carrega os agendamentos após o login
    } else {
        loginMessage.textContent = 'Senha incorreta.';
        loginMessage.style.display = 'block';
        senhaAdminInput.value = '';
    }
}

btnLoginAdmin.addEventListener("click", fazerLogin);
senhaAdminInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
        fazerLogin();
    }
});


// ===============================
// LÓGICA DE TROCA DE SENHA
// ===============================
const formTroca = document.getElementById('form-troca-senha');
const inputSenhaAtual = document.getElementById('senha-atual');
const inputNova = document.getElementById('nova-senha');
const inputConfirm = document.getElementById('confirmar-senha');
const mensagemEl = document.getElementById('mensagem-troca-senha');

if (formTroca) {
    formTroca.addEventListener('submit', (e) => {
        e.preventDefault();

        const senhaAtualDigitada = inputSenhaAtual.value.trim();
        const nova = inputNova.value.trim();
        const confirm = inputConfirm.value.trim();
        const senhaAtualSalva = getSenhaAdmin();

        if (senhaAtualDigitada !== senhaAtualSalva) {
            alert("Senha atual incorreta.");
            inputSenhaAtual.value = '';
            return;
        }

        if (nova.length < 4) {
            alert("A nova senha deve ter pelo menos 4 caracteres.");
            return;
        }

        if (nova !== confirm) {
            alert("Nova senha e confirmação não conferem.");
            return;
        }

        // Salva a nova senha
        setSenhaAdmin(nova);

        // Feedback ao usuário
        mensagemEl.style.display = 'block';
        mensagemEl.textContent = "Senha atualizada com sucesso!";
        // limpa campos
        inputSenhaAtual.value = '';
        inputNova.value = '';
        inputConfirm.value = '';

        // Opcional: esconder a mensagem depois de alguns segundos
        setTimeout(() => {
            mensagemEl.style.display = 'none';
        }, 4000);
    });
}
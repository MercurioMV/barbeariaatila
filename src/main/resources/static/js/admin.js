// ===============================
// ADMINISTRAÇÃO: FIREBASE + SENHA
// ===============================

const listaAgendamentos = document.getElementById("lista-agendamentos");
const loginFormAdmin = document.getElementById("login-form-admin");
const adminContent = document.getElementById("admin-content");
const btnLoginAdmin = document.getElementById("btn-login-admin");
const senhaAdminInput = document.getElementById("senha-admin-input");

// Elementos da Troca de Senha
const formTrocaSenha = document.getElementById("form-troca-senha");
const senhaAtualInput = document.getElementById("senha-atual");
const novaSenhaInput = document.getElementById("nova-senha");
const confirmarSenhaInput = document.getElementById("confirmar-senha");
const msgTroca = document.getElementById("mensagem-troca-senha");

// Configuração de Senha
const SENHA_PADRAO = "4t1l4";
const STORAGE_KEY = "senha_admin_barbearia"; // Chave para salvar no navegador

// Função para pegar a senha válida (do navegador ou a padrão)
function getSenhaReal() {
    return localStorage.getItem(STORAGE_KEY) || SENHA_PADRAO;
}

// 1. Lógica de Login
btnLoginAdmin.addEventListener("click", () => {
    const senhaDigitada = senhaAdminInput.value;
    const senhaReal = getSenhaReal();

    if (senhaDigitada === senhaReal) {
        loginFormAdmin.style.display = 'none';
        adminContent.style.display = 'block';
        carregarListaFirebase();
    } else {
        alert("Senha incorreta!");
    }
});

// 2. Lógica de Trocar Senha (RECUPERADA)
if (formTrocaSenha) {
    formTrocaSenha.addEventListener("submit", (e) => {
        e.preventDefault();

        const atual = senhaAtualInput.value;
        const nova = novaSenhaInput.value;
        const confirmar = confirmarSenhaInput.value;
        const senhaReal = getSenhaReal();

        // Validações
        if (atual !== senhaReal) {
            return alert("A senha atual está incorreta.");
        }
        if (nova.length < 4) {
            return alert("A nova senha deve ter pelo menos 4 letras/números.");
        }
        if (nova !== confirmar) {
            return alert("A nova senha e a confirmação não batem.");
        }

        // Salva a nova senha no navegador
        localStorage.setItem(STORAGE_KEY, nova);

        // Feedback visual
        msgTroca.style.display = "block";
        msgTroca.textContent = "Senha alterada com sucesso!";
        msgTroca.style.color = "#00C851"; // Verde

        // Limpa os campos
        formTrocaSenha.reset();

        setTimeout(() => {
            msgTroca.style.display = "none";
        }, 3000);
    });
}

// 3. Carrega Lista do Firebase (Igual ao anterior)
async function carregarListaFirebase() {
    listaAgendamentos.innerHTML = '<p style="text-align:center; color:#d4af37">Atualizando agenda...</p>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "agendamentos"));

        const agendamentos = [];
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        const promessasDeLimpeza = [];

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const dataAgendamento = new Date(dados.data + "T00:00");

            // Limpeza Automática (Ontem pra trás)
            if (dataAgendamento < hoje) {
                console.log("Arquivando antigo:", dados.nome);
                promessasDeLimpeza.push(arquivarAutomatico(doc.id, dados));
            } else {
                agendamentos.push({ id: doc.id, ...dados });
            }
        });

        if (promessasDeLimpeza.length > 0) await Promise.all(promessasDeLimpeza);

        // Ordena
        agendamentos.sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.hora);
            const dateB = new Date(b.data + 'T' + b.hora);
            return dateA - dateB;
        });

        renderizarLista(agendamentos);

    } catch (error) {
        console.error("Erro:", error);
        listaAgendamentos.innerHTML = '<p style="color:red">Erro ao carregar.</p>';
    }
}

// 4. Renderiza na Tela
function renderizarLista(lista) {
    listaAgendamentos.innerHTML = '';

    if (lista.length === 0) {
        listaAgendamentos.innerHTML = '<p style="text-align:center;">Agenda vazia ou concluída.</p>';
        return;
    }

    lista.forEach(ag => {
        const item = document.createElement("div");
        item.classList.add("agendamento-card");

        const dataFormatada = new Date(ag.data + "T00:00").toLocaleDateString('pt-BR');

        item.innerHTML = `
            <h4>
                ${ag.nome}
                <div>
                    <button onclick="concluirServico('${ag.id}')" class="btn-concluir" title="Concluir">✔</button>
                    <button onclick="cancelarServico('${ag.id}')" class="btn-remover" title="Cancelar">X</button>
                </div>
            </h4>
            <p><b>Serviços:</b> ${ag.servicos}</p>
            <p><b>Horário:</b> ${dataFormatada} às ${ag.hora}</p>
            <p><b>Contato:</b> ${ag.telefone}</p>
            <p><b>Total:</b> R$ ${ag.total}</p>
        `;
        listaAgendamentos.appendChild(item);
    });
}

// 5. Ações dos Botões (Concluir e Cancelar)
window.concluirServico = async function(id) {
    if(!confirm("Confirmar conclusão e liberar horário?")) return;
    try {
        const docRef = window.doc(window.db, "agendamentos", id);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            await window.addDoc(window.collection(window.db, "historico"), {
                ...docSnap.data(),
                status: "Concluido",
                arquivadoEm: new Date().toISOString()
            });
            await window.deleteDoc(docRef);
            alert("Concluído!");
            carregarListaFirebase();
        }
    } catch (e) { console.error(e); alert("Erro ao concluir."); }
}

window.cancelarServico = async function(id) {
    if(!confirm("Cancelar agendamento permanentemente?")) return;
    try {
        await window.deleteDoc(window.doc(window.db, "agendamentos", id));
        alert("Cancelado!");
        carregarListaFirebase();
    } catch (e) { console.error(e); }
}

async function arquivarAutomatico(id, dados) {
    try {
        await window.addDoc(window.collection(window.db, "historico"), {
            ...dados,
            status: "Arquivo Automatico",
            arquivadoEm: new Date().toISOString()
        });
        await window.deleteDoc(window.doc(window.db, "agendamentos", id));
    } catch (e) { console.error(e); }
}

// Enter para login
senhaAdminInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') btnLoginAdmin.click();
});

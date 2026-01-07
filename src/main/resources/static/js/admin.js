// ===============================
// ADMINISTRAÇÃO MANUAL (CHECK-OUT)
// ===============================

const listaAgendamentos = document.getElementById("lista-agendamentos");
const loginFormAdmin = document.getElementById("login-form-admin");
const adminContent = document.getElementById("admin-content");
const btnLoginAdmin = document.getElementById("btn-login-admin");
const senhaAdminInput = document.getElementById("senha-admin-input");

const SENHA_PADRAO = "4t1l4";

// 1. Login
btnLoginAdmin.addEventListener("click", () => {
    const senha = senhaAdminInput.value;
    if (senha === SENHA_PADRAO) {
        loginFormAdmin.style.display = 'none';
        adminContent.style.display = 'block';
        carregarListaFirebase();
    } else {
        alert("Senha incorreta!");
    }
});

// 2. Carrega Lista (Com limpeza apenas de dias ANTERIORES)
async function carregarListaFirebase() {
    listaAgendamentos.innerHTML = '<p style="text-align:center; color:#d4af37">Atualizando agenda...</p>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "agendamentos"));

        const agendamentos = [];
        const hoje = new Date();
        hoje.setHours(0,0,0,0); // Zera hora para comparar apenas data

        const promessasDeLimpeza = [];

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const dataAgendamento = new Date(dados.data + "T00:00");

            // LIMPEZA AUTOMÁTICA: Só remove se for de ONTEM ou antes.
            if (dataAgendamento < hoje) {
                console.log("Arquivando agendamento de dia anterior:", dados.nome);
                promessasDeLimpeza.push(arquivarAutomatico(doc.id, dados));
            } else {
                agendamentos.push({ id: doc.id, ...dados });
            }
        });

        if (promessasDeLimpeza.length > 0) await Promise.all(promessasDeLimpeza);

        // Ordena por horário
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

// 3. Renderiza com os DOIS botões (ESSA É A PARTE QUE FALTAVA)
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

        // AQUI ESTÃO OS DOIS BOTÕES: ✔ e X
        item.innerHTML = `
            <h4>
                ${ag.nome}
                <div>
                    <button onclick="concluirServico('${ag.id}')" class="btn-concluir" title="Concluir e Arquivar">✔</button>
                    <button onclick="cancelarServico('${ag.id}')" class="btn-remover" title="Cancelar Agendamento">X</button>
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

// 4. FUNÇÃO DO BOTÃO VERDE (✔): Move para Histórico
window.concluirServico = async function(id) {
    if(!confirm("Confirmar conclusão do serviço? Isso libera o horário.")) return;

    try {
        const docRef = window.doc(window.db, "agendamentos", id);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();

            await window.addDoc(window.collection(window.db, "historico"), {
                ...dados,
                status: "Concluido",
                arquivadoEm: new Date().toISOString()
            });

            await window.deleteDoc(docRef);

            alert("Serviço concluído e arquivado!");
            carregarListaFirebase();
        }
    } catch (e) {
        console.error("Erro:", e);
        alert("Erro ao concluir.");
    }
}

// 5. FUNÇÃO DO BOTÃO VERMELHO (X): Cancela
window.cancelarServico = async function(id) {
    if(!confirm("Cancelar este agendamento? (Isso apaga permanentemente)")) return;

    try {
        await window.deleteDoc(window.doc(window.db, "agendamentos", id));
        alert("Agendamento cancelado!");
        carregarListaFirebase();
    } catch (e) { console.error("Erro:", e); }
}

// 6. Auxiliar
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

senhaAdminInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') btnLoginAdmin.click();
});

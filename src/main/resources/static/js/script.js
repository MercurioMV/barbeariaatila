// ===============================
// 1. CONFIGURAÇÕES E CONSTANTES
// ===============================

// Configuração de dias fechados (0 = Domingo, 1 = Segunda)
const DIAS_SEMANA_FECHADOS = [0, 1];

// Datas específicas bloqueadas (Feriados)
const DATAS_BLOQUEADAS = [
    "2026-12-25", // Natal
    "2026-01-01"  // Ano Novo
];

// Elementos da Tela (DOM)
const etapa1 = document.getElementById("etapa1");
const etapa2 = document.getElementById("etapa2");
const btnProxima = document.getElementById("proximaEtapa");
const btnVoltar = document.getElementById("voltarEtapa");
const form = document.getElementById("form-agendamento");
const totalSpan = document.getElementById("total");

// ===============================
// 2. FUNÇÕES FIREBASE (Nuvem)
// ===============================

// Verificar se já existe agendamento no horário (Lógica Real na Nuvem)
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
        const inicioExistente = new Date(`${ag.data}T${ag.hora}`);
        const duracaoExistente = ag.duracao || 30;
        const fimExistente = new Date(inicioExistente.getTime() + duracaoExistente * 60000);

        // Verifica colisão de horário
        if (inicioNovo < fimExistente && fimNovo > inicioExistente) {
            conflito = true;
        }
    });

    return conflito;
}

// Salvar o agendamento no banco de dados
async function salvarNoFirebase(agendamento) {
    try {
        await window.addDoc(window.collection(window.db, "agendamentos"), agendamento);
        return true;
    } catch (e) {
        console.error("Erro Firebase:", e);
        alert("Erro de conexão com o servidor. Tente novamente.");
        return false;
    }
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Impede a página de recarregar sozinha

        // 1. Coleta os dados
        const nome = document.getElementById("nome").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const data = document.getElementById("data").value.trim();
        const hora = document.getElementById("hora").value.trim();
        const totalStr = totalSpan.textContent;

        const servicosArray = Array.from(document.querySelectorAll('.servicos input[type="checkbox"]:checked'));
        const servicos = servicosArray.map(s => s.parentElement.textContent.trim().split('-')[0].trim()).join(", ");

        // Validações Básicas
        if (!servicos) return alert("Selecione pelo menos um serviço.");

        // Validação de Dias Fechados
        const dataObj = new Date(data + "T00:00");
        const diaSemana = dataObj.getDay();

        if (DIAS_SEMANA_FECHADOS.includes(diaSemana)) {
            return alert("A Barbearia não funciona aos Domingos e Segundas-feiras.");
        }
        if (DATAS_BLOQUEADAS.includes(data)) {
            return alert("A Barbearia estará fechada nesta data específica.");
        }

        // ===============================================
        // 2. === BLOQUEIO DE PASSADO (ESSA É A NOVIDADE) ===
        // ===============================================
        const agora = new Date(); // Data e hora exata de AGORA
        const dataAgendamento = new Date(`${data}T${hora}`); // Data e hora que o cliente quer

        // Se a data do cliente for MENOR que agora, bloqueia.
        if (dataAgendamento < agora) {
            return alert("Você não pode agendar um horário que já passou! Por favor, escolha um horário futuro.");
        }
        // ===============================================


        // Validação de Horário (9h as 19h)
        const horaInt = parseInt(hora.split(':')[0]);
        if (horaInt < 9 || horaInt >= 19) return alert("Horário de funcionamento: 09:00 às 19:00.");
        if (horaInt === 12) return alert("Intervalo de almoço entre 12:00 e 13:00.");

        // 3. Preparação para Envio
        const duracao = calcularDuracaoTotal(servicosArray);

        // UX: Avisa que está processando
        const botaoSubmit = form.querySelector('button[type="submit"]');
        const textoOriginal = botaoSubmit.textContent;
        botaoSubmit.textContent = "Verificando...";
        botaoSubmit.disabled = true;

        // 4. Verifica conflito na Nuvem (AWAIT = Espera a resposta)
        const existeConflito = await verificarConflitoReal(data, hora, duracao);

        if (existeConflito) {
            alert(`Horário indisponível! Já existe um cliente agendado neste intervalo.`);
            botaoSubmit.textContent = textoOriginal;
            botaoSubmit.disabled = false;
            return;
        }

        // 5. Cria objeto e Salva
        const novoAgendamento = {
            nome,
            telefone,
            data,
            hora,
            servicos,
            total: totalStr,
            duracao: duracao,
            criadoEm: new Date().toISOString() // Bom para organização
        };

        const salvou = await salvarNoFirebase(novoAgendamento);

        if (salvou) {
            // Manda para o WhatsApp
            const msg = encodeURIComponent(`*Novo Agendamento Confirmado*\n👤 ${nome}\n📞 ${telefone}\n🗓 ${new Date(data).toLocaleDateString('pt-BR')}\n⏰ ${hora} (${duracao} min)\n💈 ${servicos}\n💵 R$ ${totalStr}`);
            window.open(`https://wa.me/5561984911379?text=${msg}`, "_blank");

            alert("Agendamento realizado com sucesso!");
            window.location.reload();
        } else {
            // Se falhar, libera o botão de novo
            botaoSubmit.textContent = textoOriginal;
            botaoSubmit.disabled = false;
        }
    });
}

// ===============================
// 4. FUNÇÕES AUXILIARES E INTERFACE
// ===============================

// Calculadora de Preço e Duração
document.querySelectorAll('.servicos input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", () => {
        let total = 0;
        document.querySelectorAll('.servicos input[type="checkbox"]:checked').forEach(item => {
            total += parseFloat(item.value);
        });
        totalSpan.textContent = total.toFixed(2).replace('.', ',');
    });
});

function calcularDuracaoTotal(servicosArray) {
    // Regra: 40 minutos por serviço (ajuste conforme sua necessidade)
    return servicosArray.length * 40;
}

// Navegação entre Etapas
if (btnProxima) {
    btnProxima.addEventListener("click", () => {
        const nome = document.getElementById("nome").value.trim();
        const tel = document.getElementById("telefone").value.trim();
        if (!nome || !tel) return alert("Por favor, preencha nome e telefone.");

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

// Data Mínima (Hoje)
document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data');
    if (dataInput) {
        const today = new Date();
        today.setHours(today.getHours() - 3); // Ajuste fuso BR
        dataInput.min = today.toISOString().split('T')[0];
    }

    // Conecta as máscaras
    const inputTel = document.getElementById('telefone');
    if(inputTel) inputTel.addEventListener('input', function() { formatarTelefone(this); });
});

// Máscaras de Input
function formatarTelefone(campo) {
    let valor = campo.value.replace(/\D/g, '');
    valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
    valor = valor.replace(/(\d{5})(\d{4})$/, '$1-$2');
    campo.value = valor;
}

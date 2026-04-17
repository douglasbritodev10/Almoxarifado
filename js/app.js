import { db, auth } from './config.js';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, onSnapshot, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userRole = 'leitor';
let userName = '';
let currentProdId = null;
let currentProdNome = "";
let currentProdQtd = 0;
let listaCompletaProdutos = [];

// --- INICIALIZAÇÃO E PERMISSÕES ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            userRole = data.nivel;
            userName = data.username;
            document.getElementById('userNameDisplay').innerText = userName;
            
            if (document.getElementById('gridProdutos')) carregarProdutos();
            if (document.getElementById('listaHistorico')) {
                const hoje = new Date().toISOString().split('T')[0];
                document.getElementById('dataInicio').value = hoje;
                document.getElementById('dataFim').value = hoje;
                carregarHistorico();
            }
            renderizarLayout();
        } else { window.location.href = "primeiro-acesso.html"; }
    } else { window.location.href = "index.html"; }
});

function renderizarLayout() {
    if (userRole === 'admin') {
        document.getElementById('adminPanel')?.classList.remove('hidden');
        document.getElementById('btnHistorico')?.classList.remove('hidden');
        
        // Ativa o clique do botão apenas para Admin
        const btnSalvar = document.getElementById('btnSalvarNovo');
        if(btnSalvar) {
            btnSalvar.onclick = () => window.salvarProduto();
        }
    }
}

// --- GESTÃO DE PRODUTOS (CARDS EXPANSÍVEIS) ---
function carregarProdutos() {
    onSnapshot(query(collection(db, "produtos"), orderBy("descricao", "asc")), (snapshot) => {
        const grid = document.getElementById('gridProdutos');
        grid.innerHTML = "";
        const grupos = {};
        listaCompletaProdutos = [];

        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            const id = docSnap.id;
            listaCompletaProdutos.push({...p, id});

            const titulo = p.descricao.split(' ').slice(0, 2).join(' '); // Agrupa pelas 2 primeiras palavras
            if (!grupos[titulo]) grupos[titulo] = [];
            grupos[titulo].push({ ...p, id });
        });

        for (const [titulo, itens] of Object.entries(grupos)) {
            const card = document.createElement('div');
            card.className = 'card';
            let itensHtml = "";
            itens.forEach(item => {
                itensHtml += `
                <div class="variacao-item">
                    <span>${item.descricao}</span>
                    <div>
                        <strong style="margin-right:12px">${item.quantidade}</strong>
                        <button onclick="event.stopPropagation(); abrirModal('${item.id}', '${item.descricao}', ${item.quantidade})">⚙️</button>
                    </div>
                </div>`;
            });

            card.innerHTML = `
                <div class="card-header" onclick="this.parentElement.classList.toggle('active')">
                    <span class="card-title">${titulo} <small style="color:var(--cinza)">(${itens.length})</small></span>
                    <span class="seta">▼</span>
                </div>
                <div class="card-content">${itensHtml}</div>`;
            grid.appendChild(card);
        }
    });
}

// --- MODAL E AÇÕES (EDIÇÃO/ENTRADA/SAÍDA) ---
window.abrirModal = (id, nome, qtd) => {
    currentProdId = id; currentProdNome = nome; currentProdQtd = qtd;
    document.getElementById('modalTitulo').innerText = nome;
    document.getElementById('editNome').value = nome;
    document.getElementById('modalAcao').style.display = 'flex';
    
    const areaAdmin = document.getElementById('areaEditarAdmin');
    if (userRole === 'admin') {
        areaAdmin.classList.remove('hidden');
        document.getElementById('btnEntrada').style.display = 'block';
    } else {
        areaAdmin.classList.add('hidden');
        document.getElementById('btnEntrada').style.display = 'none';
    }
    document.getElementById('btnSaida').style.display = userRole !== 'leitor' ? 'block' : 'none';
};

window.fecharModal = () => document.getElementById('modalAcao').style.display = 'none';

window.salvarEdicaoDescricao = async () => {
    const novoNome = document.getElementById('editNome').value;
    if (!novoNome || novoNome === currentProdNome) return;
    await updateDoc(doc(db, "produtos", currentProdId), { descricao: novoNome });
    await registrarHistorico("EDIÇÃO", `Alterou ${currentProdNome} para ${novoNome}`, 0);
    fecharModal();
};

// Procure a função confirmarAcao e ajuste a trava de Colaborador:
window.confirmarAcao = async (tipo) => {
    // NOVA REGRA: Colaborador só pode dar SAÍDA
    if (userRole === 'colaborador' && tipo === 'ENTRADA') {
        return alert("Colaboradores só podem realizar saídas de material.");
    }

    const valor = parseInt(document.getElementById('modalQtd').value);
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido");
    
    let novaQtd = tipo === 'ENTRADA' ? currentProdQtd + valor : currentProdQtd - valor;
    if (novaQtd < 0) return alert("Estoque insuficiente!");
    
    await updateDoc(doc(db, "produtos", currentProdId), { quantidade: novaQtd });
    await registrarHistorico(tipo, currentProdNome, valor);
    fecharModal();
};

// --- EXPORTAÇÕES ---
window.exportarExcel = () => {
    const busca = document.getElementById('txtBusca').value.toLowerCase();
    const dados = listaCompletaProdutos.filter(p => p.descricao.toLowerCase().includes(busca));
    const ws = XLSX.utils.json_to_sheet(dados.map(p => ({ "Produto": p.descricao, "Estoque": p.quantidade })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, "Estoque_Simonetti.xlsx");
};

window.exportarPDF = () => {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    const busca = document.getElementById('txtBusca').value.toLowerCase();
    const dados = listaCompletaProdutos.filter(p => p.descricao.toLowerCase().includes(busca));

    // Cabeçalho Profissional
    docPdf.setFillColor(30, 58, 138); // Azul Simonetti
    docPdf.rect(0, 0, 210, 30, 'F');
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(16);
    docPdf.text("RELATÓRIO DE ESTOQUE - MÓVEIS SIMONETTI", 15, 20);
    
    docPdf.setTextColor(100, 116, 139);
    docPdf.setFontSize(10);
    docPdf.text(`Gerado por: ${userName} em ${new Date().toLocaleString('pt-BR')}`, 15, 38);

    // Tabela Manual com Quebra de Página
    let y = 50;
    docPdf.setFontSize(11);
    docPdf.setTextColor(0, 0, 0);

    // Linha de títulos
    docPdf.setFont(undefined, 'bold');
    docPdf.text("PRODUTO", 15, y);
    docPdf.text("QTD", 170, y);
    docPdf.line(15, y + 2, 195, y + 2);
    y += 10;
    docPdf.setFont(undefined, 'normal');

    dados.forEach((p, index) => {
        // Se chegar perto do fim da página (A4 tem 297mm)
        if (y > 270) {
            docPdf.addPage();
            y = 20;
            // Repete o topo da tabela na nova página
            docPdf.setFont(undefined, 'bold');
            docPdf.text("PRODUTO", 15, y);
            docPdf.text("QTD", 170, y);
            docPdf.line(15, y + 2, 195, y + 2);
            y += 10;
            docPdf.setFont(undefined, 'normal');
        }

        docPdf.text(p.descricao.toUpperCase(), 15, y);
        docPdf.text(p.quantidade.toString(), 170, y);
        
        // Linha pontilhada leve
        docPdf.setDrawColor(230, 230, 230);
        docPdf.line(15, y + 2, 195, y + 2);
        y += 8;
    });

    docPdf.save(`Estoque_Simonetti_${new Date().toLocaleDateString()}.pdf`);
};

// --- HISTÓRICO ---
async function registrarHistorico(tipo, produto, qtd) {
    await addDoc(collection(db, "historico"), {
        usuario: userName, acao: tipo, produto: produto, quantidade: qtd,
        timestamp: Date.now(), dataISO: new Date().toISOString().split('T')[0],
        dataBR: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR')
    });
}

window.carregarHistorico = () => {
    const inicio = document.getElementById('dataInicio').value; // Formato YYYY-MM-DD
    const fim = document.getElementById('dataFim').value;
    const busca = document.getElementById('buscaHistorico').value.toLowerCase();
    
    // Filtro garantindo que pegue o dia inteiro (do início do dia até o final do dia)
    const q = query(
        collection(db, "historico"), 
        where("dataISO", ">=", inicio), 
        where("dataISO", "<=", fim), 
        orderBy("dataISO", "desc"),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById('listaHistorico');
        lista.innerHTML = "";
        
        if (snapshot.empty) {
            lista.innerHTML = "<p style='text-align:center; color:gray;'>Nenhum registro encontrado para este período.</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const h = docSnap.data();
            // Filtro de busca inteligente (front-end)
            if(h.usuario.toLowerCase().includes(busca) || h.produto.toLowerCase().includes(busca)) {
                lista.innerHTML += `
                <div class="card" style="padding:12px; border-left: 5px solid ${h.acao === 'SAÍDA' ? 'red' : 'green'}">
                    <div style="font-size:0.75rem; color:#64748b">${h.dataBR} ${h.hora} - <b>${h.usuario}</b></div>
                    <div style="font-weight:bold; margin:5px 0">${h.acao}: ${h.produto}</div>
                    <div style="font-size:0.85rem">Quantidade: ${h.quantidade}</div>
                </div>`;
            }
        });
    });
};

window.logout = () => auth.signOut();
window.filtrarCards = () => {
    const termo = document.getElementById("txtBusca").value.toLowerCase();
    const cards = document.querySelectorAll(".card"); // Pega todos os cards de grupo

    cards.forEach(card => {
        // Pega todo o texto dentro do card (Título e variações)
        const textoCard = card.innerText.toLowerCase();
        
        if (textoCard.includes(termo)) {
            card.style.display = "block"; // Mostra o card
            
            // Se o usuário digitou mais de 2 letras, expande o card automaticamente 
            // para mostrar onde está o que ele buscou
            if (termo.length > 2) {
                card.classList.add("active");
            } else {
                card.classList.remove("active");
            }
        } else {
            card.style.display = "none"; // Esconde o card se não tiver o termo
        }
    });
};

// --- FUNÇÃO PARA SALVAR NOVO PRODUTO (ADMIN) ---
window.salvarProduto = async () => {
    if (userRole !== 'admin') return alert("Apenas administradores podem cadastrar.");

    const nome = document.getElementById('prodNome').value;
    const qtd = parseInt(document.getElementById('prodQtd').value);

    if (!nome || isNaN(qtd)) return alert("Preencha o nome e a quantidade corretamente.");

    try {
        await addDoc(collection(db, "produtos"), {
            descricao: nome,
            quantidade: qtd,
            timestamp: Date.now()
        });

        await registrarHistorico("CADASTRO", `Novo produto: ${nome}`, qtd);

        // Limpar campos
        document.getElementById('prodNome').value = "";
        document.getElementById('prodQtd').value = "";
        
        alert("Produto cadastrado com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar produto no banco de dados.");
    }
};

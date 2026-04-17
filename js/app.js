import { db, auth } from './config.js';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, onSnapshot, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userRole = 'leitor';
let userName = '';
let currentProdId = null;
let currentProdNome = "";
let currentProdQtd = 0;

// Inicialização e Proteção
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
                configurarDatas();
                carregarHistorico();
            }
            renderizarLayout();
        } else {
            window.location.href = "primeiro-acesso.html";
        }
    } else {
        window.location.href = "index.html";
    }
});

function renderizarLayout() {
    if (userRole === 'admin') {
        document.getElementById('adminPanel')?.classList.remove('hidden');
        document.getElementById('btnHistorico')?.classList.remove('hidden');
    }
}

// Lógica de Produtos com Agrupamento
function carregarProdutos() {
    onSnapshot(query(collection(db, "produtos"), orderBy("descricao", "asc")), (snapshot) => {
        const grid = document.getElementById('gridProdutos');
        grid.innerHTML = "";
        const grupos = {};

        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            const id = docSnap.id;
            // Agrupamento inteligente: "BLUSA SOCIAL G" vira grupo "BLUSA SOCIAL"
            const partes = p.descricao.split(' ');
            const titulo = partes.length > 1 ? partes.slice(0, -1).join(' ') : partes[0];
            
            if (!grupos[titulo]) grupos[titulo] = [];
            grupos[titulo].push({ ...p, id });
        });

        for (const [titulo, itens] of Object.entries(grupos)) {
            let html = `<div class="card"><div class="card-title">${titulo}</div>`;
            itens.forEach(item => {
                html += `
                <div class="variacao-item">
                    <span>${item.descricao}</span>
                    <div>
                        <strong style="margin-right:10px">${item.quantidade}</strong>
                        <button onclick="abrirModal('${item.id}', '${item.descricao}', ${item.quantidade})">⚙️</button>
                    </div>
                </div>`;
            });
            html += `</div>`;
            grid.innerHTML += html;
        }
    });
}

// Modal e Ações
window.abrirModal = (id, nome, qtd) => {
    currentProdId = id; currentProdNome = nome; currentProdQtd = qtd;
    document.getElementById('modalTitulo').innerText = nome;
    document.getElementById('modalAcao').style.display = 'flex';
    
    // Esconde botões conforme nível
    document.getElementById('btnEntrada').style.display = userRole === 'admin' ? 'block' : 'none';
    document.getElementById('btnSaida').style.display = userRole !== 'leitor' ? 'block' : 'none';
};

window.fecharModal = () => document.getElementById('modalAcao').style.display = 'none';

window.confirmarAcao = async (tipo) => {
    const valor = parseInt(document.getElementById('modalQtd').value);
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido");

    let novaQtd = tipo === 'ENTRADA' ? currentProdQtd + valor : currentProdQtd - valor;
    if (novaQtd < 0) return alert("Estoque insuficiente!");

    await updateDoc(doc(db, "produtos", currentProdId), { quantidade: novaQtd });
    await registrarHistorico(tipo, currentProdNome, valor);
    fecharModal();
};

async function registrarHistorico(tipo, produto, qtd) {
    await addDoc(collection(db, "historico"), {
        usuario: userName,
        acao: tipo,
        produto: produto,
        quantidade: qtd,
        timestamp: Date.now(),
        dataISO: new Date().toISOString().split('T')[0], // Para o filtro de data
        dataBR: new Date().toLocaleDateString('pt-BR')
    });
}

// Filtros de Histórico
function configurarDatas() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataInicio').value = hoje;
    document.getElementById('dataFim').value = hoje;
}

function carregarHistorico() {
    const inicio = document.getElementById('dataInicio').value;
    const fim = document.getElementById('dataFim').value;
    
    const q = query(collection(db, "historico"), 
                where("dataISO", ">=", inicio), 
                where("dataISO", "<=", fim),
                orderBy("dataISO", "desc"));

    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById('listaHistorico');
        lista.innerHTML = "";
        snapshot.forEach(docSnap => {
            const h = docSnap.data();
            lista.innerHTML += `
                <div class="card" style="border-left-color: ${h.acao === 'SAÍDA' ? 'red' : 'green'}">
                    <small>${h.dataBR} - <b>${h.usuario}</b></small>
                    <div style="font-weight:bold; margin: 5px 0;">${h.acao}: ${h.produto}</div>
                    <span>Quantidade: ${h.quantidade}</span>
                </div>`;
        });
    });
}

window.logout = () => auth.signOut();

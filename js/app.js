import { db, auth } from './config.js';
import { 
    collection, addDoc, getDocs, updateDoc, doc, query, 
    orderBy, onSnapshot, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userRole = 'leitor';

// --- CONTROLE DE ACESSO ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            userRole = userSnap.data().nivel;
            renderizarLayoutPorNivel();
            carregarProdutos();
            
            // Proteção extra para a página de histórico
            if (window.location.pathname.includes('historico.html') && userRole !== 'admin') {
                window.location.href = "dashboard.html";
            }
            if (window.location.pathname.includes('historico.html')) {
                carregarHistorico();
            }
        } else {
            if (!window.location.pathname.includes('primeiro-acesso.html')) {
                window.location.href = "primeiro-acesso.html";
            }
        }
    } else {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = "index.html";
        }
    }
});

function renderizarLayoutPorNivel() {
    const adminPanel = document.getElementById('adminPanel');
    const btnHistorico = document.getElementById('btnHistorico');
    
    if (userRole === 'admin' && adminPanel) {
        adminPanel.classList.remove('hidden');
        btnHistorico.classList.remove('hidden');
    }
}

// --- GESTÃO DE PRODUTOS ---

// Salvar ou Editar (Admin)
window.salvarProduto = async () => {
    if (userRole !== 'admin') return alert("Apenas administradores podem cadastrar.");
    
    const nome = document.getElementById('prodNome').value;
    const qtd = parseInt(document.getElementById('prodQtd').value);

    if (!nome || isNaN(qtd)) return alert("Preencha todos os campos corretamente.");

    try {
        await addDoc(collection(db, "produtos"), {
            descricao: nome,
            quantidade: qtd,
            timestamp: Date.now()
        });
        await registrarHistorico("CADASTRO", nome, qtd);
        alert("Produto cadastrado!");
        document.getElementById('prodNome').value = "";
        document.getElementById('prodQtd').value = "";
    } catch (e) {
        console.error("Erro ao salvar: ", e);
    }
};

// Listar Produtos em Tempo Real
function carregarProdutos() {
    const lista = document.getElementById('listaProdutos');
    if (!lista) return;

    const q = query(collection(db, "produtos"), orderBy("descricao", "asc"));
    
    onSnapshot(q, (snapshot) => {
        lista.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;

            let acoes = "";
            if (userRole === 'admin' || userRole === 'colaborador') {
                // Colaborador só dá saída, Admin faz tudo
                acoes = `<button onclick="darSaida('${id}', '${p.descricao}', ${p.quantidade})"> - Saída </button>`;
                if (userRole === 'admin') {
                    acoes += ` <button onclick="darEntrada('${id}', '${p.descricao}', ${p.quantidade})" style="background-color: #059669;"> + Entrada </button>`;
                }
            } else {
                acoes = `<span>Apenas visualização</span>`;
            }

            lista.innerHTML += `
                <tr>
                    <td>${p.descricao}</td>
                    <td><strong>${p.quantidade}</strong></td>
                    <td>${acoes}</td>
                </tr>
            `;
        });
    });
}

window.darSaida = async (id, nome, qtdAtual) => {
    if (userRole === 'leitor') return;
    const qtdRetirar = parseInt(prompt(`Quantas unidades de ${nome} deseja retirar?`, "1"));
    
    if (isNaN(qtdRetirar) || qtdRetirar <= 0) return;
    if (qtdAtual < qtdRetirar) return alert("Estoque insuficiente!");

    await updateDoc(doc(db, "produtos", id), { quantidade: qtdAtual - qtdRetirar });
    await registrarHistorico("SAÍDA", nome, qtdRetirar);
};

window.darEntrada = async (id, nome, qtdAtual) => {
    if (userRole !== 'admin') return;
    const qtdAdicionar = parseInt(prompt(`Quantas unidades de ${nome} deseja adicionar?`, "1"));
    
    if (isNaN(qtdAdicionar) || qtdAdicionar <= 0) return;

    await updateDoc(doc(db, "produtos", id), { quantidade: qtdAtual + qtdAdicionar });
    await registrarHistorico("ENTRADA", nome, qtdAdicionar);
};

// --- HISTÓRICO ---

async function registrarHistorico(acao, produto, quantidade) {
    await addDoc(collection(db, "historico"), {
        usuario: auth.currentUser.email,
        acao: acao,
        produto: produto,
        quantidade: quantidade,
        data: new Date().toLocaleString(),
        timestamp: Date.now()
    });
}

function carregarHistorico() {
    const tabelaH = document.getElementById('listaHistorico');
    if (!tabelaH) return;

    const q = query(collection(db, "historico"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        tabelaH.innerHTML = "";
        snapshot.forEach(doc => {
            const h = doc.data();
            tabelaH.innerHTML += `
                <tr>
                    <td>${h.data}</td>
                    <td>${h.usuario}</td>
                    <td><b style="color: ${h.acao === 'SAÍDA' ? 'red' : 'green'}">${h.acao}</b></td>
                    <td>${h.produto}</td>
                    <td>${h.quantidade}</td>
                </tr>
            `;
        });
    });
}

// Lógica de Busca
window.filtrarTabela = () => {
    let input = document.getElementById("txtBusca").value.toUpperCase();
    let rows = document.getElementById("listaProdutos").getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        let text = rows[i].getElementsByTagName("td")[0].textContent.toUpperCase();
        rows[i].style.display = text.indexOf(input) > -1 ? "" : "none";
    }
};

window.logout = () => {
    auth.signOut().then(() => window.location.href = "index.html");
};

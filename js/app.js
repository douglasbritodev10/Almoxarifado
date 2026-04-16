import { db, auth } from './config.js';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userRole = 'leitor';

// Verificar Permissões ao Carregar
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            userRole = userSnap.data().nivel;
            renderizarLayoutPorNivel();
            carregarProdutos();
        } else {
            window.location.href = "primeiro-acesso.html";
        }
    } else {
        window.location.href = "index.html";
    }
});

function renderizarLayoutPorNivel() {
    if (userRole === 'admin') {
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('btnHistorico').classList.remove('hidden');
    }
}

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

// Exemplo de Saída (Disponível para Admin e Colaborador)
window.darSaida = async (id, nome, qtdAtual) => {
    if (userRole === 'leitor') return alert("Acesso negado");
    
    const novaQtd = qtdAtual - 1;
    if (novaQtd < 0) return alert("Estoque insuficiente");

    await updateDoc(doc(db, "produtos", id), { quantidade: novaQtd });
    await registrarHistorico("SAÍDA", nome, 1);
};

// Lógica de busca simples
window.filtrarTabela = () => {
    let input = document.getElementById("txtBusca").value.toUpperCase();
    let rows = document.getElementById("listaProdutos").getElementsByTagName("tr");
    
    for (let i = 0; i < rows.length; i++) {
        let text = rows[i].getElementsByTagName("td")[0].textContent.toUpperCase();
        rows[i].style.display = text.indexOf(input) > -1 ? "" : "none";
    }
};

import { auth, db } from './config.js';
import { signInWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Função para Login Híbrido (Email ou Username)
window.realizarLogin = async () => {
    const loginId = document.getElementById('loginId').value;
    const senha = document.getElementById('loginSenha').value;
    let emailFinal = loginId;

    try {
        // Se não for e-mail (não tem @), busca o username no Firestore
        if (!loginId.includes('@')) {
            const q = query(collection(db, "usuarios"), where("username", "==", loginId));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                throw new Error("Usuário não encontrado.");
            }
            emailFinal = querySnapshot.docs[0].data().email;
        }

        const userCredential = await signInWithEmailAndPassword(auth, emailFinal, senha);
        const user = userCredential.user;

        // Verifica se existe perfil no Firestore
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        
        if (!userDoc.exists()) {
            window.location.href = "primeiro-acesso.html";
        } else {
            window.location.href = "almoxerifado.html";
        }

    } catch (error) {
        document.getElementById('msgErro').innerText = "Erro: " + error.message;
    }
};

// Função para o Primeiro Acesso
window.finalizarCadastro = async () => {
    const user = auth.currentUser;
    const username = document.getElementById('novoUsername').value;
    const novaSenha = document.getElementById('novaSenha').value;

    if (!user) return alert("Sessão expirada. Faça login novamente.");

    try {
        // 1. Salva os dados no Firestore com nível 'leitor' por padrão
        await setDoc(doc(db, "usuarios", user.uid), {
            username: username,
            email: user.email,
            nivel: "leitor", // Padrão solicitado
            uid: user.uid
        });

        // 2. Atualiza a senha no Firebase Auth
        await updatePassword(user, novaSenha);

        alert("Cadastro finalizado!");
        window.location.href = "almoxerifado.html";

    } catch (error) {
        document.getElementById('msgErro').innerText = "Erro ao salvar: " + error.message;
    }
};

window.logout = () => {
    auth.signOut().then(() => { window.location.href = "index.html"; });
};

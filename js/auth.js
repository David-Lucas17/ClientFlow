const supabaseClient = window.supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            const btnLogin = document.getElementById('btn-login');
            
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            errorMessage.style.display = 'none';
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                window.location.href = 'dashboard.html';
            } catch (error) {
                errorMessage.textContent = 'Email ou senha incorretos';
                errorMessage.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            }
        });
    }
    
    const linkCadastro = document.getElementById('link-cadastro');
    
    if (linkCadastro) {
        linkCadastro.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('modal-cadastro').style.display = 'flex';
        });
    }
    
    const btnFecharCadastro = document.getElementById('btn-fechar-cadastro');
    
    if (btnFecharCadastro) {
        btnFecharCadastro.addEventListener('click', () => {
            document.getElementById('modal-cadastro').style.display = 'none';
        });
    }
    
    const formCadastro = document.getElementById('form-cadastro');
    
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('cadastro-nome').value;
            const email = document.getElementById('cadastro-email').value;
            const senha = document.getElementById('cadastro-senha').value;
            const errorMessage = document.getElementById('cadastro-error');
            const btnSubmit = formCadastro.querySelector('button[type="submit"]');
            
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
            errorMessage.style.display = 'none';
            
            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        data: {
                            nome: nome
                        }
                    }
                });
                
                if (error) throw error;
                document.getElementById('modal-cadastro').style.display = 'none';
                window.location.href = 'dashboard.html';
            } catch (error) {
                errorMessage.textContent = error.message || 'Erro ao criar conta';
                errorMessage.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta';
            }
        });
    }
    
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});

async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    
    return user;
}

async function atualizarUsuario({ nome, email, senha }) {
    const updates = {
        data: {
            nome: nome
        }
    };
    
    if (email) {
        updates.email = email;
    }
    
    if (senha) {
        updates.password = senha;
    }
    
    const { data, error } = await supabaseClient.auth.updateUser(updates);
    
    if (error) throw error;
    
    return data;
}
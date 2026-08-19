let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    
    usuarioAtual = user;
    
    const nomeUsuario = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
    document.getElementById('user-name').textContent = nomeUsuario;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('config-nome').value = user.user_metadata?.nome || '';
    document.getElementById('config-email').value = user.email || '';
    
    carregarDashboard();
    carregarClientes();
    configurarNavegacao();
    configurarFiltros();
    configurarBusca();
    configurarModais();
    configurarFormularios();
});

async function carregarDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { count: total } = await supabaseClient
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);
    
    const { count: ativos } = await supabaseClient
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'ativo')
        .is('deleted_at', null);
    
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    
    const { count: novos } = await supabaseClient
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', seteDiasAtras.toISOString())
        .is('deleted_at', null);
    
    const taxa = total > 0 ? Math.round((ativos / total) * 100) : 0;
    
    document.getElementById('total-clientes').textContent = total || 0;
    document.getElementById('clientes-ativos').textContent = ativos || 0;
    document.getElementById('novos-clientes').textContent = novos || 0;
    document.getElementById('taxa-ativos').textContent = `${taxa}%`;
    
    const { data: ultimos } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
    
    renderizarUltimosClientes(ultimos || []);
    renderizarGrafico();
}

function renderizarUltimosClientes(clientes) {
    const container = document.getElementById('ultimos-clientes');
    
    if (clientes.length === 0) {
        container.innerHTML = '<p style="color:#5a718b;">Nenhum cliente cadastrado ainda.</p>';
        return;
    }
    
    container.innerHTML = clientes.map(cliente => `
        <div class="client-item">
            <span>${cliente.nome}</span>
            <span class="status-badge ${cliente.status === 'inativo' ? 'inactive' : cliente.status === 'pendente' ? 'pending' : ''}">${cliente.status}</span>
        </div>
    `).join('');
}

function renderizarGrafico() {
    const container = document.getElementById('grafico-evolucao');
    const alturas = [30, 45, 28, 55, 40, 65, 30, 50, 70, 38];
    
    container.innerHTML = alturas.map(altura => `
        <div style="height:${altura}px; width:18px; background:#2a7de1; border-radius:6px 6px 0 0;"></div>
    `).join('');
}

function configurarNavegacao() {
    const navItems = document.querySelectorAll('.nav-dashboard');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = item.getAttribute('data-page');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.page-dashboard').forEach(p => p.style.display = 'none');
            document.getElementById(`page-${page}`).style.display = 'block';
            
            if (page === 'clientes') {
                carregarClientes();
            }
        });
    });
}

function configurarFiltros() {
    const filtros = document.querySelectorAll('.filtro');
    
    filtros.forEach(filtro => {
        filtro.addEventListener('click', () => {
            filtros.forEach(f => f.classList.remove('active'));
            filtro.classList.add('active');
            
            statusAtual = filtro.getAttribute('data-status');
            carregarClientes();
        });
    });
}

function configurarBusca() {
    const busca = document.getElementById('busca-cliente');
    
    if (busca) {
        busca.addEventListener('input', (e) => {
            buscaAtual = e.target.value;
            carregarClientes();
        });
    }
}

function configurarModais() {
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    if (btnNovoCliente) {
        btnNovoCliente.addEventListener('click', () => {
            abrirModalCliente();
        });
    }
    
    const btnPrimeiroCliente = document.getElementById('btn-primeiro-cliente');
    if (btnPrimeiroCliente) {
        btnPrimeiroCliente.addEventListener('click', () => {
            abrirModalCliente();
        });
    }
    
    const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir');
    if (btnConfirmarExcluir) {
        btnConfirmarExcluir.addEventListener('click', async () => {
            if (clienteParaExcluir) {
                try {
                    await excluirCliente(clienteParaExcluir);
                    fecharModalExcluir();
                    carregarClientes();
                    carregarDashboard();
                } catch (error) {
                    console.error('Erro ao excluir cliente:', error);
                }
            }
        });
    }
}

function configurarFormularios() {
    const formCliente = document.getElementById('form-cliente');
    if (formCliente) {
        formCliente.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('cliente-id').value;
            const nome = document.getElementById('cliente-nome').value;
            const contato = document.getElementById('cliente-contato').value;
            const email = document.getElementById('cliente-email').value;
            const status = document.getElementById('cliente-status').value;
            const errorMessage = document.getElementById('cliente-error');
            
            errorMessage.style.display = 'none';
            
            try {
                if (id) {
                    await atualizarCliente(id, { nome, contato, email, status });
                } else {
                    await criarCliente({ nome, contato, email, status });
                }
                
                fecharModalCliente();
                carregarClientes();
                carregarDashboard();
            } catch (error) {
                errorMessage.textContent = error.message || 'Erro ao salvar cliente';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    const formConfig = document.getElementById('form-config');
    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('config-nome').value;
            const email = document.getElementById('config-email').value;
            const senha = document.getElementById('config-senha').value;
            
            try {
                await atualizarUsuario({ nome, email, senha });
                document.getElementById('user-name').textContent = nome;
                document.getElementById('user-email').textContent = email;
                document.getElementById('config-senha').value = '';
                alert('Dados atualizados com sucesso!');
            } catch (error) {
                alert('Erro ao atualizar dados: ' + error.message);
            }
        });
    }
}
let clienteParaExcluir = null;
let statusAtual = 'todos';
let buscaAtual = '';

async function listarClientes({ status = 'todos', busca = '' } = {}) {
    let query = supabaseClient
        .from('clientes')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    
    if (status !== 'todos') {
        query = query.eq('status', status);
    }
    
    if (busca) {
        query = query.or(`nome.ilike.%${busca}%,contato.ilike.%${busca}%,email.ilike.%${busca}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function criarCliente({ nome, contato, email, status }) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { data: existente } = await supabaseClient
        .from('clientes')
        .select('id')
        .eq('user_id', user.id)
        .eq('contato', contato)
        .is('deleted_at', null)
        .single();
    
    if (existente) {
        throw new Error('Já existe um cliente com este contato');
    }
    
    const { data: cliente, error } = await supabaseClient
        .from('clientes')
        .insert([{
            user_id: user.id,
            nome,
            contato,
            email,
            status
        }])
        .select()
        .single();
    
    if (error) throw error;
    
    await registrarAtividade(cliente.id, 'criacao', 'Cliente cadastrado');
    
    return cliente;
}

async function atualizarCliente(id, { nome, contato, email, status }) {
    const { data: clienteAntigo } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    
    const { data: cliente, error } = await supabaseClient
        .from('clientes')
        .update({ nome, contato, email, status })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    
    if (clienteAntigo.status !== status) {
        await registrarAtividade(id, 'status', `Status alterado: ${clienteAntigo.status} → ${status}`);
    } else {
        await registrarAtividade(id, 'edicao', 'Dados atualizados');
    }
    
    return cliente;
}

async function excluirCliente(id) {
    const { error } = await supabaseClient
        .from('clientes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) throw error;
    
    await registrarAtividade(id, 'exclusao', 'Cliente excluído');
}

async function registrarAtividade(clienteId, tipo, descricao) {
    const { data, error } = await supabaseClient
        .from('cliente_atividades')
        .insert([{
            cliente_id: clienteId,
            tipo,
            descricao
        }]);
    
    if (error) throw error;
    return data;
}

async function buscarTimeline(clienteId) {
    const { data, error } = await supabaseClient
        .from('cliente_atividades')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function buscarClientePorId(id) {
    const { data, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

function abrirModalCliente(cliente = null) {
    const modal = document.getElementById('modal-cliente');
    const titulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-cliente');
    
    form.reset();
    document.getElementById('cliente-error').style.display = 'none';
    
    if (cliente) {
        titulo.textContent = 'Editar Cliente';
        document.getElementById('cliente-id').value = cliente.id;
        document.getElementById('cliente-nome').value = cliente.nome;
        document.getElementById('cliente-contato').value = cliente.contato;
        document.getElementById('cliente-email').value = cliente.email || '';
        document.getElementById('cliente-status').value = cliente.status;
    } else {
        titulo.textContent = 'Novo Cliente';
        document.getElementById('cliente-id').value = '';
    }
    
    modal.style.display = 'flex';
}

function fecharModalCliente() {
    document.getElementById('modal-cliente').style.display = 'none';
}

function abrirModalTimeline(clienteId) {
    const modal = document.getElementById('modal-timeline');
    const content = document.getElementById('timeline-content');
    
    content.innerHTML = '<p style="text-align:center;">Carregando...</p>';
    modal.style.display = 'flex';
    
    buscarTimeline(clienteId)
        .then(atividades => {
            if (atividades.length === 0) {
                content.innerHTML = '<p style="text-align:center;">Nenhuma atividade registrada.</p>';
                return;
            }
            
            content.innerHTML = atividades.map(atividade => {
                const icone = {
                    'criacao': '🟢',
                    'edicao': '✏️',
                    'status': '🔄',
                    'exclusao': '🗑️'
                }[atividade.tipo] || '📝';
                
                return `
                    <div class="atividade">
                        <div class="ponto-timeline ponto-${atividade.tipo}"></div>
                        <div class="conteudo-atividade">
                            <strong>${icone} ${atividade.descricao}</strong>
                            <small>${new Date(atividade.created_at).toLocaleString('pt-BR')}</small>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(error => {
            content.innerHTML = '<p style="text-align:center;">Erro ao carregar timeline.</p>';
        });
}

function fecharModalTimeline() {
    document.getElementById('modal-timeline').style.display = 'none';
}

function abrirModalExcluir(clienteId) {
    clienteParaExcluir = clienteId;
    document.getElementById('modal-excluir').style.display = 'flex';
}

function fecharModalExcluir() {
    clienteParaExcluir = null;
    document.getElementById('modal-excluir').style.display = 'none';
}

async function carregarClientes() {
    try {
        const clientes = await listarClientes({ status: statusAtual, busca: buscaAtual });
        renderizarTabela(clientes);
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

function renderizarTabela(clientes) {
    const corpoTabela = document.getElementById('corpo-tabela');
    const estadoVazio = document.getElementById('estado-vazio');
    
    if (clientes.length === 0) {
        corpoTabela.innerHTML = '';
        estadoVazio.style.display = 'block';
        return;
    }
    
    estadoVazio.style.display = 'none';
    
    corpoTabela.innerHTML = clientes.map(cliente => `
        <tr>
            <td style="padding:0.75rem;">
                <strong>${cliente.nome}</strong>
                ${cliente.email ? `<br><small style="color:#5a718b;">${cliente.email}</small>` : ''}
            </td>
            <td style="padding:0.75rem;">${cliente.contato}</td>
            <td style="padding:0.75rem;">
                <span class="status-badge-${cliente.status}">
                    ${cliente.status.charAt(0).toUpperCase() + cliente.status.slice(1)}
                </span>
            </td>
            <td style="padding:0.75rem;">${new Date(cliente.created_at).toLocaleDateString('pt-BR')}</td>
            <td style="padding:0.75rem;">
                <button class="btn-acao btn-timeline" onclick="abrirModalTimeline('${cliente.id}')" title="Ver histórico">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn-acao btn-editar" onclick="editarCliente('${cliente.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-acao btn-excluir" onclick="abrirModalExcluir('${cliente.id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function editarCliente(id) {
    try {
        const cliente = await buscarClientePorId(id);
        abrirModalCliente(cliente);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
    }
}
// JavaScript para gerenciamento de grupos
class GroupsManager {
    constructor() {
        this.groups = [];
        this.filteredGroups = [];
        this.currentFilter = 'all';
        this.currentUser = AuthUtils.getUser();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGroups();
    }

    setupEventListeners() {
        // Botão de adicionar grupo
        const addGroupBtn = document.getElementById('addGroupBtn');
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => this.openGroupModal());
        }

        // Formulário de grupo
        const groupForm = document.getElementById('groupForm');
        if (groupForm) {
            groupForm.addEventListener('submit', (e) => this.handleGroupSubmit(e));
        }

        // Modais
        this.setupModalEvents();

        // Filtros
        this.setupFilterEvents();

        // Busca
        const searchInput = document.getElementById('searchGroups');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Color picker
        this.setupColorPicker();

        // Sidebar e logout
        this.setupSidebarEvents();
    }

    setupModalEvents() {
        const groupModal = document.getElementById('groupModal');
        const usersModal = document.getElementById('usersModal');
        const closeModal = document.getElementById('closeModal');
        const closeUsersModal = document.getElementById('closeUsersModal');
        const cancelBtn = document.getElementById('cancelBtn');

        // Fechar modais
        [closeModal, closeUsersModal, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeModals());
            }
        });

        // Fechar ao clicar fora
        [groupModal, usersModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModals();
                    }
                });
            }
        });
    }

    setupFilterEvents() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remover classe active de todos os botões
                filterBtns.forEach(b => b.classList.remove('active'));
                // Adicionar classe active ao botão clicado
                btn.classList.add('active');
                // Aplicar filtro
                this.currentFilter = btn.dataset.filter;
                this.applyFilters();
            });
        });
    }

    setupColorPicker() {
        const colorInput = document.getElementById('groupColor');
        const colorPresets = document.querySelectorAll('.color-preset');

        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                if (colorInput) {
                    colorInput.value = color;
                }
                // Atualizar visual dos presets
                colorPresets.forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });
    }

    setupSidebarEvents() {
        // Toggle sidebar
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        const headerLogout = document.getElementById('headerLogout');

        [logoutBtn, headerLogout].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    AuthUtils.logout();
                });
            }
        });

        // User menu
        const userMenuToggle = document.getElementById('userMenuToggle');
        const userMenuDropdown = document.getElementById('userMenuDropdown');

        if (userMenuToggle && userMenuDropdown) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenuDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                userMenuDropdown.classList.remove('show');
            });
        }
    }

    async loadGroups() {
        try {
            UIUtils.showLoading(document.getElementById('groupsGrid'));

            const data = await ApiUtils.get('/api/groups');
            this.groups = data.groups || [];
            this.filteredGroups = [...this.groups];
            this.renderGroups();

        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
            UIUtils.showAlert('Erro ao carregar grupos', 'error');
            document.getElementById('groupsGrid').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erro ao carregar grupos
                </div>
            `;
        }
    }

    renderGroups() {
        const container = document.getElementById('groupsGrid');
        if (!container) return;

        if (this.filteredGroups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <h3>Nenhum grupo encontrado</h3>
                    <p>Não há grupos que correspondam aos filtros aplicados.</p>
                </div>
            `;
            return;
        }

        const html = this.filteredGroups.map(group => this.renderGroupCard(group)).join('');
        container.innerHTML = html;

        // Adicionar event listeners aos botões de ação
        this.setupGroupActions();
    }

    renderGroupCard(group) {
        const isAdmin = this.currentUser?.role === 'admin';
        const passwordCount = group.password_count || 0;
        const userCount = group.user_count || 0;

        return `
            <div class="group-card ${!group.is_active ? 'inactive' : ''}" data-group-id="${group.id}">
                ${!group.is_active ? '<div class="group-status inactive">Inativo</div>' : ''}
                
                <div class="group-header">
                    <div class="group-color" style="background-color: ${group.color}"></div>
                    <div class="group-actions">
                        ${isAdmin ? `
                            <button class="action-btn edit" title="Editar grupo" data-action="edit" data-group-id="${group.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn users" title="Ver usuários" data-action="users" data-group-id="${group.id}">
                            <i class="fas fa-users"></i>
                        </button>
                        ${isAdmin ? `
                            <button class="action-btn delete" title="Excluir grupo" data-action="delete" data-group-id="${group.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="group-info">
                    <h3>${group.name}</h3>
                    ${group.description ? `<p class="group-description">${group.description}</p>` : ''}
                </div>

                <div class="group-stats">
                    <div class="stat-item">
                        <span class="stat-number">${passwordCount}</span>
                        <span class="stat-label">Senhas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${userCount}</span>
                        <span class="stat-label">Usuários</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${UIUtils.formatDate(group.created_at).split(' ')[0]}</span>
                        <span class="stat-label">Criado</span>
                    </div>
                </div>
            </div>
        `;
    }

    setupGroupActions() {
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const groupId = btn.dataset.groupId;
                
                switch (action) {
                    case 'edit':
                        this.editGroup(groupId);
                        break;
                    case 'users':
                        this.showGroupUsers(groupId);
                        break;
                    case 'delete':
                        this.deleteGroup(groupId);
                        break;
                }
            });
        });
    }

    openGroupModal(group = null) {
        const modal = document.getElementById('groupModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('groupForm');

        if (group) {
            modalTitle.textContent = 'Editar Grupo';
            this.fillGroupForm(group);
        } else {
            modalTitle.textContent = 'Novo Grupo';
            form.reset();
            document.getElementById('groupColor').value = '#FFD700';
            document.getElementById('groupActive').checked = true;
        }

        modal.classList.add('show');
    }

    fillGroupForm(group) {
        document.getElementById('groupId').value = group.id;
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupDescription').value = group.description || '';
        document.getElementById('groupColor').value = group.color;
        document.getElementById('groupActive').checked = group.is_active;

        // Atualizar preset de cor ativo
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            preset.classList.toggle('active', preset.dataset.color === group.color);
        });
    }

    async handleGroupSubmit(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const btnText = saveBtn.querySelector('.btn-text');
        const loadingIcon = saveBtn.querySelector('.loading-icon');

        try {
            // Mostrar loading
            btnText.style.display = 'none';
            loadingIcon.style.display = 'inline-block';
            saveBtn.disabled = true;

            const formData = new FormData(e.target);
            const groupData = {
                name: document.getElementById('groupName').value.trim(),
                description: document.getElementById('groupDescription').value.trim(),
                color: document.getElementById('groupColor').value,
                is_active: document.getElementById('groupActive').checked
            };

            const groupId = document.getElementById('groupId').value;

            let response;
            if (groupId) {
                // Editar grupo existente
                response = await ApiUtils.put(`/api/groups/${groupId}`, groupData);
            } else {
                // Criar novo grupo
                response = await ApiUtils.post('/api/groups', groupData);
            }

            UIUtils.showAlert(response.message, 'success');
            this.closeModals();
            this.loadGroups();

        } catch (error) {
            console.error('Erro ao salvar grupo:', error);
            UIUtils.showAlert('Erro ao salvar grupo', 'error');
        } finally {
            // Esconder loading
            btnText.style.display = 'inline-block';
            loadingIcon.style.display = 'none';
            saveBtn.disabled = false;
        }
    }

    editGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (group) {
            this.openGroupModal(group);
        }
    }

    deleteGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        UIUtils.confirmAction(
            `Tem certeza que deseja excluir o grupo "${group.name}"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    await ApiUtils.delete(`/api/groups/${groupId}`);
                    UIUtils.showAlert('Grupo excluído com sucesso', 'success');
                    this.loadGroups();
                } catch (error) {
                    console.error('Erro ao excluir grupo:', error);
                    UIUtils.showAlert('Erro ao excluir grupo', 'error');
                }
            }
        );
    }

    async showGroupUsers(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('usersModal');
        const modalTitle = document.getElementById('usersModalTitle');
        const usersList = document.getElementById('groupUsersList');

        modalTitle.textContent = `Usuários do Grupo: ${group.name}`;
        UIUtils.showLoading(usersList);
        modal.classList.add('show');

        try {
            const data = await ApiUtils.get(`/api/groups/${groupId}/users`);
            this.renderGroupUsers(data.users || []);
        } catch (error) {
            console.error('Erro ao carregar usuários do grupo:', error);
            usersList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erro ao carregar usuários
                </div>
            `;
        }
    }

    renderGroupUsers(users) {
        const container = document.getElementById('groupUsersList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>Nenhum usuário neste grupo</h4>
                    <p>Este grupo ainda não possui usuários.</p>
                </div>
            `;
            return;
        }

        const html = users.map(user => `
            <div class="user-item">
                <div class="user-info-item">
                    <div class="user-avatar-item">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details-item">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                    </div>
                </div>
                <div class="user-permissions">
                    ${user.can_view ? '<span class="permission-badge view">Ver</span>' : ''}
                    ${user.can_edit ? '<span class="permission-badge edit">Editar</span>' : ''}
                    ${user.can_delete ? '<span class="permission-badge delete">Excluir</span>' : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    applyFilters() {
        this.filteredGroups = this.groups.filter(group => {
            // Filtro por status
            if (this.currentFilter === 'active' && !group.is_active) return false;
            if (this.currentFilter === 'inactive' && group.is_active) return false;

            return true;
        });

        this.renderGroups();
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.filteredGroups = [...this.groups];
        } else {
            this.filteredGroups = this.groups.filter(group => 
                group.name.toLowerCase().includes(searchTerm) ||
                (group.description && group.description.toLowerCase().includes(searchTerm))
            );
        }

        this.applyFilters();
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.classList.remove('show'));
    }

    // Métodos de sidebar (reutilizados do dashboard)
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('mobile-show');
        overlay.classList.toggle('show');
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('mobile-show');
        overlay.classList.remove('show');
    }
}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new GroupsManager();
});

// CSS adicional para elementos específicos
const additionalStyles = `
    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--gray-dark);
        grid-column: 1 / -1;
    }

    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--gray-medium);
    }

    .empty-state h3, .empty-state h4 {
        margin: 0 0 0.5rem 0;
        color: var(--primary-black);
    }

    .empty-state p {
        margin: 0;
        font-size: var(--font-size-small);
    }

    .error-message {
        text-align: center;
        padding: 2rem;
        color: var(--error);
        grid-column: 1 / -1;
    }

    .error-message i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        display: block;
    }
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);


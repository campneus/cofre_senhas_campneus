// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.setupSidebar();
        this.loadDashboardData();
    }

    // Verificar autenticação
    async checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/';
            return;
        }

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUserInfo();
                this.setupAdminFeatures();
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            console.error('Erro na autenticação:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
    }

    // Atualizar informações do usuário na interface
    updateUserInfo() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');

        if (userName) userName.textContent = this.currentUser.name;
        if (userRole) userRole.textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
    }

    // Configurar recursos de admin
    setupAdminFeatures() {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;

        // Mostrar itens de menu apenas para admin
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(item => {
            item.style.display = 'block';
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        // Toggle do sidebar
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

        // Navegação
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });

        // Menu do usuário
        const userMenuToggle = document.getElementById('userMenuToggle');
        const userMenuDropdown = document.getElementById('userMenuDropdown');

        if (userMenuToggle && userMenuDropdown) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenuDropdown.classList.toggle('show');
            });

            // Fechar menu ao clicar fora
            document.addEventListener('click', () => {
                userMenuDropdown.classList.remove('show');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        const headerLogout = document.getElementById('headerLogout');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        if (headerLogout) {
            headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Busca global
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
        }

        // Responsividade
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Configurar sidebar
    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const savedState = localStorage.getItem('sidebarCollapsed');
        
        if (savedState === 'true' && window.innerWidth > 768) {
            sidebar.classList.add('collapsed');
        }
    }

    // Toggle sidebar desktop
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    // Toggle sidebar mobile
    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('mobile-show');
        overlay.classList.toggle('show');
    }

    // Fechar sidebar mobile
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('mobile-show');
        overlay.classList.remove('show');
    }

    // Navegação entre páginas
    navigateTo(page) {
        // Atualizar navegação ativa
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Mostrar conteúdo da página
        const pageContents = document.querySelectorAll('.page-content');
        pageContents.forEach(content => {
            content.style.display = 'none';
        });

        const targetContent = document.getElementById(`${page}Content`);
        if (targetContent) {
            targetContent.style.display = 'block';
        }

        // Atualizar título da página
        const pageTitle = document.getElementById('pageTitle');
        const titles = {
            dashboard: 'Dashboard',
            passwords: 'Senhas',
            groups: 'Grupos',
            users: 'Usuários',
            logs: 'Logs'
        };

        if (pageTitle && titles[page]) {
            pageTitle.textContent = titles[page];
        }

        this.currentPage = page;

        // Carregar dados específicos da página
        this.loadPageData(page);

        // Fechar sidebar mobile se estiver aberto
        if (window.innerWidth <= 768) {
            this.closeMobileSidebar();
        }
    }

    // Carregar dados da página
    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'passwords':
                await this.loadPasswordsData();
                break;
            case 'groups':
                await this.loadGroupsData();
                break;
            case 'users':
                if (this.currentUser?.role === 'admin') {
                    await this.loadUsersData();
                }
                break;
            case 'logs':
                if (this.currentUser?.role === 'admin') {
                    await this.loadLogsData();
                }
                break;
        }
    }

    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            const token = localStorage.getItem('authToken');
            
            // Carregar estatísticas
            const [passwordsRes, groupsRes] = await Promise.all([
                fetch('/api/passwords', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/groups', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (passwordsRes.ok && groupsRes.ok) {
                const passwordsData = await passwordsRes.json();
                const groupsData = await groupsRes.json();

                // Atualizar estatísticas
                this.updateStats({
                    totalPasswords: passwordsData.passwords?.length || 0,
                    totalGroups: groupsData.groups?.length || 0,
                    recentAccess: Math.floor(Math.random() * 50) // Placeholder
                });

                // Carregar senhas recentes
                this.loadRecentPasswords(passwordsData.passwords?.slice(0, 5) || []);
                
                // Carregar overview dos grupos
                this.loadGroupsOverview(groupsData.groups || []);
            }

            // Carregar estatísticas de usuários se for admin
            if (this.currentUser?.role === 'admin') {
                const usersRes = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    document.getElementById('totalUsers').textContent = usersData.users?.length || 0;
                }
            }

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        }
    }

    // Atualizar estatísticas
    updateStats(stats) {
        const elements = {
            totalPasswords: document.getElementById('totalPasswords'),
            totalGroups: document.getElementById('totalGroups'),
            recentAccess: document.getElementById('recentAccess')
        };

        Object.keys(stats).forEach(key => {
            if (elements[key]) {
                this.animateNumber(elements[key], stats[key]);
            }
        });
    }

    // Animar números
    animateNumber(element, target) {
        const start = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (target - start) * progress);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // Carregar senhas recentes
    loadRecentPasswords(passwords) {
        const container = document.getElementById('recentPasswords');
        if (!container) return;

        if (passwords.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhuma senha encontrada</p>';
            return;
        }

        const html = passwords.map(password => `
            <div class="recent-password-item">
                <div class="password-icon">
                    <i class="fas fa-key"></i>
                </div>
                <div class="password-info">
                    <h4>${password.title}</h4>
                    <p>${password.group_name || 'Sem grupo'}</p>
                </div>
                <div class="password-meta">
                    <span class="last-modified">
                        ${new Date(password.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // Carregar overview dos grupos
    loadGroupsOverview(groups) {
        const container = document.getElementById('groupsOverview');
        if (!container) return;

        if (groups.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum grupo encontrado</p>';
            return;
        }

        const html = groups.map(group => `
            <div class="group-item">
                <div class="group-color" style="background-color: ${group.color}"></div>
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p>${group.password_count || 0} senhas</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // Placeholder para outras funções de carregamento
    async loadPasswordsData() {
        console.log('Carregando dados de senhas...');
    }

    async loadGroupsData() {
        console.log('Carregando dados de grupos...');
    }

    async loadUsersData() {
        console.log('Carregando dados de usuários...');
    }

    async loadLogsData() {
        console.log('Carregando dados de logs...');
    }

    // Busca global
    handleGlobalSearch(query) {
        console.log('Buscando:', query);
        // Implementar busca global
    }

    // Logout
    async logout() {
        try {
            const token = localStorage.getItem('authToken');
            
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
    }

    // Responsividade
    handleResize() {
        const sidebar = document.getElementById('sidebar');
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('mobile-hidden');
        } else {
            sidebar.classList.remove('mobile-hidden', 'mobile-show');
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('show');
        }
    }
}

// Inicializar dashboard quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

// CSS adicional para elementos dinâmicos
const additionalStyles = `
    .recent-password-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--gray-medium);
        transition: all var(--transition-fast);
    }

    .recent-password-item:last-child {
        border-bottom: none;
    }

    .recent-password-item:hover {
        background-color: var(--yellow-light);
    }

    .password-icon {
        width: 40px;
        height: 40px;
        background-color: var(--primary-yellow);
        border-radius: var(--border-radius);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-black);
    }

    .password-info {
        flex: 1;
    }

    .password-info h4 {
        margin: 0 0 0.25rem 0;
        font-size: var(--font-size-base);
        font-weight: 600;
        color: var(--primary-black);
    }

    .password-info p {
        margin: 0;
        font-size: var(--font-size-small);
        color: var(--gray-dark);
    }

    .password-meta {
        text-align: right;
    }

    .last-modified {
        font-size: var(--font-size-small);
        color: var(--gray-dark);
    }

    .group-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--gray-medium);
        transition: all var(--transition-fast);
    }

    .group-item:last-child {
        border-bottom: none;
    }

    .group-item:hover {
        background-color: var(--yellow-light);
    }

    .group-color {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .group-info {
        flex: 1;
    }

    .group-info h4 {
        margin: 0 0 0.25rem 0;
        font-size: var(--font-size-base);
        font-weight: 600;
        color: var(--primary-black);
    }

    .group-info p {
        margin: 0;
        font-size: var(--font-size-small);
        color: var(--gray-dark);
    }
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);


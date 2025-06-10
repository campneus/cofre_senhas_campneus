// Utilitários de autenticação
class AuthUtils {
    static getToken() {
        return localStorage.getItem('authToken');
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static setToken(token) {
        localStorage.setItem('authToken', token);
    }

    static setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    static clearAuth() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    static async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Token não encontrado');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...options, ...defaultOptions });

        if (response.status === 401) {
            // Token expirado ou inválido
            this.clearAuth();
            window.location.href = '/';
            throw new Error('Sessão expirada');
        }

        return response;
    }

    static async refreshUserData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/auth/refresh', {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                this.setUser(data.user);
                return data.user;
            } else {
                throw new Error('Erro ao atualizar dados do usuário');
            }
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            await this.makeAuthenticatedRequest('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            this.clearAuth();
            window.location.href = '/';
        }
    }
}

// Utilitários de API
class ApiUtils {
    static async get(endpoint) {
        const response = await AuthUtils.makeAuthenticatedRequest(endpoint);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        return response.json();
    }

    static async post(endpoint, data) {
        const response = await AuthUtils.makeAuthenticatedRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        return response.json();
    }

    static async put(endpoint, data) {
        const response = await AuthUtils.makeAuthenticatedRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        return response.json();
    }

    static async delete(endpoint) {
        const response = await AuthUtils.makeAuthenticatedRequest(endpoint, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        return response.json();
    }
}

// Utilitários de UI
class UIUtils {
    static showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Inserir no topo da página
        const contentArea = document.getElementById('contentArea') || document.body;
        contentArea.insertBefore(alertDiv, contentArea.firstChild);

        // Remover após 5 segundos
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);

        // Adicionar animação
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-20px)';
        alertDiv.style.transition = 'all 0.3s ease';

        setTimeout(() => {
            alertDiv.style.opacity = '1';
            alertDiv.style.transform = 'translateY(0)';
        }, 10);
    }

    static getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    static showLoading(element, show = true) {
        if (show) {
            element.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    Carregando...
                </div>
            `;
        }
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Agora mesmo';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} dia${days > 1 ? 's' : ''} atrás`;
        }
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('Copiado para a área de transferência!', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    static fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showAlert('Copiado para a área de transferência!', 'success');
        } catch (err) {
            this.showAlert('Erro ao copiar texto', 'error');
        }

        document.body.removeChild(textArea);
    }

    static confirmAction(message, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirmação</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-danger" id="confirmBtn">
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('#confirmBtn');
        confirmBtn.addEventListener('click', () => {
            modal.remove();
            callback();
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Utilitários de validação
class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPassword(password) {
        return password && password.length >= 6;
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
}

// Disponibilizar globalmente
window.AuthUtils = AuthUtils;
window.ApiUtils = ApiUtils;
window.UIUtils = UIUtils;
window.ValidationUtils = ValidationUtils;


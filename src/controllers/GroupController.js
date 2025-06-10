const PasswordGroup = require('../models/PasswordGroup');
const User = require('../models/User');

class GroupController {
    // Renderizar página de grupos
    static async renderGroupsPage(req, res) {
        try {
            res.render('groups', { 
                title: 'Grupos - Sistema de Senhas',
                user: req.user 
            });
        } catch (error) {
            console.error('Erro ao renderizar página de grupos:', error);
            res.status(500).render('error', { 
                title: 'Erro',
                message: 'Erro interno do servidor' 
            });
        }
    }

    // Renderizar página de usuários (apenas admin)
    static async renderUsersPage(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).render('error', { 
                    title: 'Acesso Negado',
                    message: 'Apenas administradores podem acessar esta página' 
                });
            }

            res.render('users', { 
                title: 'Usuários - Sistema de Senhas',
                user: req.user 
            });
        } catch (error) {
            console.error('Erro ao renderizar página de usuários:', error);
            res.status(500).render('error', { 
                title: 'Erro',
                message: 'Erro interno do servidor' 
            });
        }
    }

    // Renderizar página de senhas
    static async renderPasswordsPage(req, res) {
        try {
            res.render('passwords', { 
                title: 'Senhas - Sistema de Senhas',
                user: req.user 
            });
        } catch (error) {
            console.error('Erro ao renderizar página de senhas:', error);
            res.status(500).render('error', { 
                title: 'Erro',
                message: 'Erro interno do servidor' 
            });
        }
    }

    // Obter estatísticas do dashboard
    static async getDashboardStats(req, res) {
        try {
            let stats = {};

            // Estatísticas de grupos
            if (req.user.role === 'admin') {
                const groups = await PasswordGroup.findAll();
                stats.totalGroups = groups.length;
                stats.activeGroups = groups.filter(g => g.is_active).length;
            } else {
                const userGroups = await PasswordGroup.findByUserId(req.user.id);
                stats.totalGroups = userGroups.length;
                stats.activeGroups = userGroups.filter(g => g.is_active).length;
            }

            // Estatísticas de usuários (apenas admin)
            if (req.user.role === 'admin') {
                const users = await User.findAll();
                stats.totalUsers = users.length;
                stats.activeUsers = users.filter(u => u.is_active).length;
            }

            res.json({
                success: true,
                stats: stats
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ 
                error: 'Erro ao buscar estatísticas',
                code: 'STATS_ERROR'
            });
        }
    }
}

module.exports = GroupController;


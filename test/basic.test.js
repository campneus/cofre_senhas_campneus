// Teste básico do servidor
const request = require('supertest');
const app = require('../src/app');

describe('Sistema de Senhas - Testes Básicos', () => {
    
    test('Health check deve retornar status 200', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        expect(response.body.status).toBe('healthy');
        expect(response.body.services).toBeDefined();
    });

    test('Página de login deve carregar', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);
        
        expect(response.text).toContain('Sistema de Senhas');
    });

    test('Rota protegida deve retornar 401 sem token', async () => {
        await request(app)
            .get('/api/groups')
            .expect(401);
    });

    test('API de autenticação deve estar disponível', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({ token: 'invalid_token' })
            .expect(401);
        
        expect(response.body.error).toBeDefined();
    });
});

// Teste de configuração
describe('Configuração do Sistema', () => {
    
    test('Variáveis de ambiente essenciais', () => {
        // Verificar se as variáveis críticas estão definidas
        const requiredEnvVars = [
            'NODE_ENV',
            'PORT'
        ];
        
        requiredEnvVars.forEach(envVar => {
            if (!process.env[envVar]) {
                console.warn(`Variável de ambiente ${envVar} não definida`);
            }
        });
    });

    test('Estrutura de arquivos', () => {
        const fs = require('fs');
        const path = require('path');
        
        const requiredFiles = [
            'package.json',
            'src/app.js',
            'src/config/database.js',
            'src/config/firebase.js',
            'sql/database_setup.sql',
            '.env.example',
            'README.md'
        ];
        
        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });
});

console.log('✅ Testes básicos configurados');
console.log('📝 Para executar os testes: npm test');
console.log('🚀 Para iniciar o servidor: npm start');
console.log('🔧 Para desenvolvimento: npm run dev');


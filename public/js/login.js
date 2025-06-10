// Funções utilitárias para a página de login

// Toggle da visibilidade da senha
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Validação de email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validação de senha
function isValidPassword(password) {
    return password.length >= 6;
}

// Adicionar validação em tempo real
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    
    // Validação em tempo real do email
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        
        if (email && !isValidEmail(email)) {
            this.style.borderColor = 'var(--error)';
            showFieldError(this, 'Email inválido');
        } else {
            this.style.borderColor = 'var(--gray-medium)';
            hideFieldError(this);
        }
        
        updateLoginButtonState();
    });
    
    // Validação em tempo real da senha
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        if (password && !isValidPassword(password)) {
            this.style.borderColor = 'var(--error)';
            showFieldError(this, 'Senha deve ter pelo menos 6 caracteres');
        } else {
            this.style.borderColor = 'var(--gray-medium)';
            hideFieldError(this);
        }
        
        updateLoginButtonState();
    });
    
    // Atualizar estado do botão de login
    function updateLoginButtonState() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        const isFormValid = email && password && isValidEmail(email) && isValidPassword(password);
        
        if (isFormValid) {
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
        } else {
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.6';
        }
    }
    
    // Mostrar erro específico do campo
    function showFieldError(field, message) {
        // Remover erro anterior se existir
        hideFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = `
            color: var(--error);
            font-size: var(--font-size-small);
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        `;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
        
        field.parentNode.parentNode.appendChild(errorDiv);
    }
    
    // Esconder erro do campo
    function hideFieldError(field) {
        const existingError = field.parentNode.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    // Inicializar estado do botão
    updateLoginButtonState();
    
    // Adicionar efeito de foco nos inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.style.transform = 'scale(1.02)';
            this.parentNode.style.transition = 'transform 0.2s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentNode.style.transform = 'scale(1)';
        });
    });
    
    // Adicionar efeito de ripple nos botões
    const buttons = document.querySelectorAll('.login-btn, .google-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Adicionar animação de entrada para os elementos
    const animatedElements = document.querySelectorAll('.login-card > *');
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Adicionar CSS para animação de ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .login-btn, .google-btn {
        position: relative;
        overflow: hidden;
    }
    
    .field-error {
        animation: slideInError 0.3s ease-out;
    }
    
    @keyframes slideInError {
        from {
            opacity: 0;
            transform: translateY(-5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);


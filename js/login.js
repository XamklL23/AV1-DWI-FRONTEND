const API = 'http://localhost:8080/api';

        // ===== UTIL =====
        function esEmailValido(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        // 🔥 PARSER UNIVERSAL (SOLUCIÓN REAL)
        async function parseResponse(res) {
            const text = await res.text();

            let data;
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = { message: text };
            }

            if (!res.ok) {
                throw new Error(data?.message || "Error en la petición");
            }

            return data;
        }

        // ===== VALIDACIÓN EN VIVO =====
        function activarValidacion(input, tipo) {
            if (!input) return;

            input.addEventListener('input', () => {
                let valido = false;

                if (tipo === 'email') {
                    valido = esEmailValido(input.value);
                } else if (tipo === 'password') {
                    valido = input.value.length >= 6;
                } else {
                    valido = input.value.trim().length > 2;
                }

                input.classList.remove('valid', 'invalid');

                if (input.value === '') return;

                input.classList.add(valido ? 'valid' : 'invalid');
            });
        }

        // activar validaciones
        activarValidacion(document.getElementById('loginEmail'), 'email');
        activarValidacion(document.getElementById('loginPassword'), 'password');
        activarValidacion(document.getElementById('regNombre'), 'text');
        activarValidacion(document.getElementById('regEmail'), 'email');
        activarValidacion(document.getElementById('regPassword'), 'password');


        // ===== LOGIN =====
        document.getElementById('loginForm').addEventListener('submit', async e => {
            e.preventDefault();

            const loginError = document.getElementById('loginError');
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            loginError.classList.add('hidden');

            if (!esEmailValido(email)) {
                loginError.textContent = "Correo inválido";
                loginError.classList.remove('hidden');
                return;
            }

            if (!password) {
                loginError.textContent = "Ingresa tu contraseña";
                loginError.classList.remove('hidden');
                return;
            }

            try {
                const res = await fetch(`${API}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await parseResponse(res);
                console.log('Respuesta login:', data); 

                if (data.rol) data.rol = data.rol.toLowerCase();

                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data));

                // Comparación más robusta
                const rol = (data.rol || '').trim().toLowerCase();

                if (rol === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }


            } catch (err) {
                loginError.textContent = err.message;
                loginError.classList.remove('hidden');
            }
        });


        // ===== MODAL =====
        function toggleRegister(show) {
            document.getElementById('registerModal')
                .classList.toggle('hidden', !show);
        }


        // ===== REGISTER =====
        async function registrar() {

            const nombre = document.getElementById('regNombre').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;

            const registerError = document.getElementById('registerError');
            const registerSuccess = document.getElementById('registerSuccess');

            registerError.classList.add('hidden');
            registerSuccess.classList.add('hidden');

            if (nombre.length < 3) {
                mostrarError("Nombre muy corto");
                return;
            }

            if (!esEmailValido(email)) {
                mostrarError("Correo inválido");
                return;
            }

            if (password.length < 6) {
                mostrarError("Mínimo 6 caracteres");
                return;
            }

            try {
                const res = await fetch(`${API}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, password })
                });

                const data = await parseResponse(res);

                registerSuccess.textContent = "Cuenta creada ✔";
                registerSuccess.classList.remove('hidden');

                // limpiar campos
                document.getElementById('regNombre').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regPassword').value = '';

                setTimeout(() => toggleRegister(false), 1500);

            } catch (err) {
                mostrarError(err.message);
            }
        }

        function mostrarError(msg) {
            const registerError = document.getElementById('registerError');
            registerError.textContent = msg;
            registerError.classList.remove('hidden');
        }

        // ESC
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') toggleRegister(false);
        });
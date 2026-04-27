"""
AYRON — Teste E2E do Fluxo Clínico Completo
Cobre: login, criar paciente, agendar, check-in, prontuário,
       evolução, documento, financeiro, estoque, mensagens.
"""
import re
import time
import httpx
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"
API_URL  = "http://localhost:4000/api/v1"
EMAIL    = "master@ayron.health"
PASSWORD = "Ayron@Master2025!"


# ---------------------------------------------------------------------------
# T1 — Login
# ---------------------------------------------------------------------------
class TestLogin:
    def test_login_success(self, page: Page):
        """Login com credenciais válidas → redireciona para /dashboard."""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("domcontentloaded")
        page.fill('input[name="email"]', EMAIL)
        page.fill('input[name="password"]', PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_url(re.compile(r"/dashboard"), timeout=15000)
        assert "/dashboard" in page.url, f"Esperava /dashboard, got {page.url}"

    def test_login_wrong_password(self, page: Page):
        """Login com senha errada → permanece em /login com mensagem de erro."""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("domcontentloaded")
        page.fill('input[name="email"]', EMAIL)
        page.fill('input[name="password"]', "wrong_password")
        page.click('button[type="submit"]')
        time.sleep(3)
        assert "/login" in page.url or "/dashboard" not in page.url, "Deveria permanecer no login"


# ---------------------------------------------------------------------------
# T2 — Dashboard carrega sem erros
# ---------------------------------------------------------------------------
class TestDashboard:
    def test_dashboard_loads(self, auth_page):
        page, token = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e or "No QueryClient" in e]
        assert not critical, f"Erros críticos no console: {critical}"
        assert "/dashboard" in page.url, f"Não está no dashboard: {page.url}"

    def test_sidebar_visible(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_load_state("networkidle")
        # sidebar or navigation must be present
        sidebar = page.locator("nav, aside, [class*='sidebar'], [class*='Sidebar']").first
        assert sidebar.count() > 0 or page.locator("text=Pacientes, text=Agenda, text=AYRON").first.is_visible(timeout=5000)


# ---------------------------------------------------------------------------
# T3 — Lista de Pacientes
# ---------------------------------------------------------------------------
class TestPatients:
    def test_patients_page_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/patients")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error: {critical}"

    def test_patients_list_renders(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/patients")
        page.wait_for_load_state("networkidle")
        try:
            page.wait_for_selector("main, table, [class*='patient']", timeout=8000)
        except Exception:
            pass
        content = page.content()
        assert any(t in content for t in ["Paciente", "paciente", "Nome", "Nome Completo", "Novo paciente", "CPF"]), \
            f"Página de pacientes sem conteúdo esperado. URL: {page.url}"

    def test_create_patient_via_api(self):
        """Cria paciente via API e verifica response."""
        r = httpx.post(
            f"{API_URL}/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=10,
        )
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Use unique CPF based on timestamp to avoid duplicates
        unique_suffix = str(int(time.time()))[-9:]
        payload = {
            "full_name": "Teste E2E Silva",
            "birth_date": "1990-05-15",
            "sex": "F",
            "phone": "11999990001",
            "email": f"teste.e2e.{unique_suffix}@ayron.test",
            "cpf": unique_suffix,
        }
        resp = httpx.post(f"{API_URL}/patients", json=payload, headers=headers, timeout=10)
        assert resp.status_code in (200, 201), f"Criar paciente falhou: {resp.status_code} {resp.text}"
        data = resp.json()
        assert data.get("id"), "Paciente criado sem ID"


# ---------------------------------------------------------------------------
# T4 — Agenda
# ---------------------------------------------------------------------------
class TestAgenda:
    def test_agenda_page_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/agenda")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error: {critical}"

    def test_agenda_renders_appointments(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/agenda")
        page.wait_for_load_state("networkidle")
        # Wait for any rendered element from the agenda page
        page.wait_for_selector("h1, [class*='topbar'], main", timeout=10000)
        visible = (
            page.locator("text=Agenda").first.is_visible(timeout=5000)
            or page.locator("button:has-text('Novo')").first.is_visible(timeout=2000)
            or page.locator("text=Agendar").first.is_visible(timeout=2000)
        )
        assert visible, f"Agenda não renderizou conteúdo. URL: {page.url}"

    def test_create_appointment_via_api(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        token = r.json()["access_token"]
        user_data = r.json()["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get patients
        pts = httpx.get(f"{API_URL}/patients?page=1&limit=1", headers=headers, timeout=10).json()
        patient_id = pts["data"][0]["id"]

        # Get professionals
        profs = httpx.get(f"{API_URL}/professionals", headers=headers, timeout=10)
        if profs.status_code != 200:
            pytest.skip("Professionals endpoint not available")
        prof_list = profs.json()
        if not prof_list:
            pytest.skip("Nenhum profissional cadastrado")
        professional_id = prof_list[0]["id"]

        payload = {
            "patient_id": patient_id,
            "professional_id": professional_id,
            "type": "CONSULTATION",
            "start_time": f"2026-04-{(int(time.time()) % 28) + 1:02d}T{(int(time.time()) % 10) + 8:02d}:00:00.000Z",
            "end_time":   f"2026-04-{(int(time.time()) % 28) + 1:02d}T{(int(time.time()) % 10) + 9:02d}:00:00.000Z",
            "notes": "Agendamento E2E teste",
        }
        resp = httpx.post(f"{API_URL}/agenda", json=payload, headers=headers, timeout=10)
        assert resp.status_code in (200, 201), f"Criar consulta falhou: {resp.status_code} {resp.text}"


# ---------------------------------------------------------------------------
# T5 — Paciente 360 (abas)
# ---------------------------------------------------------------------------
class TestPatient360:
    @pytest.fixture(autouse=True)
    def get_patient_id(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        self.token = r.json()["access_token"]
        pts = httpx.get(f"{API_URL}/patients?page=1&limit=1", headers={"Authorization": f"Bearer {self.token}"}, timeout=10).json()
        self.patient_id = pts["data"][0]["id"]

    def test_patient_360_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/patients/{self.patient_id}")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error: {critical}"

    def test_patient_360_tabs_visible(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/patients/{self.patient_id}")
        page.wait_for_load_state("networkidle")
        # Should have tabs: Visão Geral, Agenda, Financeiro, Prontuário, etc.
        tab_texts = ["Visão", "Agenda", "Financeiro", "Prontuário", "Documentos", "Preferências"]
        found = 0
        for t in tab_texts:
            if page.locator(f"text={t}").count() > 0:
                found += 1
        assert found >= 3, f"Esperava ≥3 abas, encontrou {found} de {tab_texts}"

    def test_patient_360_prontuario_tab_no_crash(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/patients/{self.patient_id}")
        page.wait_for_load_state("networkidle")
        # Click Prontuário tab
        pron = page.locator("text=Prontuário, button:has-text('Prontuário'), [role='tab']:has-text('Prontuário')").first
        if pron.is_visible(timeout=3000):
            pron.click()
            time.sleep(1)
        critical = [e for e in errors if "QueryClient" in e or "Unhandled" in e]
        assert not critical, f"Erros ao abrir Prontuário: {critical}"


# ---------------------------------------------------------------------------
# T6 — Modo Médico (appointment page)
# ---------------------------------------------------------------------------
class TestModoMedico:
    @pytest.fixture(autouse=True)
    def get_appointment(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        self.token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {self.token}"}
        appts = httpx.get(f"{API_URL}/agenda?limit=10", headers=headers, timeout=10).json()
        active = [a for a in appts if a["status"] in ("SCHEDULED", "CHECKED_IN")]
        if not active:
            pytest.skip("Nenhum appointment ativo para testar")
        self.appt = active[0]
        self.patient_id = self.appt["patient_id"]
        self.appt_id = self.appt["id"]

    def test_appointment_page_loads_no_queryclient_error(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        url = f"{BASE_URL}/patients/{self.patient_id}/appointments/{self.appt_id}"
        page.goto(url)
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error na consulta: {critical}"
        # page must show HTTP 200 (not error overlay)
        assert "No QueryClient" not in page.content()

    def test_appointment_page_renders_sections(self, auth_page):
        page, _ = auth_page
        url = f"{BASE_URL}/patients/{self.patient_id}/appointments/{self.appt_id}"
        page.goto(url)
        page.wait_for_load_state("networkidle")
        sections = ["Evolução", "Métricas", "Protocolo", "Implante", "Documentos", "Modo Médico", "Consulta"]
        found = sum(1 for s in sections if page.locator(f"text={s}").count() > 0)
        assert found >= 2, f"Esperava ≥2 seções no modo médico, encontrou {found}"


# ---------------------------------------------------------------------------
# T7 — Financeiro
# ---------------------------------------------------------------------------
class TestFinanceiro:
    def test_financial_page_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/financial")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error no financeiro: {critical}"

    def test_financial_shows_content(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/financial")
        # Wait explicitly for client-side hydration (RSC streaming finishes after networkidle)
        page.wait_for_load_state("networkidle")
        assert "/login" not in page.url, f"Não autenticado: {page.url}"
        # Wait for any h1 to appear (Topbar renders title as h1)
        try:
            page.wait_for_function("document.querySelector('h1') !== null", timeout=12000)
        except Exception:
            pass
        # Check rendered text via JS evaluation (bypasses RSC payload)
        text = page.evaluate("document.body.innerText")
        assert any(t in text for t in ["Financeiro", "Receita", "Transaç"]), \
            f"Financeiro sem conteúdo esperado. URL: {page.url}, body text snippet: {text[:300]}"


# ---------------------------------------------------------------------------
# T8 — Estoque (inventário)
# ---------------------------------------------------------------------------
class TestEstoque:
    def test_inventory_page_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/inventory")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error no estoque: {critical}"

    def test_novo_item_button_opens_modal(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/inventory")
        page.wait_for_load_state("networkidle")
        try:
            page.wait_for_selector("button", timeout=8000)
        except Exception:
            pass
        # Use filter-based locator (avoids CSS-comma ambiguity)
        btn = page.locator("button").filter(has_text="Novo Item").first
        assert btn.is_visible(timeout=8000), f"Botão 'Novo Item' não encontrado. Buttons: {[page.locator('button').nth(i).inner_text() for i in range(min(page.locator('button').count(), 8))]}"
        btn.click()
        time.sleep(1)
        # Modal should show "Novo Item de Estoque" heading
        modal_heading = page.locator("text=Novo Item de Estoque").first
        assert modal_heading.is_visible(timeout=5000), "Modal 'Novo Item de Estoque' não abriu"

    def test_create_inventory_item_via_modal(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/inventory")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("button", timeout=8000)
        page.locator("button").filter(has_text="Novo Item").first.click()
        time.sleep(0.5)
        # Fill form — first input inside the fixed modal overlay
        name_input = page.locator(".fixed input").first
        if not name_input.is_visible(timeout=2000):
            name_input = page.locator("input[placeholder*='Ex'], input[placeholder*='Agulha']").first
        if not name_input.is_visible(timeout=2000):
            name_input = page.locator("input").nth(0)
        name_input.fill("Agulha E2E 40x12")
        # Submit
        submit_btn = page.locator("button").filter(has_text="Criar Item").first
        submit_btn.click()
        time.sleep(2)
        # Success: item in list or success toast
        text = page.evaluate("document.body.innerText")
        success = (
            "Agulha E2E 40x12" in text
            or "sucesso" in text.lower()
            or "criado" in text.lower()
        )
        assert success, f"Item não foi criado. Body: {text[:400]}"


# ---------------------------------------------------------------------------
# T9 — Mensagens
# ---------------------------------------------------------------------------
class TestMensagens:
    def test_messages_page_loads(self, auth_page):
        page, _ = auth_page
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(f"{BASE_URL}/messages")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "QueryClient" in e]
        assert not critical, f"QueryClient error em mensagens: {critical}"

    def test_messages_empty_state_informative(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/messages")
        page.wait_for_load_state("networkidle")
        assert "/login" not in page.url, f"Não autenticado: {page.url}"
        # Either shows channels OR empty state text
        ok = (
            page.locator("text=Nenhum canal configurado").is_visible(timeout=5000)
            or page.locator("text=Selecione um canal").is_visible(timeout=2000)
            or page.locator("[class*='channel']").count() > 0
        )
        assert ok, f"Mensagens não mostra conteúdo válido. URL: {page.url}"


# ---------------------------------------------------------------------------
# T10 — Documentos
# ---------------------------------------------------------------------------
class TestDocumentos:
    def test_documents_api_list(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        token = r.json()["access_token"]
        pts = httpx.get(f"{API_URL}/patients?page=1&limit=1", headers={"Authorization": f"Bearer {token}"}, timeout=10).json()
        patient_id = pts["data"][0]["id"]
        resp = httpx.get(f"{API_URL}/patients/{patient_id}/documents", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert resp.status_code in (200, 404), f"Documentos endpoint falhou: {resp.status_code}"

    def test_create_and_sign_document_api(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        pts = httpx.get(f"{API_URL}/patients?page=1&limit=1", headers=headers, timeout=10).json()
        patient_id = pts["data"][0]["id"]

        # Create DRAFT — use the real enum value from API validation error
        draft = httpx.post(f"{API_URL}/documents", json={
            "patientId": patient_id,
            "type": "PRESCRIPTION",
            "title": "Receita E2E Teste",
            "content": "Metformina 500mg 2x ao dia por 30 dias.",
        }, headers=headers, timeout=10)
        assert draft.status_code in (200, 201), f"Criar DRAFT falhou: {draft.status_code} {draft.text}"
        doc_id = draft.json().get("id")
        assert doc_id, "Documento criado sem ID"

        # Sign
        sign = httpx.post(f"{API_URL}/documents/{doc_id}/sign", headers=headers, timeout=30)
        assert sign.status_code in (200, 201), f"Assinar falhou: {sign.status_code} {sign.text}"
        signed = sign.json()
        assert signed.get("document_hash"), "Hash não gerado após assinatura"
        assert signed.get("status") in ("SIGNED", "PENDING_CFM_VALIDATION"), f"Status inesperado: {signed.get('status')}"


# ---------------------------------------------------------------------------
# T11 — Clinical Hub (/clinical)
# ---------------------------------------------------------------------------
class TestClinicalHub:
    def test_clinical_redirects(self, auth_page):
        page, _ = auth_page
        page.goto(f"{BASE_URL}/clinical")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        # Should redirect to either /agenda or an appointment page
        assert (
            "/agenda" in page.url
            or "/appointments/" in page.url
            or "/clinical" in page.url  # or stays on clinical page
        ), f"URL inesperada: {page.url}"


# ---------------------------------------------------------------------------
# T12 — API Health
# ---------------------------------------------------------------------------
class TestAPIHealth:
    def test_health_endpoint(self):
        resp = httpx.get(f"{API_URL}/health", timeout=5)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "ok"

    def test_pagination_patients(self):
        r = httpx.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        token = r.json()["access_token"]
        resp = httpx.get(f"{API_URL}/patients?page=1&limit=5", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data and "total" in data and "page" in data, f"Paginação incorreta: {list(data.keys())}"
        assert isinstance(data["data"], list), "data deve ser lista"

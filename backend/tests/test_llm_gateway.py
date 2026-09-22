from unittest.mock import patch
import pytest
from app.services.llm_gateway import PROVIDER_ENDPOINTS, llm_gateway, mask_api_key


@pytest.fixture
def auth_header_llm(client):
    import uuid
    email = f"llm_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "LLM User"},
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_mask_api_key():
    assert mask_api_key("sk-1234567890abcdef") == "sk-***cdef"
    assert mask_api_key("short") == "***"
    assert mask_api_key(None) is None


def test_resolve_url_all_providers():
    providers = ["nvidia_nim", "groq", "ollama", "openrouter", "gemini"]
    for p in providers:
        url = llm_gateway._resolve_url(p)
        assert url == PROVIDER_ENDPOINTS[p]

    custom = llm_gateway._resolve_url("ollama", "http://my-host:11434/v1")
    assert custom == "http://my-host:11434/v1/chat/completions"


def test_get_and_update_llm_settings(client, auth_header_llm):
    get_resp = client.get("/api/v1/settings/llm", headers=auth_header_llm)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["primary_provider"] == "nvidia_nim"

    update_payload = {
        "primary_provider": "groq",
        "primary_model": "llama-3.3-70b-versatile",
        "primary_api_key": "gsk_secret123456789",
        "backup_provider": "nvidia_nim",
        "backup_model": "meta/llama-3.3-70b-instruct",
        "backup_api_key": "nvapi-backup12345678",
    }
    put_resp = client.put("/api/v1/settings/llm", json=update_payload, headers=auth_header_llm)
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["primary_provider"] == "groq"
    assert updated["backup_provider"] == "nvidia_nim"
    assert "gsk_***6789" == updated["primary_api_key_masked"]
    assert "nva***5678" == updated["backup_api_key_masked"]


def test_llm_gateway_primary_and_failover():
    with patch.object(llm_gateway, "call_provider") as mock_call:
        mock_call.side_effect = [
            RuntimeError("Primary timed out"),
            "Backup response content",
        ]

        class MockConfig:
            primary_provider = "groq"
            primary_model = "llama3"
            primary_api_key = "key1"
            primary_base_url = None
            backup_provider = "nvidia_nim"
            backup_model = "llama3"
            backup_api_key = "key2"
            backup_base_url = None

        class MockQuery:
            def filter(self, *args, **kwargs):
                return self
            def first(self):
                return MockConfig()

        class MockDB:
            def query(self, *args, **kwargs):
                return MockQuery()

        result = llm_gateway.generate(
            prompt="Hello",
            user_id="user-123",
            db=MockDB(),
        )
        assert result == "Backup response content"
        assert mock_call.call_count == 2


def test_resolve_url_mismatched_domain_fallback():
    url = llm_gateway._resolve_url("groq", "https://openrouter.ai/api/v1")
    assert url == PROVIDER_ENDPOINTS["groq"]

    url_nvidia = llm_gateway._resolve_url("nvidia_nim", "https://openrouter.ai/api/v1")
    assert url_nvidia == PROVIDER_ENDPOINTS["nvidia_nim"]


def test_test_provider_key_isolation(client, auth_header_llm):
    put_resp = client.put(
        "/api/v1/settings/llm",
        json={
            "primary_provider": "openrouter",
            "primary_model": "meta-llama/llama-3.3-70b-instruct",
            "primary_api_key": "sk-or-v1-secretkey987654321",
        },
        headers=auth_header_llm,
    )
    assert put_resp.status_code == 200

    test_resp = client.post(
        "/api/v1/settings/llm/test",
        json={
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
        },
        headers=auth_header_llm,
    )
    assert test_resp.status_code == 200
    data = test_resp.json()
    assert data["success"] is False
    assert "No API key provided for groq" in data["error"]

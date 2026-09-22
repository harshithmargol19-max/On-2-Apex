import time
from typing import Any, Dict, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.errors import AppException
from app.core.logging import logger
from app.models.llm import LLMProviderConfig

PROVIDER_ENDPOINTS = {
    "nvidia_nim": "https://integrate.api.nvidia.com/v1/chat/completions",
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "ollama": "http://localhost:11434/v1/chat/completions",
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
}


def mask_api_key(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    cleaned = key.strip()
    if len(cleaned) <= 8:
        return "***"
    return f"{cleaned[:3]}***{cleaned[-4:]}"


class LLMGateway:
    def _resolve_url(self, provider: str, custom_base_url: Optional[str] = None) -> str:
        if custom_base_url and custom_base_url.strip():
            url = custom_base_url.strip().rstrip("/")
            mismatched = (
                ("openrouter.ai" in url and provider != "openrouter")
                or ("api.groq.com" in url and provider != "groq")
                or ("integrate.api.nvidia.com" in url and provider != "nvidia_nim")
                or ("googleapis.com" in url and provider != "gemini")
            )
            if not mismatched:
                if not url.endswith("/chat/completions"):
                    url = f"{url}/chat/completions"
                return url
        if provider == "ollama" and settings.OLLAMA_BASE_URL:
            base = settings.OLLAMA_BASE_URL.strip().rstrip("/")
            if not base.endswith("/chat/completions"):
                base = f"{base}/v1/chat/completions" if not base.endswith("/v1") else f"{base}/chat/completions"
            return base
        return PROVIDER_ENDPOINTS.get(provider, PROVIDER_ENDPOINTS["openrouter"])

    def _resolve_headers(self, provider: str, api_key: Optional[str]) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "AI-Placement-Coach/1.0",
        }
        key = (api_key or "").strip().strip("'\"")
        if key.lower().startswith("bearer "):
            key = key[7:].strip()
        if provider == "openrouter":
            headers["Authorization"] = f"Bearer {key}"
            headers["HTTP-Referer"] = "http://localhost:3000"
            headers["X-Title"] = "AI Placement Coach"
        elif provider == "ollama":
            headers["Authorization"] = f"Bearer {key or 'ollama'}"
        else:
            headers["Authorization"] = f"Bearer {key}"
        return headers

    def call_provider(
        self,
        provider: str,
        model: str,
        api_key: Optional[str],
        base_url: Optional[str],
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        max_tokens: Optional[int] = None,
        timeout: float = 45.0,
    ) -> str:
        endpoint = self._resolve_url(provider, base_url)
        if provider != "ollama" and not (api_key and api_key.strip()):
            raise RuntimeError(
                f"[{provider}] Missing API Key. Please provide an API key for {provider} in Settings."
            )
        headers = self._resolve_headers(provider, api_key)

        formatted_messages = list(messages)
        token_limit = max_tokens if max_tokens is not None else 4096

        payload: Dict[str, Any] = {
            "model": model,
            "messages": formatted_messages,
            "temperature": 0.2,
            "max_tokens": token_limit,
            "stream": False,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
            has_json = any(
                "json" in m.get("content", "").lower() for m in formatted_messages
            )
            if not has_json and formatted_messages:
                last_msg = dict(formatted_messages[-1])
                last_msg["content"] = f"{last_msg['content']}\n\nRespond with valid JSON format."
                formatted_messages[-1] = last_msg
                payload["messages"] = formatted_messages

        with httpx.Client(timeout=timeout) as client:
            resp = client.post(endpoint, headers=headers, json=payload)
            if resp.status_code != 200:
                err_detail = resp.text[:300]
                try:
                    err_json = resp.json()
                    err_detail = (
                        err_json.get("detail")
                        or (err_json.get("error", {}).get("message") if isinstance(err_json.get("error"), dict) else err_json.get("error"))
                        or err_json.get("message")
                        or err_detail
                    )
                except Exception:
                    pass
                raise RuntimeError(f"[{provider}] API error {resp.status_code}: {err_detail}")
            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError(f"[{provider}] Returned empty choices array")
            return choices[0]["message"]["content"]

    def test_connection(
        self,
        provider: str,
        model: str,
        api_key: Optional[str],
        base_url: Optional[str],
    ) -> Tuple[bool, float, Optional[str], Optional[str]]:
        start = time.perf_counter()
        messages = [
            {"role": "system", "content": "You are a test ping responder."},
            {"role": "user", "content": "Respond with 'pong'."},
        ]
        try:
            content = self.call_provider(
                provider=provider,
                model=model,
                api_key=api_key,
                base_url=base_url,
                messages=messages,
                json_mode=False,
                max_tokens=64,
                timeout=15.0,
            )
            duration_ms = (time.perf_counter() - start) * 1000
            return True, duration_ms, content.strip(), None
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            return False, duration_ms, None, str(exc)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        user_id: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> str:
        config: Optional[LLMProviderConfig] = None
        if user_id and db:
            config = db.query(LLMProviderConfig).filter(LLMProviderConfig.user_id == user_id).first()

        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        primary_provider = config.primary_provider if config and config.primary_provider else "nvidia_nim"
        primary_model = config.primary_model if config and config.primary_model else "meta/llama-3.1-8b-instruct"
        primary_key = (config.primary_api_key if config and config.primary_api_key else "") or ""
        primary_url = config.primary_base_url if config else None

        backup_provider = config.backup_provider if config else None
        backup_model = config.backup_model if config else None
        backup_key = config.backup_api_key if config else None
        backup_url = config.backup_base_url if config else None

        try:
            logger.info(f"Attempting LLM generation via Primary Provider [{primary_provider}] model [{primary_model}]")
            return self.call_provider(
                provider=primary_provider,
                model=primary_model,
                api_key=primary_key,
                base_url=primary_url,
                messages=messages,
                json_mode=json_mode,
            )
        except Exception as primary_err:
            logger.warning(
                f"Primary LLM provider [{primary_provider}] failed: {primary_err}. Checking backup provider..."
            )

        if backup_provider and backup_model:
            try:
                logger.info(
                    f"Failing over to Backup Provider [{backup_provider}] model [{backup_model}]"
                )
                return self.call_provider(
                    provider=backup_provider,
                    model=backup_model,
                    api_key=backup_key,
                    base_url=backup_url,
                    messages=messages,
                    json_mode=json_mode,
                )
            except Exception as backup_err:
                logger.error(f"Backup LLM provider [{backup_provider}] also failed: {backup_err}")
                raise AppException(
                    message=f"Both primary ({primary_provider}) and backup ({backup_provider}) LLM providers failed.",
                    code="LLM_FAILOVER_EXHAUSTED",
                    details={
                        "primary_error": str(primary_err),
                        "backup_error": str(backup_err),
                    },
                )

        raise AppException(
            message=f"Primary LLM provider [{primary_provider}] failed and no backup provider was configured.",
            code="LLM_GENERATION_FAILED",
            details={"error": str(primary_err)},
        )


llm_gateway = LLMGateway()

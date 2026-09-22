from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.llm import LLMProviderConfig
from app.models.user import User
from app.schemas.llm import (
    LLMConfigOut,
    LLMConfigUpdate,
    LLMTestRequest,
    LLMTestResponse,
)
from app.services.llm_gateway import llm_gateway, mask_api_key

router = APIRouter()


@router.get("", response_model=LLMConfigOut)
def get_llm_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = db.query(LLMProviderConfig).filter(LLMProviderConfig.user_id == current_user.id).first()
    if not config:
        config = LLMProviderConfig(
            user_id=current_user.id,
            primary_provider="nvidia_nim",
            primary_model="meta/llama-3.1-8b-instruct",
            primary_api_key=None,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    elif config.primary_provider == "openrouter":
        config.primary_provider = "nvidia_nim"
        config.primary_model = "meta/llama-3.1-8b-instruct"
        config.primary_base_url = None
        db.commit()
        db.refresh(config)
    elif config.primary_provider == "nvidia_nim":
        wrong_key = config.primary_api_key and (
            config.primary_api_key.startswith("sk-or-") or config.primary_api_key.startswith("gsk_")
        )
        if wrong_key:
            config.primary_api_key = None
            config.primary_base_url = None
            db.commit()
            db.refresh(config)

    return LLMConfigOut(
        id=config.id,
        user_id=config.user_id,
        primary_provider=config.primary_provider,
        primary_model=config.primary_model,
        primary_api_key_masked=mask_api_key(config.primary_api_key),
        primary_base_url=config.primary_base_url,
        backup_provider=config.backup_provider,
        backup_model=config.backup_model,
        backup_api_key_masked=mask_api_key(config.backup_api_key),
        backup_base_url=config.backup_base_url,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.put("", response_model=LLMConfigOut)
def update_llm_settings(
    payload: LLMConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = db.query(LLMProviderConfig).filter(LLMProviderConfig.user_id == current_user.id).first()
    if not config:
        config = LLMProviderConfig(user_id=current_user.id)
        db.add(config)

    provider_changed = config.primary_provider != payload.primary_provider
    config.primary_provider = payload.primary_provider
    config.primary_model = payload.primary_model.strip()

    if provider_changed:
        config.primary_api_key = None
        config.primary_base_url = None

    if payload.primary_api_key is not None:
        clean_key = payload.primary_api_key.strip()
        config.primary_api_key = clean_key if clean_key else None

    if payload.primary_base_url is not None:
        clean_url = payload.primary_base_url.strip()
        config.primary_base_url = clean_url if clean_url else None

    backup_provider_changed = config.backup_provider != payload.backup_provider
    config.backup_provider = payload.backup_provider
    config.backup_model = payload.backup_model.strip() if payload.backup_model else None

    if backup_provider_changed:
        config.backup_api_key = None
        config.backup_base_url = None

    if payload.backup_api_key is not None:
        clean_bkey = payload.backup_api_key.strip()
        config.backup_api_key = clean_bkey if clean_bkey else None

    if payload.backup_base_url is not None:
        clean_burl = payload.backup_base_url.strip()
        config.backup_base_url = clean_burl if clean_burl else None

    db.commit()
    db.refresh(config)

    return LLMConfigOut(
        id=config.id,
        user_id=config.user_id,
        primary_provider=config.primary_provider,
        primary_model=config.primary_model,
        primary_api_key_masked=mask_api_key(config.primary_api_key),
        primary_base_url=config.primary_base_url,
        backup_provider=config.backup_provider,
        backup_model=config.backup_model,
        backup_api_key_masked=mask_api_key(config.backup_api_key),
        backup_base_url=config.backup_base_url,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("/test", response_model=LLMTestResponse)
def test_llm_provider(
    payload: LLMTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_key_to_use = payload.api_key
    base_url_to_use = payload.base_url

    if not api_key_to_use:
        config = db.query(LLMProviderConfig).filter(LLMProviderConfig.user_id == current_user.id).first()
        if config:
            if config.primary_provider == payload.provider and config.primary_api_key:
                api_key_to_use = config.primary_api_key
                if not base_url_to_use:
                    base_url_to_use = config.primary_base_url
            elif config.backup_provider == payload.provider and config.backup_api_key:
                api_key_to_use = config.backup_api_key
                if not base_url_to_use:
                    base_url_to_use = config.backup_base_url

    clean_key = (api_key_to_use or "").strip().strip("'\"")
    if clean_key.lower().startswith("bearer "):
        clean_key = clean_key[7:].strip()

    if payload.provider != "ollama" and not clean_key:
        return LLMTestResponse(
            success=False,
            provider=payload.provider,
            model=payload.model,
            latency_ms=0.0,
            response=None,
            error=f"No API key provided for {payload.provider}. Please enter your {payload.provider.upper()} API key in the 'Primary API Key' field before testing.",
        )

    success, latency, resp, err = llm_gateway.test_connection(
        provider=payload.provider,
        model=payload.model,
        api_key=clean_key,
        base_url=base_url_to_use,
    )
    return LLMTestResponse(
        success=success,
        provider=payload.provider,
        model=payload.model,
        latency_ms=round(latency, 2),
        response=resp,
        error=err,
    )

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/johnfabric"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    asset_base_path: str = "./assets"
    render_base_path: str = "./renders"
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    use_s3: bool = False
    frontend_url: str = "http://localhost:3000"
    render_serve_base_url: str = "http://localhost:8000/renders"

    @property
    def asset_path(self) -> Path:
        return Path(self.asset_base_path)

    @property
    def render_path(self) -> Path:
        return Path(self.render_base_path)


settings = Settings()

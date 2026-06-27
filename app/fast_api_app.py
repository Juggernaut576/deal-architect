# ruff: noqa: E402
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import os

import google.auth
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback

setup_telemetry()

# Load .env file
from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "mock-project")
else:
    try:
        _, project_id = google.auth.default()
    except Exception:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "mock-project")

try:
    logging_client = google_cloud_logging.Client()
    logger = logging_client.logger(__name__)
except Exception:
    import logging

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.log_struct = lambda data, severity="INFO": logging.info(
        f"Feedback log: {data} ({severity})"
    )
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# In-memory session configuration - no persistent storage
session_service_uri = None

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=False,
    artifact_service_uri=artifact_service_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    otel_to_cloud=False,
)
app.title = "deal-architect"
app.description = "API for interacting with the Agent deal-architect"


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


# Mount premium static front-end assets
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

static_path = os.path.join(AGENT_DIR, "app", "static")
os.makedirs(static_path, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/")
def serve_dashboard_root():
    """Serve the premium glassmorphic dashboard at root."""
    return FileResponse(os.path.join(static_path, "index.html"))


@app.get("/dashboard")
def get_dashboard():
    """Serve the premium glassmorphic dashboard."""
    return FileResponse(os.path.join(static_path, "index.html"))


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

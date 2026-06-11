from pathlib import Path
import traceback

import uvicorn


LOG_PATH = Path(__file__).resolve().parent.parent.parent / "backend-launch.log"


try:
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        log_level="info",
    )
except Exception:
    LOG_PATH.write_text(traceback.format_exc(), encoding="utf-8")
    raise

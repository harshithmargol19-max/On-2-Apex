import os
import re
import shutil
import subprocess
import tempfile
from typing import Any, Dict, Optional, Tuple
from app.core.errors import AppException
from app.core.logging import logger


class PdfCompilerService:
    def is_pdflatex_available(self) -> bool:
        return shutil.which("pdflatex") is not None

    def get_compiler_info(self) -> Dict[str, Any]:
        available = self.is_pdflatex_available()
        version_str: Optional[str] = None
        if available:
            try:
                res = subprocess.run(
                    ["pdflatex", "--version"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=5,
                )
                first_line = res.stdout.splitlines()[0] if res.stdout else ""
                version_str = first_line.strip() or "pdflatex"
            except Exception:
                version_str = "pdflatex"

        return {
            "available": available,
            "engine": "pdflatex",
            "version": version_str,
            "instructions": (
                "To enable automatic LaTeX PDF compilation, install MiKTeX or TeX Live "
                "and ensure 'pdflatex' is present in your system PATH."
                if not available
                else None
            ),
        }

    def compile_latex_to_pdf(self, latex_source: str, job_name: str = "resume") -> bytes:
        if not self.is_pdflatex_available():
            raise AppException(
                message="pdflatex compiler is not installed or discoverable in system PATH.",
                code="PDFLATEX_NOT_INSTALLED",
                status_code=503,
                details={
                    "engine": "pdflatex",
                    "solution": "Install MiKTeX (Windows) or TeX Live and ensure pdflatex is in system PATH.",
                },
            )

        safe_job_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", job_name).strip("_") or "resume"

        with tempfile.TemporaryDirectory() as tmp_dir:
            tex_file_path = os.path.join(tmp_dir, f"{safe_job_name}.tex")
            pdf_file_path = os.path.join(tmp_dir, f"{safe_job_name}.pdf")
            log_file_path = os.path.join(tmp_dir, f"{safe_job_name}.log")

            with open(tex_file_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(latex_source)

            try:
                proc = subprocess.run(
                    [
                        "pdflatex",
                        "-interaction=nonstopmode",
                        "-halt-on-error",
                        f"{safe_job_name}.tex",
                    ],
                    cwd=tmp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30,
                )
            except subprocess.TimeoutExpired:
                raise AppException(
                    message="pdflatex compilation timed out after 30 seconds.",
                    code="LATEX_COMPILATION_TIMEOUT",
                    status_code=504,
                )
            except Exception as exc:
                raise AppException(
                    message=f"Failed to execute pdflatex: {str(exc)}",
                    code="LATEX_EXECUTION_FAILED",
                    status_code=500,
                )

            if os.path.exists(pdf_file_path) and os.path.getsize(pdf_file_path) > 0:
                with open(pdf_file_path, "rb") as pdf_file:
                    return pdf_file.read()

            log_snippet = ""
            if os.path.exists(log_file_path):
                try:
                    with open(log_file_path, "r", encoding="utf-8", errors="replace") as lf:
                        lines = lf.readlines()
                        error_lines = [l.strip() for l in lines if l.startswith("!") or "Error" in l]
                        log_snippet = "\n".join(error_lines[:10]) if error_lines else "".join(lines[-25:])
                except Exception:
                    pass

            raise AppException(
                message="LaTeX document compilation failed.",
                code="LATEX_COMPILATION_ERROR",
                status_code=422,
                details={
                    "returncode": proc.returncode,
                    "log_snippet": log_snippet or proc.stdout.decode("utf-8", errors="replace")[-500:],
                },
            )


pdf_compiler = PdfCompilerService()

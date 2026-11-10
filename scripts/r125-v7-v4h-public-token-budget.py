#!/usr/bin/env python3
"""PUBLIC Qwen3 tokenizer-only budget check. Never load model weights or Ollama."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from urllib.request import Request, urlopen

URL = ("https://huggingface.co/Qwen/Qwen3-14B/resolve/"
       "c321b93f1a796e6c92322019caa857d961b089eb/tokenizer.json")
EXPECTED_SHA = "aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4"
MAX_SIZE = 16 * 1024 * 1024
CHAT_MARGIN = 64
OUTPUT_MARGIN = 16

def download_official_tokenizer(file):
    digest = hashlib.sha256()
    count = 0
    request = Request(URL, headers={"User-Agent":"MAB-Public-Token-Budget-Audit"})
    with urlopen(request, timeout=40) as src, file.open("wb") as dst:
        while True:
            block = src.read(65536)
            if not block:
                break
            count += len(block)
            if count > MAX_SIZE:
                raise ValueError("TOKENIZER_DOWNLOAD_SIZE_LIMIT")
            digest.update(block)
            dst.write(block)
    if count < 1000000 or digest.hexdigest() != EXPECTED_SHA:
        raise ValueError("PINNED_PUBLIC_TOKENIZER_SHA256_MISMATCH")
    return count

def audit(input_path):
    from tokenizers import Tokenizer
    data = json.loads(Path(input_path).read_text(encoding="utf-8"))
    if data.get("schema") != "r125-v7-v4h-public-token-input-v1":
        raise ValueError("INPUT_SCHEMA_MISMATCH")
    if data.get("provenance") != "PUBLIC_SYNTHETIC_NOT_REAL_QWEN":
        raise ValueError("WRONG_PROVENANCE")
    if (data.get("num_ctx"), data.get("num_predict")) != (2048, 1024):
        raise ValueError("PROTECTED_INFERENCE_LIMIT_CHANGED")
    if data.get("modelCalls") != 0 or data.get("worldWrites") != 0:
        raise ValueError("NOT_READ_ONLY")
    samples = data.get("samples")
    if not isinstance(samples, list) or len(samples) != 5:
        raise ValueError("SAMPLES_MISSING")
    with tempfile.TemporaryDirectory(prefix="mab-public-tokenizer-") as temp:
        target = Path(temp) / "tokenizer.json"
        size = download_official_tokenizer(target)
        tokenizer = Tokenizer.from_file(str(target))
        def count(text):
            if not isinstance(text, str):
                raise ValueError("INPUT_TEXT_INVALID")
            return len(tokenizer.encode(text, add_special_tokens=False).ids)
        # Public Qwen3 ChatML framing. Installed Ollama template is NOT proven.
        framed = ("<|im_start|>system\n" + data["prompt"] +
                  "<|im_end|>\n<|im_start|>user\n" + data["brief"] +
                  "<|im_end|>\n<|im_start|>assistant\n")
        input_tokens = count(framed)
        measurements = []
        for case in samples:
            raw = case["json"]
            if json.loads(raw).get("schema") != "minecraftaibuilder-r125-v4h-mezzanine-author-v1":
                raise ValueError("NOT_V4H_AUTHOR_JSON")
            output_tokens = count(raw)
            measurements.append({
                "genre": case["genre"], "jsonUtf8Bytes": len(raw.encode("utf-8")),
                "jsonTokens": output_tokens,
                "expectedOutputFits": output_tokens + OUTPUT_MARGIN <= 1024,
                "combinedExampleFits": input_tokens + output_tokens + CHAT_MARGIN <= 2048,
            })
        complete_output_window = input_tokens + 1024 + CHAT_MARGIN <= 2048
        fit = complete_output_window and all(
            row["expectedOutputFits"] and row["combinedExampleFits"]
            for row in measurements
        )
        report = {
            "status": "PUBLIC_TOKEN_SAMPLE_BUDGET_FITS" if fit else "HOLD_TOKEN_SAMPLE_BUDGET",
            "source": "Qwen/Qwen3-14B official public tokenizer.json",
            "sha256": EXPECTED_SHA,
            "tokenizerBytes": size,
            "systemPromptBytes": len(data["prompt"].encode("utf-8")),
            "chatMLInputTokens": input_tokens,
            "numCtx": 2048, "numPredict": 1024, "reservedTemplateTokens": CHAT_MARGIN,
            "wholeConfiguredOutputWindowFits": complete_output_window,
            "cases": measurements,
            "realOllamaGGUFTemplateAttested": False,
            "realModelResponsesTested": 0,
            "privateArtifactsAccessed": 0,
            "minecraftWorldWrites": 0,
            "grantsModelExecutionApproval": False,
        }
        print("V7_V4H_PUBLIC_TOKEN_BUDGET " + json.dumps(report,sort_keys=True),flush=True)
        if not fit:
            raise ValueError("TOKEN_BUDGET_NOT_PROVEN_NO_MODEL_EXECUTION")
        return report

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("NEED_ONE_PUBLIC_INPUT_FILE")
        audit(sys.argv[1])
    except Exception as exc:
        print("V7_V4H_PUBLIC_TOKEN_BUDGET_HOLD " + str(exc),file=sys.stderr)
        sys.exit(2)

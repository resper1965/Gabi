#!/usr/bin/env python3
"""
Fetch full regulatory texts from official Brazilian government sources.
Outputs clean .txt files to api/seeds/regulatory/
"""

import os
import re
import sys
import html
import urllib.request

SEEDS_DIR = os.path.join(os.path.dirname(__file__), "..", "api", "seeds", "regulatory")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# ── Sources ──
SOURCES = {
    "lgpd": {
        "lgpd_13709_2018": {
            "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
            "title": "LEI GERAL DE PROTEÇÃO DE DADOS PESSOAIS (LGPD)\nLei nº 13.709, de 14 de agosto de 2018",
        },
        "cdc_8078_1990": {
            "url": "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
            "title": "CÓDIGO DE DEFESA DO CONSUMIDOR\nLei nº 8.078, de 11 de setembro de 1990",
        },
    },
    "ans": {
        "lei_9656_1998_planos_saude": {
            "url": "https://www.planalto.gov.br/ccivil_03/leis/l9656.htm",
            "title": "LEI DOS PLANOS DE SAÚDE\nLei nº 9.656, de 3 de junho de 1998",
        },
        "rn_465_2021_rol_procedimentos": {
            "url": "https://www.ans.gov.br/component/legislacao/?view=legislacao&task=TextoLei&format=raw&id=NDAyMQ==",
            "title": "RESOLUÇÃO NORMATIVA Nº 465, DE 24 DE FEVEREIRO DE 2021\nAtualiza o Rol de Procedimentos e Eventos em Saúde",
            "fallback_url": "https://www.in.gov.br/en/web/dou/-/resolucao-normativa-rn-n-465-de-24-de-fevereiro-de-2021-305523992",
        },
        "rn_259_2011_prazos_atendimento": {
            "url": "https://www.ans.gov.br/component/legislacao/?view=legislacao&task=TextoLei&format=raw&id=MTc4Mg==",
            "title": "RESOLUÇÃO NORMATIVA Nº 259, DE 17 DE JUNHO DE 2011\nDispõe sobre a garantia de atendimento dos beneficiários de plano privado de assistência à saúde",
            "fallback_url": "https://www.in.gov.br/en/web/dou/-/resolucao-normativa-rn-n-259-de-17-de-junho-de-2011-224180024",
        },
    },
    "bacen": {
        "resolucao_4893_seguranca_cibernetica": {
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=85",
            "title": "RESOLUÇÃO BCB Nº 85 (ex-4.893), DE 8 DE ABRIL DE 2021\nDispõe sobre a política de segurança cibernética e requisitos para contratação de serviços de processamento e armazenamento de dados",
        },
        "resolucao_4658_open_finance": {
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=32",
            "title": "RESOLUÇÃO BCB Nº 32 (ex-4.658), DE 29 DE OUTUBRO DE 2020\nDispõe sobre a política de segurança cibernética e sobre requisitos para a contratação de serviços de processamento e armazenamento de dados",
        },
        "resolucao_cmn_4966_instrumentos_financeiros": {
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4966",
            "title": "RESOLUÇÃO CMN Nº 4.966, DE 25 DE NOVEMBRO DE 2021\nDispõe sobre os conceitos e os critérios contábeis aplicáveis a instrumentos financeiros",
        },
    },
    "cvm": {
        "resolucao_175_fundos": {
            "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/resol175.html",
            "title": "RESOLUÇÃO CVM Nº 175, DE 23 DE DEZEMBRO DE 2022\nDispõe sobre a constituição, o funcionamento, a transparência, a publicidade e a distribuição de cotas dos fundos de investimento",
        },
        "resolucao_80_emissores": {
            "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/resol080.html",
            "title": "RESOLUÇÃO CVM Nº 80, DE 29 DE MARÇO DE 2022\nDispõe sobre o registro e a prestação de informações periódicas e eventuais dos emissores de valores mobiliários",
        },
    },
    "susep": {
        "circular_648_seguranca_cibernetica": {
            "url": "https://www.in.gov.br/en/web/dou/-/circular-susep-n-648-de-28-de-outubro-de-2022-439018377",
            "title": "CIRCULAR SUSEP Nº 648, DE 28 DE OUTUBRO DE 2022\nDispõe sobre requisitos de segurança cibernética a serem observados pelas sociedades seguradoras",
        },
        "circular_637_seguros_pessoas": {
            "url": "https://www.in.gov.br/en/web/dou/-/circular-susep-n-637-de-21-de-julho-de-2021-334399668",
            "title": "CIRCULAR SUSEP Nº 637, DE 21 DE JULHO DE 2021\nDispõe sobre seguros de pessoas e planos de previdência complementar aberta",
        },
    },
}


def fetch_url(url: str, encoding: str = "latin-1") -> str:
    """Fetch URL content with proper encoding."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            # Try to detect encoding from content-type
            ct = resp.headers.get("Content-Type", "")
            if "charset=" in ct:
                enc = ct.split("charset=")[-1].strip().split(";")[0]
            else:
                enc = encoding
            try:
                return raw.decode(enc)
            except (UnicodeDecodeError, LookupError):
                return raw.decode("latin-1", errors="replace")
    except Exception as e:
        print(f"  ⚠️  Error fetching {url}: {e}")
        return ""


def html_to_text(raw_html: str) -> str:
    """Convert HTML to clean text."""
    # Remove style and script blocks
    text = re.sub(r"<style[^>]*>.*?</style>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)

    # Replace common block elements with newlines
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|h[1-6]|li|tr|dt|dd|blockquote)>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(p|div|h[1-6]|li|tr|dt|dd|blockquote)[^>]*>", "", text, flags=re.IGNORECASE)

    # Remove remaining tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Decode HTML entities
    text = html.unescape(text)

    # Clean up whitespace
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        # Collapse multiple spaces
        line = re.sub(r"\s+", " ", line)
        if line:
            lines.append(line)

    # Collapse multiple blank lines
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def clean_legal_text(text: str) -> str:
    """Extra cleaning for legal texts — remove navigation, headers, footers."""
    # Remove common Planalto navigation text
    patterns_to_remove = [
        r"Presidência da República\s*Secretaria-Geral\s*Subchefia para Assuntos Jurídicos",
        r"Presidência da República\s*Casa Civil\s*Subchefia para Assuntos Jurídicos",
        r"Texto compilado",
        r"Mensagem de veto",
        r"Vigência\s*$",
        r"Produção de efeito",
        r"Promulgação partes vetadas",
        r"Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:",
        r"Faço saber que o Congresso Nacional decreta e eu promulgo.*?seguinte Lei:",
        r"O PRESIDENTE DA REPÚBLICA",
        r"Brasília,?\s*\d{1,2}\s*de\s*\w+\s*de\s*\d{4}.*$",
        r"Este texto não substitui o publicado no DOU.*$",
        r"Este texto não substitui o publicado no D\.O\.U\..*$",
        r"\*\s*$",
    ]
    for p in patterns_to_remove:
        text = re.sub(p, "", text, flags=re.MULTILINE | re.IGNORECASE)

    return text.strip()


def process_source(pack_id: str, file_id: str, info: dict) -> bool:
    """Fetch, clean, and save a regulatory text."""
    outdir = os.path.join(SEEDS_DIR, pack_id)
    os.makedirs(outdir, exist_ok=True)
    outpath = os.path.join(outdir, f"{file_id}.txt")

    print(f"\n📄 {pack_id}/{file_id}")
    print(f"   URL: {info['url']}")

    raw_html = fetch_url(info["url"])
    if not raw_html and "fallback_url" in info:
        print(f"   Trying fallback: {info['fallback_url']}")
        raw_html = fetch_url(info["fallback_url"])

    if not raw_html:
        print(f"   ❌ Could not fetch content")
        return False

    text = html_to_text(raw_html)
    text = clean_legal_text(text)

    # Prepend title header
    full_text = f"{info['title']}\n\n{'=' * 60}\n\n{text}"

    # Write
    with open(outpath, "w", encoding="utf-8") as f:
        f.write(full_text)

    size_kb = len(full_text.encode("utf-8")) / 1024
    lines = full_text.count("\n") + 1
    print(f"   ✅ Saved: {lines} lines, {size_kb:.1f} KB")
    return True


def main():
    print("=" * 60)
    print("  Gabi Hub — Regulatory Text Fetcher")
    print("=" * 60)

    total = 0
    success = 0

    for pack_id, files in SOURCES.items():
        print(f"\n{'─' * 40}")
        print(f"📦 Pack: {pack_id.upper()}")
        for file_id, info in files.items():
            total += 1
            if process_source(pack_id, file_id, info):
                success += 1

    print(f"\n{'=' * 60}")
    print(f"  Done: {success}/{total} files fetched")
    print("=" * 60)

    # Show summary
    print("\n📊 Summary:")
    for pack_id in SOURCES:
        pack_dir = os.path.join(SEEDS_DIR, pack_id)
        if os.path.exists(pack_dir):
            files = [f for f in os.listdir(pack_dir) if f.endswith(".txt")]
            total_size = sum(os.path.getsize(os.path.join(pack_dir, f)) for f in files)
            print(f"  {pack_id}: {len(files)} files, {total_size/1024:.1f} KB total")


if __name__ == "__main__":
    main()

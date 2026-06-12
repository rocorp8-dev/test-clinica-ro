#!/bin/bash

# =============================================================
#  🧪 QA ENGINE — RoSaas Factory
#  Orquestador principal: corre tests E2E + UX + genera reporte
#  Uso: ./scripts/qa-engine.sh [--url URL] [--open]
# =============================================================

set -e

# ── Colores ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." &> /dev/null && pwd )"
PROJECT_NAME=$(basename "$PROJECT_DIR")
QA_BASE_URL="${QA_BASE_URL:-http://localhost:3009}"
OPEN_REPORT=false
SKIP_SERVER=false
ONLY_SUITE=""

# ── Args ──────────────────────────────────────────────────────────────────────
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --url) QA_BASE_URL="$2"; shift ;;
        --open) OPEN_REPORT=true ;;
        --no-server) SKIP_SERVER=true ;;
        --only) ONLY_SUITE="$2"; shift ;;
        *) echo "Arg desconocido: $1" ;;
    esac
    shift
done

export QA_BASE_URL

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║     🧪 RoSaas QA Engine v1.0                ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Proyecto:${NC} ${CYAN}${PROJECT_NAME}${NC}"
echo -e "  ${BOLD}URL:${NC}      ${CYAN}${QA_BASE_URL}${NC}"
echo -e "  ${BOLD}Fecha:${NC}    $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ── Crear directorio de reportes ─────────────────────────────────────────────
mkdir -p "$PROJECT_DIR/qa-reports"

# ── Verificar dependencias ────────────────────────────────────────────────────
echo -e "${YELLOW}▶ Verificando dependencias...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no encontrado${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/node_modules/.bin/playwright" ]; then
    echo -e "${YELLOW}  Instalando dependencias QA...${NC}"
    cd "$PROJECT_DIR" && npm install --save-dev @playwright/test @axe-core/playwright 2>/dev/null
    npx playwright install chromium --with-deps 2>/dev/null || true
fi

echo -e "${GREEN}  ✓ Dependencias OK${NC}"

# ── Verificar que el servidor está corriendo ──────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Verificando servidor en ${QA_BASE_URL}...${NC}"

SERVER_STARTED=false
if ! curl -s --max-time 3 "${QA_BASE_URL}" > /dev/null 2>&1; then
    if [ "$SKIP_SERVER" = false ]; then
        echo -e "${YELLOW}  Servidor no detectado. Iniciando npm run dev...${NC}"
        cd "$PROJECT_DIR"
        npm run dev -- --port 3009 &> /tmp/qa-dev-server.log &
        DEV_SERVER_PID=$!
        SERVER_STARTED=true

        # Esperar hasta 30 segundos que el servidor levante
        echo -n "  Esperando"
        for i in {1..30}; do
            sleep 1
            echo -n "."
            if curl -s --max-time 2 "${QA_BASE_URL}" > /dev/null 2>&1; then
                echo ""
                echo -e "${GREEN}  ✓ Servidor listo (${i}s)${NC}"
                break
            fi
            if [ $i -eq 30 ]; then
                echo ""
                echo -e "${RED}  ❌ Timeout: el servidor no respondió en 30s${NC}"
                echo -e "${YELLOW}  Tip: corre 'npm run dev' manualmente y usa --no-server${NC}"
                kill $DEV_SERVER_PID 2>/dev/null || true
                exit 1
            fi
        done
    else
        echo -e "${RED}  ❌ Servidor no disponible en ${QA_BASE_URL}${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  ✓ Servidor detectado OK${NC}"
fi

# ── Correr tests Playwright ───────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Ejecutando suite de tests E2E + UX...${NC}"
echo ""

cd "$PROJECT_DIR"

EXIT_CODE=0

if [ -n "$ONLY_SUITE" ]; then
    # Correr solo un spec específico
    npx playwright test "tests/${ONLY_SUITE}.spec.ts" \
        2>&1 || EXIT_CODE=$?
else
    # Correr todos los specs en orden lógico
    npx playwright test \
        tests/auth.spec.ts \
        tests/happy-path.spec.ts \
        tests/forms.spec.ts \
        tests/temporal.spec.ts \
        tests/mobile.spec.ts \
        tests/ux-audit.spec.ts \
        2>&1 || EXIT_CODE=$?
fi

# ── Generar dashboard HTML ────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Generando dashboard de reporte...${NC}"

if [ -f "$PROJECT_DIR/qa-reports/results.json" ]; then
    node "$PROJECT_DIR/scripts/qa-report.js" \
        "$PROJECT_DIR/qa-reports/results.json" \
        "$PROJECT_NAME" || true

    REPORT_PATH="$PROJECT_DIR/qa-reports/dashboard.html"
    echo -e "${GREEN}  ✓ Dashboard HTML generado${NC}"

    # Abrir reporte en browser si --open
    if [ "$OPEN_REPORT" = true ] && [ -f "$REPORT_PATH" ]; then
        echo -e "${CYAN}  Abriendo reporte en browser...${NC}"
        open "$REPORT_PATH" 2>/dev/null || xdg-open "$REPORT_PATH" 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}  ⚠️  No se encontró results.json — skipping dashboard${NC}"
fi

# ── Notificación Telegram (opcional) ─────────────────────────────────────────
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo ""
    echo -e "${YELLOW}▶ Enviando resumen a Telegram...${NC}"

    # Parsear el score del results.json
    if [ -f "$PROJECT_DIR/qa-reports/results.json" ]; then
        PASS=$(node -e "const r=require('./qa-reports/results.json'); const all=[]; function walk(s){s.forEach(suite=>{(suite.specs||[]).forEach(t=>{const st=t.tests?.[0]?.results?.[0]?.status;if(st)all.push(st)});if(suite.suites)walk(suite.suites)}); walk(r.suites||[]); console.log(all.filter(s=>s==='passed').length)" 2>/dev/null || echo "?")
        FAIL=$(node -e "const r=require('./qa-reports/results.json'); const all=[]; function walk(s){s.forEach(suite=>{(suite.specs||[]).forEach(t=>{const st=t.tests?.[0]?.results?.[0]?.status;if(st)all.push(st)});if(suite.suites)walk(suite.suites)}); walk(r.suites||[]); console.log(all.filter(s=>s==='failed').length)" 2>/dev/null || echo "?")

        EMOJI="✅"
        VERDICT="APROBADO"
        if [ "$EXIT_CODE" != "0" ]; then
            EMOJI="❌"
            VERDICT="FALLÓ"
        fi

        MSG="${EMOJI} *QA Report — ${PROJECT_NAME}*
Fecha: $(date '+%Y-%m-%d %H:%M')
Tests: ✅ ${PASS} pasaron | ❌ ${FAIL} fallaron
Veredicto: *${VERDICT}*"

        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"${MSG}\",\"parse_mode\":\"Markdown\"}" \
            > /dev/null 2>&1

        echo -e "${GREEN}  ✓ Notificación Telegram enviada${NC}"
    fi
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
if [ "$SERVER_STARTED" = true ]; then
    echo ""
    echo -e "${YELLOW}▶ Deteniendo servidor de desarrollo...${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}  ✓ Servidor detenido${NC}"
fi

# ── Resultado final ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "  ${BOLD}${GREEN}🎉 QA APROBADO — Listo para deploy${NC}"
else
    echo -e "  ${BOLD}${RED}❌ QA FALLÓ — Corrige los errores antes de deployar${NC}"
fi
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $EXIT_CODE

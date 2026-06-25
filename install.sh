#!/usr/bin/env bash
#
# Installer for the Token Extensions Architect skill (Claude Code / Codex).
# Copies the skill/ folder to ~/.claude/skills/token-extensions so the agent
# can progressively load it. Idempotent: re-running cleanly replaces the install.
#
set -euo pipefail

# --- config ---------------------------------------------------------------
SKILL_NAME="token-extensions"
CLAUDE_DIR="${HOME}/.claude"
SKILLS_DIR="${CLAUDE_DIR}/skills"
TARGET_DIR="${SKILLS_DIR}/${SKILL_NAME}"
AGENTS_DIR="${CLAUDE_DIR}/agents"
COMMANDS_DIR="${CLAUDE_DIR}/commands"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/skill"

SKIP_CONFIRM=false

# --- colors ---------------------------------------------------------------
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"; DIM="$(printf '\033[2m')"
  GREEN="$(printf '\033[32m')"; YELLOW="$(printf '\033[33m')"; RESET="$(printf '\033[0m')"
else
  BOLD=""; DIM=""; GREEN=""; YELLOW=""; RESET=""
fi

print_help() {
  cat <<EOF
${BOLD}Token Extensions Architect — installer${RESET}

Installs the skill to ${TARGET_DIR}

Usage: ./install.sh [options]

Options:
  -y, --yes     Skip the confirmation prompt
  -h, --help    Show this help
EOF
}

# --- args -----------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    -y|--yes)  SKIP_CONFIRM=true; shift ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "Unknown option: $1" >&2; print_help; exit 1 ;;
  esac
done

# --- sanity check ---------------------------------------------------------
if [ ! -f "${SOURCE_DIR}/SKILL.md" ]; then
  echo "${YELLOW}Error:${RESET} could not find skill/SKILL.md next to this script." >&2
  echo "Run install.sh from inside the cloned repository." >&2
  exit 1
fi

echo "${BOLD}Token Extensions Architect${RESET}"
echo "${DIM}Modern SPL Token-2022 guidance for Claude Code / Codex.${RESET}"
echo
echo "  Source: ${SOURCE_DIR}"
echo "  Target: ${TARGET_DIR}"
echo

# --- confirm --------------------------------------------------------------
if [ "${SKIP_CONFIRM}" != "true" ]; then
  printf "Proceed with installation? [Y/n] "
  read -r REPLY
  if [[ "${REPLY}" =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

# --- install --------------------------------------------------------------
mkdir -p "${SKILLS_DIR}"
rm -rf "${TARGET_DIR}"                 # idempotent: clean replace
mkdir -p "${TARGET_DIR}"
cp -R "${SOURCE_DIR}/." "${TARGET_DIR}/"
echo "${GREEN}✓${RESET} skill   → ${TARGET_DIR}"

# Optional companion agent (one specialist over the skill).
if [ -f "${SCRIPT_DIR}/agents/token-extensions-architect.md" ]; then
  mkdir -p "${AGENTS_DIR}"
  cp "${SCRIPT_DIR}/agents/token-extensions-architect.md" "${AGENTS_DIR}/"
  echo "${GREEN}✓${RESET} agent   → ${AGENTS_DIR}/token-extensions-architect.md"
fi

# Optional companion command (/design-token).
if [ -f "${SCRIPT_DIR}/commands/design-token.md" ]; then
  mkdir -p "${COMMANDS_DIR}"
  cp "${SCRIPT_DIR}/commands/design-token.md" "${COMMANDS_DIR}/"
  echo "${GREEN}✓${RESET} command → ${COMMANDS_DIR}/design-token.md  (/design-token)"
fi

echo
echo "${GREEN}✓ Installed.${RESET}"
echo
echo "Try asking your agent:"
echo "  ${DIM}\"Design a KYC-gated stablecoin with Token Extensions\"${RESET}"
echo "  ${DIM}\"Add a 1% transfer fee to a new Token-2022 mint using @solana/kit\"${RESET}"
echo "  ${DIM}\"Should I use a transfer hook or confidential transfers for private payroll?\"${RESET}"

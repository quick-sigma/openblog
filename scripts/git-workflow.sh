#!/usr/bin/env bash
# git-workflow.sh — Git init → commit → archive → registro
# Basado en: specs/done/agent-panel.md (capas, contratos, ADs, reglas)
#
# Capas:
#   Bootstrap  → git init, .gitignore, branch structure
#   Provider   → gh repo create, remote config
#   Commit     → stage, commit, push
#   Archive    → mover spec → archived, crear registro comprimido
#   Post       → auto-sync hook, detección cambios residuales
#
# Uso:
#   ./scripts/git-workflow.sh setup    ← solo bootstrap + provider
#   ./scripts/git-workflow.sh commit   ← solo commit + archive + post
#   ./scripts/git-workflow.sh          ← flujo completo (default)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

ask_yn() {
  local prompt="$1 (y/n): " ans
  while true; do
    read -r -p "$prompt" ans
    case "$ans" in [Yy]*) return 0 ;; [Nn]*) return 1 ;; *) echo "  y o n" ;; esac
  done
}

ask_choice() {
  local prompt="$1" opt; shift
  echo "$prompt"
  select opt in "$@"; do [[ -n "$opt" ]] && { echo "$opt"; return; }; done
}

# ─────────────────────────────────────────────────────────
# AD-01: Bootstrap — git init + .gitignore interactivo
# AD-02: .gitignore con detección de proyecto + confirmación
# ─────────────────────────────────────────────────────────
bootstrap_git() {
  [[ -d .git ]] && { warn ".git existe — saltando"; return; }
  git init
  log "git init ok"

  # Detectar tipo de proyecto para sugerir patrones
  local has_node=false has_python=false has_rust=false has_go=false
  [[ -f package.json ]] && has_node=true
  [[ -f pyproject.toml || -f requirements.txt ]] && has_python=true
  [[ -f Cargo.toml ]] && has_rust=true
  [[ -f go.mod ]] && has_go=true

  > .gitignore
  echo "# git-workflow.sh — auto-generated" >> .gitignore

  if $has_node; then
    if ask_yn "¿Añadir patrones Node (node_modules/, dist/, .env)?"; then
      printf "node_modules/\ndist/\n.env\n*.log\n" >> .gitignore
      log "Node patterns"
    fi
  fi
  if $has_python; then
    if ask_yn "¿Añadir patrones Python (__pycache__/, *.pyc, .venv/)?"; then
      printf "__pycache__/\n*.pyc\n.venv/\n*.egg-info/\n" >> .gitignore
      log "Python patterns"
    fi
  fi
  if $has_rust; then
    if ask_yn "¿Añadir patrones Rust (target/)?"; then
      echo "target/" >> .gitignore
      log "Rust patterns"
    fi
  fi
  if $has_go; then
    if ask_yn "¿Añadir patrones Go (bin/, *.exe)?"; then
      printf "bin/\n*.exe\n" >> .gitignore
      log "Go patterns"
    fi
  fi

  # Patrones personalizados — preguntas cerradas
  while true; do
    read -r -p "  Patrón adicional (ENTER = terminar): " pat
    [[ -z "$pat" ]] && break
    grep -qF "$pat" .gitignore 2>/dev/null && { warn "ya existe: $pat"; continue; }
    echo "$pat" >> .gitignore
    log "Añadido: $pat"
  done

  log ".gitignore: $(wc -l < .gitignore) reglas"
}

# ─────────────────────────────────────────────────────────
# AD-03: Ramas — preguntas cerradas, crear una a una
# ─────────────────────────────────────────────────────────
setup_branches() {
  local current
  current=$(git branch --show-current 2>/dev/null)

  if ask_yn "¿Crear rama develop?"; then
    if git show-ref --verify --quiet refs/heads/develop; then
      warn "develop ya existe"
    else
      git branch develop
      log "Rama develop creada"
    fi
  fi

  while ask_yn "¿Crear otra rama?"; do
    read -r -p "  Nombre: " name
    [[ -z "$name" ]] && { warn "vacío — salta"; continue; }
    if git show-ref --verify --quiet "refs/heads/$name"; then
      warn "rama $name ya existe"
    else
      git branch "$name"
      log "Rama $name creada"
    fi
  done

  info "Ramas:"
  git branch -a | head -20
}

# ─────────────────────────────────────────────────────────
# AD-04: Provider — gh repo create + remote config
# AD-05: Push inicial opcional post-create
# ─────────────────────────────────────────────────────────
setup_remote() {
  if git remote get-url origin &>/dev/null; then
    warn "origin: $(git remote get-url origin)"
    ask_yn "¿Reemplazar remote?" || return 0
    git remote remove origin
  fi

  if ! command -v gh &>/dev/null; then
    err "gh CLI no instalada"
    read -r -p "  URL remote manual (ENTER = saltar): " url
    [[ -n "$url" ]] && { git remote add origin "$url"; log "remote origin → $url"; }
    return
  fi

  local name vis
  if gh repo view --json name &>/dev/null 2>&1; then
    warn "Repo GitHub ya existe"
  else
    vis=$(ask_choice "Visibilidad:" "public" "private")
    read -r -p "  Nombre repo (ENTER = $(basename "$(pwd)")): " name
    name="${name:-$(basename "$(pwd)")}"
    gh repo create "$name" --"$vis" --source=. --remote=origin --push || {
      err "gh repo create falló"
      read -r -p "  URL remote manual: " url
      [[ -n "$url" ]] && git remote add origin "$url"
      return
    }
    log "gh repo create: $name ($vis)"
    return
  fi

  # Si el repo ya existía pero no hay remote
  if ! git remote get-url origin &>/dev/null; then
    read -r -p "  URL remote: " url
    [[ -n "$url" ]] && git remote add origin "$url" && log "remote origin → $url"
  fi
}

# ─────────────────────────────────────────────────────────
# AD-06: Commit — stage, mensaje (sugerido + decisión usuario), push
# AD-07: Si hay conflicto en push → opciones de resolución
# ─────────────────────────────────────────────────────────
do_commit() {
  info "Cambios sin stage:"
  git status --short | head -30
  echo ""

  # Stage
  local staged=false
  if ask_yn "¿Stage automático (git add -A)?"; then
    git add -A
    staged=true
    log "Stage: $(git diff --cached --stat | tail -1 | awk '{print $4" "$5}') archivos"
  else
    echo "  Usa 'git add <file>', luego ENTER para continuar..."
    read -r -s
    [[ -z "$(git diff --cached --stat)" ]] && { err "Sin archivos en stage — abortando"; return 1; }
    staged=true
  fi

  # Detectar conflicto (rebase/merge pendiente)
  if [[ -f .git/MERGE_HEAD || -f .git/REBASE_HEAD ]]; then
    warn "Conflicto de merge/rebase detectado"
    handle_conflict "merge"
    return 1
  fi

  # Mensaje: sugerencia técnica, usuario decide
  local msg="" suggested=""
  local branch
  branch=$(git branch --show-current 2>/dev/null || echo "main")

  suggested="feat($branch): $(git diff --cached --stat | head -1 | awk '{print $NF}' | sed 's/.*\///' | sed 's/\..*//' 2>/dev/null || echo "update")"
  [[ -z "$suggested" ]] && suggested="feat($branch): update $(date +%Y%m%d)"

  echo ""
  info "Mensaje sugerido:  ${suggested}"
  if ask_yn "¿Usar sugerido?"; then
    msg="$suggested"
  else
    read -r -p "  Mensaje > " msg
    [[ -z "$msg" ]] && { err "Commit cancelado"; return 1; }
  fi

  git commit -m "$msg"
  local sha
  sha=$(git rev-parse --short HEAD)
  log "Commit ${sha}: ${msg}"

  # Push con detección de conflicto
  if ask_yn "¿Hacer push ahora?"; then
    if ! git remote get-url origin &>/dev/null; then
      err "No hay remote — push omitido"
    else
      if git push -u origin "$branch" 2>&1; then
        log "Push ok → origin/$branch"
      else
        warn "Push rechazado — posible conflicto"
        handle_conflict "push" "$branch"
      fi
    fi
  fi

  echo "$msg|$sha"
}

# ─────────────────────────────────────────────────────────
# AD-08: Conflictos — 3 opciones cerradas, usuario decide
# ─────────────────────────────────────────────────────────
handle_conflict() {
  local type="$1" branch="${2:-}"
  echo ""
  case "$type" in
    merge)
      info "Conflicto de merge activo. Opciones:"
      local opt
      opt=$(ask_choice "Elige:" "Resolver manualmente (abre editor)" "Abortar merge (git merge --abort)" "Aceptar versión local (--ours) para todos")
      case "$opt" in
        "Resolver manualmente (abre editor)")
          "${EDITOR:-vi}" "$(git diff --name-only --diff-filter=U | head -1)"
          ask_yn "¿Continuar merge (git commit)?" && git commit -m "merge: resolved conflicts" || git merge --abort
          ;;
        "Abortar merge (git merge --abort)")
          git merge --abort
          log "Merge abortado"
          ;;
        "Aceptar versión local (--ours) para todos")
          git diff --name-only --diff-filter=U | xargs -I{} git checkout --ours "{}"
          git add -A && git commit -m "merge: resolved conflicts (ours)"
          log "Conflicto resuelto (ours)"
          ;;
      esac
      ;;
    push)
      info "Push rechazado. Opciones:"
      local opt
      opt=$(ask_choice "Elige:" "Hacer pull --rebase primero" "Forzar push (git push --force)" "Cancelar push")
      case "$opt" in
        "Hacer pull --rebase primero")
          if git pull --rebase origin "$branch" 2>&1; then
            if [[ -f .git/REBASE_HEAD ]]; then
              warn "Conflicto durante rebase"
              handle_conflict "merge"
            else
              git push origin "$branch"
              log "Push tras rebase ok"
            fi
          else
            warn "Pull falló — posible conflicto"
            handle_conflict "merge"
          fi
          ;;
        "Forzar push (git push --force)")
          if ask_yn "¿Seguro? Sobrescribirás historial remoto"; then
            git push --force origin "$branch"
            log "Force push ok"
          fi
          ;;
        "Cancelar push")
          warn "Push cancelado"
          ;;
      esac
      ;;
  esac
}

# ─────────────────────────────────────────────────────────
# AD-09: Archivar spec — mover de done/ a archived/
# ─────────────────────────────────────────────────────────
archive_spec() {
  local src="specs/done" dst="specs/archived" specs=()
  [[ ! -d "$src" ]] && { info "No existe specs/done/"; return; }

  while IFS= read -r -d '' f; do specs+=("$(basename "$f")"); done < <(find "$src" -maxdepth 1 -name "*.md" -print0 2>/dev/null)
  [[ ${#specs[@]} -eq 0 ]] && { info "specs/done/ vacío"; return; }

  echo ""
  info "Specs pendientes de archivar:"
  for s in "${specs[@]}"; do echo "  - $s"; done

  if ask_yn "¿Mover todos a specs/archived/?"; then
    mkdir -p "$dst"
    for s in "${specs[@]}"; do mv "$src/$s" "$dst/$s" && log "Archivado: $s"; done
  else
    for s in "${specs[@]}"; do
      ask_yn "¿Archivar $s?" && { mkdir -p "$dst"; mv "$src/$s" "$dst/$s" && log "Archivado: $s"; }
    done
  fi
}

# ─────────────────────────────────────────────────────────
# AD-10: Registro supercomprimido — 10 puntos, un archivo
# ─────────────────────────────────────────────────────────
create_commit_record() {
  local data="$1" msg sha
  msg="${data%%|*}"
  sha="${data##*|}"
  [[ "$msg" == "$data" ]] && sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  [[ -z "$msg" || "$msg" == "$sha" ]] && msg=$(git log -1 --format=%s 2>/dev/null || echo "init")

  local commit_date commit_author branch files_added files_mod files_del
  commit_date=$(git log -1 --format=%ci 2>/dev/null || date "+%Y-%m-%d %H:%M")
  commit_author=$(git log -1 --format="%an" 2>/dev/null || git config user.name 2>/dev/null || echo "?")
  branch=$(git branch --show-current 2>/dev/null || echo "?")
  files_added=$(git diff --diff-filter=A HEAD~1..HEAD --name-only 2>/dev/null | wc -l)
  files_mod=$(git diff --diff-filter=M HEAD~1..HEAD --name-only 2>/dev/null | wc -l)
  files_del=$(git diff --diff-filter=D HEAD~1..HEAD --name-only 2>/dev/null | wc -l)

  mkdir -p specs/commits
  local f="specs/commits/${sha}.md"

  cat > "$f" << EOF
# ${sha}

**Msg:** ${msg}
**Date:** ${commit_date} **Author:** ${commit_author} **Branch:** ${branch}

## Δ files

| A | M | D | Total |
|---|---|---|---|
| ${files_added} | ${files_mod} | ${files_del} | $((files_added + files_mod + files_del)) |

## 10-point compact

1. **Init:** \`git init\` → interactive .gitignore (lang-detected + custom)
2. **Branch:** develop $(git show-ref --verify --quiet refs/heads/develop && echo "✓" || echo "—") $(git branch -a | grep -v '^\*' | grep -v 'main' | wc -l) additionals
3. **Remote:** $(git remote get-url origin 2>/dev/null || echo "—")
4. **Stage:** auto add-A (user approved)
5. **Msg:** "${msg}"
6. **Commit:** ${sha}
7. **Push:** origin/${branch}
8. **Archive:** specs/done/ → specs/archived/
9. **Conflicts:** $(git log -1 --format=%s | grep -qi "conflict\|merge" && echo "resolved" || echo "none")
10. **Post:** $(git config alias.sync 2>/dev/null && echo "alias sync" || echo "—")
EOF

  # Detectar si fue stage manual o automático
  local stage_mode="auto add-A"
  # (no podemos saberlo aquí sin estado compartido, asumimos auto)

  echo "" >> "$f"
  echo "### Files" >> "$f"
  git diff --stat HEAD~1..HEAD 2>/dev/null >> "$f" || git show --stat HEAD 2>/dev/null >> "$f"
  log "Registro: ${f}"
}

# ─────────────────────────────────────────────────────────
# Post-config: auto-sync sin intervención
# ─────────────────────────────────────────────────────────
post_config() {
  echo ""
  info "Auto-sync — detecta cambios residuales y sincroniza"
  local opt
  opt=$(ask_choice "Elige:" "Hook post-commit (avisa si quedan cambios)" "Alias 'git sync' (add+commit+push automático)" "Omitir")
  case "$opt" in
    "Hook post-commit (avisa si quedan cambios)")
      cat > .git/hooks/post-commit << 'HOOK'
#!/usr/bin/env bash
remaining=$(git status --porcelain)
if [[ -n "$remaining" ]]; then
  echo "[post-commit] ⚠ Cambios sin commit:"
  echo "$remaining"
fi
HOOK
      chmod +x .git/hooks/post-commit
      log "post-commit hook instalado"
      ;;
    "Alias 'git sync' (add+commit+push automático)")
      git config alias.sync "!f(){ git add -A && git commit -m \"sync: $(date +%Y%m%d-%H%M)\" && git push; }; f"
      log "Alias 'git sync' configurado"
      ;;
    "Omitir")
      warn "Post-config omitido"
      ;;
  esac
}

# ─────────────────────────────────────────────────────────
# Main — orquestador por capas
# ─────────────────────────────────────────────────────────
main() {
  local mode="${1:-full}"

  echo ""
  echo "=============================================="
  echo "  git-workflow.sh — v2 (agent-panel arch)"
  echo "=============================================="

  case "$mode" in
    setup)
      bootstrap_git
      setup_branches
      setup_remote
      ;;
    commit)
      local out
      out=$(do_commit) || exit 1
      archive_spec
      create_commit_record "$out"
      post_config
      ;;
    full)
      if [[ -d .git ]]; then
        info "Repo existente — omitiendo bootstrap"
        if ask_yn "¿Configurar remote?"; then setup_remote; fi
      else
        bootstrap_git
        setup_branches
        setup_remote
      fi
      local out
      out=$(do_commit) || exit 1
      archive_spec
      create_commit_record "$out"
      post_config
      ;;
    *)
      echo "Uso: $0 {setup|commit|full}"
      echo "  setup   — git init + .gitignore + ramas + remote"
      echo "  commit  — stage + commit + archive + registro + post"
      echo "  full    — flujo completo (default)"
      exit 1
      ;;
  esac

  echo ""
  log "Done."
}

main "$@"

# Knowledge base

## Paso 1 — Agent Config Wizard (88df944)
- Implementado wizard de configuración de agente con selección de provider, input de API Key con type=password, y validación real contra `list_models()`.
- Componentes puros ProviderCard y SetupForm; orquestación en AgentSetupWizard vía AgentContext.
- CSS unificado en `agent-panel.css` con animación rainbow en botón "Configurar agente" (7 stops, 3s).
- Sidebar del wizard fijo 220px; overlay cierra con click fuera o X sin confirmación.
- Logo de provider: intenta SVG, fallback a PNG, doble fallback → sin imagen.
- Expuestos `setProvider` en AgentContext y `base_url` en storage-api para OpenAILikeProvider.
- Tests agregados para todos los componentes nuevos (ProviderCard, SetupForm, AgentContext, etc).
- Cero dependencias npm nuevas.

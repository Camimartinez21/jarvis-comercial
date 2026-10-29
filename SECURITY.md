# Seguridad — agente comercial de Cami

## Lo que la protege
| Control | Cómo |
|---|---|
| Solo Cami puede hablarle | `TELEGRAM_ALLOWED_USERS` con su ID y `unauthorized_dm_behavior: ignore` |
| Nada irreversible sin "sí" | AGENTS.md § 3–4; la puerta al Business OS no puede enviar, y los trabajos programados no tienen acciones irreversibles |
| No borra | `agente-api` no tiene borrado (solo deshacer lo que ella misma creó en 48 h) y registra todo en `agente_bitacora` |
| Datos personales | `agente-api` nunca devuelve correos ni teléfonos de personas; no viajan a DeepSeek |
| Solo sus 3 negocios | `agente_negocios` limita la puerta a Alquimistic, ERA y Colego |
| Llaves fuera de git | Variables selladas en Railway; `.env` está en `.gitignore`; en la base solo vive el hash de la llave |
| Gasto | DeepSeek prepago; Railway con límite duro |
| No aprende permisos | AGENTS.md § 6; sus lecciones se pueden deshacer con "deshaz" |

## Botón de pánico
1. **Apagarla:** Railway › servicio › Settings › "Remove deployment".
2. **Cortarle el Business OS:** en Supabase (SQL), `update agente_llaves set activa = false;` (o pedírselo a Claude).
3. **Rotar llaves:** DeepSeek (borrar la llave y crear otra), Telegram (@BotFather › /revoke), y una llave nueva para `agente-api` (Claude la genera).
4. Revisar `agente_bitacora` para ver qué cambió y deshacer lo necesario.

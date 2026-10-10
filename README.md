# demo-backoff-exponential-and-idempotency

Ejercicio técnico, Parte B: sincronizar pedidos desde una API paginada, con reintentos, mapeo e idempotencia. Hecho con NestJS 12, TypeScript y Vitest.

## El problema

Implementar una función `sincronizarPedidos()` que:

- Consuma una API paginada: `GET /orders?page=n` devuelve `{ "data": [...], "next_page": n|null }`.
- Recorra todas las páginas hasta agotar `next_page`.
- Ante 429/5xx, reintente con backoff exponencial (máx. 5 intentos); ante 4xx (salvo 429), falle claro.
- Mapee cada pedido del esquema origen `{ order_id, customer_name, amount, source }` al interno `{ id, cliente, total_centavos, canal }` (`amount` viene en pesos con decimales; `total_centavos` es entero).
- Garantice idempotencia: si un `order_id` ya fue procesado, no lo duplique.
- Devuelva un resumen: procesados, omitidos (duplicados), fallidos.

## Cómo correrlo

Requiere Node 20.19 o superior (yo lo hice con Node 24).

```bash
npm install
npm test
npm run start:dev
```

Con la app arriba:

```bash
curl -X POST http://localhost:3000/orders/sincronizar   # sincroniza
curl http://localhost:3000/orders                       # pedidos guardados
```

La API externa está simulada en la misma app, en `GET /external-api/orders?page=n`. La página 2 falla a propósito dos veces (503 y luego 429) para que se vean los reintentos en la consola, y los datos traen un pedido duplicado y uno con monto inválido.

La primera corrida regresa `{"processed":5,"omitted":1,"failed":1}`. Si la vuelves a correr, `{"processed":0,"omitted":6,"failed":1}`.

Para apuntar a otra API, define `ORDERS_API_URL` (ver `.env.example`).

## Decisiones

- API simulada con un controller: preferí que el cliente hiciera llamadas HTTP reales en lugar de leer un arreglo, así los reintentos se prueban con respuestas de verdad.
- Reintentos: en 429, 5xx y errores de red, máximo 5 intentos en total. Si viene `Retry-After` lo respeto; si no, backoff exponencial y cualquier otro 4xx falla de inmediato con un error que dice la URL y el status.
- Paginación: sigo `next_page` en lugar de sumar 1. Si la API regresa una página que ya visité, me detengo para no quedarme en un ciclo.
- Centavos: `Math.round(amount * 100)`, porque en JavaScript presenta detalles con el manejo de decimales.
- Pedidos inválidos: si falta un campo o el monto no es válido, cuenta como fallido y queda en el log, pero la sincronización sigue.
- Idempotencia: un store en memoria (`Map` por `order_id`) que solo guarda si el id no existe.
- Si una página falla después de los reintentos, el endpoint responde 502, porque el problema es del sistema externo. Lo ya guardado se queda y, como todo es idempotente, basta con volver a correrlo.

## Con más tiempo

Guardaría en PostgreSQL, mandaría la sincronización a una cola para no depender de que el POST termine y validaría la forma de la respuesta de la API con Zod, no usaria Loger y usaria Pino o Windston.

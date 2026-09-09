# MDA — Alta de tickets en Zammad

App de una sola página para que los agentes creen tickets en Zammad sin salir
del chat de tawk.to. Reemplaza a la app React anterior.

Servida como estático desde https://mda.gruposeac.online

## Por que un solo archivo

El formulario quedo en seis campos despues de retirar del ticket numero_pdv,
cuit y tipo_gestion (la organizacion identifica el PDV afectado desde el parche
al core de Zammad, ver repo zammad-seac-patches). Con ese alcance, un build de
React era mas infraestructura que producto: no hay build, no hay dependencias,
no hay pipeline que se rompa.

## Arquitectura

    Navegador del agente
      -> GET  n8n/webhook/zammad-buscar-pdv?q=...   (autocomplete de PDV)
      -> POST n8n/webhook/zammad-crear-ticket        (alta del ticket)
                  |
                  v
      n8n (token de Zammad en credencial)  ->  Zammad API REST

La app nunca habla directo con Zammad: el token quedaria expuesto en el
navegador y Zammad no habilita CORS para origenes externos.

Lectura de PDV por SQL (usuario zammadread, solo SELECT sobre organizations y
users, con indices pg_trgm). Escritura de tickets SIEMPRE por API REST: un
INSERT directo saltearia el numero de ticket, el article, el historial, el
indice de Elasticsearch y los triggers.

## Configuracion

    cp config.example.js config.js
    # editar config.js y completar AUTH_VALUE

config.js esta en .gitignore. Contiene la clave del header que autentica los
webhooks de n8n.

Esa clave viaja al navegador y es legible por cualquiera que abra las
herramientas de desarrollo. No es un secreto fuerte: protege del curioso
casual, no de alguien decidido. La proteccion real es que el vhost solo sea
accesible desde la red de SEAC.

## Deploy

    cd /home/gruposeac-mda/htdocs/mda.gruposeac.online
    git pull
    chown -R gruposeac-mda:gruposeac-mda .

config.js no se toca porque no esta versionado.

## Mantenimiento

Tres listas estan hardcodeadas en index.html y hay que actualizarlas a mano si
cambian en Zammad: GRUPOS, PRODUCTOS, SOLUCIONES y MOTIVOS.

Verificar contra la base:

    SELECT name FROM groups WHERE active = true ORDER BY name;

    SELECT a.name, a.data_option
    FROM object_manager_attributes a
    JOIN object_lookups o ON o.id = a.object_lookup_id
    WHERE o.name = 'Ticket' AND a.data_type IN ('select','tree_select');

Un nombre de grupo mal escrito hace fallar la creacion con un error poco claro.
Pendiente: servir esas listas desde un tercer webhook que lea
object_manager_attributes, para que dejen de estar duplicadas.

## Notas

- El agente define su correo una vez (se guarda en localStorage). Tambien se
  acepta ?agente=fulano@seac.com.ar en la URL.
- El ticket se crea con X-On-Behalf-Of para que quede a nombre del agente real
  y no del usuario de servicio api-mda@seac.com.ar.
- Si el cliente no puede identificar su PDV, buscar "no identificado": existe
  una organizacion con ese nombre para no forzar al agente a elegir cualquiera.
- Si Zammad rechaza el alta, el formulario NO se limpia.

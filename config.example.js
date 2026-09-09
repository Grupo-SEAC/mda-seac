// Copiar este archivo a config.js en el servidor y completar AUTH_VALUE.
// config.js NO se versiona: contiene la clave del webhook de n8n.
window.MDA_CONFIG = {
  BASE:        'https://n8n.gruposeac.online/webhook',
  BUSCAR:      'zammad-buscar-pdv',
  CREAR:       'zammad-crear-ticket',
  AUTH_HEADER: 'X-MDA-Key',
  AUTH_VALUE:  '',   // <-- clave del header de la credencial "MDA webhook auth"
  ZAMMAD:      'https://portalgestion.gruposeac.online',
};

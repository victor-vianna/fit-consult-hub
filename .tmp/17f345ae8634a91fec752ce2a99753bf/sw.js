import {registerRoute as workbox_routing_registerRoute} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-routing/registerRoute.mjs';
import {ExpirationPlugin as workbox_expiration_ExpirationPlugin} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-expiration/ExpirationPlugin.mjs';
import {NetworkFirst as workbox_strategies_NetworkFirst} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-strategies/NetworkFirst.mjs';
import {clientsClaim as workbox_core_clientsClaim} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';
import {NavigationRoute as workbox_routing_NavigationRoute} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-routing/NavigationRoute.mjs';
import {createHandlerBoundToURL as workbox_precaching_createHandlerBoundToURL} from 'D:/Empresa/NOVICX/PROJETOS/personal/Personal Guilherme Barbosa/Plataforma Consultoria/fit-consult-hub/node_modules/workbox-precaching/createHandlerBoundToURL.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */








self.skipWaiting();

workbox_core_clientsClaim();


/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "assets/AnalyticsSection-C8OpHDHP.js",
    "revision": null
  },
  {
    "url": "assets/AssinaturasManager-C8RAQ3bL.js",
    "revision": null
  },
  {
    "url": "assets/ConfiguracoesSection-DoNctBWn.js",
    "revision": null
  },
  {
    "url": "assets/ConteudosGlobaisSection-DtEAbEzs.js",
    "revision": null
  },
  {
    "url": "assets/DashboardOverview-Chzt6zL7.js",
    "revision": null
  },
  {
    "url": "assets/html2canvas.esm-CBrSDip1.js",
    "revision": null
  },
  {
    "url": "assets/index-74u5oWcc.css",
    "revision": null
  },
  {
    "url": "assets/index-Br6z06d_.js",
    "revision": null
  },
  {
    "url": "assets/index.es-YTtCCXMo.js",
    "revision": null
  },
  {
    "url": "assets/NotificacoesSection-UYjIlkw9.js",
    "revision": null
  },
  {
    "url": "assets/PagamentosManager-DUrwl6BU.js",
    "revision": null
  },
  {
    "url": "assets/PersonalsManager-D_qYKIYD.js",
    "revision": null
  },
  {
    "url": "assets/PlanosManager-Drkm1sBC.js",
    "revision": null
  },
  {
    "url": "assets/purify.es-B9ZVCkUG.js",
    "revision": null
  },
  {
    "url": "assets/RelatoriosSection-C1Vb3Vzb.js",
    "revision": null
  },
  {
    "url": "assets/shield-DvqisLgv.js",
    "revision": null
  },
  {
    "url": "assets/UsuariosManager-BmZOmv_I.js",
    "revision": null
  },
  {
    "url": "favicon.ico",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "icons/apple-touch-icon.png",
    "revision": "99d61ba1205a64875479e49d9c8fd7bc"
  },
  {
    "url": "icons/icon-192x192.png",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "icons/icon-512x512.png",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "index.html",
    "revision": "62d706b872c3fccfd14f9702ddf389d6"
  },
  {
    "url": "offline.html",
    "revision": "4b8f7722095fdfa9c3b7219ed9b0507e"
  },
  {
    "url": "placeholder.svg",
    "revision": "35707bd9960ba5281c72af927b79291f"
  },
  {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  },
  {
    "url": "favicon.ico",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "icons/icon-192x192.png",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "icons/icon-512x512.png",
    "revision": "eab2365ca1392dbcfdbeaa87383dd87b"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "3109f5fe0dc9f3e566b25b2c70bb4491"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();
workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("index.html")));


workbox_routing_registerRoute(/^https:\/\/jqpxlqggkstytgrkyhyb\.supabase\.co\/.*/i, new workbox_strategies_NetworkFirst({ "cacheName":"supabase-api-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })] }), 'GET');





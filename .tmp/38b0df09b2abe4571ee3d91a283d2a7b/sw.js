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
    "url": "assets/AnalyticsSection-C4d6ORFe.js",
    "revision": null
  },
  {
    "url": "assets/AssinaturasManager-D31-cTmN.js",
    "revision": null
  },
  {
    "url": "assets/ConfiguracoesSection-Cinh2DuY.js",
    "revision": null
  },
  {
    "url": "assets/ConteudosGlobaisSection-BUbi09BE.js",
    "revision": null
  },
  {
    "url": "assets/DashboardOverview-BgZd2-oc.js",
    "revision": null
  },
  {
    "url": "assets/html2canvas.esm-CBrSDip1.js",
    "revision": null
  },
  {
    "url": "assets/index-BMulH4o0.js",
    "revision": null
  },
  {
    "url": "assets/index-i1niIKNO.css",
    "revision": null
  },
  {
    "url": "assets/index.es-BuVORFAd.js",
    "revision": null
  },
  {
    "url": "assets/NotificacoesSection-ssow7Lg3.js",
    "revision": null
  },
  {
    "url": "assets/PagamentosManager-BU_ZIUKb.js",
    "revision": null
  },
  {
    "url": "assets/PersonalsManager-CF2YOrG9.js",
    "revision": null
  },
  {
    "url": "assets/PlanosManager-Bb1i__5N.js",
    "revision": null
  },
  {
    "url": "assets/purify.es-B9ZVCkUG.js",
    "revision": null
  },
  {
    "url": "assets/RelatoriosSection-hH6geoqt.js",
    "revision": null
  },
  {
    "url": "assets/shield-CpveoxRF.js",
    "revision": null
  },
  {
    "url": "assets/UsuariosManager-CtcYYxl1.js",
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
    "revision": "9375121404fa222af8173e11b7467fd3"
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





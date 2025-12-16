/**
 * Script para extraer subscriber IDs directamente de las requests de red
 * 
 * Este script analiza las requests de red del browser MCP para extraer
 * los subscriber IDs que aparecen como parámetro "psid" en las URLs de Facebook.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'cyan')
  log('='.repeat(60), 'cyan')
}

/**
 * Extraer subscriber IDs de las requests de red
 */
function extractSubscriberIdsFromNetworkRequests() {
  section('Extracción de Subscriber IDs desde Network Requests')
  
  const subscriberIds = new Set()
  
  // IDs que vimos directamente en las requests de red del browser MCP
  const networkRequests = [
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa00Kbg_Y3r5X7os2kVRu-HzpVSQZsWMzq-z8qWht1cmLdtzrmzWNrJaM5zq8pH5yJ8fbSDf0B1q&psid=32640609408919422&height=200&width=200&ext=1767284633&hash=AT8jHbK3mWe7WkYGSW1VZkaV',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1bHQfAVAzbuCNWECUL8KRDmL0wgjQWR0pQwwx83qCKL4k9_q_Htk005vuKupSBKBz8ArgEBgBf&psid=24664267479915356&height=200&width=200&ext=1767104081&hash=AT-fTJ6PikyFgtBLHwB0SNme',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3UR_gH9fEa_MioEBDtcAakelCzJvsHXQfjEfML2Bt_ZTJ2v4-7EATey2s5sp05g5jhDK2v7G2n&psid=26103016285952673&height=200&width=200&ext=1767210984&hash=AT9nfEUM1D-JjetumPO6Ufqt',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1Vi5dGAgsganpvpDTYTOQ74zkmr0Pgmc1hXf7Yjnl4Wk-ITZxFtO39_mUVD4OlECZ5PdeHxdtX&psid=25653703054235477&height=200&width=200&ext=1767074188&hash=AT8PA-xYQ69GfO_D3U15dSBz',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1x2lwI3Z96GsFrjOZHmatB-39Uz0UgWV9G2Mz3swZYXUXP8xRa-5QheoaYcUrW3ytVpMwXWRsx&psid=25700296369595670&height=200&width=200&ext=1767032036&hash=AT-9GJaC21WCMqH2AVoQqmsf',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2zpixI_kxKN3DYGHT7aiU5_qV5RpVtqdyYUjKDALRk-uWVct-vQH9Q5Fy4-1plI95vXIfei-g9&psid=25094122670281341&height=200&width=200&ext=1767041219&hash=AT-xMBeHlPAG2ceoYLgtOzyM',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02q2oG2nbJfect0nPgIad7_cekD_iJL-YnTvwuXKsWahD26ZEjCGSRoN_ltxxRq7Ej8z1PCxfv&psid=25541058665519003&height=200&width=200&ext=1767089711&hash=AT8FRkXkQsFhurhdqpg9A6Gk',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0lD22GRQMYoP230DJFxZRCztVPWEjgvp2-dRQBplkZyTVRkaH4Oxg5XxERTYKasZHlU28zyacj&psid=24870906525945489&height=200&width=200&ext=1767031761&hash=AT_BhLfw-XGXTXZTG9qVLFUa',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa17UaIib_Sesf5PxgvJmsuaYYTkLAKiC8dQK8ij_YSSpcJdRXP07yXzjk6mYKcuOkNONNBSztq0&psid=24586673454339326&height=200&width=200&ext=1767036821&hash=AT9ntUY5_WY61if7oVhMenWf',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa23IyTFTuJp4h2pC3c88kGKpsBPryYx2-EsB2gvrRhBqTjHggPGFV_j5LUog2UhYkQNRMrIdvyE&psid=25516304457964241&height=200&width=200&ext=1767037347&hash=AT-UHSD7W-YdjhkJVI_PTU6C',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0odgvT47Ji9tHyXYNuBu9kh5x-sFnazjKQmHfeKwKSLeaaVKpdmUqwcr9vhhTm9oVspluvdu2x&psid=25168610232799558&height=200&width=200&ext=1767014311&hash=AT-PyPceE26EnfwzICLMzBO4',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0hE2iJW5pPBV4Rwd4d1F1ESLxmTBRir_8yLXYRA_Yy6J-Y2YhgURnE9VUPeBo4S4OZuG_lCHx6&psid=25939837535622446&height=200&width=200&ext=1767017643&hash=AT-KsKSUyTa1idc8YLbq2tQo',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3hW17t49duFn1I6wnOayd7astWGuF3vnTDxIhVayJIXlD-KZtw-b2zhY0Q14VnKZ8n8Qy0qO9h&psid=24882945038073865&height=200&width=200&ext=1767029788&hash=AT9SwU0pOHJ7ThVJQtzUH0JW',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0qTDmWJhOeOONQw_sh7nifLQbp-CwyhuReZEfjtXjIppkI9s5xFyy6ZHoJ-Q4Fa9hI2OfjP5qX&psid=32644788715165666&height=200&width=200&ext=1766951341&hash=AT9xwv8TCSwzjVlWo88_UKX3',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa34I5bWRFx_oCmme9rBkDLmpAX3zqRFO4nmvEA4WfZ0L5wsmZeuQwhmyi5uXIS7VMbqT1-VDAve&psid=25301692042807123&height=200&width=200&ext=1766965965&hash=AT_WEBdX2egViHLWY6zUVkvV',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1ORxmpY8kFio3sWP5mOZ5aKAEM9U-CDseH41iLLBD3r-thMhlXB4e0m4tfr60Bz6gJWZ90eKjE&psid=25394418246855784&height=200&width=200&ext=1767023908&hash=AT_ON1Esm8xgGhFwiFSY1OZ-',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1habx9g1lKPbabCb09iHxd-rc-m2yLKC-A28Vn2l4KwmcuY6C-F3gZgwq2OfUh_VS9RB0zxODz&psid=25102619832693998&height=200&width=200&ext=1767034318&hash=AT88xPN51VgJfLF0G3PoVRAm',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1AORpTJOnDn38oTGR8w0nV4__cmo05EIISWWNGeJsrC3Vn5Hg5u1DoXQNAXSDkuQm3S5t201ix&psid=25565495896423954&height=200&width=200&ext=1767036176&hash=AT-QUU5accn5HgNTa8pTp9fS',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2ZcVZRdUFyRiR8qGYIF16Fp15Pp4zi7T41ect8gn3P7DlqXxE5M7d04xaS80BGToe73o3IHfjB&psid=24947284474943607&height=200&width=200&ext=1766973658&hash=AT-ksvoleDP1yuTGp6TwgvoD',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3xQo7mB1N015Af0v-PmZzyDmoUcKyznIOSDRTypTU3b8ae2H3JBM9Uvrut7YbvfT3e92r9ml5N&psid=24978379815186526&height=200&width=200&ext=1767015032&hash=AT9rcHvPSwqU6y1VEYZ_dvpr',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2wg6ZpY4InCNC47MSprGhes_xH0kcp6_HaSTdQYMVv-7cITK-0qPJLiJPxP4N3Q6ZgVRMpihTl&psid=24468252062848178&height=200&width=200&ext=1766956272&hash=AT_B7ewRLi_v-igF9fsch_Iz',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2VoJWN_kxVVNAMw494CDdwQxHgo4WnyfZOUbvIHGZoT3ejiMBHtDIVaHTHRIze3WtPllHy2I2n&psid=25445549041743671&height=200&width=200&ext=1766972500&hash=AT-JVgYR_zS5bgt6uiDyBAjo',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0XZKPgsUP2dtiIVLgnwZtmO9XuNsl0E1gB6vBLSzwo8qna7bJNRrTZdNv4de1Hv4CVdyZQeJNi&psid=25213961128270996&height=200&width=200&ext=1766952646&hash=AT9P41rtVxAwpaeJFJSgN5Me',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-FqB08htPdOmQJnQPy-6OxlfN1A8dK--jbEU9ZeQ4aK7pijpRYMLaQ-FzafFBWAvQhdPuD9Y4&psid=24926618923700963&height=200&width=200&ext=1766949726&hash=AT_mj487xBHDv2TDTCRpG1nq',
    'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02NuegYI14CcBaEOIlC5TvZg1SERMHm3qgb_v_qD1tWm9RG83-zDzLWJhhs_X6gksV_Fx47ZV1&psid=24833672969665712&height=200&width=200&ext=1767019869&hash=AT8-Phb35qzJN-2ybqfd2ML8'
  ]
  
  // Extraer IDs de las URLs
  for (const url of networkRequests) {
    const match = url.match(/psid=(\d{15,})/)
    if (match) {
      subscriberIds.add(match[1])
    }
  }
  
  const idsArray = Array.from(subscriberIds).sort()
  
  success(`Encontrados ${idsArray.length} subscriber IDs únicos`)
  
  // Guardar en archivo CSV
  const csvFile = path.join(__dirname, 'subscriber-ids-extracted.csv')
  const csvContent = 'pageuid\n' + idsArray.join('\n')
  fs.writeFileSync(csvFile, csvContent, 'utf-8')
  
  success(`IDs guardados en: ${csvFile}`)
  info('')
  info('Primeros 10 IDs encontrados:')
  idsArray.slice(0, 10).forEach((id, i) => {
    info(`  ${i + 1}. ${id}`)
  })
  
  if (idsArray.length > 10) {
    info(`  ... y ${idsArray.length - 10} más`)
  }
  
  return idsArray
}

// Ejecutar
const ids = extractSubscriberIdsFromNetworkRequests()

section('Sincronización')
info('Para sincronizar estos IDs al CRM, ejecuta:')
info('npm run manychat:sync-by-ids scripts/subscriber-ids-extracted.csv')














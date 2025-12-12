/**
 * Script para extraer subscriber IDs directamente de las requests de red
 * capturadas por el browser MCP
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

// Las requests de red que capturamos del browser MCP
const networkRequests = [
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa00Kbg_Y3r5X7os2kVRu-HzpVSQZsWMzq-z8qWht1cmLdtzrmzWNrJaM5zq8pH5yJ8fbSDf0B1q&psid=32640609408919422&height=200&width=200&ext=1767284633&hash=AT8jHbK3mWe7WkYGSW1VZkaV",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1bHQfAVAzbuCNWECUL8KRDmL0wgjQWR0pQwwx83qCKL4k9_q_Htk005vuKupSBKBz8ArgEBgBf&psid=24664267479915356&height=200&width=200&ext=1767104081&hash=AT-fTJ6PikyFgtBLHwB0SNme",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3UR_gH9fEa_MioEBDtcAakelCzJvsHXQfjEfML2Bt_ZTJ2v4-7EATey2s5sp05g5jhDK2v7G2n&psid=26103016285952673&height=200&width=200&ext=1767210984&hash=AT9nfEUM1D-JjetumPO6Ufqt",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1Vi5dGAgsganpvpDTYTOQ74zkmr0Pgmc1hXf7Yjnl4Wk-ITZxFtO39_mUVD4OlECZ5PdeHxdtX&psid=25653703054235477&height=200&width=200&ext=1767074188&hash=AT8PA-xYQ69GfO_D3U15dSBz",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1x2lwI3Z96GsFrjOZHmatB-39Uz0UgWV9G2Mz3swZYXUXP8xRa-5QheoaYcUrW3ytVpMwXWRsx&psid=25700296369595670&height=200&width=200&ext=1767032036&hash=AT-9GJaC21WCMqH2AVoQqmsf",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2zpixI_kxKN3DYGHT7aiU5_qV5RpVtqdyYUjKDALRk-uWVct-vQH9Q5Fy4-1plI95vXIfei-g9&psid=25094122670281341&height=200&width=200&ext=1767041219&hash=AT-xMBeHlPAG2ceoYLgtOzyM",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02q2oG2nbJfect0nPgIad7_cekD_iJL-YnTvwuXKsWahD26ZEjCGSRoN_ltxxRq7Ej8z1PCxfv&psid=25541058665519003&height=200&width=200&ext=1767089711&hash=AT8FRkXkQsFhurhdqpg9A6Gk",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0lD22GRQMYoP230DJFxZRCztVPWEjgvp2-dRQBplkZyTVRkaH4Oxg5XxERTYKasZHlU28zyacj&psid=24870906525945489&height=200&width=200&ext=1767031761&hash=AT_BhLfw-XGXTXZTG9qVLFUa",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa17UaIib_Sesf5PxgvJmsuaYYTkLAKiC8dQK8ij_YSSpcJdRXP07yXzjk6mYKcuOkNONNBSztq0&psid=24586673454339326&height=200&width=200&ext=1767036821&hash=AT9ntUY5_WY61if7oVhMenWf",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa23IyTFTuJp4h2pC3c88kGKpsBPryYx2-EsB2gvrRhBqTjHggPGFV_j5LUog2UhYkQNRMrIdvyE&psid=25516304457964241&height=200&width=200&ext=1767037347&hash=AT-UHSD7W-YdjhkJVI_PTU6C",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0odgvT47Ji9tHyXYNuBu9kh5x-sFnazjKQmHfeKwKSLeaaVKpdmUqwcr9vhhTm9oVspluvdu2x&psid=25168610232799558&height=200&width=200&ext=1767014311&hash=AT-PyPceE26EnfwzICLMzBO4",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0hE2iJW5pPBV4Rwd4d1F1ESLxmTBRir_8yLXYRA_Yy6J-Y2YhgURnE9VUPeBo4S4OZuG_lCHx6&psid=25939837535622446&height=200&width=200&ext=1767017643&hash=AT-KsKSUyTa1idc8YLbq2tQo",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3hW17t49duFn1I6wnOayd7astWGuF3vnTDxIhVayJIXlD-KZtw-b2zhY0Q14VnKZ8n8Qy0qO9h&psid=24882945038073865&height=200&width=200&ext=1767029788&hash=AT9SwU0pOHJ7ThVJQtzUH0JW",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0qTDmWJhOeOONQw_sh7nifLQbp-CwyhuReZEfjtXjIppkI9s5xFyy6ZHoJ-Q4Fa9hI2OfjP5qX&psid=32644788715165666&height=200&width=200&ext=1766951341&hash=AT9xwv8TCSwzjVlWo88_UKX3",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa34I5bWRFx_oCmme9rBkDLmpAX3zqRFO4nmvEA4WfZ0L5wsmZeuQwhmyi5uXIS7VMbqT1-VDAve&psid=25301692042807123&height=200&width=200&ext=1766965965&hash=AT_WEBdX2egViHLWY6zUVkvV",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1ORxmpY8kFio3sWP5mOZ5aKAEM9U-CDseH41iLLBD3r-thMhlXB4e0m4tfr60Bz6gJWZ90eKjE&psid=25394418246855784&height=200&width=200&ext=1767023908&hash=AT_ON1Esm8xgGhFwiFSY1OZ-",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1habx9g1lKPbabCb09iHxd-rc-m2yLKC-A28Vn2l4KwmcuY6C-F3gZgwq2OfUh_VS9RB0zxODz&psid=25102619832693998&height=200&width=200&ext=1767034318&hash=AT88xPN51VgJfLF0G3PoVRAm",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1AORpTJOnDn38oTGR8w0nV4__cmo05EIISWWNGeJsrC3Vn5Hg5u1DoXQNAXSDkuQm3S5t201ix&psid=25565495896423954&height=200&width=200&ext=1767036176&hash=AT-QUU5accn5HgNTa8pTp9fS",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2ZcVZRdUFyRiR8qGYIF16Fp15Pp4zi7T41ect8gn3P7DlqXxE5M7d04xaS80BGToe73o3IHfjB&psid=24947284474943607&height=200&width=200&ext=1766973658&hash=AT-ksvoleDP1yuTGp6TwgvoD",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3xQo7mB1N015Af0v-PmZzyDmoUcKyznIOSDRTypTU3b8ae2H3JBM9Uvrut7YbvfT3e92r9ml5N&psid=24978379815186526&height=200&width=200&ext=1767015032&hash=AT9rcHvPSwqU6y1VEYZ_dvpr",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2wg6ZpY4InCNC47MSprGhes_xH0kcp6_HaSTdQYMVv-7cITK-0qPJLiJPxP4N3Q6ZgVRMpihTl&psid=24468252062848178&height=200&width=200&ext=1766956272&hash=AT_B7ewRLi_v-igF9fsch_Iz",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2VoJWN_kxVVNAMw494CDdwQxHgo4WnyfZOUbvIHGZoT3ejiMBHtDIVaHTHRIze3WtPllHy2I2n&psid=25445549041743671&height=200&width=200&ext=1766972500&hash=AT-JVgYR_zS5bgt6uiDyBAjo",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0XZKPgsUP2dtiIVLgnwZtmO9XuNsl0E1gB6vBLSzwo8qna7bJNRrTZdNv4de1Hv4CVdyZQeJNi&psid=25213961128270996&height=200&width=200&ext=1766952646&hash=AT9P41rtVxAwpaeJFJSgN5Me",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-FqB08htPdOmQJnQPy-6OxlfN1A8dK--jbEU9ZeQ4aK7pijpRYMLaQ-FzafFBWAvQhdPuD9Y4&psid=24926618923700963&height=200&width=200&ext=1766949726&hash=AT_mj487xBHDv2TDTCRpG1nq",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02NuegYI14CcBaEOIlC5TvZg1SERMHm3qgb_v_qD1tWm9RG83-zDzLWJhhs_X6gksV_Fx47ZV1&psid=24833672969665712&height=200&width=200&ext=1767019869&hash=AT8-Phb35qzJN-2ybqfd2ML8",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3QDyg0_8XEuMM9311w8GiBHXey_SQ0WGErpOzJAyDQb1fY2CyNy0UZwKCdYsxN3bBpH_SzrHwK&psid=25459015443710917&height=200&width=200&ext=1766939004&hash=AT8RivcJpLRfm8j-clllnjAp",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa27IkYLP_humWniz4xK7OAHU5jYexJegcBkl-AnkWGO6wtm0losY6JnhC19Ns6E7e7QWnDYTphV&psid=25247827888241687&height=200&width=200&ext=1767321257&hash=AT-bdgaJ8D36w21PyfDttqAz",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa09Dt0TL3dl4aZA9DnjR1T-UnICSzjPUL8PjT6QvDR2OWUwizl79AZoYrKod59JiUHzRsHw6-r8&psid=25089507644068143&height=200&width=200&ext=1767321257&hash=AT_pZzw1R3zIuj11ltd2w7aQ",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2I0t_oNtATQj_BZ1G6dQfeHyBZPwpwJRRwYIByVlOqn_-QAXgV8Sxrfm6EvOJ9sF6W_mOr9bL8&psid=24951955477837950&height=200&width=200&ext=1767321466&hash=AT-h8HgDIWoTHgCacI1P93Cx",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa21aylohBHXcL9ZWJ8wa8v3VQrbGnw0YVBvDmI-bV66p3wFeFWmJUhflQ22KPthaiqzTbBXya9R&psid=24956095550752576&height=200&width=200&ext=1767314815&hash=AT856WzlhhGeL0skf8YMMlP6",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3sSGr99sBfEz4srmSManqGhda53dU7CTPjbHzKHD8MbCQalKA2d3MLvoF-HUv9LyjOpjVJcx2u&psid=25414036311541865&height=200&width=200&ext=1767314647&hash=AT8z7dvBb73iwTbh1K-3vuX4",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1daWZhSCiUsvg33Z0VepO4frwjww-c2lWMVC8gnd1lC2oh0ngW3cdLLuVESy1M6q-XeqnTCd8S&psid=25048318031427019&height=200&width=200&ext=1767321255&hash=AT9lfoz-nDzJopELyD6ylPli",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0rf_yzhmnxlSJj0uBVETss7zcmTMgnxcDgZWwd6HKU4R4wj0pLYq1jPWRZFWNvHxGDZlZ6pk1F&psid=25149820188005184&height=200&width=200&ext=1767321327&hash=AT9mb5nNFNB6YflN-1YU8VKI",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa11xkb9dH0xL919z-vlYVbcbalPIKyAd6kY-aga88h5lZXlLQcv-5SW4coAwdOwO9tq6bJRTKiD&psid=25756659997259890&height=200&width=200&ext=1767314815&hash=AT86uygMSDDavtwfMeJZDl89",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1ROwNmHLh_fUeFct-qo1wf2pgaQazD89G85z1Yv9WFdVZxiECRAJkxF0JMYhaVlhMhDQds705Q&psid=32766266783016526&height=200&width=200&ext=1767365860&hash=AT_dRtbF8GIJGXsAfpn7dX9-",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-603mJz4XDbkDKSKB9NjWsxVu6QM7BfnlQ2zMG4L-qjs-0JQJlkTMcwk4rCnJQBmZ0muesjuX&psid=25883253061272067&height=200&width=200&ext=1767365860&hash=AT9mEl9lwBpOxgpspU5gQ_2R",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1XM63MSc8YC_6OEC2acvqMIi2Tziw6c3sD6Dr8d7a3PzNjqJHH57NbZvwpEg-umOaFvGxqd4Xq&psid=25445038855092796&height=200&width=200&ext=1767314815&hash=AT-gxZfDUanmDY-yruxeGgFO",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Mxie0iMocS2K3JMcRouq9ogmppNXE17LsBeoM-u_9cT9WPSIMr293JSOiovmDYS0DMzrS30FZ&psid=25152061731129736&height=200&width=200&ext=1767314817&hash=AT8Jf4u4lDnEdliqfO4b5fVp",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3V9oaeenu0InDd6CYBwzGOiyHVYsEAGnwPkr8bMrQ7CRJ-8YH8cd0zpt9arvNV1hkEUjZN8-Qy&psid=25662046176732568&height=200&width=200&ext=1766946447&hash=AT_y2VF-eOJauCPGGyekVKlX",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1I8KQc1wGpL8Bd3-qm10MN5yYjcVwsHzmjYYqSZn75pkDrNNGuwu6B5a0tNrV6ei3GrIDAlMrs&psid=33728292926769929&height=200&width=200&ext=1767321466&hash=AT95VdCYWilFyP4kLVO_HM2O",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2aGc_-jxqPmPqWdLrxzFlGBJLbtTjS3V-0ZWU6OpiuVwFYpU_f2P_zTTCIkvmPEwqubrU15ET3&psid=32386909084256603&height=200&width=200&ext=1767365860&hash=AT8uUr_oqvBS3de0vOC1Mcs-",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1CCVlFU-Rra-P3RbGUF2Y7XHy-K7yyEXAZrDheAreNUKHZ__yh-NenRmkh5JTWzqcmSXMIAlmb&psid=25129733460002168&height=200&width=200&ext=1767301062&hash=AT9XpLtjNRm7acIM3ZTXRIeM",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3ij2bkgGHDUobjEn-sS_BkiQ4MZ0RVkUPBp0yCi3QUJd3NC7EsilUICNGFLQ7m325ZAWnsAftp&psid=32541082412205716&height=200&width=200&ext=1767314815&hash=AT-TR3Ns2KDNLZY-ReY0goAH",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2j6UXRiF6iIc0dTLYuPF-cvJNVA1DrkmiYd5I1OUaf7Qqk6beq6JqkvkdnI_CJZuu56kcmxoZd&psid=25019332834375717&height=200&width=200&ext=1767365207&hash=AT_3X_zEUwKsDzTbfc6YJ6E7",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0wLnRNX0nAXWqXQJZDd6ZkCK4zNOHC47TK4MW_50GYbHuhMpqjyw__xrJ4h-OGhYhIQZAqQdZv&psid=25514942561458591&height=200&width=200&ext=1767365860&hash=AT9e3cbDe0knVIbVXS79tA5W",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0xQdgPHfJPOhcPcAuAq3qntpV-b7hIllelYXBF9BYFj5c6vTQ3mX-T0ZK_GKoQnxqV1OfNtJIu&psid=9775923315865535&height=200&width=200&ext=1767321327&hash=AT97OlNqUSuu9Z4B5VLwn8SF",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa08WZ7AdS6uoPqgxoeSbFmYgD6rpeB5hYM49nSlm7ElnVQwG__RLUxpJGyeysk54QE32NFy8Tsg&psid=33124317813849061&height=200&width=200&ext=1767314647&hash=AT8dgRN6LLpHZbSQQG36ib4W",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1sESMNavVv6v9uiLjkPdEOpzJ4Fym4jxMZJo0AwqruZHwCmLRK_NJsBmc3O5LdnSCH8BTeNbff&psid=32450582731251626&height=200&width=200&ext=1767314815&hash=AT-Fi2POYIGZiae0uQ4i49C3",
  },
  {
    "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2Tfs8S_lTSCiDdruMzpLmvFm4X_Z97E3Sh2RHTzoXW4KdLyLSfUtaCVNDzBiLa1_IbMcUpQnkk&psid=24503584665981805&height=200&width=200&ext=1767365860&hash=AT-G7mksEG4CtURRyUhJ1kTd",
  },
]

section('Extracción de Subscriber IDs desde Network Requests')

// Extraer IDs de las URLs
const subscriberIds = new Set()

for (const request of networkRequests) {
  const url = request.url
  const psidMatch = url.match(/[?&]psid=(\d+)/)
  if (psidMatch) {
    subscriberIds.add(psidMatch[1])
  }
}

const uniqueIds = Array.from(subscriberIds).sort()

success(`Encontrados ${uniqueIds.length} subscriber IDs únicos`)

// Guardar en CSV
const csvPath = path.join(__dirname, 'subscriber-ids-extracted.csv')
const csvContent = 'pageuid\n' + uniqueIds.join('\n')
fs.writeFileSync(csvPath, csvContent)

success(`IDs guardados en: ${csvPath}`)

info('\nPrimeros 20 IDs encontrados:')
uniqueIds.slice(0, 20).forEach((id, index) => {
  info(`  ${index + 1}. ${id}`)
})

if (uniqueIds.length > 20) {
  info(`  ... y ${uniqueIds.length - 20} más`)
}

section('Sincronización')
info('Para sincronizar estos IDs al CRM, ejecuta:')
info(`npm run manychat:sync-by-ids scripts/subscriber-ids-extracted.csv`)












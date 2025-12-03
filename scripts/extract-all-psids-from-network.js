/**
 * Script para extraer TODOS los subscriber IDs (psid) de las requests de red
 * capturadas por el browser MCP y agregarlos al CSV existente
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

section('Extrayendo TODOS los Subscriber IDs desde Browser MCP')

const csvPath = path.join(__dirname, 'subscriber-ids-extracted.csv')
let existingIds = new Set()

// Leer IDs existentes del CSV
if (fs.existsSync(csvPath)) {
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split('\n').filter(line => line.trim() !== '')
  if (lines.length > 1) { // Ignorar la cabecera 'pageuid'
    lines.slice(1).forEach(id => existingIds.add(id.trim()))
  }
  info(`Se encontraron ${existingIds.size} IDs existentes en ${csvPath}.`)
} else {
  warn(`El archivo ${csvPath} no existe. Se creará uno nuevo.`)
}

// Función para extraer psid de una URL
function extractPsidFromUrl(url) {
  const match = url.match(/psid=(\d+)/)
  return match ? match[1] : null
}

// Array con todas las URLs de las requests de red capturadas
// Estas son todas las URLs que contienen "platform-lookaside.fbsbx.com/platform/profilepic"
const networkUrls = [
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=122147841440834012&height=50&width=50&ext=1767367176&hash=AT8vld4YqZxZkXIvCCK9z7Hh",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa00Kbg_Y3r5X7os2kVRu-HzpVSQZsWMzq-z8qWht1cmLdtzrmzWNrJaM5zq8pH5yJ8fbSDf0B1q&psid=32640609408919422&height=200&width=200&ext=1767284633&hash=AT8jHbK3mWe7WkYGSW1VZkaV",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1bHQfAVAzbuCNWECUL8KRDmL0wgjQWR0pQwwx83qCKL4k9_q_Htk005vuKupSBKBz8ArgEBgBf&psid=24664267479915356&height=200&width=200&ext=1767104081&hash=AT-fTJ6PikyFgtBLHwB0SNme",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3UR_gH9fEa_MioEBDtcAakelCzJvsHXQfjEfML2Bt_ZTJ2v4-7EATey2s5sp05g5jhDK2v7G2n&psid=26103016285952673&height=200&width=200&ext=1767210984&hash=AT9nfEUM1D-JjetumPO6Ufqt",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1Vi5dGAgsganpvpDTYTOQ74zkmr0Pgmc1hXf7Yjnl4Wk-ITZxFtO39_mUVD4OlECZ5PdeHxdtX&psid=25653703054235477&height=200&width=200&ext=1767074188&hash=AT8PA-xYQ69GfO_D3U15dSBz",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1x2lwI3Z96GsFrjOZHmatB-39Uz0UgWV9G2Mz3swZYXUXP8xRa-5QheoaYcUrW3ytVpMwXWRsx&psid=25700296369595670&height=200&width=200&ext=1767032036&hash=AT-9GJaC21WCMqH2AVoQqmsf",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2zpixI_kxKN3DYGHT7aiU5_qV5RpVtqdyYUjKDALRk-uWVct-vQH9Q5Fy4-1plI95vXIfei-g9&psid=25094122670281341&height=200&width=200&ext=1767041219&hash=AT-xMBeHlPAG2ceoYLgtOzyM",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02q2oG2nbJfect0nPgIad7_cekD_iJL-YnTvwuXKsWahD26ZEjCGSRoN_ltxxRq7Ej8z1PCxfv&psid=25541058665519003&height=200&width=200&ext=1767089711&hash=AT8FRkXkQsFhurhdqpg9A6Gk",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0lD22GRQMYoP230DJFxZRCztVPWEjgvp2-dRQBplkZyTVRkaH4Oxg5XxERTYKasZHlU28zyacj&psid=24870906525945489&height=200&width=200&ext=1767031761&hash=AT_BhLfw-XGXTXZTG9qVLFUa",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa17UaIib_Sesf5PxgvJmsuaYYTkLAKiC8dQK8ij_YSSpcJdRXP07yXzjk6mYKcuOkNONNBSztq0&psid=24586673454339326&height=200&width=200&ext=1767036821&hash=AT9ntUY5_WY61if7oVhMenWf",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa23IyTFTuJp4h2pC3c88kGKpsBPryYx2-EsB2gvrRhBqTjHggPGFV_j5LUog2UhYkQNRMrIdvyE&psid=25516304457964241&height=200&width=200&ext=1767037347&hash=AT-UHSD7W-YdjhkJVI_PTU6C",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0odgvT47Ji9tHyXYNuBu9kh5x-sFnazjKQmHfeKwKSLeaaVKpdmUqwcr9vhhTm9oVspluvdu2x&psid=25168610232799558&height=200&width=200&ext=1767014311&hash=AT-PyPceE26EnfwzICLMzBO4",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0hE2iJW5pPBV4Rwd4d1F1ESLxmTBRir_8yLXYRA_Yy6J-Y2YhgURnE9VUPeBo4S4OZuG_lCHx6&psid=25939837535622446&height=200&width=200&ext=1767017643&hash=AT-KsKSUyTa1idc8YLbq2tQo",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3hW17t49duFn1I6wnOayd7astWGuF3vnTDxIhVayJIXlD-KZtw-b2zhY0Q14VnKZ8n8Qy0qO9h&psid=24882945038073865&height=200&width=200&ext=1767029788&hash=AT9SwU0pOHJ7ThVJQtzUH0JW",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0qTDmWJhOeOONQw_sh7nifLQbp-CwyhuReZEfjtXjIppkI9s5xFyy6ZHoJ-Q4Fa9hI2OfjP5qX&psid=32644788715165666&height=200&width=200&ext=1766951341&hash=AT9xwv8TCSwzjVlWo88_UKX3",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa34I5bWRFx_oCmme9rBkDLmpAX3zqRFO4nmvEA4WfZ0L5wsmZeuQwhmyi5uXIS7VMbqT1-VDAve&psid=25301692042807123&height=200&width=200&ext=1766965965&hash=AT_WEBdX2egViHLWY6zUVkvV",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1ORxmpY8kFio3sWP5mOZ5aKAEM9U-CDseH41iLLBD3r-thMhlXB4e0m4tfr60Bz6gJWZ90eKjE&psid=25394418246855784&height=200&width=200&ext=1767023908&hash=AT_ON1Esm8xgGhFwiFSY1OZ-",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1habx9g1lKPbabCb09iHxd-rc-m2yLKC-A28Vn2l4KwmcuY6C-F3gZgwq2OfUh_VS9RB0zxODz&psid=25102619832693998&height=200&width=200&ext=1767034318&hash=AT88xPN51VgJfLF0G3PoVRAm",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1AORpTJOnDn38oTGR8w0nV4__cmo05EIISWWNGeJsrC3Vn5Hg5u1DoXQNAXSDkuQm3S5t201ix&psid=25565495896423954&height=200&width=200&ext=1767036176&hash=AT-QUU5accn5HgNTa8pTp9fS",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2ZcVZRdUFyRiR8qGYIF16Fp15Pp4zi7T41ect8gn3P7DlqXxE5M7d04xaS80BGToe73o3IHfjB&psid=24947284474943607&height=200&width=200&ext=1766973658&hash=AT-ksvoleDP1yuTGp6TwgvoD",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3xQo7mB1N015Af0v-PmZzyDmoUcKyznIOSDRTypTU3b8ae2H3JBM9Uvrut7YbvfT3e92r9ml5N&psid=24978379815186526&height=200&width=200&ext=1767015032&hash=AT9rcHvPSwqU6y1VEYZ_dvpr",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2wg6ZpY4InCNC47MSprGhes_xH0kcp6_HaSTdQYMVv-7cITK-0qPJLiJPxP4N3Q6ZgVRMpihTl&psid=24468252062848178&height=200&width=200&ext=1766956272&hash=AT_B7ewRLi_v-igF9fsch_Iz",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0XZKPgsUP2dtiIVLgnwZtmO9XuNsl0E1gB6vBLSzwo8qna7bJNRrTZdNv4de1Hv4CVdyZQeJNi&psid=25213961128270996&height=200&width=200&ext=1766952646&hash=AT9P41rtVxAwpaeJFJSgN5Me",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-FqB08htPdOmQJnQPy-6OxlfN1A8dK--jbEU9ZeQ4aK7pijpRYMLaQ-FzafFBWAvQhdPuD9Y4&psid=24926618923700963&height=200&width=200&ext=1766949726&hash=AT_mj487xBHDv2TDTCRpG1nq",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa02NuegYI14CcBaEOIlC5TvZg1SERMHm3qgb_v_qD1tWm9RG83-zDzLWJhhs_X6gksV_Fx47ZV1&psid=24833672969665712&height=200&width=200&ext=1767019869&hash=AT8-Phb35qzJN-2ybqfd2ML8",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3QDyg0_8XEuMM9311w8GiBHXey_SQ0WGErpOzJAyDQb1fY2CyNy0UZwKCdYsxN3bBpH_SzrHwK&psid=25459015443710917&height=200&width=200&ext=1766939004&hash=AT8RivcJpLRfm8j-clllnjAp",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa27IkYLP_humWniz4xK7OAHU5jYexJegcBkl-AnkWGO6wtm0losY6JnhC19Ns6E7e7QWnDYTphV&psid=25247827888241687&height=200&width=200&ext=1767321257&hash=AT-bdgaJ8D36w21PyfDttqAz",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa09Dt0TL3dl4aZA9DnjR1T-UnICSzjPUL8PjT6QvDR2OWUwizl79AZoYrKod59JiUHzRsHw6-r8&psid=25089507644068143&height=200&width=200&ext=1767321257&hash=AT_pZzw1R3zIuj11ltd2w7aQ",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2I0t_oNtATQj_BZ1G6dQfeHyBZPwpwJRRwYIByVlOqn_-QAXgV8Sxrfm6EvOJ9sF6W_mOr9bL8&psid=24951955477837950&height=200&width=200&ext=1767321466&hash=AT-h8HgDIWoTHgCacI1P93Cx",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa21aylohBHXcL9ZWJ8wa8v3VQrbGnw0YVBvDmI-bV66p3wFeFWmJUhflQ22KPthaiqzTbBXya9R&psid=24956095550752576&height=200&width=200&ext=1767314815&hash=AT856WzlhhGeL0skf8YMMlP6",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3sSGr99sBfEz4srmSManqGhda53dU7CTPjbHzKHD8MbCQalKA2d3MLvoF-HUv9LyjOpjVJcx2u&psid=25414036311541865&height=200&width=200&ext=1767314647&hash=AT8z7dvBb73iwTbh1K-3vuX4",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1daWZhSCiUsvg33Z0VepO4frwjww-c2lWMVC8gnd1lC2oh0ngW3cdLLuVESy1M6q-XeqnTCd8S&psid=25048318031427019&height=200&width=200&ext=1767321255&hash=AT9lfoz-nDzJopELyD6ylPli",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0rf_yzhmnxlSJj0uBVETss7zcmTMgnxcDgZWwd6HKU4R4wj0pLYq1jPWRZFWNvHxGDZlZ6pk1F&psid=25149820188005184&height=200&width=200&ext=1767321327&hash=AT9mb5nNFNB6YflN-1YU8VKI",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa11xkb9dH0xL919z-vlYVbcbalPIKyAd6kY-aga88h5lZXlLQcv-5SW4coAwdOwO9tq6bJRTKiD&psid=25756659997259890&height=200&width=200&ext=1767314815&hash=AT86uygMSDDavtwfMeJZDl89",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-603mJz4XDbkDKSKB9NjWsxVu6QM7BfnlQ2zMG4L-qjs-0JQJlkTMcwk4rCnJQBmZ0muesjuX&psid=25883253061272067&height=200&width=200&ext=1767365860&hash=AT9mEl9lwBpOxgpspU5gQ_2R",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1ROwNmHLh_fUeFct-qo1wf2pgaQazD89G85z1Yv9WFdVZxiECRAJkxF0JMYhaVlhMhDQds705Q&psid=32766266783016526&height=200&width=200&ext=1767365860&hash=AT_dRtbF8GIJGXsAfpn7dX9-",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1XM63MSc8YC_6OEC2acvqMIi2Tziw6c3sD6Dr8d7a3PzNjqJHH57NbZvwpEg-umOaFvGxqd4Xq&psid=25445038855092796&height=200&width=200&ext=1767314815&hash=AT-gxZfDUanmDY-yruxeGgFO",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Mxie0iMocS2K3JMcRouq9ogmppNXE17LsBeoM-u_9cT9WPSIMr293JSOiovmDYS0DMzrS30FZ&psid=25152061731129736&height=200&width=200&ext=1767314817&hash=AT8Jf4u4lDnEdliqfO4b5fVp",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3V9oaeenu0InDd6CYBwzGOiyHVYsEAGnwPkr8bMrQ7CRJ-8YH8cd0zpt9arvNV1hkEUjZN8-Qy&psid=25662046176732568&height=200&width=200&ext=1766946447&hash=AT_y2VF-eOJauCPGGyekVKlX",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1I8KQc1wGpL8Bd3-qm10MN5yYjcVwsHzmjYYqSZn75pkDrNNGuwu6B5a0tNrV6ei3GrIDAlMrs&psid=33728292926769929&height=200&width=200&ext=1767321466&hash=AT95VdCYWilFyP4kLVO_HM2O",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2aGc_-jxqPmPqWdLrxzFlGBJLbtTjS3V-0ZWU6OpiuVwFYpU_f2P_zTTCIkvmPEwqubrU15ET3&psid=32386909084256603&height=200&width=200&ext=1767365860&hash=AT8uUr_oqvBS3de0vOC1Mcs-",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1CCVlFU-Rra-P3RbGUF2Y7XHy-K7yyEXAZrDheAreNUKHZ__yh-NenRmkh5JTWzqcmSXMIAlmb&psid=25129733460002168&height=200&width=200&ext=1767301062&hash=AT9XpLtjNRm7acIM3ZTXRIeM",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3ij2bkgGHDUobjEn-sS_BkiQ4MZ0RVkUPBp0yCi3QUJd3NC7EsilUICNGFLQ7m325ZAWnsAftp&psid=32541082412205716&height=200&width=200&ext=1767314815&hash=AT-TR3Ns2KDNLZY-ReY0goAH",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2j6UXRiF6iIc0dTLYuPF-cvJNVA1DrkmiYd5I1OUaf7Qqk6beq6JqkvkdnI_CJZuu56kcmxoZd&psid=25019332834375717&height=200&width=200&ext=1767365207&hash=AT_3X_zEUwKsDzTbfc6YJ6E7",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0wLnRNX0nAXWqXQJZDd6ZkCK4zNOHC47TK4MW_50GYbHuhMpqjyw__xrJ4h-OGhYhIQZAqQdZv&psid=25514942561458591&height=200&width=200&ext=1767365860&hash=AT9e3cbDe0knVIbVXS79tA5W",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0xQdgPHfJPOhcPcAuAq3qntpV-b7hIllelYXBF9BYFj5c6vTQ3mX-T0ZK_GKoQnxqV1OfNtJIu&psid=9775923315865535&height=200&width=200&ext=1767321327&hash=AT97OlNqUSuu9Z4B5VLwn8SF",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa08WZ7AdS6uoPqgxoeSbFmYgD6rpeB5hYM49nSlm7ElnVQwG__RLUxpJGyeysk54QE32NFy8Tsg&psid=33124317813849061&height=200&width=200&ext=1767314647&hash=AT8dgRN6LLpHZbSQQG36ib4W",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1sESMNavVv6v9uiLjkPdEOpzJ4Fym4jxMZJo0AwqruZHwCmLRK_NJsBmc3O5LdnSCH8BTeNbff&psid=32450582731251626&height=200&width=200&ext=1767314815&hash=AT-Fi2POYIGZiae0uQ4i49C3",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2Tfs8S_lTSCiDdruMzpLmvFm4X_Z97E3Sh2RHTzoXW4KdLyLSfUtaCVNDzBiLa1_IbMcUpQnkk&psid=24503584665981805&height=200&width=200&ext=1767365860&hash=AT-G7mksEG4CtURRyUhJ1kTd",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1dh_p-ZKOHY34EOkLiYtEoIBxaTnj9aWw6OzANQfVAnEf-FmkfbnvPEo5-GINc139xElxOyIsJ&psid=25169703489347796&height=200&width=200&ext=1767314815&hash=AT_HcQ4LAvBucjZItbiaN56g",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3-n3s2E1kRLhmd7XEtaYuUpOdKilbiFJBb4EKTUs3J38YXUTBNdqmyYglQFul7PKAapaXZDO4D&psid=25612315761726595&height=200&width=200&ext=1767314977&hash=AT9P4Zx-dk45A7dqbrDpqEIs",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3voqakQElWh_IJN2qH8cwjASODuczWuaq7F1UJqG4YQKcR8qPBm2nQbECYdP3xipldbZr8lwiE&psid=32519534807692083&height=200&width=200&ext=1767314815&hash=AT8F0XBh6iWUEybWVPK5q0xn",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1z4XN38v0It_ehfEiS6HFNGZeT-WWLFGGId_4AAOZgRlSxi-q8Z0qIJtx5WtjaWZTZO35rzi48&psid=25035623132726594&height=200&width=200&ext=1767315234&hash=AT8AJDUO6RfFSIILyNGVDscS",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2NA5U45BtJ4T6XMq4-qiuqFdmzfTQKKWUIZKIbn1eZO7-iKgw0wifUWCdysdx1cutmZL697Jqz&psid=25079995944983383&height=200&width=200&ext=1767314977&hash=AT9H4lZEDa5RfG4NFHoC8sFm",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3DgxutS-Fi0vvq8vrAQzB7DP_UTUayGdW--vrPDSoZg3uAvgdckN31G7S_z7DD3Iu1FwFxANnv&psid=25700984036198360&height=200&width=200&ext=1767314977&hash=AT_swbTTqgv9oanFkZLFzt0r",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa07pwukrdfKjAvQJarvcZqv0DYvjdrgEKBpRXvI-Gce8CpGGRgbzNB11suUi93I2NwN54qxplWa&psid=25008165382183217&height=200&width=200&ext=1767315234&hash=AT-BXgjYp0ujXq0GPszL7Wy1",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3xzAsErsf3ZFPwT2YTWV41d2p9W4H1bQXT5Bl-u8SxHZxnY_zJ8XXP_Qw4YAoOwdsETPF5ZVT7&psid=33316279041292515&height=200&width=200&ext=1767321329&hash=AT95mpAfilTJ4-65R4zCeM0R",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3U33cSCUNCMUi1ITp54vOH0DkRl_6A-tZ5vKd69bc76htcVwZ-dnGasogevLOdBU7ctQ2YN0s2&psid=9421976107926481&height=200&width=200&ext=1767315234&hash=AT-ouMUC5HZ5em3dnfnR0ewu",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0kuwuQnmf2ZzXLMUMgNMPGahS_oabJv0FfNabANZPPMXg05D4rJd7Yhk5W7BGRdqOo0loEKcER&psid=32040667358857374&height=200&width=200&ext=1767315234&hash=AT-yt6aRNmKEUrYnw55Zl5y3",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Ed2eW_-mkXAFcuF-0KVSFfS1YAyyrUcW_glAZucj6Ch52Vr35HpcV2htXLGDFYWUBZQW8Ae9x&psid=25017951127876044&height=200&width=200&ext=1767314815&hash=AT9aPg3ZAnKTVsAmMdcf1c6Q",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3C_mcCDeoy7xA1Az_zFSQ2ZGPkHV_dy_tKHO0jZHyZE68sbVDtY3i3LaGNFO_d5_in6H4--nmM&psid=25354509097514527&height=200&width=200&ext=1767315234&hash=AT_7JzZ-x3XaSlPCo7gYCpu9",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3eMfo_UI9islS27GL8Z2MBiK9DgwCIpVHGF2tpTJi4-CvaSHAsLeLi_byrcfo3wLtA-9A59d6H&psid=27158650510438437&height=200&width=200&ext=1767314978&hash=AT8cQM13h6Y-Pmo0p97eWqRB",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0y1TqT4IWVj4FGNvqUqNpI1Kfm4ITYgTDuvqePGJGRqUBieYKobnng1bqlVFEfLvXFG1Ul8PYv&psid=25189623967366838&height=200&width=200&ext=1767314815&hash=AT_fJxXQJn5ucOUk4QzL-SNg",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1QZ6x7finvHnJdDnNSemepKUuKgAWaCI2DtPyziJ_kfBmXUdYBYvyrCuW17f8DVa9hBJ-lv337&psid=24968276479492212&height=200&width=200&ext=1767315234&hash=AT-K-ydR1BcClNymgG7_MEMR",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa04gynF2KnENe872Wv9VMGopVse26MzACHuBfWBSjuGgVyzaTGylWI-JxAK51_XnDIc9q3AmtXW&psid=33198777299706021&height=200&width=200&ext=1767314815&hash=AT8jc1baCRlvUZJ_UCP9L6Ib",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa22OP4J11daHSU_A98OKpl6lMx_BFKFtYl3FZDrd1SWtcQPNspJiwRwBWtEdxJzSVN_AScMxGSR&psid=23999165553108405&height=200&width=200&ext=1767321255&hash=AT_FXwK4METZdbEvcX1Jxh7l",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0UouIB_kT2wM0H0z76FQXLD7NzKn-8Nii2eDDbNulKGO8zq8_2gD7flg-B8BWli4XMkPhDyha0&psid=25551777851092700&height=200&width=200&ext=1767315234&hash=AT_aH5a-fP6WX-0x2p78v1JC",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3QPsFUhMh66sB5STuh0GZDzca8-s5iiNkT7CVnk-9K8_ugucc66duIJ1QXMOSVFP8WHbdLayzi&psid=25117173591300136&height=200&width=200&ext=1767321466&hash=AT--MQxa1ffCy9ae3fmqidq1",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa34GtZ278ICwKN-zJvLVRuQaYrnBe_ZJY5TCSfl6ssbBSuorY2YzasiFv81StCLZyX2shdOSavn&psid=25071561799160757&height=200&width=200&ext=1767301062&hash=AT8rIiXW3kKFpi27E-ET0H_s",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0B5z9fSPmnCt0snCS9rwtLbXdXMU93-IgIzQho25dTwFloUnSrYAqr-bjXPXL86wmiFDO2d8WA&psid=25535578066067637&height=200&width=200&ext=1767314977&hash=AT-SFIx_b3V6M9IU9tUUynXz",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0HurHkfP_-MRc3BrHGh2UQno83eVAnIg3qKIn4ZrBqpFVTkKYRyGuW6ju_oyVwoNXdXjk8V7HU&psid=9455136634610592&height=200&width=200&ext=1767314435&hash=AT-ge8JBSymMyjVc8oC16QHN",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1S20Xv8Bsfs6VsygdQSJ6jMAcI4pUTN8rdwBgElE4n9GEb0lhmL_m76lOufXF_P6i-xhr-ES5F&psid=25550551021247238&height=200&width=200&ext=1767314435&hash=AT-X4FpaWSFMIMflZ02nGFu0",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa36iqIcep119Cgvjv592-k-W-oDwRVHM95hAUXMW_1kpDh2_nNldSU33B1an6YpVXwJ8fF3MCVk&psid=24669292799417208&height=200&width=200&ext=1767314815&hash=AT9PQaVeW3A0MgFcPUGQVE9W",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3rqF80qawPigiBgwLulOGftEKLyDF264Z5nuyXdnuvDPKpL9IzkT9Ym5Uf6Vzlmr4EPqooBNRT&psid=24447970711544880&height=200&width=200&ext=1767314647&hash=AT-rXKKUfG4eJSOvvzn9j5BD",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa062AJsbXByexE9JkKTikQHAnj6WirO93DDLf22L-cUixFzCH182ZjCmTeJCWRmB2W944N2Bbqt&psid=24808918318780428&height=200&width=200&ext=1767314977&hash=AT_RKhl1fns65_QYKaxsXDRU",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Gh-EHw67vJ5uuyOY2Tmlfqv67Ms9SuHB8qDwU_Hknfn4g7zsjixjBQDwuapQVtuhlrrwpY1Qj&psid=25483477674617236&height=200&width=200&ext=1767314977&hash=AT9NvsNKMnk0sOBhwhEdpQVp",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa26dfwknbIEk54x3xbPUY5NqVnewfziauXupO-ScsurjvrzBev09MZtpTPeApAEooUIjA-jnSTH&psid=25400789776253408&height=200&width=200&ext=1767315234&hash=AT-4JkqH6o2SqpkdnhPM5F7H",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3vamgiZJiXdHiv-ewtBG2n6R1WZVGbadkDgZ5Sj4hyQwjA2PAW1n4BOaAKA5qnKc0WgLddKHp8&psid=32832950433018917&height=200&width=200&ext=1767314815&hash=AT_xC9OdicE5myUop62qcDrR",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3GDsP0H3lOWRHFn22BFYnPTtq0I71S44sWLqWIPQwF9r4RE7cwTmNBa9wu9mv7A77ly9JlNs1S&psid=25483275197978848&height=200&width=200&ext=1767315234&hash=AT_0R8bOCnE5jeEc3CzgvjnT",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0jhS7Uc9d_ZrsA0uRUfQVO-ps8PW0Psj8OrCjzuXOGhNcOTgLdso6q1fnRfqnl-oMENg3IV9bW&psid=25039233755686975&height=200&width=200&ext=1767314977&hash=AT8s5oKC1jaBiMA43X6pE2rk",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1h0Sne6EuwJ9szQUf3Aj0b7Flqdx9qR5yxHUUckQCGq-jqv7cMG0ACsCayQQld9W5svGq8Q5rW&psid=25681610908103704&height=200&width=200&ext=1767314977&hash=AT-2VvDWV7ojiKO0KFuOtTrB",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1oQ-mM3k___glW-aCNocSIwn-D9WJJcb5SEcsAmBjsQWVN9TxZz_iHIyVleXhAnk2w88qcDvF7&psid=32729015740047628&height=200&width=200&ext=1767315234&hash=AT-4ew4OvMhlMB9XfPcgUd-5",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1mBN8ETJb0Pf3yW7pzUZGK_2f9TNltJy5E9oMzSVDZR2SRdTvpZwUPc9bPmFCk8wX-yQ2JBi69&psid=24925835970448700&height=200&width=200&ext=1767315352&hash=AT8ouq4hlVuRqKZre88b76KD",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0-8MpGU7T_CPPpYUyLSJqq0Q5mKQjGst4Wao_q-vVnId9qpVNvELba8EfXIUbLwv_W5YigZHXF&psid=32912291621717871&height=200&width=200&ext=1767314977&hash=AT962tHfy7frjKqykm5l4U9a",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0NI3emySMcVZN9WMKJ_PDLltksYL0B80b_VKlD8u2IlzN4GQ48NBXfiUCKKpq5PBQ-gL5WI1D4&psid=24411565351849624&height=200&width=200&ext=1767315234&hash=AT9xlsMbqJ950E3OVj0zo-q1",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa21l3RzshPIL0xk-EiXfHsgv44Qpa03GuJQemkgArmw5yMPvi_JaZmEkqh8tp3KlQuonPhK7DKP&psid=25840517895553262&height=200&width=200&ext=1767315234&hash=AT_h3lgrP9PtDN4B_Xgh-cTl",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2f_RjM5fJ8ZYtsXV8hcxS_8NhG3mdz-cv_QLRN5ZdrtFzJqe0q6-oJe7GyOcprCLUk9TBzJskj&psid=25356073324083901&height=200&width=200&ext=1767314977&hash=AT-ZQrfMgNO1b8_CPLceB5e-",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1NlnMU6SYfJh5uXPpbBEq60gD3sSMnOLHwyLsy4IISWhd-dheR5wsTGIgIvdAx5hu7wlAN3jea&psid=25089285387430302&height=200&width=200&ext=1767315352&hash=AT8QMsp8bUfWJRTb5lKbSCF3",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa10xIe1z2DnsmfcJBD2sp4jjR2K8ytnQcCVboc6dgTMaKiJqyDBZ0MB56AGtSu5OuR9Jfe_p7Ci&psid=24818901364476464&height=200&width=200&ext=1767315352&hash=AT9EPQTFI1nHbjpgcH88BylX",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3tsZXgbnDRr_9CHFP4h9K1zuRlCvYy8qDr7jS8B1_5qM87I3jVJTQD1YYJKpRAOSFXR7hLeBaK&psid=25213042115002607&height=200&width=200&ext=1767315352&hash=AT9NUfWfV7GbNQSZxnfgD56q",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3X_-rkpjn_cSDhR_yyqQ4PDM2kG1opXFQaPnA9e87Tz4nRct3Ry8B4AjIyDoDgFMx8qrWG-vA6&psid=24184478994528604&height=200&width=200&ext=1767315353&hash=AT9lkr0UOVa3ClN4_Ki3EaRK",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2dfAizTdqtvJ8DXr1L7g7fOCNHWTW6JSaoFOwQ3VO3YQghCHfXdG_2UthRJhUOtLSNr5rpHHu-&psid=25239947868993429&height=200&width=200&ext=1767315352&hash=AT84zCJEJgKMUPT_xOyjKKQj",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3SXq-3ZtO7yfR43FO69eCRRwURIIfLoDEx8KWGZTbdDTVvR6QuSDy80WtfmmA-U_OgJQljPHHn&psid=32456203903994641&height=200&width=200&ext=1767321466&hash=AT-2iIBuGDH5o6iGr6Nv759O",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0pMafmJY6cC5RGSd5kiEmk4OE6dRlm_70f1E99ElQee72YRk4pM39OIQtPqDxKhD1MurbSAsmP&psid=24225045017171928&height=200&width=200&ext=1767315352&hash=AT9j24Eju-e2KF0wPxJg9Wcr",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1WRIJS3vESAyl0ioz0cs0VPgRgnfC7FhO1YScTwv77EjVCNL4ZErWfpZ6ynIPoC8muHFLbo_Sf&psid=25664781093127386&height=200&width=200&ext=1767315352&hash=AT8YepySy-andsVOwy2XhrCV",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2vjI0hbwzEwqkh5xCLIQs3ouKq9NaQfownvVDcUIVZTB5lNet54EHLPlPhcjpvf2NO2IWvmPo1&psid=24110991511895221&height=200&width=200&ext=1767315353&hash=AT8aYFX_UwfqThTc9SaAYMKp",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2XdXZ-p7A1fgkNbI4kZJ4zHZ5mrwiqBVdd5tBqqOSbqq5wKsvD3X3lSACnBUdQF8KVumzTIa1L&psid=25539791548965708&height=200&width=200&ext=1767315352&hash=AT9b9o0pupNovEBZ88FgHeqY",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3kl48nWxkD45ybkdlTDWxEwB95b6WTl7uZNIuuGY8vZZtB4B_D1Ns2QUWwha16xF9-sfMcr78E&psid=24873318062339832&height=200&width=200&ext=1767321470&hash=AT_vXb8d9DdMD7ARKBpeYXve",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1XNzuu-ZvJG0iIUTi4xcjHrOJ7drhIKzQ-zRgfdMtyREaXTahu2azU2b2YTE8vCm4lHCksAGkU&psid=25404891085810853&height=200&width=200&ext=1767321471&hash=AT-6aea66ptn9t7JKGv8lVzl",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2l49_jvlo_yRL8R9huSAGmeDDT2UxApfiV00BoC1WO9g8Cdu-NPlvkaSEUTR-rBfLhZZjkaghd&psid=25004932755795418&height=200&width=200&ext=1767321470&hash=AT_wzNPbFkDqTsi9-pqMG6j1",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa38eLmqksgQ_y1R1tCFlM9h83nDHJ22w90u3L4e3h5r8_SwAZEjlPIQqw8PC0rHxo6wnltAxZfH&psid=25098573743146638&height=200&width=200&ext=1767315352&hash=AT_g41d1X8-bUwDl3EZLCd4j",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa31K4dk0-EJoPVIV_Shw_HTwFP_Scgf4oWv2vfoFfbqHPNWNJM9HbKPXQQAXIXWR9cYJX_nl55I&psid=33558737397059080&height=200&width=200&ext=1767321471&hash=AT9oisz2xyFh1JWHUWE9dm2S",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0rWN7l4es_Z3_H_9qXYyMzqZDPYAukpBB-xib_KgZJBXn5rFOjArR8zKgKiJC7h8IgF8J0txCO&psid=25204275755892054&height=200&width=200&ext=1767321470&hash=AT8uzb9tGRZULP59rSDEjIPO",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0cT8S0rp9W_uot_CFF0X5Zl3z89x18jSrMYdlmFqNxum0hrd3ayuDGW5e3i3ZHZ0832RoY9oyq&psid=24941932935506207&height=200&width=200&ext=1767315352&hash=AT-OvSUoamaBy2VHuCLHgNYG",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2Orw7DXDInBKkR-g6Yw6pq_DY8umKSDQTI6JDYCCmgQ9KuXufwnd-Day3a1YH2wXQx__cYvDZu&psid=25288870094101239&height=200&width=200&ext=1767321471&hash=AT-KDNMMuKkwl2g-NK6poWhQ",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3KKatU4X3k4laTmOtROABQbPIHfNg_lMu3lAsln3HVbehBlL8qWiWrfJ02J0r134OwLvpgpArT&psid=25570446659227466&height=200&width=200&ext=1767321471&hash=AT8Gyz-ITW6glIt6XIOOHRVB",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3dFWxCcx_EOqSVUDZYhT3ngWwnyivxW5fFH1foPptqYaSUvJDPTL-x9Yjh6Xh7zdJNoDCtfznP&psid=25271233119153717&height=200&width=200&ext=1767315352&hash=AT9Mh2-aaAqA7Abwe-e79M-X",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2szkaIBf6yoJDSChr-gO0ySVHlFv_WBpvyICygvAilUbVWNVmsy_XrsVig3uvWZeYz2eJi8xmt&psid=25457904593806358&height=200&width=200&ext=1767315585&hash=AT-wSK7LXc6ZhJK_NdmO5igg",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3q_Fbb4BCBi7iAX7jsfDh_EAwu-f9VVONhM_QbY-2FVapLI1-JrsE59rzFLgK8WuhmNeLIhrdN&psid=32491848803796481&height=200&width=200&ext=1767321472&hash=AT_3S03OQjTMDu4IoNBTU0j4",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3mBOY-vNt2z8oHZZpHl36KwjG0NuzIrSXSTIa7zSVdb4Abf4spgH6okX2MjtXPJL1ZOIA8hBy6&psid=25229882043307088&height=200&width=200&ext=1767106017&hash=AT9-3Tm-3NHNciI0nAJN64PX",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0W_MOtmyedSnmVQgsViwfHu88Iqh9WJnRyHUw7KqF5YXdst3YVVV3awcWERLXP-gX7o6e-b869&psid=25126991623618617&height=200&width=200&ext=1767321472&hash=AT8fG93AcRkNlL759hX_az4H",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa20t7LoayRQ6DcF3Wct7DY-e9z1xpPdAJSmwFIbsZKUMYPLAzzUcSjdfjidFrqK3tsDB60IN_op&psid=24193355507007599&height=200&width=200&ext=1767315585&hash=AT-_VaTqqTQjccLO6rl68mpa",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa21P1RK4PUrgVYHkNA3yxVwcABsKF-6o-CdUeRRzdp2E2RK6G_BfuimGYVzJMVS2p6tcfmuivlp&psid=24890588897300387&height=200&width=200&ext=1767321473&hash=AT_DIPIu2nvBLhCppAB8YgbA",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2CsJR2UCIltyqrDMzf6zu098ZS3KBlvAaa4jMwFE3ywjUyfFUeyAUqbLoVX75NUvkUdnIe5pht&psid=24531474659861893&height=200&width=200&ext=1767314977&hash=AT9bfd2glFK7dE1eIjHUWhAt",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2Ffda1jDfILDRQmtigcTwx_fuJVJLHLRQ2haFs2bTKfCbFPkl2weAHj5ZCHvEDoMa_CAemJ3MV&psid=31390871553892097&height=200&width=200&ext=1767321472&hash=AT-lfyHbm0aS4hg7rnRYKHDX",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2ubISzaYtNvWIt64XIX7ezrcm-_cG-n7WyKB8lTjJWTIARKIrcNmgmiH4VGrqcU1H8YScR8PRW&psid=24879136728445134&height=200&width=200&ext=1767321472&hash=AT8pQh-pHsirL302a2s7Jvpt",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2iCEtXE81CDp7P_ccNe2B7S38lTlNwInpl58gxwiPEnJy1mvrrLAD4T54uuuikSTPmd4pcgxiL&psid=25107358348875329&height=200&width=200&ext=1767315352&hash=AT9oShaC2SQyE1IzpLCfRnCj",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1p60izkL6BRh2GXAaGYMpMw6qQoXUmyQGnKrEyUPYdkx4L_rKdKX8MSzXnh1swmgkp2NTNHxqx&psid=25242146572122384&height=200&width=200&ext=1767315585&hash=AT85Q2PqZvT9hf0HctdD0Kz7",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0FK1ChvpvnVRXxvFH80Yu-LvNwXIaKVeCOp-WIVZn7KcbxtqXJW-rK1pE3dU79D7oa6RujKbtV&psid=32495300456782925&height=200&width=200&ext=1767316094&hash=AT8TB9cqeUUumwDBq3KLfmYL",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3d-_Su7eHu09sZ6FbJlrTYkSY4-o6XF3XkMWL3yxeWxjyGlNOYGJdSmSEDIZIKWXQ1EH65yd-P&psid=25382997994667989&height=200&width=200&ext=1767315585&hash=AT_FgTArSCpxUIpJK7E-6C4s",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3y6eR9WiVXHxDOHye-I9m3aPpvC2nXpFDfFGm4i9p4JIiuCI3CAATj9OUYkWqXzHGOJzNyWsCK&psid=25545255828445615&height=200&width=200&ext=1767315585&hash=AT-Z65Y97p1u0ruKYiZkF0rj",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0iHNLSWLE4cNQ4Pnuv2bF0mQovcOKd1tkWpY0mmZwlEtGwUeW1T_R8ut6gIQqYsitSahcEMjob&psid=24615792234766476&height=200&width=200&ext=1767316094&hash=AT_PBKzGsK3bl20ro1JzhZhM",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2qZOVaucuqU-XvdQSJdvQBsqZBBTl6IwE89VVX4cdFwyz8FvKFAWelRAbRMZGXBVsvzmODRail&psid=31515374521410514&height=200&width=200&ext=1767314977&hash=AT9zJxd1TJKZmHudKHBlr1Nv",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0SVjHq2GlLwaTSRkwwwbp4GeXZ-Qy-YvFQzF0n1NtpuTt4U6QeD8LgCsLrynSy7ayaLbtZ4dJZ&psid=25078073781850186&height=200&width=200&ext=1767316094&hash=AT_stRCFPIY_o1pQOTKBqkTz",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2ipkwlN2fa6dEdz-wo3iP7uFTp1lbZ4B7X3HvXZQwEbsOr6EWJq_tGESXAk9Pjdyok8ybbQVj3&psid=9438065136317253&height=200&width=200&ext=1767316094&hash=AT-llFI_IYzHlYwbbJnnmqSS",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2t8HaoeT5xdl5JHMEORviwaVtZS2pQo28tLCQIT9pQNcySV7B2x7m8lnTqdXYnjdWq-WQ2uZVh&psid=24646584518348020&height=200&width=200&ext=1767315585&hash=AT_9b1GAG9RRn6fY7jHKifVU",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2L3mxRB7H-RyvUWszVl81hkcWRtMnN3vHciZ1RqtldqEaA0j2kIGlDC10LIIzW7e7McAJiDMcX&psid=25083995984584325&height=200&width=200&ext=1767315585&hash=AT9vZCxLhgsi5VtXG997xyco",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa20qt5Y-MX5iB6AWHpNd3lLy7kcwwS6VokMNkvbyWXyYT6w6zAZPbzEMZEvuoYdUm1xGFc6-QjY&psid=24976822521969272&height=200&width=200&ext=1767316094&hash=AT_Dt0FckmEiZeuaMDCrGtiN",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa25t6DE9qBwl7GaaiWK_rtqCzkZikDm5HqDHz_fiB-dfvh-4ylb5HkhBAY0q37ZZIr0td3zSnch&psid=25711796605070583&height=200&width=200&ext=1767315585&hash=AT-zDsWXdFyc33hqFvuta57f",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa14wiC-z-88HtlcBnjvKHVq0ijyJ733YZYMF4qGVm6SaKm1aOgltYqAyuGBfAihu-mdV-GQMtuE&psid=24644962781848011&height=200&width=200&ext=1767315234&hash=AT91y5BcIJ0dIzxukA88ol6d",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1lKdDikSua2rPu1kYv7xK-NpFyFBygtvV79M8U-opwRisV48XYS4BzvVxAvYcRP7zgYL1PeRp-&psid=24773456869021581&height=200&width=200&ext=1767314647&hash=AT9uBt8k5w7YL1cAdrnSnkOd",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0nifklA-Eac5fmu9rxkg-1rO1VTjrKq745I-mdpDBM-qTPUNyoXYXHNr8Y4bzeFXzDshsH81gC&psid=25086463947679297&height=200&width=200&ext=1767315585&hash=AT8GbHp7TqLecPKfKxRT9bTp",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0_JdjlWF41f11sMoYYbj4gvtBD_7XPWnegwBAMgrtgpwzR9ilZNjZeXZaYtaC0mrOyjclwcxug&psid=25359571610345110&height=200&width=200&ext=1767315585&hash=AT9D0dhiMf9qVlj-JIDiNJR3",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2jkM3kuODKDUTwBmwTfGUoWIUgk8sbB7rlKkmPPkwvVR9NN2nzE2M-Nt4h6HcLUg-hWM0hHbzL&psid=25297217843266757&height=200&width=200&ext=1767321472&hash=AT_ux325wcUxPR3ZAEX1y_vW",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1VI3_rlcNnzwxLelZ3l70nu5owUjMXllUKIwaDvI9WtVKH4e7ILn_VjUTjGxYk-17csirNHQI0&psid=24782258684808369&height=200&width=200&ext=1767315585&hash=AT9e2hvlg9kQV_PkTnMIleoB",
  "https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa04j33l-Bi2uw_mxLS4P8gnMcm6R9gChI0bND_YVxln9RpFQkU0t8fZ3v0NqwW54Q0dpVqmpMqu&psid=25009314332044501&height=200&width=200&ext=1767315585&hash=AT9rPQ0yocGseaQF8N3OXddi"
]

// Extraer todos los psid únicos de las URLs
const allPsids = new Set()
networkUrls.forEach(url => {
  const psid = extractPsidFromUrl(url)
  if (psid) {
    allPsids.add(psid)
  }
})

info(`Se encontraron ${allPsids.size} IDs únicos en las requests de red.`)

// Filtrar solo los nuevos IDs
const newIds = new Set()
allPsids.forEach(psid => {
  if (!existingIds.has(psid)) {
    newIds.add(psid)
  }
})

if (newIds.size > 0) {
  info(`Se encontraron ${newIds.size} nuevos IDs.`)
  const newIdsArray = Array.from(newIds).sort()
  const output = newIdsArray.join('\n') + '\n'

  fs.appendFileSync(csvPath, output, 'utf8')
  newIdsArray.forEach(id => existingIds.add(id)) // Actualizar el set de IDs existentes
  success(`Se agregaron ${newIds.size} nuevos IDs a ${csvPath}. Total de IDs: ${existingIds.size}`)
  
  // Mostrar algunos de los nuevos IDs
  const sampleIds = Array.from(newIds).slice(0, 10)
  info(`Ejemplos de nuevos IDs: ${sampleIds.join(', ')}`)
} else {
  warn('No se encontraron nuevos IDs en las requests de red.')
  info(`Total de IDs únicos encontrados: ${allPsids.size}`)
  info(`Total de IDs en CSV: ${existingIds.size}`)
}

log('Script finalizado.', 'cyan')

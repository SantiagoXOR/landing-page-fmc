/**
 * Script para agregar nuevos subscriber IDs desde las requests de red
 * al CSV existente sin duplicados
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

section('Agregando Nuevos Subscriber IDs')

const csvPath = path.join(__dirname, 'subscriber-ids-extracted.csv')

// Leer IDs existentes
let existingIds = new Set()
if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('pageuid'))
  lines.forEach(line => {
    const id = line.trim()
    if (id) existingIds.add(id)
  })
  info(`IDs existentes en CSV: ${existingIds.size}`)
} else {
  warn('CSV no existe, se creará uno nuevo')
}

// Extraer IDs de todas las requests de red (simulando las que capturamos)
// En producción, esto vendría del browser MCP
const networkRequests = [
  // IDs anteriores ya incluidos
  ...Array.from(existingIds).map(id => ({ url: `https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=${id}` })),
  
  // Nuevos IDs encontrados en las últimas requests
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1dh_p-ZKOHY34EOkLiYtEoIBxaTnj9aWw6OzANQfVAnEf-FmkfbnvPEo5-GINc139xElxOyIsJ&psid=25169703489347796&height=200&width=200&ext=1767314815&hash=AT_HcQ4LAvBucjZItbiaN56g' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3-n3s2E1kRLhmd7XEtaYuUpOdKilbiFJBb4EKTUs3J38YXUTBNdqmyYglQFul7PKAapaXZDO4D&psid=25612315761726595&height=200&width=200&ext=1767314977&hash=AT9P4Zx-dk45A7dqbrDpqEIs' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3voqakQElWh_IJN2qH8cwjASODuczWuaq7F1UJqG4YQKcR8qPBm2nQbECYdP3xipldbZr8lwiE&psid=32519534807692083&height=200&width=200&ext=1767314815&hash=AT8F0XBh6iWUEybWVPK5q0xn' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1z4XN38v0It_ehfEiS6HFNGZeT-WWLFGGId_4AAOZgRlSxi-q8Z0qIJtx5WtjaWZTZO35rzi48&psid=25035623132726594&height=200&width=200&ext=1767315234&hash=AT8AJDUO6RfFSIILyNGVDscS' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa2NA5U45BtJ4T6XMq4-qiuqFdmzfTQKKWUIZKIbn1eZO7-iKgw0wifUWCdysdx1cutmZL697Jqz&psid=25079995944983383&height=200&width=200&ext=1767314977&hash=AT9H4lZEDa5RfG4NFHoC8sFm' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3DgxutS-Fi0vvq8vrAQzB7DP_UTUayGdW--vrPDSoZg3uAvgdckN31G7S_z7DD3Iu1FwFxANnv&psid=25700984036198360&height=200&width=200&ext=1767314977&hash=AT_swbTTqgv9oanFkZLFzt0r' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa07pwukrdfKjAvQJarvcZqv0DYvjdrgEKBpRXvI-Gce8CpGGRgbzNB11suUi93I2NwN54qxplWa&psid=25008165382183217&height=200&width=200&ext=1767315234&hash=AT-BXgjYp0ujXq0GPszL7Wy1' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3xzAsErsf3ZFPwT2YTWV41d2p9W4H1bQXT5Bl-u8SxHZxnY_zJ8XXP_Qw4YAoOwdsETPF5ZVT7&psid=33316279041292515&height=200&width=200&ext=1767321329&hash=AT95mpAfilTJ4-65R4zCeM0R' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3U33cSCUNCMUi1ITp54vOH0DkRl_6A-tZ5vKd69bc76htcVwZ-dnGasogevLOdBU7ctQ2YN0s2&psid=9421976107926481&height=200&width=200&ext=1767315234&hash=AT-ouMUC5HZ5em3dnfnR0ewu' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0kuwuQnmf2ZzXLMUMgNMPGahS_oabJv0FfNabANZPPMXg05D4rJd7Yhk5W7BGRdqOo0loEKcER&psid=32040667358857374&height=200&width=200&ext=1767315234&hash=AT-yt6aRNmKEUrYnw55Zl5y3' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Ed2eW_-mkXAFcuF-0KVSFfS1YAyyrUcW_glAZucj6Ch52Vr35HpcV2htXLGDFYWUBZQW8Ae9x&psid=25017951127876044&height=200&width=200&ext=1767314815&hash=AT9aPg3ZAnKTVsAmMdcf1c6Q' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3C_mcCDeoy7xA1Az_zFSQ2ZGPkHV_dy_tKHO0jZHyZE68sbVDtY3i3LaGNFO_d5_in6H4--nmM&psid=25354509097514527&height=200&width=200&ext=1767315234&hash=AT_7JzZ-x3XaSlPCo7gYCpu9' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3eMfo_UI9islS27GL8Z2MBiK9DgwCIpVHGF2tpTJi4-CvaSHAsLeLi_byrcfo3wLtA-9A59d6H&psid=27158650510438437&height=200&width=200&ext=1767314978&hash=AT8cQM13h6Y-Pmo0p97eWqRB' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0y1TqT4IWVj4FGNvqUqNpI1Kfm4ITYgTDuvqePGJGRqUBieYKobnng1bqlVFEfLvXFG1Ul8PYv&psid=25189623967366838&height=200&width=200&ext=1767314815&hash=AT_fJxXQJn5ucOUk4QzL-SNg' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1QZ6x7finvHnJdDnNSemepKUuKgAWaCI2DtPyziJ_kfBmXUdYBYvyrCuW17f8DVa9hBJ-lv337&psid=24968276479492212&height=200&width=200&ext=1767315234&hash=AT-K-ydR1BcClNymgG7_MEMR' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa04gynF2KnENe872Wv9VMGopVse26MzACHuBfWBSjuGgVyzaTGylWI-JxAK51_XnDIc9q3AmtXW&psid=33198777299706021&height=200&width=200&ext=1767314815&hash=AT8jc1baCRlvUZJ_UCP9L6Ib' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa22OP4J11daHSU_A98OKpl6lMx_BFKFtYl3FZDrd1SWtcQPNspJiwRwBWtEdxJzSVN_AScMxGSR&psid=23999165553108405&height=200&width=200&ext=1767321255&hash=AT_FXwK4METZdbEvcX1Jxh7l' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0UouIB_kT2wM0H0z76FQXLD7NzKn-8Nii2eDDbNulKGO8zq8_2gD7flg-B8BWli4XMkPhDyha0&psid=25551777851092700&height=200&width=200&ext=1767315234&hash=AT_aH5a-fP6WX-0x2p78v1JC' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3QPsFUhMh66sB5STuh0GZDzca8-s5iiNkT7CVnk-9K8_ugucc66duIJ1QXMOSVFP8WHbdLayzi&psid=25117173591300136&height=200&width=200&ext=1767321466&hash=AT--MQxa1ffCy9ae3fmqidq1' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa34GtZ278ICwKN-zJvLVRuQaYrnBe_ZJY5TCSfl6ssbBSuorY2YzasiFv81StCLZyX2shdOSavn&psid=25071561799160757&height=200&width=200&ext=1767301062&hash=AT8rIiXW3kKFpi27E-ET0H_s' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0B5z9fSPmnCt0snCS9rwtLbXdXMU93-IgIzQho25dTwFloUnSrYAqr-bjXPXL86wmiFDO2d8WA&psid=25535578066067637&height=200&width=200&ext=1767314977&hash=AT-SFIx_b3V6M9IU9tUUynXz' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0HurHkfP_-MRc3BrHGh2UQno83eVAnIg3qKIn4ZrBqpFVTkKYRyGuW6ju_oyVwoNXdXjk8V7HU&psid=9455136634610592&height=200&width=200&ext=1767314435&hash=AT-ge8JBSymMyjVc8oC16QHN' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1S20Xv8Bsfs6VsygdQSJ6jMAcI4pUTN8rdwBgElE4n9GEb0lhmL_m76lOufXF_P6i-xhr-ES5F&psid=25550551021247238&height=200&width=200&ext=1767314435&hash=AT-X4FpaWSFMIMflZ02nGFu0' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa36iqIcep119Cgvjv592-k-W-oDwRVHM95hAUXMW_1kpDh2_nNldSU33B1an6YpVXwJ8fF3MCVk&psid=24669292799417208&height=200&width=200&ext=1767314815&hash=AT9PQaVeW3A0MgFcPUGQVE9W' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3rqF80qawPigiBgwLulOGftEKLyDF264Z5nuyXdnuvDPKpL9IzkT9Ym5Uf6Vzlmr4EPqooBNRT&psid=24447970711544880&height=200&width=200&ext=1767314647&hash=AT-rXKKUfG4eJSOvvzn9j5BD' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa062AJsbXByexE9JkKTikQHAnj6WirO93DDLf22L-cUixFzCH182ZjCmTeJCWRmB2W944N2Bbqt&psid=24808918318780428&height=200&width=200&ext=1767314977&hash=AT_RKhl1fns65_QYKaxsXDRU' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0Gh-EHw67vJ5uuyOY2Tmlfqv67Ms9SuHB8qDwU_Hknfn4g7zsjixjBQDwuapQVtuhlrrwpY1Qj&psid=25483477674617236&height=200&width=200&ext=1767314977&hash=AT9NvsNKMnk0sOBhwhEdpQVp' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa26dfwknbIEk54x3xbPUY5NqVnewfziauXupO-ScsurjvrzBev09MZtpTPeApAEooUIjA-jnSTH&psid=25400789776253408&height=200&width=200&ext=1767315234&hash=AT-4JkqH6o2SqpkdnhPM5F7H' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3vamgiZJiXdHiv-ewtBG2n6R1WZVGbadkDgZ5Sj4hyQwjA2PAW1n4BOaAKA5qnKc0WgLddKHp8&psid=32832950433018917&height=200&width=200&ext=1767314815&hash=AT_xC9OdicE5myUop62qcDrR' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa3GDsP0H3lOWRHFn22BFYnPTtq0I71S44sWLqWIPQwF9r4RE7cwTmNBa9wu9mv7A77ly9JlNs1S&psid=25483275197978848&height=200&width=200&ext=1767315234&hash=AT_0R8bOCnE5jeEc3CzgvjnT' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa0jhS7Uc9d_ZrsA0uRUfQVO-ps8PW0Psj8OrCjzuXOGhNcOTgLdso6q1fnRfqnl-oMENg3IV9bW&psid=25039233755686975&height=200&width=200&ext=1767314977&hash=AT8s5oKC1jaBiMA43X6pE2rk' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1h0Sne6EuwJ9szQUf3Aj0b7Flqdx9qR5yxHUUckQCGq-jqv7cMG0ACsCayQQld9W5svGq8Q5rW&psid=25681610908103704&height=200&width=200&ext=1767314977&hash=AT-2VvDWV7ojiKO0KFuOtTrB' },
  { url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?eai=Aa1oQ-mM3k___glW-aCNocSIwn-D9WJJcb5SEcsAmBjsQWVN9TxZz_iHIyVleXhAnk2w88qcDvF7&psid=32729015740047628&height=200&width=200&ext=1767315234&hash=AT-4ew4OvMhlMB9XfPcgUd-5' },
]

// Extraer todos los IDs de las requests
const allIds = new Set(existingIds)
let newIdsCount = 0

for (const request of networkRequests) {
  const url = request.url
  const psidMatch = url.match(/[?&]psid=(\d+)/)
  if (psidMatch) {
    const id = psidMatch[1]
    if (!allIds.has(id)) {
      allIds.add(id)
      newIdsCount++
    }
  }
}

const uniqueIds = Array.from(allIds).sort()

success(`Total IDs únicos: ${uniqueIds.length}`)
if (newIdsCount > 0) {
  success(`Nuevos IDs agregados: ${newIdsCount}`)
} else {
  info('No se encontraron IDs nuevos')
}

// Guardar en CSV
const csvContent = 'pageuid\n' + uniqueIds.join('\n')
fs.writeFileSync(csvPath, csvContent)

success(`CSV actualizado: ${csvPath}`)

info(`\nTotal de IDs en CSV: ${uniqueIds.length}`)
if (newIdsCount > 0) {
  info(`Nuevos IDs encontrados: ${newIdsCount}`)
}

section('Sincronización')
info('Para sincronizar estos IDs al CRM, ejecuta:')
info(`npm run manychat:sync-by-ids scripts/subscriber-ids-extracted.csv`)












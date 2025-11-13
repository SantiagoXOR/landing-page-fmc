/**
 * Script de diagnóstico para verificar el sistema de permisos
 * Ejecutar con: node diagnose-permissions.js
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function makeRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.text();
    return { error: `${response.status} - ${error}`, data: null };
  }

  return { data: await response.json(), error: null };
}

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE PERMISOS\n');
  console.log('='.repeat(60));
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Variables de entorno no configuradas');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SERVICE_ROLE_KEY);
    return;
  }

  console.log('✅ Variables de entorno configuradas\n');

  // 1. Verificar tabla de usuarios (probar ambas variantes)
  console.log('📋 1. VERIFICANDO TABLA DE USUARIOS');
  console.log('-'.repeat(60));
  
  let usersTable = null;
  let { data: users1, error: error1 } = await makeRequest('/User?select=*&limit=5');
  
  if (!error1 && users1) {
    usersTable = 'User';
    console.log(`✅ Tabla "User" encontrada (${users1.length} registros)`);
    console.log('   Usuarios:');
    users1.forEach(u => {
      console.log(`   - ${u.email} | Rol: ${u.role || u.rol} | Status: ${u.status || 'N/A'}`);
    });
  } else {
    console.log('⚠️  Tabla "User" no encontrada o error:', error1);
  }

  let { data: users2, error: error2 } = await makeRequest('/users?select=*&limit=5');
  
  if (!error2 && users2) {
    usersTable = usersTable || 'users';
    console.log(`✅ Tabla "users" encontrada (${users2.length} registros)`);
    console.log('   Usuarios:');
    users2.forEach(u => {
      console.log(`   - ${u.email} | Rol: ${u.role || u.rol} | Status: ${u.status || 'N/A'}`);
    });
  } else {
    console.log('⚠️  Tabla "users" no encontrada o error:', error2);
  }

  if (!usersTable) {
    console.error('❌ No se encontró ninguna tabla de usuarios');
    return;
  }

  console.log('\n');

  // 2. Verificar tablas de permisos
  console.log('🔐 2. VERIFICANDO TABLAS DE PERMISOS');
  console.log('-'.repeat(60));
  
  const { data: permissions, error: permError } = await makeRequest('/permissions?select=*&limit=5');
  if (!permError && permissions) {
    console.log(`✅ Tabla "permissions" existe (${permissions.length} registros)`);
    if (permissions.length > 0) {
      console.log('   Ejemplos:');
      permissions.forEach(p => {
        console.log(`   - ${p.name}: ${p.resource}:${p.action}`);
      });
    }
  } else {
    console.log('❌ Tabla "permissions" no existe o error:', permError);
  }

  const { data: rolePerms, error: rolePermError } = await makeRequest('/role_permissions?select=*&limit=5');
  if (!rolePermError && rolePerms) {
    console.log(`✅ Tabla "role_permissions" existe (${rolePerms.length} registros)`);
  } else {
    console.log('❌ Tabla "role_permissions" no existe o error:', rolePermError);
  }

  const { data: userPerms, error: userPermError } = await makeRequest('/user_permissions?select=*&limit=5');
  if (!userPermError && userPerms) {
    console.log(`✅ Tabla "user_permissions" existe (${userPerms.length} registros)`);
  } else {
    console.log('❌ Tabla "user_permissions" no existe o error:', userPermError);
  }

  console.log('\n');

  // 3. Verificar función RPC
  console.log('⚙️  3. VERIFICANDO FUNCIÓN RPC user_has_permission');
  console.log('-'.repeat(60));
  
  const testUserId = users1?.[0]?.id || users2?.[0]?.id;
  if (testUserId) {
    const { data: rpcResult, error: rpcError } = await makeRequest(
      `/rpc/user_has_permission?p_user_id=${testUserId}&p_resource=leads&p_action=read`
    );
    
    if (!rpcError) {
      console.log('✅ Función RPC existe y responde:', rpcResult);
    } else {
      console.log('❌ Función RPC no existe o error:', rpcError);
    }
  } else {
    console.log('⚠️  No se puede probar RPC sin un ID de usuario');
  }

  console.log('\n');

  // 4. Resumen y Recomendaciones
  console.log('📊 4. RESUMEN Y RECOMENDACIONES');
  console.log('='.repeat(60));
  
  const hasPermissionsTables = !permError && !rolePermError && !userPermError;
  const hasRPC = testUserId && rpcResult !== undefined;
  
  if (hasPermissionsTables && hasRPC) {
    console.log('✅ Sistema completo de permisos granulares está configurado');
    console.log('   Recomendación: Verificar que los datos estén correctamente poblados');
  } else if (!hasPermissionsTables) {
    console.log('❌ Sistema de permisos granulares NO está configurado');
    console.log('   Recomendación: Simplificar checkUserPermission para usar solo roles');
    console.log('   📝 El sistema debe basarse únicamente en el rol del usuario');
  } else {
    console.log('⚠️  Sistema parcialmente configurado');
    console.log('   Recomendación: Completar configuración o simplificar a solo roles');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnóstico completado\n');
}

diagnose().catch(console.error);





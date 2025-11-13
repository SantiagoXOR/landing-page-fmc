#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

console.log('🧪 Running all tests for Phorencial CRM\n')

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${description}`)
    console.log(`Running: ${command} ${args.join(' ')}\n`)
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve(__dirname, '..')
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - PASSED\n`)
        resolve()
      } else {
        console.log(`❌ ${description} - FAILED (exit code: ${code})\n`)
        reject(new Error(`${description} failed`))
      }
    })
    
    process.on('error', (error) => {
      console.log(`❌ ${description} - ERROR: ${error.message}\n`)
      reject(error)
    })
  })
}

async function main() {
  const testSuites = [
    {
      command: 'npm',
      args: ['run', 'lint'],
      description: 'ESLint - Code Quality Check'
    },
    {
      command: 'npm',
      args: ['run', 'test:jest'],
      description: 'Jest - Unit Tests'
    },
    {
      command: 'npm',
      args: ['run', 'build'],
      description: 'Next.js Build - Compilation Check'
    }
  ]
  
  // Only run E2E tests if explicitly requested
  if (process.argv.includes('--e2e')) {
    testSuites.push({
      command: 'npm',
      args: ['run', 'test:e2e'],
      description: 'Playwright - E2E Tests'
    })
  }
  
  let passed = 0
  let failed = 0
  
  for (const suite of testSuites) {
    try {
      await runCommand(suite.command, suite.args, suite.description)
      passed++
    } catch (error) {
      failed++
      
      // Continue with other tests even if one fails
      console.log(`Continuing with remaining tests...\n`)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📋 Total:  ${passed + failed}`)
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.')
    process.exit(1)
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Tests interrupted by user')
  process.exit(1)
})

main().catch((error) => {
  console.error('\n❌ Test runner error:', error.message)
  process.exit(1)
})

/**
 * TestReporter - Generate detailed test reports
 * Supports multiple formats: Console, Markdown, JSON
 */

import { TestLogger, LogLevel } from './TestLogger'

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  logs?: any[]
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  startTime: number
  endTime: number
}

export class TestReporter {
  private suites: TestSuite[] = []
  private currentSuite: TestSuite | null = null

  startSuite(name: string) {
    this.currentSuite = {
      name,
      tests: [],
      startTime: Date.now(),
      endTime: 0,
    }
  }

  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now()
      this.suites.push(this.currentSuite)
      this.currentSuite = null
    }
  }

  addTest(result: TestResult) {
    if (this.currentSuite) {
      this.currentSuite.tests.push(result)
    }
  }

  // Generate console report
  printConsoleReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 TEST REPORT')
    console.log('='.repeat(80) + '\n')

    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0
    let totalDuration = 0

    this.suites.forEach(suite => {
      const passed = suite.tests.filter(t => t.status === 'pass').length
      const failed = suite.tests.filter(t => t.status === 'fail').length
      const skipped = suite.tests.filter(t => t.status === 'skip').length
      const duration = suite.endTime - suite.startTime

      totalTests += suite.tests.length
      totalPassed += passed
      totalFailed += failed
      totalSkipped += skipped
      totalDuration += duration

      console.log(`📦 ${suite.name}`)
      console.log(`   Tests: ${suite.tests.length} | ✅ ${passed} | ❌ ${failed} | ⏭️  ${skipped}`)
      console.log(`   Duration: ${duration}ms`)

      // Show failed tests
      suite.tests.filter(t => t.status === 'fail').forEach(test => {
        console.log(`   ❌ ${test.name}`)
        if (test.error) {
          console.log(`      Error: ${test.error}`)
        }
      })

      console.log('')
    })

    console.log('─'.repeat(80))
    console.log(`📊 SUMMARY`)
    console.log(`   Total: ${totalTests} tests`)
    console.log(`   ✅ Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`)
    console.log(`   ❌ Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`)
    console.log(`   ⏭️  Skipped: ${totalSkipped}`)
    console.log(`   ⏱️  Duration: ${totalDuration}ms`)
    console.log('='.repeat(80) + '\n')
  }

  // Generate markdown report
  generateMarkdownReport(): string {
    let md = '# Test Report\n\n'
    md += `**Generated:** ${new Date().toISOString()}\n\n`

    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0

    this.suites.forEach(suite => {
      const passed = suite.tests.filter(t => t.status === 'pass').length
      const failed = suite.tests.filter(t => t.status === 'fail').length
      const skipped = suite.tests.filter(t => t.status === 'skip').length

      totalTests += suite.tests.length
      totalPassed += passed
      totalFailed += failed
      totalSkipped += skipped

      md += `## ${suite.name}\n\n`
      md += `- **Tests:** ${suite.tests.length}\n`
      md += `- **Passed:** ✅ ${passed}\n`
      md += `- **Failed:** ❌ ${failed}\n`
      md += `- **Skipped:** ⏭️ ${skipped}\n`
      md += `- **Duration:** ${suite.endTime - suite.startTime}ms\n\n`

      if (failed > 0) {
        md += `### Failed Tests\n\n`
        suite.tests.filter(t => t.status === 'fail').forEach(test => {
          md += `- ❌ **${test.name}**\n`
          if (test.error) {
            md += `  - Error: \`${test.error}\`\n`
          }
        })
        md += '\n'
      }
    })

    md += `## Summary\n\n`
    md += `| Metric | Value |\n`
    md += `|--------|-------|\n`
    md += `| Total Tests | ${totalTests} |\n`
    md += `| Passed | ✅ ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%) |\n`
    md += `| Failed | ❌ ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%) |\n`
    md += `| Skipped | ⏭️ ${totalSkipped} |\n`

    return md
  }

  // Generate JSON report
  generateJSONReport(): string {
    return JSON.stringify({
      generated: new Date().toISOString(),
      suites: this.suites,
      summary: this.getSummary(),
    }, null, 2)
  }

  // Get summary statistics
  getSummary() {
    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0
    let totalDuration = 0

    this.suites.forEach(suite => {
      totalTests += suite.tests.length
      totalPassed += suite.tests.filter(t => t.status === 'pass').length
      totalFailed += suite.tests.filter(t => t.status === 'fail').length
      totalSkipped += suite.tests.filter(t => t.status === 'skip').length
      totalDuration += suite.endTime - suite.startTime
    })

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      passRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
    }
  }
}

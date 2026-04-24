/**
 * Engine Parity Test: JS vs Python
 * Runs faarfieldEngine.js on KLHX Section 6627 with hardcoded traffic,
 * compares against known Python CDF values.
 * Tolerance: 0.1% relative error.
 *
 * Run: node scripts/engine_parity_test.js
 */

import {
  analyzeSection, odemarkSubgradeStrain, westergaardPccStress,
  burmisterAcStrain, acFatigueLife, subgradeRuttingLife, pccFatigueLife,
  cbrToModulus, modulusToK
} from '../website/src/engine/faarfieldEngine.js'

import { readFileSync, writeFileSync } from 'fs'

// Load traffic from JSON
const traffic = JSON.parse(readFileSync('website/src/data/traffic.json', 'utf-8'))
const klhxTraffic = traffic.KLHX.aircraft.map(a => ({
  type: a.type, mtow: a.mtow, gear: a.gear, annual_deps: a.annual_deps
}))

// KLHX Section 6627 layers
const layers = [
  { type: 'P-401 AC', h: 2.5, E: 200000, nu: 0.35 },
  { type: 'P-501 PCC', h: 6.0, E: 4000000, nu: 0.15 },
  { type: 'Subgrade', h: 9999, E: 10500, nu: 0.40 },
]

console.log('=== FAARFIELD Engine Parity Test ===')
console.log('Section: KLHX 6627 (2.5" AC + 6" PCC, CBR=7)')
console.log(`Traffic: ${klhxTraffic.length} aircraft, Growth: 3.2%, Life: 20yr, FR: 700 psi`)
console.log('')

// Run JS engine
const result = analyzeSection(layers, klhxTraffic, 0.032, 20, 700)

// Python reference values (from all_airports_cdf.py run)
const pyRef = {
  cdf_ac:  8.636642e-07,
  cdf_sub: 4.449370e-09,
  cdf_pcc: 1.015172e+01,
}

function pctError(js, py) {
  if (py === 0) return js === 0 ? 0 : Infinity
  return Math.abs((js - py) / py) * 100
}

const results = [
  { mode: 'AC Fatigue',       js: result.cdf_ac,  py: pyRef.cdf_ac },
  { mode: 'Subgrade Rutting', js: result.cdf_sub, py: pyRef.cdf_sub },
  { mode: 'PCC Fatigue',      js: result.cdf_pcc, py: pyRef.cdf_pcc },
]

console.log('Failure Mode        |    JS Value    |   Python Value  |  Error %  | Pass?')
console.log('-'.repeat(80))

let allPass = true
const lines = ['FAARFIELD Engine Parity Test — KLHX Section 6627', '']

for (const r of results) {
  const err = pctError(r.js, r.py)
  const pass = err < 0.1
  if (!pass) allPass = false
  const line = `${r.mode.padEnd(20)}| ${r.js.toExponential(6).padStart(14)} | ${r.py.toExponential(6).padStart(15)} | ${err.toFixed(4).padStart(8)}% | ${pass ? 'PASS' : 'FAIL'}`
  console.log(line)
  lines.push(line)
}

console.log('')
console.log(`CDF_max: JS=${result.cdf_max.toExponential(6)}, Python=${pyRef.cdf_pcc.toExponential(6)}`)
console.log(`Controlling: ${result.controlling}`)
console.log(`Adequate: ${result.adequate}`)
console.log('')
console.log(allPass ? 'ALL PASS — JS engine matches Python within 0.1%' : 'FAIL — JS/Python drift detected')

lines.push('', `Overall: ${allPass ? 'ALL PASS' : 'FAIL'}`)

// Also test individual functions
console.log('')
console.log('=== Individual Function Checks ===')
const testLoad = 18000  // typical tire load
const testPress = 170   // typical tire pressure

const { epsZ } = odemarkSubgradeStrain(layers, testLoad, testPress)
const sigmaPcc = westergaardPccStress(layers, testLoad, testPress)
const epsH = burmisterAcStrain(layers, testLoad, testPress)
const nfAc = acFatigueLife(epsH, 200000)
const nfSub = subgradeRuttingLife(epsZ, 10500)
const nfPcc = pccFatigueLife(sigmaPcc, 700)

console.log(`Odemark eps_z:    ${epsZ.toExponential(4)}`)
console.log(`Westergaard sig:  ${sigmaPcc.toFixed(1)} psi`)
console.log(`Burmister eps_h:  ${epsH.toExponential(4)}`)
console.log(`Nf_AC:            ${nfAc.toExponential(4)}`)
console.log(`Nf_Sub:           ${nfSub.toExponential(4)}`)
console.log(`Nf_PCC:           ${nfPcc.toExponential(4)}`)
console.log(`CBR 7 -> E=${cbrToModulus(7)}, k=${modulusToK(cbrToModulus(7)).toFixed(1)}`)

// Save results
writeFileSync('results/parity_test.txt', lines.join('\n'))
console.log('\nResults saved to results/parity_test.txt')

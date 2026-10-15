import path from 'node:path'
import os from 'node:os'
import { lstat } from 'node:fs/promises'
import { validateConfig, validateReceipt } from './policy.mjs'

export function stagingApi(port) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_QA_PORT')
  return `https://10.0.2.2:${port}`
}
export async function stagingRoot(root) {
  const absolute = path.resolve(root)
  if (!path.isAbsolute(root) || path.dirname(absolute) !== path.resolve(os.tmpdir()) ||
      !path.basename(absolute).startsWith('emcoin-native-stage-') || (await lstat(absolute)).isSymbolicLink()) throw Error('INVALID_QA_ROOT')
  return absolute
}
export function validateStagingReceipt(receipt, files, port) {
  if (receipt.profile !== 'emcoin-local-android/v1' || receipt.applicationId !== 'cloud.emcoin.app.staging' || receipt.api !== stagingApi(port)) throw Error('INVALID_QA_RECEIPT')
  // Reuse exact file/worker/secret checks without broadening the production API policy.
  validateReceipt({ ...receipt, api: 'https://app.emcoin.cloud' }, files)
}
export function stagingConfig(base) {
  validateConfig(base)
  return { ...base, appId: 'cloud.emcoin.app.staging', appName: 'EmCoin QA' }
}

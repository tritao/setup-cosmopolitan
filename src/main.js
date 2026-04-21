import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import https from 'https'

const apeInstallUrl =
  'https://raw.githubusercontent.com/jart/cosmopolitan/master/ape/apeinstall.sh'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const version = core.getInput('version', { required: true })

    const userPath = core.getInput('path', { required: false })
    if (userPath[0] === '/' || userPath[0] === '~') {
      throw new Error('Path must be relative to the workspace')
    }

    const cachedDir = tc.find('cosmocc', version)
    if (fs.existsSync(cachedDir)) {
      core.addPath(path.join(cachedDir, 'bin'))
      await install(cachedDir)
      return
    }

    const cosmopolitanPath = path.join(process.env.GITHUB_WORKSPACE, userPath)

    const cacheKey = `cosmocc-${version}`
    const cacheKeyId = await cache.restoreCache([cosmopolitanPath], cacheKey)
    if (cacheKeyId !== undefined) {
      core.addPath(path.join(cosmopolitanPath, 'bin'))
      await install(cosmopolitanPath)
      return
    }

    const urlBase = 'https://cosmo.zip/pub/cosmocc/'
    const url =
      version === 'latest'
        ? `${urlBase}cosmocc.zip`
        : `${urlBase}cosmocc-${version}.zip`
    const cosmopolitan = await tc.downloadTool(url)
    await tc.extractZip(cosmopolitan, cosmopolitanPath)
    core.addPath(path.join(cosmopolitanPath, 'bin'))

    const cachedPath = await tc.cacheDir(cosmopolitanPath, 'cosmocc', version)
    await cache.saveCache([cosmopolitanPath], cacheKey)

    await install(cachedPath)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

const downloadScript = async (url, destination) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)
    https
      .get(url, response => {
        response.pipe(file)
        file.on('finish', () => {
          file.close(() => resolve(destination))
        })
      })
      .on('error', err => {
        fs.unlink(destination)
        reject(err.message)
      })
  })
}

async function install(cosmopolitanPath) {
  https.get
  await downloadScript(apeInstallUrl, 'apeinstall.sh')

  fs.chmodSync('apeinstall.sh', 0o755)

  exec(
    `sudo sh -c "COSMO=${cosmopolitanPath} ./apeinstall.sh"`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error}`)
        return
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`)
      }
      console.log(`Script output: ${stdout}`)
    }
  )
}

export { run }

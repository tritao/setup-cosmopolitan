const cache = require('@actions/cache')
const core = require('@actions/core')
const tc = require('@actions/tool-cache')

const fs = require('fs')
const path = require('path')

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
      return
    }

    const cosmopolitanPath = path.join(process.env.GITHUB_WORKSPACE, userPath)

    const cacheKey = `cosmocc-${version}`
    const cacheKeyId = await cache.restoreCache([cosmopolitanPath], cacheKey)
    if (cacheKeyId !== undefined) {
      core.addPath(path.join(cosmopolitanPath, 'bin'))
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
    const cacheId = await cache.saveCache([cosmopolitanPath], cacheKey)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}

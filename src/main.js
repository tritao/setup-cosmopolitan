const core = require('@actions/core')
const tc = require('@actions/tool-cache')
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

    const cosmopolitanCachedDir = tc.find('cosmocc', version)
    if (cosmopolitanCachedDir !== undefined) {
      core.addPath(cosmopolitanCachedDir)
      return
    }

    const urlBase = 'https://cosmo.zip/pub/cosmocc/'
    const url =
      version === 'latest'
        ? `${urlBase}cosmocc.zip`
        : `${urlBase}cosmocc-${version}.zip`
    const cosmopolitan = await tc.downloadTool(url)
    const cosmopolitanPath = path.join(process.env.GITHUB_WORKSPACE, userPath)
    await tc.extractZip(cosmopolitan, cosmopolitanPath)
    const cachedPath = await tc.cacheDir(cosmopolitanPath, 'cosmocc', version)
    core.addPath(cachedPath)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}

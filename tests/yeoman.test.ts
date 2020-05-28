import * as helpers from 'yeoman-test'
import * as assert from 'yeoman-assert'
import * as path from 'path'
import * as generatorZoteroPluginPkg from '../package.json'
import * as yeomanUser from 'yeoman-generator/lib/actions/user'

import mock = require('mock-require')

const plugin = 'zotero-scaffold-plugin'
const description = 'A Zotero plugin generator'
const user = {
  username: 'your_github_username',
  name: 'your_git_name',
  email: 'your_git_email',
}

// mock('superb', () => "cat's meow")
mock('inquirer-npm-name', () => Promise.resolve({ name: plugin }))

yeomanUser.git.name = () => user.name
yeomanUser.git.email = () => user.email
yeomanUser.github.username = async () => user.username

const common = [
  '.github/label-gun.yml',
  '.gitignore',
  '.travis.yml',
  'README.md',
  'chrome.manifest',
  `locale/en-US/${plugin}.dtd`,
  'skin/default/overlay.css',
  'tsconfig.json',
  'tslint.json',
  'webpack.config.ts',
]

async function prepare(kind) {
  return helpers.run(path.join(__dirname, '../app'))
    .inDir('generator-temp')
    .withPrompts({
      name: plugin,
      description,
      homepage: 'http://yeoman.io',
      githubAccount: 'yeoman',
      authorName: 'The Yeoman Team',
      authorEmail: 'hi@yeoman.io',
      authorUrl: 'http://yeoman.io',
      keywords: [],
      license: 'MIT',
      kind,
  })
}

describe('zotero:extension', () => {
  describe('defaults', () => {
    it('creates an overlay extension', async () => {
      await prepare('overlay')
      assert.equal(path.basename(process.cwd()), 'generator-temp')
      assert.file(common.concat([`content/${plugin}.ts`, 'content/overlay.xul']))
    })

    it('creates an bootstrapped extension', async () => {
      await prepare('bootstrapped')
      assert.equal(path.basename(process.cwd()), 'generator-temp')
      assert.file(common.concat('bootstrap.ts'))
    })

    it('fills package.json with correct information', async () => {
      await prepare('overlay')
      // eslint-disable-next-line new-cap
      assert.JSONFileContent('package.json', {
        name: plugin,
        description,
        dependencies: generatorZoteroPluginPkg.devDependencies,
        scripts: {
          postbuild: `zotero-plugin-zipup build ${plugin}`,
        },
        repository: {
          type: 'git',
          url: `https://github.com/${user.username}/${plugin}.git`,
        },
        author: {
          name: user.name,
          email: user.email,
        },
        bugs: {
          url: `https://github.com/${user.username}/${plugin}/issues`,
        },
        homepage: `https://github.com/${user.username}/${plugin}`,
        xpi: {
          name: 'Scaffold Plugin for Zotero',
          updateLink: `https://github.com/${user.username}/${plugin}/releases/download/v{version}/zotero-${plugin}-{version}.xpi`,
          releaseURL: `https://github.com/${user.username}/${plugin}/releases/download/release/`,
        },
      })
    })

  })
})

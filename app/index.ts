/* eslint-disable no-console */
import Generator from 'yeoman-generator'
import yosay from 'yosay'
import askName from 'inquirer-npm-name'
import * as _ from 'lodash'
import * as path from 'path'

const prefix = 'zotero-'

function makePluginName(name: string): string {
  name = _.kebabCase(name)
  if (!name.startsWith(prefix)) name = `${prefix}${name}`
  return name
}

class ZoteroPlugin extends Generator {
  private props = {
    plugin: {
      name: '',
      humanName: '',
      description: '',
    },
    code: {
      namespace: '',
      localePrefix: '',
      bootstrapped: true,
    },
    user: {
      username: '',
      email: '',
      name: '',
    },
  }

  public async prompting(): Promise<void> {
    // Have Yeoman greet the user.
    this.log(yosay('Welcome to the zotero-plugin generator!'))

    this.props.plugin.name = (await askName({
      name: 'name',
      message: 'Your plugin name',
      default: makePluginName(path.basename(process.cwd())),
      filter: makePluginName,
      validate: str => (str.length > prefix.length),
    }, this)).name

    const answers = await this.prompt([
      { type: 'input', name: 'description', message: 'Description' },
      { type: 'list', name: 'kind', message: 'Do you want an overlay or a bootstrapped (inclomplete currently) extension?', choices: ['overlay', 'bootstrapped' ] },
    ])

    this.props.plugin.description = answers.description
    this.props.plugin.humanName = this.props.plugin.name.replace(prefix, '').replace(/(^|-)([a-z])/g, g => g.toUpperCase().replace(/-/g, ' ')).trim()
    this.props.code.namespace = this.props.plugin.humanName.replace(/ /g, '')
    this.props.code.localePrefix = this.props.plugin.name.replace(/-/g, '.')
    this.props.code.bootstrapped = (answers.kind === 'bootstrapped')

    try {
      this.props.user.username = await this.user.github.username()
    }
    catch (error) {
      this.log('\nWARNING: An error occurred while resolving your GitHub username.')
      this.log(error)

      this.log('Using "TOCHANGE" as default username, please replace it later.\n')
      this.props.user.username = 'TOCHANGE'
    }
    this.props.user.name = this.user.git.name()
    this.props.user.email = this.user.git.email()
  }

  public writing(): void {
    const package_json = {
      name: this.props.plugin.name,
      version: '0.0.1',
      description: this.props.plugin.description,
      scripts: {
        lint: 'eslint . --ext .ts --cache --cache-location .eslintcache/',
        prebuild: 'npm run lint',
        build: 'tsc --noEmit && node esbuild.js',
        postbuild: `zotero-plugin-zipup build ${this.props.plugin.name}`,
        release: 'zotero-plugin-release',
        postversion: 'git push --follow-tags',
      },
      repository: {
        type: 'git',
        url: `https://github.com/${this.props.user.username}/${this.props.plugin.name}.git`,
      },
      author: {
        name: this.props.user.name,
        email: this.props.user.email,
      },
      bugs: {
        url: `https://github.com/${this.props.user.username}/${this.props.plugin.name}/issues`,
      },
      homepage: `https://github.com/${this.props.user.username}/${this.props.plugin.name}`,
      dependencies: require('../package.json').devDependencies,
      xpi: {
        name: `${this.props.plugin.humanName} for Zotero`,
        updateLink: `https://github.com/${this.props.user.username}/${this.props.plugin.name}/releases/download/v{version}/${this.props.plugin.name}-{version}.xpi`,
        releaseURL: `https://github.com/${this.props.user.username}/${this.props.plugin.name}/releases/download/release/`,
        bootstrapped: false,
      },
    }

    if (this.props.code.bootstrapped) {
      package_json.xpi.bootstrapped = true
    }
    else {
      delete package_json.xpi.bootstrapped
    }
    this.fs.writeJSON(this.destinationPath('package.json'), package_json)

    const templates = [
      'README.md',
      'esbuild.js_',
      'chrome.manifest',
      'locale/en-US/index.dtd',
    ]

    if (this.props.code.bootstrapped) {
      templates.push('bootstrap.ts_')
    }
    else {
      templates.push('content/overlay.xul')
      templates.push('content/overlay.ts_')
    }

    for (const src of templates) {
      const tgt = src
        .replace('/overlay.', `/${this.props.plugin.name}.`)
        .replace('/index.', `/${this.props.plugin.name}.`)
        .replace('.ts_', '.ts')
        .replace('.js_', '.js')
      this.fs.copyTpl(this.templatePath(src), this.destinationPath(tgt), this.props)
    }
    const files = [
      'tsconfig.json',
      'dot-gitignore',
      'dot-github/workflows/release.yml',
      'skin/default/overlay.css',
    ]
    for (const src of files) {
      const tgt = src.replace(/dot-/g, '.')
      this.fs.copy(this.templatePath(src), this.destinationPath(tgt))
    }
    const copy = [
      '.eslintrc.json',
      '.eslintignore',
    ]
    for (const src of copy) {
      this.fs.copy(path.join(__dirname, '..', src), this.destinationPath(src))
    }
  }

  /*
  public install(): void {
    this.installDependencies({ npm: true })
  }
  */
}

export = ZoteroPlugin

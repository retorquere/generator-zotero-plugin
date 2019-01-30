import Generator = require('yeoman-generator')
import yosay = require('yosay')
import askName = require('inquirer-npm-name')
import * as _ from 'lodash'
import * as path from 'path'
import extend = require('deep-extend')

const prefix = 'zotero-'

function makePluginName(name) {
  name = _.kebabCase(name)
  name = name.indexOf(prefix) === 0 ? name : prefix + name
  return name
}

export = class ZoteroPlugin extends Generator {
  private props = {
    plugin: {
      name: '',
      humanName: '',
      description: '',
    },
    code: {
      namespace: '',
      localePrefix: '',
    },
    user: {
      username: '',
      email: '',
      name: '',
    },
  }

  public async prompting() {
    // Have Yeoman greet the user.
    this.log(yosay('Welcome to the zotero-plugin generator!'))

    this.props.plugin.name = (await askName({
      name: 'name',
      message: 'Your plugin name',
      default: makePluginName(path.basename(process.cwd())),
      filter: makePluginName,
      validate: str => (str.length > prefix.length),
    }, this)).name

    const prompts = [
      {
        type: 'input',
        name: 'description',
        message: 'Description',
      },
    ]

    for (const [name, value] of Object.entries(await this.prompt(prompts))) {
      this.props.plugin[name] = value
    }

    this.props.plugin.humanName = this.props.plugin.name.replace(prefix, '').replace(/(^|-)([a-z])/g, g => g.toUpperCase().replace(/-/g, ' ')).trim()
    this.props.code.namespace = this.props.plugin.humanName.replace(/ /g, '')
    this.props.code.localePrefix = this.props.plugin.name.replace(/-/g, '.')

    this.props.user.username = await this.user.github.username()
    this.props.user.name = await this.user.git.name()
    this.props.user.email = this.user.git.email()
  }

  public writing() {
    const package_json = {
      name: this.props.plugin.name,
      version: '0.0.1',
      description: this.props.plugin.description,
      scripts: {
        lint: 'tslint -t stylish --project .',
        prebuild: 'npm run lint',
        build: 'webpack',
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
      dependencies: require('../../package.json').devDependencies,
      xpi: {
        name: `${this.props.plugin.humanName} for Zotero`,
        updateLink: `https://github.com/${this.props.user.username}/${this.props.plugin.name}/releases/download/v{version}/zotero-auto-index-{version}.xpi`,
        releaseURL: `https://github.com/${this.props.user.username}/${this.props.plugin.name}/releases/download/release/`,
      },
    }
    this.fs.writeJSON(this.destinationPath('package.json'), package_json)

    const templates = [
      'README.md',
      'webpack.config.ts_',
      'chrome.manifest',
      'content/overlay.xul',
      'content/index.ts_',
      'locale/en-US/index.dtd',
    ]
    for (const src of templates) {
      const tgt = src.replace('/index.', `/${this.props.plugin.name}.`).replace('.ts_', '.ts')
      this.fs.copyTpl(this.templatePath(src), this.destinationPath(tgt), this.props)
    }
    const files = [
      'tsconfig.json',
      'tslint.json',
      'dot-travis.yml',
      'dot-gitignore',
      'skin/default/overlay.css',
    ]
    for (const src of files) {
      const tgt = src.replace('dot-', '.')
      this.fs.copy(this.templatePath(src), this.destinationPath(tgt))
    }
  }

  public install() {
    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false,
    })
  }
}

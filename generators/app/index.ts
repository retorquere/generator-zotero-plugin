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
  private props: { [key: string]: string } = {}

  public async prompting() {
    // Have Yeoman greet the user.
    this.log(yosay('Welcome to the wicked zotero-plugin generator!'))

    this.props.name = (await askName({
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
      this.props[name] = value
    }

    this.props.label = this.props.name.replace(prefix, '').replace(/(^|-)([a-z])/g, g => g.toUpperCase().replace('-', ' ')).trim()
    this.props.id = this.props.label.replace(/ /, '')

    this.props.owner = this.user.git.name()
    this.props.email = this.user.git.email()
    this.props.key = this.props.name.replace('-', '.')
  }

  public writing() {
    const package_json = {
      name: this.props.name,
      version: '0.0.1',
      description: this.props.description,
      scripts: {
        lint: 'tslint -t stylish --project .',
        prebuild: 'npm run lint',
        build: 'webpack',
        postbuild: `zotero-plugin-zipup build ${this.props.name}`,
        release: 'zotero-plugin-release',
        postversion: 'git push --follow-tags',
      },
      repository: {
        type: 'git',
        url: `git@github.com:${this.user.git.name()}/${this.props.name}.git`,
      },
      author: {
        name: this.user.git.name(),
        email: this.user.git.email(),
      },
      bugs: {
        url: `https://github.com/${this.user.git.name()}/${this.props.name}/issues`,
      },
      homepage: `https://github.com/${this.user.git.name()}/${this.props.name}`,
      dependencies: require('../../package.json').dependencies,
      xpi: {
        name: `Zotero ${this.props.label}`,
        updateLink: `https://github.com/${this.user.git.name()}/${this.props.name}/releases/download/v{version}/zotero-auto-index-{version}.xpi`,
        releaseURL: `https://github.com/${this.user.git.name()}/${this.props.name}/releases/download/release/`,
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
      const tgt = src.replace('/index.', `/${this.props.name}.`).replace('.ts_', '.ts')
      this.fs.copyTpl(this.templatePath(src), this.destinationPath(tgt), this.props)
    }
    const files = [
      'tsconfig.json',
      'tslint.json',
      '.travis.yml',
      '.gitignore',
    ]
    for (const f of files) {
      this.fs.copy(this.templatePath(f), this.destinationPath(f))
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

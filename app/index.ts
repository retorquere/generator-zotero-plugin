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
      id: '',
    },
    code: {
      namespace: '',
      localePrefix: '',
      template: '',
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

    const template = {
      'Overlay plugin for Zotero 6': 'src-1.0',
      'Overlay plugin for Zotero 6 and bootstrapped plugin for Zotero 7': 'src-1.1',
      'Bootstrapped plugin for Zotero 6 and 7': 'src-1.2',
      'Bootstrapped plugin for Zotero 7': 'src-2.0',
    }
    const answers = await this.prompt([
      { type: 'input', name: 'description', message: 'Description' },
      { type: 'list', name: 'template', message: 'What kind of extension are you building?', choices: Object.keys(template).sort() },
    ])

    this.props.plugin.description = answers.description
    this.props.plugin.humanName = this.props.plugin.name.replace(prefix, '').replace(/(^|-)([a-z])/g, g => g.toUpperCase().replace(/-/g, ' ')).trim()
    this.props.code.namespace = this.props.plugin.humanName.replace(/ /g, '')
    this.props.code.localePrefix = this.props.plugin.name.replace(/-/g, '.')
    this.props.code.template = template[answers.template]

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

    this.props.plugin.id = `${this.props.plugin.name}@${this.props.user.email.replace(/.+@/, '')}`
  }

  public end() {
    this.log('also look at the `zotero-plugin` package that is now installed for your plugin')
  }

  public writing(): void {
    const base = 'client'
    this.fs.copy(
      this.templatePath(path.join('make-it-red', this.props.code.template, '**')),
      this.destinationPath(base), {
        globOptions: { dot: true },
        process: (contents: Buffer) => {
          let source = contents.toString('utf-8')
          source = source.replace(/make-it-red-ftl/g, `${this.props.plugin.name}-ftl`)
          source = source.replace(/make-it-red[.]ftl/g, `${this.props.plugin.name}.ftl`)
          source = source.replace(/make-it-red[.]properties/g, `${this.props.plugin.name}.properties`)
          source = source.replace(/make-it-red@zotero[.]org/g, `.${this.props.plugin.id}.`)
          source = source.replace(/[.]make-it-red[.]/g, `.${this.props.plugin.name}.`)
          source = source.replace(/[/]make-it-red[/]/g, `/${this.props.plugin.name}/`)
          source = source.replace(/Make It Red/g, `/${this.props.plugin.description}/`)
          source = source.replace(/Makes everything red/g, `/${this.props.plugin.description}/`)
          source = source.replace(/Zotero[.]MakeItRed/g, `/Zotero.${this.props.code.namespace}/`)
          source = source.replace(/make-it-red([-.])/g, `/${this.props.plugin.name}$1`)
          source = source.replace(/locale\s+make-it-red\s+en-US/, `locale ${this.props.plugin.name} en-US`)
          if (source !== contents.toString('utf-8')) return source
          return contents
        },
      }
    )
    this.fs.move(
      this.destinationPath(path.join(base, 'locale', 'en-US', 'make-it-red.ftl')),
      this.destinationPath(path.join(base, 'locale', 'en-US', `${this.props.plugin.name}.ftl`))
    )
    this.fs.move(
      this.destinationPath(path.join(base, 'chrome', 'locale', 'en-US', 'make-it-red.properties')),
      this.destinationPath(path.join(base, 'chrome', 'locale', 'en-US', `${this.props.plugin.name}.properties`))
    )

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
      },
    }

    this.fs.writeJSON(this.destinationPath('package.json'), package_json)

  }

  public install(): void {
    // this.installDependencies({ npm: true })
    console.log('install')
  }
}

export = ZoteroPlugin

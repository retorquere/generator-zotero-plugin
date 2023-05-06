/* eslint-disable no-console */
import Generator from 'yeoman-generator'
import yosay from 'yosay'
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
      id: '',
      base: '',
      name: '',
    },
    code: {
      namespace: '',
      template: '',
    },
    user: {
      email: '',
      name: '',
    },
    repo: {
      owner: '',
      name: '',
    },
  }

  private async _private_ask(question): Promise<string> {
    if (!question?.message) throw new Error(JSON.stringify(question))
    return (await this.prompt([{ name: 'input', type: 'input', ...question}])).input as string
  }
  public async prompting(): Promise<void> {
    // Have Yeoman greet the user.
    this.log(yosay('Welcome to the zotero-plugin generator!'))

    this.props.user.name = await this._private_ask({ message: 'Your name', default: this.user.git.name() })
    this.props.user.email = await this._private_ask({ message: 'Your email', default: this.user.git.email() })
    try {
      this.props.repo.owner = await this.user.github.username()
    }
    catch (error) {
    }
    this.props.repo.owner = await this._private_ask({ message: 'GitHub repo owner', default: this.props.repo.owner })
    this.props.repo.name = await this._private_ask({ message: 'GitHub repo name', default: makePluginName(path.basename(process.cwd())) })

    this.props.plugin.id = await this._private_ask({
      message: 'Plugin ID:',
      default: `${this.props.repo.name}@${this.props.user.email.replace(/^[^@]*@/, '')}`,
    })
    this.props.plugin.base = this.props.plugin.id.replace(/@.*/, '')
    this.props.plugin.name = await this._private_ask({
      message: 'Plugin description',
      default: this.props.plugin.base.replace(prefix, '').replace(/(^|-)([a-z])/g, (g: string) => g.toUpperCase().replace(/-/g, ' ')).trim(),
    })

    this.props.code.namespace = await this._private_ask({ message: 'Plugin Namespace', default: `Zotero.${this.props.plugin.name.replace(/ /g, '')}` })
    this.props.code.namespace = `Zotero.${this.props.code.namespace.replace(/^Zotero./, '').replace(/[^a-z0-9]/gi, '')}`

    const template = {
      // 'Overlay plugin for Zotero 6': 'src-1.0',
      // 'Overlay plugin for Zotero 6 and bootstrapped plugin for Zotero 7': 'src-1.1',
      'Bootstrapped plugin for Zotero 6 and 7': 'src-1.2',
      'Bootstrapped plugin for Zotero 7': 'src-2.0',
    }
    this.props.code.template = await this._private_ask({ type: 'list', choices: Object.keys(template).sort(), message: 'What kind of extension are you building?' })
    this.props.code.template = template[this.props.code.template]
  }

  private _private_move(source: string, target: string): void {
    const dest_source = this.destinationPath(source)

    if (this.fs.exists(dest_source)) {
      this.fs.move(dest_source, this.destinationPath(target))
    }
  }

  public writing(): void {
    const base = 'client'
    const root = path.join(base, '..')

    this.fs.copy(
      this.templatePath(path.join('make-it-red', this.props.code.template, '**')),
      this.destinationPath(base), {
        globOptions: { dot: true },
        process: (contents: Buffer) => {
          let source = contents.toString('utf-8')
          source = source.replace(/make-it-red-ftl/g, `${this.props.plugin.base}-ftl`)
          source = source.replace(/make-it-red[.]ftl/g, `${this.props.plugin.base}.ftl`)
          source = source.replace(/make-it-red[.]properties/g, `${this.props.plugin.base}.properties`)
          source = source.replace(/make-it-red@zotero[.]org/g, `.${this.props.plugin.id}.`)
          source = source.replace(/[.]make-it-red[.]/g, `.${this.props.plugin.base}.`)
          source = source.replace(/[/]make-it-red[/]/g, `/${this.props.plugin.base}/`)
          source = source.replace(/Make It Red/g, `/${this.props.plugin.name}/`)
          source = source.replace(/Makes everything red/g, `${this.props.plugin.name}`)
          source = source.replace(/Zotero[.]MakeItRed/g, this.props.code.namespace)
          source = source.replace(/make-it-red([-.])/g, `${this.props.plugin.base}$1`)
          source = source.replace(/locale\s+make-it-red\s+en-US/, `locale ${this.props.plugin.base} en-US`)

          // source = source.replace(/;$/gm, '').replace(/\t/, '  ').replace(/\s+$/gm, '')

          if (source !== contents.toString('utf-8')) return source
          return contents
        },
      }
    )

    this._private_move(
      path.join(base, 'locale', 'en-US', 'make-it-red.ftl'),
      path.join(base, 'locale', 'en-US', `${this.props.plugin.base}.ftl`)
    )
    this._private_move(
      path.join(base, 'chrome', 'locale', 'en-US', 'make-it-red.properties'),
      path.join(base, 'chrome', 'locale', 'en-US', `${this.props.plugin.base}.properties`)
    )
    this._private_move(path.join(base, 'bootstrap.js'), path.join(root, 'bootstrap.ts'))
    this._private_move(path.join(base, 'lib.js'), path.join(root, 'lib.ts'))
    this._private_move(path.join(base, 'esbuild.js'), path.join(root, 'esbuild.js'))

    this.fs.copy(path.join(__dirname, 'tsconfig.json'), this.destinationPath(path.join(root, 'tsconfig.json')))
    this.fs.copy(path.join(__dirname, 'eslintrc.json'), this.destinationPath(path.join(root, '.eslintrc.json')))

    const version = '0.0.1'
    this.fs.writeJSON(this.destinationPath('package.json'), {
      name: this.props.plugin.base,
      version,
      description: this.props.plugin.name,
      scripts: {
        lint: 'eslint . --ext .ts --cache --cache-location .eslintcache/',
        prebuild: 'npm run lint',
        build: 'tsc --noEmit && node esbuild.js',
        postbuild: `zotero-plugin-zipup build ${this.props.plugin.base}`,
        release: 'zotero-plugin-release',
        postversion: 'git push --follow-tags',
      },
      repository: {
        type: 'git',
        url: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}.git`,
      },
      author: {
        name: this.props.user.name,
        email: this.props.user.email,
      },
      bugs: {
        url: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}/issues`,
      },
      homepage: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}`,
      dependencies: require('../package.json').devDependencies,
      xpi: {
        name: `${this.props.plugin.name} for Zotero`,
        updateLink: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}/releases/download/v{version}/${this.props.plugin.base}-{version}.xpi`,
        releaseURL: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}/releases/download/release/`,
      },
    })

    // overwrite during build bij zotero-plugin
    // this.fs.delete(this.destinationPath(path.join(base, 'install.rdf')))

    if (this.fs.exists(this.destinationPath(path.join(base, 'manifest.json')))) {
      this.fs.writeJSON(this.destinationPath(path.join(base, 'manifest.json')), {
        manifest_version: 2,
        name: this.props.plugin.name,
        version,
        description: this.props.plugin.name,
        applications: {
          zotero: {
            id: this.props.plugin.id,
            update_url: `https://github.com/${this.props.repo.owner}/${this.props.repo.name}/releases/download/release/update.rdf`,
            strict_min_version: '6.999',
            strict_max_version: '7.0.*',
          },
        },
      })
    }

    this.env.options.nodePackageManager = 'npm'
  }

  public end(): void {
    this.spawnCommandSync('npm', ['run', 'lint', '--', '--fix'])
    this.log('also look at the `zotero-plugin` package that is now installed for your plugin')
  }
}

export = ZoteroPlugin

import Debug from 'debug'
import { CODE_LANGUAGES } from '@packages/types'
import {
  AllPackageNames,
  AllPackagePackages,
  BUNDLERS,
  DEPENDENCIES,
  FRONTEND_FRAMEWORKS,
  AllPackagesDescriptions,
  CYPRESS_DEV_SERVERS,
} from '@packages/scaffold-config'
import type { DataContext } from '..'
import path from 'path'
import resolve from 'resolve-from'

const debug = Debug('cypress:data-context:wizard-data-source')

interface PackageToInstall {
  name: AllPackageNames
  description: AllPackagesDescriptions
  package: AllPackagePackages
  installer: typeof DEPENDENCIES[number]['installer']
}

export class WizardDataSource {
  constructor (private ctx: DataContext) {}

  async packagesToInstall (): Promise<PackageToInstall[] | null> {
    if (!this.chosenFramework || !this.chosenBundler) {
      return null
    }

    const packages: PackageToInstall[] = [...this.chosenFramework.packages]

    // find the matching dev server
    // vite -> @cypress/vite-dev-server
    // webpack -> @cypress/webpack-dev-server
    // only applicable for `library` - `template` like CRA, Next.js etc
    // only support 1 dev server, which is included in `framework.dependencies`.
    if (this.chosenFramework.family === 'library') {
      const cypressDevServer = CYPRESS_DEV_SERVERS.find(
        (devServer) => devServer.supports.some((bundler) => bundler.type === this.chosenBundler?.type),
      )

      if (!cypressDevServer) {
        throw Error(`Could not find matching Cypress Dev Server for ${this.chosenBundler.type}`)
      }

      packages.push(cypressDevServer)
    }

    const storybookInfo = await this.ctx.storybook.loadStorybookInfo()
    const { storybookDep } = this.chosenFramework

    if (storybookInfo && storybookDep) {
      packages.push(storybookDep)
    }

    return packages
  }

  async installDependenciesCommand () {
    const commands = {
      'npm': 'npm install -D',
      'pnpm': 'pnpm install -D',
      'yarn': 'yarn add -D',
    }

    let depsToInstall = (await this.ctx.wizard.packagesToInstall() ?? [])

    if (!depsToInstall?.length) {
      return null
    }

    const deps = depsToInstall.map((pack) => `${pack.installer}`).join(' ')

    return `${commands[this.ctx.coreData.packageManager ?? 'npm']} ${deps}`
  }

  async installedPackages (): Promise<string[]> {
    if (this.ctx.coreData.wizard.__fakeInstalledPackagesForTesting) {
      return this.ctx.coreData.wizard.__fakeInstalledPackagesForTesting
    }

    const packagesInitial = await this.packagesToInstall() || []

    if (!this.ctx.currentProject) {
      throw Error('currentProject is not defined')
    }

    debug('packages to install: %O in %s', packagesInitial, this.ctx.currentProject)

    const installedPackages: Array<string | null> = packagesInitial.map((p) => {
      if (this.ctx.currentProject) {
        debug('package checked: %s', p.package)

        // At startup, node will only resolve the main files of packages it knows of.
        // Adding a package after the app started will not be resolved in the same way.
        // It will only be resolved as a package whose main is `index.js`, ignoring the "main" field
        // to avoid this bug, we resolve a file we know has to be in a node module:
        // `package.json`
        const packageJsonPath = path.join(p.package, 'package.json')

        debug('package.json path: %s', packageJsonPath)

        try {
          debug(`resolving ${this.ctx.currentProject, packageJsonPath}`)
          const loc = resolve(this.ctx.currentProject, packageJsonPath)

          debug('found at %s', loc)

          return p.package
        } catch (e) {
          debug('ERROR - resolving package "%s": %O', p.package, e)
        }
      }

      return null
    })

    return installedPackages.filter((p) => p !== null) as string[]
  }

  get chosenFramework () {
    return FRONTEND_FRAMEWORKS.find((f) => f.type === this.ctx.wizardData.chosenFramework) || null
  }

  get chosenBundler () {
    return BUNDLERS.find((f) => f.type === this.ctx.wizardData.chosenBundler) || null
  }

  get chosenLanguage () {
    return CODE_LANGUAGES.find((f) => f.type === this.ctx.wizardData.chosenLanguage) || null
  }
}

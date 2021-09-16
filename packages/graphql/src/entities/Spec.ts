import { nxs, NxsResult } from 'nexus-decorators'
import { SpecTypeEnum } from '../constants/specConstants'
import type { BaseContext } from '../context'
import type { SpecContract } from '../contracts/SpecContract'
import { GitInfo } from './GitInfo'

@nxs.objectType({
  description: 'A spec file associated with a project and testing type via the testFiles glob',
})
export class Spec implements SpecContract {
  constructor (private _config: SpecContract, private ctx: BaseContext) {}

  @nxs.field.nonNull.type(() => SpecTypeEnum)
  get specType (): NxsResult<'Spec', 'specType'> {
    return this._config.specType
  }

  @nxs.field.nonNull.string()
  get absolute (): NxsResult<'Spec', 'absolute'> {
    return this._config.absolute
  }

  @nxs.field.nonNull.string()
  get relative (): NxsResult<'Spec', 'relative'> {
    return this._config.relative
  }

  @nxs.field.nonNull.string()
  get name (): NxsResult<'Spec', 'name'> {
    return this._config.name
  }

  @nxs.field.type(() => GitInfo)
  get gitInfo (): NxsResult<'Spec', 'gitInfo'> {
    return new GitInfo(this._config.absolute, this.ctx)
  }
}
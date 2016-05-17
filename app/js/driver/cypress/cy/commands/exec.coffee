$Cypress.register "Exec", (Cypress, _, $, Promise) ->

  exec = (options) =>
    new Promise (resolve, reject) ->
      Cypress.trigger "exec", options, (resp) ->
        if err = resp.__error
          reject(err)
        else
          resolve(resp)

  Cypress.addParentCommand
    exec: (cmd, options = {}) ->
      _.defaults options,
        log: true
        timeout: Cypress.config("execTimeout")
        failOnNonZeroExit: true

      if options.log
        options._log = Cypress.Log.command({
          message: _.truncate(cmd, 25)
        })

      if not cmd or not _.isString(cmd)
        $Cypress.Utils.throwErrByPath("exec.invalid_argument", {
          onFail: options._log,
          args: { cmd: cmd ? '' }
        })

      options.cmd = cmd

      ## need to remove the current timeout
      ## because we're handling timeouts ourselves
      @_clearTimeout()

      exec(_.pick(options, "cmd", "timeout"))
      .timeout(options.timeout)
      .catch (error) ->
        ## pass timeout errors to next catch
        throw error if error instanceof Promise.TimeoutError

        $Cypress.Utils.throwErrByPath("exec.failed", {
          onFail: options._log
          args: { cmd, error }
        })
      .catch Promise.TimeoutError, (err) =>
        $Cypress.Utils.throwErrByPath "exec.timed_out", {
          onFail: options._log
          args: { cmd, timeout: options.timeout }
        }

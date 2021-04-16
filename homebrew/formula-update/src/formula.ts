import { compile } from 'handlebars'

/**
 * FormulaParams describes all parameters provided to templating engine that
 * could be used during rendering contents of formula.
 */
type FormulaParams = {
  formulaFile: string
  revision: string
  tag: string
}

/**
 * generateFormula renders a formula using Handlebars templating engine.
 *
 * @param template
 * @param params
 */
async function renderFormula(template: string, params: FormulaParams): Promise<string> {
  const render = compile(template)
  return render({
    ...params,

    // aliases
    formula: params.formulaFile,
    version: params.tag,
  })
}

export default renderFormula

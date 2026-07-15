/**
 * Operator resolution — the SP's find-or-create rule, isolated so both the
 * add and edit paths reuse it and no duplicate operators are ever created.
 *
 * SP rules:
 *   • blank name   -> 'NA'
 *   • blank number -> '1234567890'
 *   • look up by (name, number, designation); insert only if not found.
 */

const operatorRepository = require("../repositories/operatorRepository");
const {
  DEFAULT_OPERATOR_NAME,
  DEFAULT_OPERATOR_NUMBER,
} = require("../constants/cameraMapping");

/**
 * @returns {Promise<number>} the resolved operator id.
 */
async function resolveOperatorId(makeRequest, input, district) {
  const name = input.operatorName?.trim() || DEFAULT_OPERATOR_NAME;
  const number = input.operatorNumber?.trim() || DEFAULT_OPERATOR_NUMBER;
  const designation = input.operatorDesignation?.trim() || "";

  const existingId = await operatorRepository.findId(makeRequest, {
    name,
    number,
    designation,
  });
  if (existingId) return existingId;

  return operatorRepository.insert(makeRequest, {
    name,
    number,
    designation,
    district,
  });
}

module.exports = { resolveOperatorId };

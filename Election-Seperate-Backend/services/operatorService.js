/**
 * Operator resolution: find-or-create, so the add and edit paths never create
 * duplicate operators.
 *
 *   • blank name   -> 'NA'
 *   • blank number -> '1234567890'
 *   • look up by (name, number); insert only if not found.
 */

const operatorRepository = require("../repositories/operatorRepository");
const {
  DEFAULT_OPERATOR_NAME,
  DEFAULT_OPERATOR_NUMBER,
} = require("../constants/cameraMapping");

/** @returns {Promise<{operatorId: string, name: string, number: string}>} */
async function resolveOperator(input, session) {
  const name = input.operatorName?.trim() || DEFAULT_OPERATOR_NAME;
  const number = input.operatorNumber?.trim() || DEFAULT_OPERATOR_NUMBER;
  const designation = input.operatorDesignation?.trim() || "";

  const existingId = await operatorRepository.findId({ name, number }, session);
  const operatorId =
    existingId ||
    (await operatorRepository.insert({ name, number, designation }, session));
  return { operatorId, name, number };
}

module.exports = { resolveOperator };

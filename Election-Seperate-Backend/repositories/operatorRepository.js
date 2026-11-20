/**
 * Operators: the `operator_infos` collection in the polling database.
 * Document shape (same as the web portal): { operatorId: "OP-<ms>", name, mobile, Srno }.
 */

const { getPollingModels } = require("../models/polling");

/** operatorId of the operator with this exact name + mobile, or null. */
async function findId({ name, number }, session) {
  const { Operator } = getPollingModels();
  const doc = await Operator.findOne({ name, mobile: number }, { operatorId: 1 })
    .session(session || null)
    .lean();
  return doc ? doc.operatorId : null;
}

/** Create an operator and return its operatorId. */
async function insert({ name, number, designation }, session) {
  const { Operator } = getPollingModels();
  const last = await Operator.findOne({}, { Srno: 1 })
    .sort({ Srno: -1 })
    .session(session || null)
    .lean();
  const operatorId = `OP-${Date.now()}`;
  const doc = { operatorId, name, mobile: number, Srno: (Number(last?.Srno) || 0) + 1 };
  if (designation) doc.designation = designation;
  await Operator.create([doc], { session });
  return operatorId;
}

module.exports = { findId, insert };
